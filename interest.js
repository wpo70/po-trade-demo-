'use strict';

import quotes from '../stores/quotes.js';
import active_product from '../stores/active_product.js';
import { roundUpToNearest } from '../common/formatting.js';
import { addDays, addMonths, toTenor } from '../common/formatting.js';
import { calc3mSps, calc6mSps, getFwdMid } from './pricing_models.js';
import prices from '../stores/prices.js';
import products from '../stores/products.js';
import { get } from 'svelte/store';

class Interest {

  // Prices that are close to the mid point are defined as good.  This defines close.

  static close = 0.105;

  // An order can be constructed from an object that has come from the server vis JSON.

  constructor(rxo) {
    Object.assign(this, rxo);
    /* 
    Generally the structure of an order or interest is as follows:
      order_id
      product_id
      trader_id
      broker_id
      firm
      bid
      years
      currency_code
      time_placed
      time_clsoed --> this should be null for any interest, order, or price
      volume --> this should be null for any interest object
      price --> this may or may not be null for any interest object
      start_date
      fwd
      muted
    */
    this.check();
  }

  check () {
    var n;
    
    if(!this.eoi){
      // Volumes must be positive.
      if (this.volume != null && this.volume <= 0) {
        throw new Error(`Order volume must be positive.`);
      }
    }

    // There must be between 1 and 3 years in increasing order.
    n = this.years.length;
    if (!Array.isArray(this.years) || n === 0 || n >= 2 && this.years[0] >= this.years[1] 
        || n === 3 && this.years[1] >= this.years[2] || n > 3) {
      if (this.spread_expiry_date <= this.expiry_date) {
        throw new Error('There must be an array of one to three years in increasing order');
      }
    }

    // Make sure years match the configured indicators.  Get a quote for each year
    // to test that it is valid.
    if (this.product_id == 17 || this.product_id == 18 || this.product_id == 27 || this.product_id == 20 || (this.product_id == 3 && get(active_product) == 20)) return;
    for (let y of this.years) {
      quotes.get(this.product_id, y);
    }
  }

  isBelowMMP () {
    // Return true if the order volume is below minimum market parcel.  
    // Get the minimum market parcel, which is always at the last year.

    let mmp = roundUpToNearest(quotes.mmp(this.product_id, this.years, this?.fwd), 2);
    return (roundUpToNearest(this.volume, 2) < mmp);
  }

  isOutright () {
    return (this.years.length === 1);
  }

  isSpread () {
    return (this.years.length === 2);
  }

  isButterfly () {
    return (this.years.length === 3);
  }

  hasSameTenor (o) {
    // Return true if the given order has the same tenor as this order.
  
    const n = this.years.length;
    if (n !== o.years.length) return false;
  
    for (let i = 0; i < n; i++) {
      if (this.years[i] !== o.years[i]) return false;
    }
  
    return true;
  }

  shape () {
    // Return a string specifying the shape of the order.

    switch (this.years.length) {
      case 1:
        return 'outright';
      case 2:
        return 'spread';
      case 3:
        return 'butterfly';
      default:
        throw Error('Could not convert years to shape ' + this.years.toString());
    }
  }

  isExpired() {
    // Scan IRS SPS if the order with the specific start date is before Tommorow
    let now = new Date();
    let spot = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (!this.fwd && (this.product_id === 17 || this.product_id === 18 || this.product_id === 20 || this.product_id == 27) && this.start_date !== null) {
      let start_date = new Date(this.start_date);
      if (start_date.getTime() < spot.getTime()) {
        return true;  
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  priceIsGood (mid_point) {
    // Return true if the price is close to the mid point.  The mid_point
    // argument is optional.

    if (typeof mid_point === 'undefined') {
      if (this.product_id == 17) {
        
        let monthSymbols = {2: "H", 5: "M", 8: "U", 11: "Z"};
        let months = {2: "Mar", 5: "Jun", 8: "Sep", 11: "Dec"};
        let date = new Date(this.start_date);
        let tenor = "IR" + monthSymbols[date.getMonth()] + date.getFullYear().toString()[3] + " " + months[date.getMonth()];

        let p17 = get(prices)[17];
        for (let p of p17[0]) {
          if (p.tenor == tenor) mid_point = quotes.mid(this.product_id, p.years);
        }
      } else if (this.product_id == 27) {
        
        let monthSymbols = {2: "H", 5: "M", 8: "U", 11: "Z"};
        let months = {2: "Mar", 5: "Jun", 8: "Sep", 11: "Dec"};
        let date = new Date(this.start_date);
        let tenor = "IR" + monthSymbols[date.getMonth()] + date.getFullYear().toString()[3] + " " + months[date.getMonth()];

        let p27 = get(prices)[27];
        for (let p of p27[0]) {
          if (p.tenor == tenor) mid_point = quotes.mid(this.product_id, p.years);
        }
      } else if (this.product_id == 18) {
        

        let fwdtenor;
        let now = new Date();
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let days;

        if (this.fwd != null){
          fwdtenor = this.fwd*12;
          let todayMonth = today.getMonth();
          let spot = (products.isXccy(this.product_id) || products.isNZD(this.product) || products.isUSD(this.product)) ? addDays(addDays(today, 1,this.product_id), 1,this.product_id) : addDays(today, 1);
          let tommorrowMonth = spot.getMonth();
          if (todayMonth != tommorrowMonth) spot = addMonths(spot, fwdtenor-1);
          else spot = addMonths(spot, fwdtenor);
          days = Math.round(new Date((spot.getMonth() + 1) + "-" + spot.getDate() + "-" + (spot.getFullYear() - 2000)).getTime() - today.getTime()) / (1000*60*60*24);
        } else {
          let spot = new Date(this.start_date);
          days = Math.round(new Date((spot.getMonth() + 1) + "-" + spot.getDate() + "-" + (spot.getFullYear() - 2000)).getTime() - today.getTime()) / (1000*60*60*24);
        }
        if (this.years[0] == 0.25) mid_point = calc3mSps(days);
        else mid_point = calc6mSps(days);
      } else if (products.isFwd(this.product_id)) {
        let fwdtenor = toTenor([this.fwd]);
        let term = toTenor(this.years);
        let tenor = fwdtenor + "" + term;
        mid_point = getFwdMid(this.product_id, tenor);
      } else {
        mid_point = quotes.mid(this.product_id, this.years);
      }
    }

    return (this.bid) ?
      (this.price >= mid_point - Interest.close) :
      (this.price <= mid_point + Interest.close);
  }

}

export default Interest;
