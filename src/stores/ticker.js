'use strict';

import { writable, get } from 'svelte/store';
import { addMonths, round } from '../common/formatting';
import { refreshData } from '../common/pricing_models';

function init() {
  const arr1 = [
    "xma", "yma", "abfs",
    "ct2", "ct3", "ct4", "ct5", "ct6", "ct7", "ct8", "ct9", "ct10", "ct12", "ct15", "ct20", "ct25", "ct30",
    "bf",
  ];
  const default_val1 = { bid: 0, ask: 0, mid: 0, fut_px_val_bp: 0, last: 0 };

  const arr2 = [
    "ir1", "ir2", "ir3", "ir4", "ir5", "ir6", "ir7", "ir8", "ir9", "ir10", "ir11", "ir12",
    "ib1", "ib2", "ib3", "ib4", "ib5", "ib6", "ib7", "ib8", "ib9", "ib10", "ib11", "ib12", "ib13", "ib14", "ib15", "ib16", "ib17",
    "1m", "2m", "3m", "4m", "5m", "6m",
  ];
  const default_val2 = { last: 0, mid: 0, ask: 0 };

  return {
    ...Object.fromEntries(arr1.map(t => [t, {...default_val1}])),
    ...Object.fromEntries(arr2.map(t => [t, {...default_val2}])),
    rbacor: { last: 0 },
  };
};

const ticker = (function () {
  
  const { subscribe, set } = writable(init());

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
                      store.ib16, store.ib17];
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
