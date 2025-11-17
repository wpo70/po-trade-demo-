'use strict';

// Quotes have a fixed structure and array size.  Values may change regularly
// and may be overridden by the brokers.

// The quote data for mids, dv01s, etc. is an object of arrays.  The arrays are
// index by product_id.  They have to be sorted by year.  There is one array of
// quotes for each product.

import { writable, get } from 'svelte/store';
import { getRbaRuns } from '../common/rba_handler';
import { isTenor, roundToNearest, roundUpToNearest, tenorToYear } from '../common/formatting';
import products from './products';
import prices from './prices';
import data_collection_settings from './data_collection_settings';
import { getFWDDV01, getOISMid } from '../common/pricing_models';

const quotes = (function () {
  const { subscribe, set, update } = writable([]);
  
  let prev = {};

  let rba_dates = {};

  const my_set = function (db_data) {
    // This function is called with an Array of quote objects on initialisation.  They have to
    // be grouped by product_id and sorted by year.

    var store = {};

    for (let data of db_data) {
      // Get the array for this product_id
     
      prev[data.quote_id] = {};

      const product_id = data.product_id;
      if (!store.hasOwnProperty(product_id)) {
        store[product_id] = [];
      }
      const the_quotes = store[product_id];

      // Add the quote to the array.

      the_quotes.push(data);
    }

    // Sort the indicators.

    for (let product_id in store) {
      store[product_id].sort((a, b) => a.year - b.year);
    }

    // Set the store with the new data.
    set.call(this, store);
  };

  const updateFWDMids = function (data) {
    update(store => {
      for (let key of Object.keys(data)) {
        if (data[parseInt(key)] == null) continue;
        for (let quote of data[parseInt(key)]) {
          let q = store[parseInt(key)].find(q => q.year === quote.year);
          q.fwd_mids = quote.fwd_mids;
        }
      }
      return store;
    });
    prices.recalculateMids(products.getFwdProducts());
  } 

  const refresh = function (blp_quotes) {
    // This function is called with an Array of quote objects for a single
    // product, on user request.
    update(store => {

      for (let quote of blp_quotes) {
        if (!quote) continue;
        // Get the quote for the product and year.
        let q = store[quote.product_id].find(q => q.year === quote.year);

        prev[q.quote_id] = JSON.parse(JSON.stringify(q));

        if (typeof q === 'undefined') throw new Error(`Database does not have a quote for product ${quote.product_id} and year ${quote.year} and currency ${quote.currency_code}`);

        // Replace the quote's mid, dv01 and override with the values from the server.
        q.mid = quote.mid;
        q.dv01 = quote.dv01;
        if (quote.override != undefined) q.override = quote.override;
        if (quote.yesterday_close != null) q.yesterday_close = quote.yesterday_close;
        q.mid_is_stale = quote.mid_is_stale;
        q.dv01_is_stale = quote.dv01_is_stale;
      }

      return store;
    });
  };

  // Get the quote object for the given product_id, currency_code and year.

  const getQuote = function (product_id, year) {
    let store = get(quotes);
    let the_quotes = store[products.nonFwd(product_id)];
    if (typeof the_quotes === 'undefined') throw new Error('Could not get quote for product_id ' + product_id);

    let q; 
    try {
      q = the_quotes.find(q => q.year.toFixed(5) === year.toFixed(5));
    } catch (error) {
      // console.log(error);
    }
    try {
      if (typeof q === 'undefined') throw new Error('Could not get quote for year ' + year + ' of product_id ' + product_id);
    } catch (error) {
      // console.log(error);
    }
    return q;
  };

  // Fundamentally the same as getQuote, but returns a bool and has no console.logs to display to the end user

  const isQuotedTenor = function (product_id, year) {
    if (!year) return false;
    if (typeof year == "string") {
      if (!isTenor(year)) { console.warn("isQuotedTenor was called with a non-tenor string"); return false; }
      year = tenorToYear(year)[0];
    }
    const quo = get(quotes)[products.nonFwd(product_id)];
    if (!quo) return false;
    return quo.some(q => q.year.toFixed(5) === year.toFixed(5));
  };

  // Set the override field in the given quotes.

  const override = function (overrides) {
    // Update the quotes with the new overrides

    update(store => {
      for (let ovr of overrides) {
        // Get the quote for the product and year.
        let q = store[ovr.product_id].find(q => q.year === ovr.year);
        if (typeof q === 'undefined') throw new Error(`Could not override quote for product ${ovr.product_i} and year ${ovr.year} and currency ${ovr.currency}`);

        // Replace the quote's override with the value from the server.
        q.override = ovr.override;
      }
      return store;
    });
  };

  const mid = function (product_id, years) {
    // Get the mid point for the given years:Array.  Outright mid points are stored in
    // QUOTES.  Spread and butterfly mid points are calculated from them.

    // This function gets the mid point from a quote allowing that it may be
    // overridden.
  
    const ovmid = function (q) {
      if (get(data_collection_settings).calcOIS && (product_id == 20 || product_id == 3) && (q.year < 2 || q.year > 1000)) {
        return (q.override === null) ? getOISMid(q.year) : q.override;
      } else {
        return (q.override === null) ? q.mid : q.override;
      }
    };

    let qq = years.map(year => { return getQuote(product_id, year); });
    switch (qq.length) {
      case 1:
        return ovmid(qq[0]);
      case 2:
        return ovmid(qq[1]) - ovmid(qq[0]);
      case 3:
        return 2 * ovmid(qq[1]) - ovmid(qq[0]) - ovmid(qq[2]);
      default:
        throw new Error('Argument years does not have 1, 2 or 3 elements: "' + years + '"');
    }
  };

  // Return the DV01 for the given year.

  const dv01 = function (product_id, year, fwd) {
    let dv01;
    if (product_id == 20 && dv01 == 1 && year > 1000) {
      let rbas = getRbaRuns();
      let thisMonthDayCount = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      let tenorDayCount = rbas[year - 1001][4];
      if (tenorDayCount < 45) {
        dv01 = quotes._get_dv01(3, tenorToYear("1m"));
      } else {
        thisMonthDayCount += new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).getDate();
        dv01 = quotes._get_dv01(3, tenorToYear("2m"));
      }
      dv01 = dv01*tenorDayCount/thisMonthDayCount;
    } else if (products.isFwd(product_id)) {
      if (get(data_collection_settings).gateways.length > 0) {
        dv01 = getFWDDV01(year, fwd);
      } else {
        dv01 = getQuote(products.nonFwd(product_id), year).dv01;
      }
    } else {
      dv01 = getQuote(product_id, year).dv01;
    }
    return dv01;
  };

  // Return the minimum market parcel for the given tenor.

  const mmp = function (product_id, years, fwd = null) {
    // Years may be the years array from an order or price and it may be a
    // scalar.  Outright volumes are at years[0], spread and butterfly volumes
    // are at years[1].

    // The minimum market parcel of a butterfly is double that of an outright or
    // spread.

    let y, s;

    if (Array.isArray(years)) {
      y = (years.length === 1) ? years[0] : years[1];
      s = (years.length === 3) ? 2 : 1;
    } else {
      y = years;
      s = 1;
    }

    // MMP is 25 ($M) at a dv01 of 10, by convention, for product IRS, EFP, OIS, 3v1, BOB, XCCY
    // MMP is 40 ($M) at a dv01 of 10, by convention, for product 6v3
    // MMP is 500 ($M), by 3M, for product SPS3M
    // MMP is 200 ($M), by 6M, for product SPS6M
    if (product_id == 18) {
      // 3M
      if (y == 0.25) return 500;
      // 6M
      if (y == 0.5) return 200;
    } else if (product_id == 17 || product_id == 27) {
      return 500;
    }

    let dv01;
    try {
      dv01 = this.dv01(product_id, y, fwd);
    } catch (error) {
      // console.log(error);
    }
    if (product_id === 5) {
      return roundUpToNearest((s * 40 * 10 / dv01), 2);
    } else { 
      return roundUpToNearest((s * 25 * 10 / dv01), 2);
    }
  };

  const _get_dv01 = function (product_id, years) {
    let y;
    if (Array.isArray(years)) {
      y = (years.length === 1) ? years[0] : years[1];
    } else {
      y = years;
    }
    return getQuote(product_id, y).dv01;
  };

  const getDV01FromVol = function (product_id, years, vol, fwd = null) {
    let year;
    let dv01;

    if (years.length > 1) {
      year = years[1];
    } else {
      year = years[0];
    }

    if (products.isStir(product_id)) {
      return vol/quotes.mmp(product_id, years, fwd);
    }
    
    // MMP is 25 ($M) at a dv01 of 10, by convention, for product IRS, EFP, OIS, 3v1, BOB, XCCY
    // MMP is 40 ($M) at a dv01 of 10, by convention, for product 6v3
    dv01 = quotes.dv01(product_id, year, fwd);
    return (dv01 * vol) / 10;
  };

  const volumeAt = function (product_id, at_year, volume, year) {
    // Return the volume at at_year that is equivalent to the given volume at the
    // given year.

    const dv01 = this.dv01(product_id, year);
    const at_dv01 = this.dv01(product_id, at_year);
    return roundUpToNearest(volume * dv01 / at_dv01, 2);
  };

  const minimumVolume = function (product_id, vola, yeara, volb, yearb) {
    // Return the minimum of the two volumes, vola and volb, after referring a to
    // the year of b.

    // Convert volume a to year b
    let a = this.volumeAt(product_id, yearb, vola, yeara);

    // Which is the minimum.
    return (a < volb) ? a : volb;
  };

  const getPrevQuote = (quote_id) => {
    // gets the previous quote for a given product_id and year
    
    return prev[quote_id];
  };

  const setRbaDates = (rba_data) => {
    rba_dates = rba_data;
  } 
  const getRbaDates = () => {
    return rba_dates;
  }

  return {
    subscribe,
    set: my_set,
    refresh,
    get: getQuote,
    override,
    mid,
    dv01,
    mmp,
    volumeAt,
    minimumVolume,
    getPrevQuote,
    _get_dv01,
    getDV01FromVol,
    isQuotedTenor,
    updateFWDMids,
    setRbaDates,
    getRbaDates
  };
}());

export default quotes;