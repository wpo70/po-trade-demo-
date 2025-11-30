'use strict';

import { writable, get } from 'svelte/store';
import { addMonths, round } from '../common/formatting';
import { refreshData } from '../common/pricing_models';

const ticker = (function () {
  
const { subscribe, set } = writable({
xma: { bid: 95.4975, ask: 95.5025, mid: 95.50, fut_px_val_bp: 0.0445, last: 95.50 },
yma: { bid: 96.0475, ask: 96.0525, mid: 96.05, fut_px_val_bp: 0.0270, last: 96.05 },
    abfs: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 },
    abfs: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // AUD: 3x10 spread 

    ct2: {  bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT2 Govt
    ct3: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT3 Govt
    ct4: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT4 Govt
    ct5: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT5 Govt
    ct6: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT6 Govt
    ct7: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT7 Govt
    ct8: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT8 Govt
    ct9: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT9 Govt
    ct10: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT10 Govt
    ct12: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT12 Govt
    ct15: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT15 Govt
    ct20: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT20 Govt
    ct25: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT25 Govt
    ct30: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: CT30 Govt

    bf: { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 }, // USD: BF051030 Index - 5x10x30 Bond Fly 

    ir1: { last: 96.32, mid: 96.32, ask: 96.32 },
    ir2: { last: 96.31, mid: 96.31, ask: 96.31 },
    ir3: { last: 96.28, mid: 96.28, ask: 96.28 },
    ir4: { last: 96.20, mid: 96.20, ask: 96.20 },
    ir5: { last: 96.20, mid: 96.20, ask: 96.20 },
    ir6: { last: 96.15, mid: 96.15, ask: 96.15 },
    ir7: { last: 96.11, mid: 96.11, ask: 96.11 },
    ir8: { last: 96.07, mid: 96.07, ask: 96.07 },
    ir9: { last: 96.39, mid: 96.39, ask: 96.39 },
    ir10: { last: 96.40, mid: 96.40, ask: 96.40 },
    ir11: { last: 96.42, mid: 96.42, ask: 96.42 },
    ir12: { last: 96.44, mid: 96.44, ask: 96.44 },

    ib1: { last: 0, mid: 0, ask: 0 },
    ib2: { last: 0, mid: 0, ask: 0 },
    ib3: { last: 0, mid: 0, ask: 0 },
    ib4: { last: 0, mid: 0, ask: 0 },
    ib5: { last: 0, mid: 0, ask: 0 },
    ib6: { last: 0, mid: 0, ask: 0 },
    ib7: { last: 0, mid: 0, ask: 0 },
    ib8: { last: 0, mid: 0, ask: 0 },
    ib9: { last: 0, mid: 0, ask: 0 },
    ib10: { last: 0, mid: 0, ask: 0 },
    ib11: { last: 0, mid: 0, ask: 0 },
    ib12: { last: 0, mid: 0, ask: 0 },
    ib13: { last: 0, mid: 0, ask: 0 },
    ib14: { last: 0, mid: 0, ask: 0 },
    ib15: { last: 0, mid: 0, ask: 0 },
    ib16: { last: 0, mid: 0, ask: 0 },
    ib17: { last: 0, mid: 0, ask: 0 },
    ib18: { last: 0, mid: 0, ask: 0 },
    
    '1m': { last: 3.5521, mid: 3.5521, ask: 3.5521 },
    '2m': { last: 3.6091, mid: 3.6091, ask: 3.6091 },
    '3m': { last: 3.6678, mid: 3.6678, ask: 3.6678 },
    '4m': { last: 3.7575, mid: 3.7575, ask: 3.7575 },
    '5m': { last: 3.8675, mid: 3.8675, ask: 3.8675 },
    '6m': { last: 3.9645, mid: 3.9645, ask: 3.9645 },
    
    rbacor: { last: 0 },
  });

  const my_set = function (security_data) {
    let store = get(ticker);

    let needsRefresh = false;

    for (let [key, values] of Object.entries(security_data)){
      if (!!values.ask && !!values.bid) {
        values.mid = (values.ask + values.bid) / 2;
        if (values.mid == store[key].mid) continue;
      }
      if (key != "xma" && key != "yma") needsRefresh = true;
      for (let [key2, val] of Object.entries(values)) {
        if (typeof val == "number") {
          values[key2] = round(val, 7);
        }
      }
      store[key] = values;
    }
    set.call(this, store);
    
    if (needsRefresh) refreshData();
  };

  const getYMA = function () {
    let store = get(ticker);
    return store.yma;
  };

  const getXMA = function () {
    let store = get(ticker);
    return store.xma;
  };

  const getABFS = function () {
    let store = get(ticker);
    return store.abfs;
  };

  const getBBSW = function () {
    let store = get(ticker);
    return [store['1m'], store['2m'], store['3m'], store['4m'], store['5m'], store['6m']];
  };

  const getRBACOR = function () {
    let store = get(ticker);
    return store.rbacor;
  };

  const get90dFutures = function () {
    let store = get(ticker);
    let futures_90d = [store.ir1, store.ir2, store.ir3, store.ir4, store.ir5, 
                      store.ir6, store.ir7, store.ir8, store.ir9, store.ir10, 
                      store.ir11, store.ir12];
    return futures_90d;
  }

  const get30dFutures = function () {
    let store = get(ticker);
    let futures_30d = [store.ib1, store.ib2, store.ib3, store.ib4, store.ib5, 
                      store.ib6, store.ib7, store.ib8, store.ib9, store.ib10, 
                      store.ib11, store.ib12, store.ib13, store.ib14, store.ib15, 
                      store.ib16, store.ib17, store.ib18];
    return futures_30d;
  }


// Gets the thursday following the first friday of the month
  function getSecondThursday(month, year){
      let date = new Date("2023-"+month+"-01");
      if (year) date.setFullYear(year);
      while (true){
          if (date.getDay() == 5) break;
          date.setDate(date.getDate() + 1);
      } 
      date.setDate(date.getDate() + 6);
      return date;
  }

  const getEFPStrike = function (date) {
    let store = get(ticker);
    let now = new Date();
    let monthDiff = (now.getMonth() + 1) % 3;
    if (monthDiff == 0) {
      if (getSecondThursday(now.getMonth() + 1, now.getFullYear()).getTime() < now.getTime()) {
        now = addMonths(now, 3);
      }
    } else {
      now = addMonths(now, 3 - monthDiff);
    }

    for (let i = 1; i <= 12; i++) {
      if (now.getMonth() == date.getMonth() && now.getFullYear() == date.getFullYear()) {
        return store["ir" + i];
      }
      now = addMonths(now, 3);
    }
  }

  const getUSD_fut_strike = function (tenor) {
    let store = get(ticker);
    return store["ct"+ tenor];
  }

  return {
    subscribe,
    set: my_set,
    getYMA,
    getXMA,
    getABFS,
    getRBACOR,
    get90dFutures,
    get30dFutures,
    getBBSW,
    getEFPStrike,
    getUSD_fut_strike,
  };
}());

export default ticker;
