'use strict';

import { get } from "svelte/store";
import quotes from "../stores/quotes";
import { addMonths, addYears, tenorToYear, toTenor, addTenorToDays, addDays, round, roundToNearest, convertDateToString } from "./formatting";
import ticker from "../stores/ticker";
import prices from "../stores/prices";
import products from "../stores/products";
import { clearAll, findRbaDates } from "./rba_handler";
import data_collection_settings from "../stores/data_collection_settings.js";
import CustomSpline from "../../server/custom_spline";
let initialisedSpline_3m = false;
let initialisedSpline_6m = false;
let initialisedOISCurve = false;
let isInitSplinesArray = [];

let inv = 1.0 / 0.00125;

// Interpolation models
let spline_3m;
let spline_6m;
let OISCurve;
let rbaDates;
let splinesArray = [];

let current3mBBSW = ticker?.getBBSW()[2].mid; // Current 3M BBSW Flat rate
let current6mBBSW = ticker?.getBBSW()[5].mid; // Current 6M BBSW Flat rate

export function refreshData() {
  current3mBBSW = ticker.getBBSW()[2].mid;
  current6mBBSW = ticker.getBBSW()[5].mid;

  initialisedSpline_3m = false;
  initialisedSpline_6m = false;
  initialisedOISCurve = false;
  isInitSplinesArray = isInitSplinesArray.fill(false);

  clearAll();

  spline_3m = null;
  spline_6m = null;
  OISCurve = null;
  rbaDates = null;
  splinesArray = splinesArray.fill(null);

  let prods = [18].concat(products.getFwdProducts);
  prices.recalculateMids(prods);
}

/**
 * Calculates Forward Product's Mids using a curve built off of its respective quotes
 * @param {number} prod_id 
 * @param {string} tenor 
 * @returns {number} mid for given tenor of given product
 */

export function getFwdMid(prod_id, tenor) {
  // Read tenor
  let terms = [];
  const regex = /(d|w|m|y)/gi;
  for (let i = 0; i < tenor.length; i++) {
    if (tenor[i].match(regex)) {
      terms.push(tenor.slice(0, i + 1));
      terms.push(tenor.slice(i + 1));
      break;
    }
  }

  let fwds = quotes.get(products.nonFwd(prod_id), tenorToYear(terms[1])[0])?.fwd_mids;

  if (fwds != null) {
    let mid = fwds[tenorToYear(terms[0])[0]];
    if (mid != null) return mid;
  }
  return calcFwdMidFromSpline(prod_id, terms);
}

function calcFwdMidFromSpline(prod_id, terms) {
  let product_id = products.nonFwd(prod_id);
  try {
    if (!isInitSplinesArray[product_id] || splinesArray[product_id] == null) {
      initProdSpline(product_id);
      if (product_id == 1 && (!isInitSplinesArray[5] || splinesArray[5] == null)) {
        initProdSpline(5);
      }
    }
  } catch (err) {
    console.warn("Failed to determine mid for given fwd product " + prod_id + ".\n" + err.toString());
    return NaN;
  }

  let year1 = tenorToYear(terms[0])[0];
  let year2 = year1 + tenorToYear(terms[1])[0];

  // Establish variable values 
  let periods1;
  let periods2;
  let periodsTenor;
  if (tenorToYear(terms[1])[0] > 3) {
    periods1 = year1 * 2;
    periods2 = year2 * 2;
    periodsTenor = tenorToYear(terms[1])[0] * 2;
  } else {
    periods1 = year1 * 4;
    periods2 = year2 * 4;
    periodsTenor = tenorToYear(terms[1])[0] * 4;
  }

  let days1 = Math.round(year1 * 365);
  let days2 = Math.round(year2 * 365);

  let rate1 = splinesArray[product_id].at(days1);
  let rate2 = splinesArray[product_id].at(days2);

  // if is Fwd Irs
  if (product_id == 1 && tenorToYear(terms[1])[0] > 3) {
    if (year1 <= 3) {
      rate1 = rate1 + splinesArray[5].at(days1) / 100;
    }
    if (year2 <= 3) {
      rate2 = rate2 + splinesArray[5].at(days2) / 100;
    }
  } else if (product_id == 1) {
    if (year1 > 3) {
      rate1 = rate1 - splinesArray[5].at(days1) / 100;
    }
    if (year2 > 3) {
      rate2 = rate2 - splinesArray[5].at(days2) / 100;
    }
  }

  // Calculate and return mid
  let mid = Math.pow(Math.pow((1 + rate2 / (periodsTenor * 100)), periods2) / Math.pow((1 + rate1 / (periodsTenor * 100)), periods1), 1 / periodsTenor) - 1;
  return roundToNearest((mid * periodsTenor * 100), [1, 3].includes(product_id) ? inv : inv / 100);
}

// Calculates 3m SPS Mids using the 90d IR Futures curve
export function calc3mSps(days) {
  if (!initialisedSpline_3m) init3mSpline();
  return roundToNearest(spline_3m.at(days), inv);
}

// Calculates 6m SPS Mids using the 90d IR Futures curve
export function calc6mSps(days) {
  if (!initialisedSpline_6m) init6mSpline();
  let inv = 1.0 / 0.00125;
  return roundToNearest(spline_6m.at(days), inv);
}

// Creates a cubic spline interpolation model
function createSpline(data) {
  // Sort the data by start date
  data.sort((a, b) => a.start - b.start);
  // Get the x and y values for the interpolation
  const x = data.map(d => d.start);
  const y = data.map(d => d.price);
  let interpChoice = get(data_collection_settings).interpChoice;
  let spline = new CustomSpline(x, y, interpChoice);
  return spline;
}

// Gets the thursday following the first friday of the month
function getSecondThursday(month, year) {
  let date = new Date("2023-" + month + "-01");
  if (year) date.setFullYear(year);
  while (true) {
    if (date.getDay() == 5) break;
    date.setDate(date.getDate() + 1);
  }
  date.setDate(date.getDate() + 6);
  return date;
}

// Initializes the data for the 90d IR Futures curve
function init3mSpline() {
  initialisedSpline_3m = true;
  let data = [{ start: 0, price: current3mBBSW }];
  let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let date = new Date(new Date().getFullYear(), today.getMonth(), 1);

  if ((date.getMonth() + 1) % 3 != 0) {
    date = addMonths(date, 3 - ((today.getMonth() + 1) % 3));
  }
  if (getSecondThursday(date.getMonth() + 1, date.getFullYear()).getTime() <= today.getTime()) {
    date = addMonths(date, 3);
  }

  let tickers = ticker.get90dFutures();

  for (let t of tickers) {
    if (t.ask == 0 || t.ask == null) {
      date = addMonths(date, 3);
      continue;
    }
    let days = Math.round((getSecondThursday(date.getMonth() + 1, date.getFullYear()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    data.push({ start: days, price: roundToNearest((100 - t.ask), inv)});
    date = addMonths(date, 3);
  }

  spline_3m = createSpline(data);
}

// Initializes the data for the 6m curve
function init6mSpline() {
  initialisedSpline_6m = true;
  let data = [{ start: 0, price: current6mBBSW }];
  let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let date = new Date(new Date().getFullYear(), today.getMonth(), 1);
  let fixed6m6s3s = quotes.mid(5, [0.5]) / 100;

  if ((date.getMonth() + 1) % 3 != 0) {
    date = addMonths(date, 3 - ((today.getMonth() + 1) % 3));
  }
  if (getSecondThursday(date.getMonth() + 1, date.getFullYear()).getTime() <= today.getTime()) {
    date = addMonths(date, 3);
  }

  let tickers = ticker.get90dFutures();

  for (let i = 1; i < tickers.length; i++) {
    let t1 = tickers[i - 1];
    let t2 = tickers[i];
    if (t1.ask == 0 || t1.ask == null || t2.ask == 0 || t2.ask == null) {
      date = addMonths(date, 3);
      continue;
    }
    let days = Math.round((getSecondThursday(date.getMonth() + 1, date.getFullYear()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let price = roundToNearest(((100 - t1.ask)/2 + (100 - t1.ask)/2 + fixed6m6s3s), inv);
    data.push({ start: days, price: price });
    date = addMonths(date, 3);
  }
  spline_6m = createSpline(data);
}


// Initializes the data for the 6s3s curve
function init6s3sSpline() {
  isInitSplinesArray[5] = true;
  let data = [{ start: 0, price: 0 }];

  let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let quotes_6s3s = get(quotes)[5];

  for (let q of quotes_6s3s) {
    let date;
    if (q.year == 0.5) {
      date = addMonths(today, 6);
    } else {
      date = addYears(today, q.year);
    }
    let days = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    data.push({ start: days, price: q.mid });
  }
  splinesArray[5] = createSpline(data);
}

/**
 *  Initializes the data for the respective products curve
 *  Has an exception for 6s3s which uses a slightly different structure
 */ 
function initProdSpline(prod_id) {
  if (prod_id == 5) {
    init6s3sSpline();
    return;
  } else {
    isInitSplinesArray[prod_id] = true;

    let data = [];
    const prod_quotes = get(quotes)[prod_id];

    for (let q of prod_quotes) {
      if (q.mid_is_stale) continue;
      let days = Math.round(q.year * 365);
      data.push({ start: days, price: q.mid });
    }

    if (data.length == 0) {
      data = [{ days: 0, start: 0 }];
    }

    splinesArray[prod_id] = createSpline(data);
  }
}

/*
TODO
 - Add way of handling rate hike
 - Add way of handling adjustments
*/

// export function getRBAOISMid (years) {
//   let rbafindRbaDates();
// }
  
export function getOISMid (year) {
  let rate;
  if (year > 1000) {
    if (!rbaDates) rbaDates = findRbaDates();
    let rbaindex = year - 1000;
    rate = getRateForDates(rbaDates[rbaindex], rbaDates[rbaindex + 1]);
    if (rate < 10) return rate;
    else return 0; 
  } else {
    let today = new Date();
    let spot = addDays(today, 1);
    let end = addTenorToDays(toTenor(year), spot);
    rate = getRateForDates(spot, end);
  }
  if (rate < 10) return rate; // i.e. if it could reasonably be an accurate mid
  else return 0; // return 0 beacuse to get to this point calcOIS must be true, so itd be confusing to return the known mids from db
}

// export function getBillOISMid () {
// }

export function getRateForDates (d1, d2, return_DV01 = false, year = null) {
  if (!initialisedOISCurve) initOISCurve();
  
  let days = roundToNearest((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000), 1);
  let comp1 = OISCurve[convertDateToString(d1)]?.compound;
  let comp2 = OISCurve[convertDateToString(d2)]?.compound;
  
  let rate = roundToNearest((((comp2 / comp1) - 1) * 36500) / days, 800);
  if (return_DV01) return [rate, !year ? (1-(comp1/comp2))/(rate/100) : (1/comp1)*quotes.dv01(1, year)];
  else return rate;
}

export function getFWDDV01 (year, fwd) {
  let spot = addDays(new Date(), 1);
  let start = addTenorToDays(toTenor([fwd]), spot);
  let end = addTenorToDays(toTenor([year]), start);
  return getRateForDates(start, end, true, year)[1];
}

function initOISCurve () {
  OISCurve = {};
  initialisedOISCurve = true;

  let today = new Date();
  let date = new Date();

  let rbaDates = quotes.getRbaDates()
    .map( d => !isNaN(new Date(d.start_date)) ? new Date(d.start_date):"TBA")
    .sort((a,b) => a-b);
  rbaDates = rbaDates.slice(rbaDates.findIndex(d => d > today) - 1);
  
  let rbaIndex = 0;
  if (rbaDates[0].getMonth() != today.getMonth()) rbaIndex = 1;

  let keyDates = [];
  while (rbaIndex < rbaDates.length && keyDates.length < 17) {
    if (rbaDates[rbaIndex].getMonth() == date.getMonth()) {
      keyDates.push(rbaDates[rbaIndex]);
      rbaIndex++;
    } else {
      keyDates.push(new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
    }
    date = addMonths(date, 1);
  } 

  let IBFutures = ticker.get30dFutures();
  let prevRate = ticker.getRBACOR().last;
  let prevComp = 1;
  let prevTime = keyDates[0].getTime();
  for (let i = 0; i < keyDates.length; i++) {
    let date = new Date(keyDates[i].toISOString());
    let nextDate = keyDates?.[i+1] ?? addYears(date, 10); // last date will be 10 years after last key date to allow for 5y5y fwd dv01 calculations
    let _yield = (i == 0 && date.getDate() != 1) ? ticker.getRBACOR().last : roundToNearest(100 - IBFutures[i].mid, 800);
    let daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    let beforeRBA = date.getDate() - 1;
    let afterRBA = daysInMonth - beforeRBA;
    let calculatedRate = round(((_yield - (prevRate * beforeRBA) / daysInMonth) * daysInMonth) / afterRBA, 4);

    while (date < nextDate) {
      let days = roundToNearest((date.getTime() - prevTime) / (24 * 60 * 60 * 1000), 1);
      let compoundRate = (1 + (prevRate * (days / 36500))) * prevComp;
      OISCurve[convertDateToString(date)] = {
        rate: calculatedRate,
        compound: compoundRate
      }
      prevComp = compoundRate;
      prevTime = date.getTime();
      date = addDays(date, 1);
      prevRate = calculatedRate;
    }
  }
}