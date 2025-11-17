'use strict';

import prices from '../stores/prices.js';
import quotes from '../stores/quotes.js';
import ticker from '../stores/ticker.js';
import Trade from './trade.js';
import { round, roundToNearest, toVolume } from './formatting.js';
import { getBrokerage } from './brokerages.js';
import {
  spreadVol,
  flyWingVolFromBody,
  flyBodyVolFromWing,
  flyWingVolFromWing,
  spreadPrice,
  spreadShortLegPrice,
  spreadLongLegPrice,
  flyPrice,
  flyWing1Price,
  flyBodyPrice,
  flyWing2Price
} from './calculations.js';

// A Trades object is an array of trades given an offer Price
// and a bid Price. These Price objects contain 1 or more
// Order objects that make up the price.
// Each Trade object in trades defines the details of the tickets
// involved in the trades
// Also given the broker_id of the active user

class Trades {
  constructor(offer, bid) {
    this.trades = [];
    this.product_id = offer.product_id;
    this.timestamp = null;
    this.years = offer.years;
    if (offer.fwd) this.fwd = offer.fwd;

    // Insert the Trade objects

    this._insertTrades(offer);
    this._insertTrades(bid);

    // Calculate the prices of all Trades
    this._setPrices();

    // Set initial volumes of all Trades

    this._setVolumes();

    // Calculate the brokerages of all Trades

    this._setBrokerages();

    // Set the timestamp

    this._setTimestamp();
  }

  // Insert a Trade into the trades array given a Price object
  // This could result in either creating a new Trade object
  // or adding a bid/offer to an existing trade object

  _insertTrades(price) {
    // Determine if the price is an offer
    // or a bid and insert the orders
    // Also give the initial volume of the offers and bids
    // This is the start of the process
    // known as 'Hedging'

    for (let order of price.links) {
      if (order.isOutright()) {
        // Insert leg of outright at bid

        this._insertLeg(order, order.years[0], order.bid, order.fwd);
      } else if (order.isSpread()) {
        // Insert short leg on !bid and long leg on bid

        this._insertLeg(order, order.years[0], !order.bid);
        this._insertLeg(order, order.years[1], order.bid);
      } else if (order.isButterfly()) {
        // Insert wings on !bid and body on bid

        this._insertLeg(order, order.years[0], !order.bid);
        this._insertLeg(order, order.years[1], order.bid);
        this._insertLeg(order, order.years[2], !order.bid);
      }
    }
  }

  // Insert given order at given year. offer/bid determined using 'bid'

  _insertLeg(order, year, bid, fwd) {
    // if no trade exists at year
    // make a new Trade object and insert it
    // else trade already exists, 
    // insert the order into existing trade

    let idx = this.indexOf(year);

    if (idx === -1) {
      // No trade exists with given year, or no trade exists with slot available
      // so make a new Trade and insert it

      let trade = new Trade(year, fwd);
      trade.insertOrder(order, bid);
      this._insertTrade(trade);
    } else {
      // Trade already exist in Trades
      // Insert the order into the existing Trade object

      this.trades[idx].insertOrder(order, bid);
    }
  }

  // Insert a trade object into this.trades at the correct sorted position

  _insertTrade(trade) {
    let i = 0;
    while (i < this.trades.length && trade.year >= this.trades[i].year) i++;

    this.trades.splice(i, 0, trade);
  }

  // Set trade volume of all trades

  _setVolumes() {
    // First, propagate the limiting volume through the trades and 
    // ensure that all total relative vols are equal
    this._propogateRelativeVolumes();

    // Now all relative volumes are equal, so set all trade volumes
    for (let trade of this.trades) {
      let rel_offer_totvol = trade.getTotalRelativeVolume(false);
      let rel_bid_totvol = trade.getTotalRelativeVolume(true);
      trade.volume = Math.min(rel_offer_totvol, rel_bid_totvol);
    }
  }

  _propogateRelativeVolumes() {
    let rel_offer_totvol, rel_bid_totvol;
    let all_rel_totvols_equal;
    do {
      all_rel_totvols_equal = true;

      for (let trade of this.trades) {
        rel_offer_totvol = trade.getTotalRelativeVolume(false);
        rel_bid_totvol = trade.getTotalRelativeVolume(true);

        let totvol_diff = Math.abs(rel_offer_totvol - rel_bid_totvol);

        if (totvol_diff <= 1) {
          continue;
        } else if (rel_offer_totvol < rel_bid_totvol) {
          all_rel_totvols_equal = false;

          // Update the offer side relative volume using the bid side relative total volume
          this._resolveDiffRVolume(trade, true, rel_offer_totvol);
        } else if (rel_offer_totvol > rel_bid_totvol) {
          all_rel_totvols_equal = false;

          // Update the bid side relative volume using the offer side relative total volume
          this._resolveDiffRVolume(trade, false, rel_bid_totvol);
        }
      }
    } while (!all_rel_totvols_equal);
  }

  // Resolve a trade offer/bid side's relative volume. If any updated orders are 
  // a spread or fly, we must also update the relative volume on the other legs
  _resolveDiffRVolume(trade, bid, new_tot_rvol) {
    // Loop over each order on the given side of the trade

    // we split high side of the trade to the low side of the trade.
    let high_trade_side = trade.getOrders(bid);
    let low_trade_side = trade.getOrders(!bid);


    // Special and set rules
    // Assumption here: the lower side of the trade vol has to be split evenly.
    // Thus, the high side will have to split the low side trade evenly and will be assigned the half of the low-sides trade vol
    if (high_trade_side.length === 2) {
      if(low_trade_side.length === 2) {
        if (this._ordersContainsOutrights(high_trade_side)) {
          // If the high side has more than one order, and it contains an outright, this algorithm prioritises matching the 
          // outright order's relative volume to be adjusted before the spreads.
          // Currently,  we take the total volume of the spread and flies on the higher side, minus that from the low_side total relative
          // and assign that to the volume of the high side outright order
          let outright_orders_hs;
          let spread_and_fly_orders_hs = [];
          let tot_spread_and_fly_vol_hs = 0;
          let tot_vol_ls = trade.getTotalRelativeVolume(!bid);
      
          // TODO: test two outright orders in one trade object. Not tested and unsure how to get two outright orders on one side of the trade....
          for (let order of high_trade_side) {
            if(order.isOutright()) {
              outright_orders_hs = order;
            } else {
              spread_and_fly_orders_hs.push(order);
            }
          }
          
          // Calculates the total volume for spreads and flies on the high side
          for (let order of spread_and_fly_orders_hs) {
            tot_spread_and_fly_vol_hs = tot_spread_and_fly_vol_hs + trade.getRelativeOrderVolume(order.order_id, bid);
          }
    
          // High side outright relative volume = total lowside volume - total spread and fly volume high side
          let outright_rel_vol = tot_vol_ls - tot_spread_and_fly_vol_hs;
    
          // sets the high side outright relative volume.
          trade.setRelativeVolume(outright_orders_hs.order_id, bid, outright_rel_vol);
    
        } 
      } else {
        let low_side_tot_rel_vol = trade.getTotalRelativeVolume(!bid);
        let split_rvol = low_side_tot_rel_vol / 2;

        // For each order in the high side, if the order volume is more than or equal to half of the low side trade volume / 2,
        // We set the each of high side's order's relative volume to low side trade volume / 2
        // Else we set it to 0
        // NOTE: what should we do if the order volume is less than low side trade volume / 2 ??
        for (let order of high_trade_side) {
          if (order.volumeAtYear(trade.year) < split_rvol) {
            trade.setRelativeVolume(order.order_id, bid, 0);
  
            // If order is spread or fly, must also update relative volumes of other legs
            this._applyRelVolToOtherLegs(order, trade, bid, split_rvol);
          } else {
            //TODO: need proper testing here
            trade.setRelativeVolume(order.order_id, bid, split_rvol);
  
            // If order is spread or fly, must also update relative volumes of other legs
            this._applyRelVolToOtherLegs(order, trade, bid, split_rvol);
          }

        }
      } 
    } else {
      for (let order of high_trade_side) {
        // Set the relative volume of each order using the ratio
        // each order contributed to the total relative volume
        let current_total_rvol = trade.getTotalRelativeVolume(bid);
        let current_order_rvol = trade.getRelativeOrderVolume(order.order_id, bid);
        let new_order_rvol = (current_order_rvol / current_total_rvol) * new_tot_rvol;

        trade.setRelativeVolume(order.order_id, bid, new_order_rvol);

        // If order is spread or fly, must also update relative volumes of other legs
        this._applyRelVolToOtherLegs(order, trade, bid, new_order_rvol);

      }
    }
  }

  // This function applies the relative volume to other legs if the order is a spread or a fly.
  _applyRelVolToOtherLegs(order, trade, bid, new_order_rvol) {
    if (order.isSpread()) {
      let spr_leg = order.spreadLeg(trade.year);

      if (spr_leg === 'short') {
        // Also update long leg relative volume

        let long_vol = spreadVol(order.product_id, trade.year, order.years[1], new_order_rvol);
        let long_trade = this.getTrade(order.years[1], order.order_id);
        long_trade.setRelativeVolume(order.order_id, !bid, long_vol);
      } else if (spr_leg === 'long') {
        // Also update short leg relative volume

        let short_vol = spreadVol(order.product_id, trade.year, order.years[0], new_order_rvol);
        let short_trade = this.getTrade(order.years[0], order.order_id);
        short_trade.setRelativeVolume(order.order_id, !bid, short_vol);
      }
    } else if (order.isButterfly()) {
      let fly_leg = order.butterflyLeg(trade.year);

      if (fly_leg === 'wing1') {
        // Also update body and wing2 relative volumes

        let body_vol = flyBodyVolFromWing(order.product_id, trade.year, order.years[1], new_order_rvol);
        let body_trade = this.getTrade(order.years[1], order.order_id);
        body_trade.setRelativeVolume(order.order_id, !bid, body_vol);

        let wing2_vol = flyWingVolFromWing(order.product_id, trade.year, order.years[2], new_order_rvol);
        let wing2_trade = this.getTrade(order.years[2], order.order_id);
        wing2_trade.setRelativeVolume(order.order_id, bid, wing2_vol);
      } else if (fly_leg === 'body') {
        // Also update wing1 and wing2 relative volumes

        let wing1_vol = flyWingVolFromBody(order.product_id, trade.year, order.years[0], new_order_rvol);
        let wing1_trade = this.getTrade(order.years[0], order.order_id);
        wing1_trade.setRelativeVolume(order.order_id, !bid, wing1_vol);

        let wing2_vol = flyWingVolFromBody(order.product_id, trade.year, order.years[2], new_order_rvol);
        let wing2_trade = this.getTrade(order.years[2], order.order_id);
        wing2_trade.setRelativeVolume(order.order_id, !bid, wing2_vol);
      } else if (fly_leg === 'wing2') {
        // Also update wing1 and body relative volumes

        let wing1_vol = flyWingVolFromWing(order.product_id, trade.year, order.years[0], new_order_rvol);
        let wing1_trade = this.getTrade(order.years[0], order.order_id);
        wing1_trade.setRelativeVolume(order.order_id, bid, wing1_vol);

        let body_vol = flyBodyVolFromWing(order.product_id, trade.year, order.years[1], new_order_rvol);
        let body_trade = this.getTrade(order.years[1], order.order_id);
        body_trade.setRelativeVolume(order.order_id, !bid, body_vol);
      }
    }
  }

  // This function detects if a side in the trade contains an outright order.
  _ordersContainsOutrights(orders) {
    for (let order of orders) {
      if (order.isOutright()) {
        return true;
      }
    }
    return false;
  }


  // Recalculate trade volume of all trades resulting from order volume update
  // NOTE: Be careful when calling this function. If order volume has not yet been updated,
  // it will not update the volumes correctly.

  recalculateTradeVolumes() {
    // Reset relative volumes of all orders in all trades

    let orders, new_rvol, bid_at_year;
    for (let trade of this.trades) {
      orders = trade.getAllOrders();

      for (let order of orders) {
        bid_at_year = order.bidAtYear(trade.year);
        new_rvol = order.volumeAtYear(trade.year);
        trade.setRelativeVolume(order.order_id, bid_at_year, new_rvol);
      }
    }

    // Recalculate trade volume.Updating trade volumes must also recalculate brokerages and lots

    this._setVolumes();
    this._setBrokerages();
  }

  // Calculate the price of all trades in this.trades

  _setPrices() {
    // Attempt to set prices, handle error if 
    try {
      // First, find any outright/derived outright prices

      this._setOutrightPrices();

      // Then find prices of all trades

      this._setSpreadAndFlyPrices();
    } catch (err) {
      if (err.message === 'violated order price detected') {
        // trade prices violated order price
        // resolve the violated order and try
        // to calculate the prices again

        try {
          this._resolveViolatedOrder(err.violated_orders[0]);
          this._resetTradePrices();
          this._setPrices();
        } catch (err) {
          if (err.message === 'could not calculate price for trades') {
            console.log(err.message, this, 'violated order: ', err.order);
            throw (err);
          } else {
            console.log('encountered error when resolving order violation: ', err);
            throw (err);
          }
        }
      } else {
        console.log('_setPrices: encountered error:', err);
        throw (err);
      }
    }

    // Verify the prices on each ticket match order prices
    // NOTE It should be okay to remove this, since any invalid prices
    // are detected in _detectViolatedOrders() and handled in the above try.. catch
    // But kept in for now just as a final verification of the chosen prices
    //this._verifyPrices();
  }

  // Set trade.price to price of outright/derived outright

  _setOutrightPrices() {
    for (let trade of this.trades) {
      if (trade.price !== null) continue;

      let price = null;
      let orders = trade.offers.concat(trade.bids);

      // If offer or bid in trade is an outright,
      // price has been found

      for (let order of orders) {
        if (order.isOutright()) {
          price = order.price;
          break;
        }
      }

      // If price is not found, try to find a price from derived prices

      if (price === null) {
        let all_prices = prices.derivedFrom(orders);

        for (let prc of all_prices) {
          // if derived price contains order not involved in the trade, ignore

          if (!this._priceContainsAllOrders(prc, orders)) continue;

          if (Trades.yearsEqual(prc.years, [trade.year])) {
            // if year in price matches year in trade, set trade price

            price = prc.price;
          }
        }
      }

      // If price was found, set all trades at year to price
      // otherwise, price will be calculated later

      if (price !== null) {
        this._setTradePrice(trade, price);
      }
    }
  }

  // Return true if every order in prc is in orders, false otherwise

  _priceContainsAllOrders(prc, orders) {
    let order_ids = orders.map(el => el.order_id);
    for (let link of prc.links) {
      if (!order_ids.includes(link.order_id)) return false;
    }

    return true;
  }

  // Calculate the spread and fly prices
  // The order with the least unknowns in the price calculation is chosen first
  // if a price has been found, move onto the next trade

  _setSpreadAndFlyPrices() {
    // Get all orders involved in the trades

    let orders = this.getAllOrders();


    // Find the order with the least unknown variables and calculate missing prices
    // until all prices are found

    let all_prices_found = false;
    while (!all_prices_found) {
      let least_unknowns = this._findLeastUnknownOrder(orders);

      if (least_unknowns.count === Infinity) {
        all_prices_found = true;
        break;
      }

      let u_year = least_unknowns.years[0];
      let u_oid = least_unknowns.order.order_id;
      let u_trade = this.getTrade(u_year, u_oid);

      // If the least unknown order has exactly 1 unknown, calculate the unknown

      if (least_unknowns.count === 1) {
        let price;

        if (least_unknowns.order.isSpread()) {
          let unknown_leg = least_unknowns.order.spreadLeg(u_year);

          if (unknown_leg === 'short') {
            // Get long leg price and calculate short leg price

            let ll_price = this.getTrade(least_unknowns.order.years[1], u_oid).price;
            price = spreadShortLegPrice(least_unknowns.order.price, ll_price);
          } else if (unknown_leg === 'long') {
            // Get short leg price and calculate long leg price

            let sl_price = this.getTrade(least_unknowns.order.years[0], u_oid).price;
            price = spreadLongLegPrice(least_unknowns.order.price, sl_price);
          }
        } else if (least_unknowns.order.isButterfly()) {
          let unknown_leg = least_unknowns.order.butterflyLeg(u_year);

          if (unknown_leg === 'wing1') {
            // Get body and wing2 price and calculate wing1 price

            let b_price = this.getTrade(least_unknowns.order.years[1], u_oid).price;
            let w2_price = this.getTrade(least_unknowns.order.years[2], u_oid).price;
            price = flyWing1Price(least_unknowns.order.price, b_price, w2_price);
          } else if (unknown_leg === 'body') {
            // Get wing1 and wing2 price and calculate body price

            let w1_price = this.getTrade(least_unknowns.order.years[0], u_oid).price;
            let w2_price = this.getTrade(least_unknowns.order.years[2], u_oid).price;
            price = flyBodyPrice(least_unknowns.order.price, w1_price, w2_price);
          } else if (unknown_leg === 'wing2') {
            // Get wing1 and body price and calculate wing2 price

            let w1_price = this.getTrade(least_unknowns.order.years[0], u_oid).price;
            let b_price = this.getTrade(least_unknowns.order.years[1], u_oid).price;
            price = flyWing2Price(least_unknowns.order.price, w1_price, b_price);
          }
        }

        this._setTradePrice(u_trade, price);
      } else {
        // Otherwise, set one unknown price to mid at that year (take first unknown year for simplicity)

        let mid = quotes.mid(least_unknowns.order.product_id, [u_year]);
        this._setTradePrice(u_trade, mid);
      }
    }
  }

  // Return the order and unknown count 
  // of order with least number of unknown prices

  _findLeastUnknownOrder(orders) {
    let least_unknowns = {
      count: Infinity,
      years: [],
      order: null,
    };

    for (let order of orders) {
      let cur_unknowns = 0;
      let unknown_years = [];

      for (let year of order.years) {
        // If the year does not yet have a price, increment unknown counter
        // and add the unknown year to years

        let t_at_y = this.getTrade(year, order.order_id);
        if (t_at_y.price === null) {
          cur_unknowns++;
          unknown_years.push(year);
        }
      }

      // Only update least unknowns if current value is not 0

      if (cur_unknowns !== 0 && cur_unknowns < least_unknowns.count) {
        least_unknowns.count = cur_unknowns;
        least_unknowns.years = unknown_years;
        least_unknowns.order = order;
      }
    }

    return least_unknowns;
  }

  // Set the price of a trade to the given price
  // Check all order prices are not violated

  _setTradePrice(trade, price) {
    trade.price = roundToNearest(price, 10000000);

    // Verify all trade prices are valid for all orders

    let violated_orders = this._detectViolatedOrders();
    if (violated_orders.length > 0) {
      let err = new Error('violated order price detected');
      err.violated_orders = violated_orders;
      throw err;
    }
  }

  // Reset all trade prices to null

  _resetTradePrices() {
    for (let trade of this.trades) {
      trade.price = null;
    }
  }

  // Return a list of the orders in the Trades with invalid prices

  _detectViolatedOrders() {
    // Get a list of all orders in this trades

    let orders = this.getAllOrders();
    let violated_orders = [];
    for (let order of orders) {
      if (order.isOutright()) {
        // Detect violated outright order

        let t = this.getTrade(order.years[0], order.order_id);

        if (!t.price) continue;

        if (t.price && round(t.price, 8) !== round(order.price, 8)) {
          if (this.trades.length > 1 && !this.trades.some(trade => trade.offers.length > 1 || trade.bids.length > 1)){
            let equal = true;
            if (this.trades.length == 2){
              let bid = this.trades[0].offers[0].price-this.trades[1].bids[0].price;
              let offer = -this.trades[1].offers[0].price+this.trades[0].bids[0].price;
              if (offer !== bid){
                equal = false;
              }
            }else if (this.trades.length == 3){
              let bid = this.trades[0].offers[0].price - 2*this.trades[1].bids[0].price + this.trades[2].offers[0].price;
              let offer = this.trades[0].bids[0].price - 2*this.trades[1].offers[0].price + this.trades[2].bids[0].price;
              if (offer !== bid){
                equal = false;
              }
            }
            if (!equal){
              violated_orders.push(order);
            }else{
              t.price = roundToNearest((t.offers[0].price+t.bids[0].price)/2, 10000000);
            }
          }else if(this.trades.length > 1){
            
            if (!this.checkViolatedSpread){
              violated_orders.push(order);
            }else{
              return violated_orders;
            }
          }else{
            violated_orders.push(order);
          }
        }

      } else if (order.isSpread()) {
        // Detect violated spread order

        let short_t = this.getTrade(order.years[0], order.order_id);
        let long_t = this.getTrade(order.years[1], order.order_id);

        if (!short_t.price || !long_t.price) continue;

        let price_t = spreadPrice(long_t.price, short_t.price);
        if (round(price_t, 8) !== round(order.price, 8)) {
          if (!this.checkViolatedSpread){
            violated_orders.push(order);
          }else{
            return violated_orders;
          }
        }
      } else if (order.isButterfly()) {
        // Detect violated butterfly order

        let wing1_t = this.getTrade(order.years[0], order.order_id);
        let body_t = this.getTrade(order.years[1], order.order_id);
        let wing2_t = this.getTrade(order.years[2], order.order_id);

        if (!wing1_t.price || !body_t.price || !wing2_t.price) continue;

        let price_t = flyPrice(body_t.price, wing1_t.price, wing2_t.price);
        if (round(price_t, 8) !== round(order.price, 8)) {
          violated_orders.push(order);
        }
      }
    }

    return violated_orders;
  }

  checkViolatedSpread(){
    var added = [];
    var bid = 0;
    var offer = 0;
    var bYears = [];
    var oYears = [];
    var tf = true;
    var bFactor = 1;
    var oFactor = 1;
    for (let t of this.trades){
      for (let o of t.getAllOrders()){
        if (!added.includes(o.order_id)){
          if (tf == o.bid){
            for (let year of o.years){
              if (!bYears.includes(year)){
                bYears.push(year);
              }
            }
            added.push(o.order_id);
          }else{
            for (let year of o.years){
              if (!oYears.includes(year)){
                oYears.push(year);
              }
            }
            added.push(o.order_id);
          }
        }
      }
      tf = !tf;
    }
    added = [];
    tf = true;
    for (let t of this.trades){
      for (let o of t.getAllOrders()){
        if (!added.includes(o.order_id)){
          if (tf == o.bid){
            bid += bFactor*o.price;
          }else{
            offer += oFactor*o.price;
          }
        }
        added.push(o.order_id);
      }
      if (oFactor == 1 && oYears.length == 3){
        oFactor = -2;
      }else if (oFactor == -2){
        oFactor = 1;
      }else{
        oFactor = -oFactor;
      }
      if (bFactor == 1 && bYears.length == 3){
        bFactor = -2;
      }else if (bFactor == -2){
        bFactor = 1;
      }else{
        bFactor = -bFactor;
      }
      tf = !tf;
    }
    return bid == offer;
  }

  // Resolve case where order price is not valid for calculated trade price

  _resolveViolatedOrder(order) {
    let trade_to_split;
    // Ensure there is a leg the order is on that contains 
    // more than 1 offers and bids

    trade_to_split = null;

    let trade;
    for (let year of order.years) {
      trade = this.getTrade(year, order.order_id);
      if (trade.offers.length > 1 && trade.bids.length > 1) {
        trade_to_split = trade;
        break;
      }
    }

    // If no trades have more than one offer and bid, cannot calculate price of this trades

    if (trade_to_split === null) {
      let err = new Error('could not calculate price for trades');
      err.order = order;
      throw err;
    }

    // Split the chosen trade into a new trade and insert the order

    let year = trade_to_split.year;
    let fwd = trade_to_split.fwd;
    let bid_at_year = order.bidAtYear(trade_to_split.year);

    let new_trade = new Trade(year, fwd);
    new_trade.insertOrder(order, bid_at_year);
    this._insertTrade(new_trade);

    // Remove the order from the existing trade

    trade_to_split.removeOrder(order.order_id);

    // Select a counterparty to move to this new trade

    let cptys = trade_to_split.getOrders(!bid_at_year);
    let chosen_cpty = null;

    // If no counterparty in list of invalid orders, 
    // use a counterparty with a trade price that has not been set yet

    if (!chosen_cpty) {
      for (let cpty of cptys) {
        let t;
        for (let year of cpty.years) {
          if (year === trade_to_split.year) continue;

          // Get the trade at year
          t = this.getTrade(year, cpty.order_id);

          if (t.price === null) {
            chosen_cpty = cpty;
            break;
          }
        }

        if (chosen_cpty) break;
      }
    }

    if (!chosen_cpty) {
      throw new Error('_resolveInvalidOrders: could not choose a counterparty to add to new trade in price calculation');
    }

    // Remove the chosen counterparty from the old trade and into the new

    trade_to_split.removeOrder(chosen_cpty.order_id);
    new_trade.insertOrder(chosen_cpty, !bid_at_year);
  }

  // Ensure that all trade prices are correct and match
  // up with order prices

  _verifyPrices() {
    // first, get a list of all order years and prices in trades

    let orders = this.getAllOrders();

    // for every price in all_prices, ensure that prices are correct

    for (let order of orders) {
      // different calculations for outrights, spreads, flys

      if (order.isOutright()) {
        // throw error if trade price at year 0 not equal to order price

        let t = this.getTrade(order.years[0], order.order_id);
        if (round(t.price, 8) !== round(order.price, 8)) {
          throw new Error(
            `Invalid trade price for order with year ${order.years}.
            Trade price is ${t.price}. Order price is ${order.price}`
          );
        }
      } else if (order.isSpread()) {
        // throw error if trade price with spread calc not equal to order price

        let short_t = this.getTrade(order.years[0], order.order_id);
        let long_t = this.getTrade(order.years[1], order.order_id);

        let price_t = spreadPrice(long_t.price, short_t.price);

        if (round(price_t, 8) !== round(order.price, 8)) {
          throw new Error(
            `Invalid trade price for order with years ${order.years}
            Trade price is ${price_t}. Order price is ${order.price}`
          );
        }
      } else if (order.isButterfly()) {
        // throw error if trade price fly calc not equal to order price

        let wing1_t = this.getTrade(order.years[0], order.order_id);
        let body_t = this.getTrade(order.years[1], order.order_id);
        let wing2_t = this.getTrade(order.years[2], order.order_id);

        let price_t = flyPrice(body_t.price, wing1_t.price, wing2_t.price);

        if (round(price_t, 8) !== round(order.price, 8)) {
          throw new Error(
            `Invalid trade price for order with years ${order.years}
            Trade price is ${price_t}. Order price is ${order.price}`
          );
        }
      }
    }
  }

  // Calculate the Brokerages of all Trades in this.trades

  _setBrokerages() {
    for (let trade of this.trades) {
      // Set offers' and bids' brokerage

      let offer_rvol, offer_bro, offer_bid_at_year;
      for (let offer of trade.offers) {
        if (trade.hasBrokerage(offer)) {
          offer_bid_at_year = offer.bidAtYear(trade.year);
          offer_rvol = trade.getRelativeOrderVolume(offer.order_id, offer_bid_at_year);
          offer_rvol = toVolume(offer_rvol); // Format to match what volume is displayed on the trade
          offer_bro = getBrokerage(offer, offer_rvol);
          trade.setBrokerage(offer.order_id, offer_bro, false);
        }
      }

      let bid_rvol, bid_bro, bid_bid_at_year;
      for (let bid of trade.bids) {
        if (trade.hasBrokerage(bid)) {
          bid_bid_at_year = bid.bidAtYear(trade.year);
          bid_rvol = trade.getRelativeOrderVolume(bid.order_id, bid_bid_at_year);
          bid_rvol = toVolume(bid_rvol); // Format to match what volume is displayed on the trade
          bid_bro = getBrokerage(bid, bid_rvol);
          trade.setBrokerage(bid.order_id, bid_bro, true);
        }
      }
    }
  }

  // Set the timestamp using the most recently made order

  _setTimestamp() {
    let orders = this.getAllOrders();

    let most_recent_time = new Date(orders[0].time_placed);
    let date;
    for (let order of orders) {
      date = new Date(order.time_placed);
      if (date.getTime() > most_recent_time.getTime())
        most_recent_time = date;
    }

    this.timestamp = most_recent_time;
  }

  // Round all volumes to nearest 0.5

  _roundVolumes() {
    for (let trade of this.trades) {
      trade.volume = roundToNearest(trade.volume, 1);
    }
  }

  // Return index of trades with matching year

  indexOf(year) {
    for (let idx = 0; idx < this.trades.length; idx++) {
      if (this.trades[idx].year === year) {
        return idx;
      }
    }

    return -1;
  }

  // Return all trades with matching year and containing order_id

  getTrade(year, order_id) {
    for (let trade of this.trades) {
      if (trade.year === year && trade.containsOrder(order_id)) return trade;
    }

    return null;
  }

  // Return time this trades object was created

  getTimestamp() {
    return this.timestamp.getTime();
  }

  // return true if two years arrays are equal,
  // false otherwise

  static yearsEqual(years1, years2) {
    if (years1.length !== years2.length) return false;

    for (let i = 0; i < years1.length; i++) {
      if (years1[i] !== years2[i]) return false;
    }

    return true;
  }

  // Return a list of all distinct orders involved in this trades object

  getAllOrders() {
    let orders = [];
    for (let trade of this.trades) {
      for (let offer of trade.offers) {
        if (!orders.includes(offer)) orders.push(offer);
      }

      for (let bid of trade.bids) {
        if (!orders.includes(bid)) orders.push(bid);
      }
    }

    return orders;
  }

}

export default Trades;
