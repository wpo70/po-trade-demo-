'use strict';

import ticker from '../stores/ticker.js';
import bic from '../stores/bic';
import trades from '../stores/trades.js';
import { toTenor } from './formatting.js';
import { getRbaRuns } from './rba_handler.js';
import banks from '../stores/banks.js';
import bank_divisions from '../stores/bank_divisions.js';
import { calcLots } from './calculations.js';
import products from '../stores/products.js';
import traders from '../stores/traders.js';
import brokers from '../stores/brokers.js';

class Ticket {
  constructor(trade, offer, bid, volume, timestamp, start_date) {
    this.product_id = offer.product_id,
    this.offer = offer;
    this.bid = bid;
    this.year = trade.year;
    this.fwd = trade.fwd;
    this.price = trade.price;
    this.volume = volume;
    this.start_date = offer.product_id != 20 ? start_date : new Date(getRbaRuns()[this.year - 1001][0]);
    this.lots = offer.product_id === 2 || offer.product_id === 17 ? calcLots(volume, this.product_id, this.year) : null;
    this.fut_strike = this.getFutures();
    this.offer_brokerage = trade.getBrokerage(offer.order_id, false);
    this.bid_brokerage = trade.getBrokerage(bid.order_id, true);
    this.currency = trade.currency;
    this.timestamp = new Date(timestamp).toISOString();
    this.offer_bank_division_id = trade.getBankDivision(offer.order_id);
    this.bid_bank_division_id = trade.getBankDivision(bid.order_id);
    this._convertSubdivision();
    this.sef = trade.sef ? true : false; // Seems Pointless but prevents it from being submitted at undefined or null
    this.rtb_handler();
    this.defaultBicCodes();
    this.clearhouse = trade.clearhouse;
    if (products.isFuturesProd(this.product_id)) {
      this.offer_fut_acc = traders.get(offer.trader_id).futures_account;
      this.bid_fut_acc = traders.get(bid.trader_id).futures_account;
      this.vconSender = brokers.getDefaultVCONAccount();
    }
    // Trade_id_ov as Broker ID (markitwire) may not be longer than SWB_DEAL_ID_MAXLEN = 40
    // Format 'TRADE{random 0-100}-{Date time}-{ID of the next Trades Table}-{Tenor value}
    this.trade_id_ov = `TRADE${Math.floor(Math.random() * 1000)}-${new Date().getTime()}-${trades.getTradeIdMax() + 1}-${parseFloat(trade.year).toFixed(2)}`;
  }  

  getFutures() {
    let fut_strike;
    if (this.product_id == 17) fut_strike = ticker.getEFPStrike(new Date(this.start_date)).ask;
    else if (this.product_id == 2) fut_strike = this.year <= 5 ? ticker.getYMA().ask : ticker.getXMA().ask;
    else if (this.product_id == 28 ) fut_strike = (ticker.getUSD_fut_strike(this.year) || ticker.getUSD_fut_strike(this.year)?.ask == 0 ) ? ticker.getUSD_fut_strike(this.year).ask : null //USD SOFR SPREAD, 
    else fut_strike = null;
    return fut_strike;
  }
  
  rtb_handler() {    
    let rtb_bid_default;
    let rtb_offer_default;
    let bid_bank = banks.get(bank_divisions.get(this.bid_bank_division_id)?.bank_id);
    let offer_bank = banks.get(bank_divisions.get(this.offer_bank_division_id)?.bank_id);
    if (bid_bank?.rtb_products?.includes?.(this.product_id) && bid_bank?.right_to_break[0] <= this.year) rtb_bid_default = bid_bank?.right_to_break;
    if (offer_bank?.rtb_products?.includes?.(this.product_id) && offer_bank?.right_to_break[0] <= this.year) rtb_offer_default = offer_bank?.right_to_break;
    if(rtb_bid_default && rtb_offer_default){
      this.breaks = toTenor(rtb_bid_default[0] <= rtb_offer_default[0] ? rtb_bid_default[0] : rtb_offer_default[0]).toUpperCase();
      this.thereafter = toTenor(rtb_bid_default[1] <= rtb_offer_default[1] ? rtb_bid_default[1] : rtb_offer_default[1]).toUpperCase();
    }else if (rtb_bid_default){
      this.breaks = toTenor(rtb_bid_default[0]).toUpperCase();
      this.thereafter = toTenor(rtb_bid_default[1]).toUpperCase();
    }else if (rtb_offer_default){
      this.breaks = toTenor(rtb_offer_default[0]).toUpperCase();
      this.thereafter = toTenor(rtb_offer_default[1]).toUpperCase();
    }else{
      this.breaks = "";
      this.thereafter = "";
    }
  }

  defaultBicCodes() {
    const bicPair = bic.getMatchingBic(this.offer.trader_id, this.bid.trader_id, this.product_id);
    this.bic_bid = bicPair.bic_bid;
    this.bic_offer = bicPair.bic_offer;
  }

  // Sort out Subdivision for NOM
  _convertSubdivision () {
    let offer = this.offer_bank_division_id;
    let bid = this.bid_bank_division_id;
    if (offer === 3){
      if (bid === 1 || bid === 6) {
        this.offer_bank_division_id = 4;
      }
    }
    if (bid === 3){
      if (offer === 1 || offer === 6) {
        this.bid_bank_division_id = 4;
      }
    }
  }


}

export default Ticket;
