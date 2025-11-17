'use strict';
import Holidays from 'date-holidays';
import { getRbaRuns, rbaToYear } from './rba_handler';
import products from '../stores/products';
import { flyPrice, spreadPrice } from './calculations';
import bank_divisions from '../stores/bank_divisions';
import banks from '../stores/banks';

const hd = new Holidays('AU', 'NSW');
const us = new Holidays('US', 'NY');
const jp = new Holidays('JP');
const nz = new Holidays('NZ', 'WGN', 'AUK');

export function toPrice (n) {

  // If n is undefined there is no price to be displayed.  Limit prices to no
  // more than 4 decimal places.

  if (typeof n === 'undefined') {
    return null;
  }

  // If n was given make sure it is a number (and not a string).

  if (typeof n !== 'number') {
    n = parseFloat(n);
    if (isNaN(n)) {
      throw Error('Parameter is not a number ' + typeof n);
    }
  }

  return removeTrailZero(n, 4);
}

export function toBPPrice (n) {

  // If n is undefined there is no price to be displayed.  Limit prices to no
  // more than 4 decimal places.

  if (typeof n === 'undefined') {
    return null;
  }

  // If n was given make sure it is a number (and not a string).

  if (typeof n !== 'number') {
    throw Error('Parameter is not a number ' + typeof n);
  }

  // Give integer values 4 decimal places.
  n = n*100;
  
  return n.toFixed(4);
}

/**
 * Function to generate tenor string from given parameters, dynamically handling the product type consideration
 * @param {object} price_origin object fields to be included where applicable for given product {
 *    product_id: integer <required>,
 *    years: integer[],
 *    fwd: integer,
 *    start_date: date
 *  }
 * @returns {String} tenor as displayed string
 */
export function genericToTenor(price_origin, specific_sps = false) {
  let price = Object.assign(!!price_origin.year && !price_origin.years ?  {years:[price_origin.year]} : {}, price_origin);
  let tenor;
  if (products.isFwd(price.product_id)) {
    let fwdtenor = toTenor([price.fwd]);
    let term = toTenor(price.years);
    tenor = fwdtenor + "" + term;
  } else if (price.product_id == 18 && specific_sps) {
    let fwdtenor;
    let now = new Date();
    let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (price.fwd != null){
      fwdtenor = price.fwd*12;
      let todayMonth = today.getMonth();
      let spot = addDays(today, 1);
      let tommorrowMonth = spot.getMonth();
      if (todayMonth != tommorrowMonth) spot = addMonths(spot, fwdtenor-1);
      else spot = addMonths(spot, fwdtenor);
      tenor = timestampToISODate(spot);
    } else {
      let date = new Date(price.start_date);
      fwdtenor = date.getMonth() - today.getMonth() + (date.getFullYear() - today.getFullYear())*12;
      tenor = timestampToISODate(date);
    }
  } else if (price.product_id == 18) {
    let fwd;
    if (typeof price.fwd === "number") {
      fwd = price.fwd*12;
    } else {
      const today = new Date();
      const start = new Date(price.start_date);
      const diff = (start - today) / (1000 * 60 * 60 * 24 * 30);
      fwd = Math.round(diff);
    }
    tenor = fwd + 'x' + (fwd + price.years[0]*12);
  } else if ([17, 27].includes(price.product_id)) {
    tenor = toEFPSPSTenor(price.start_date);
  } else if (price.product_id == 20) {
    tenor = toRBATenor(price.years);
  } else {
    tenor = toTenor(price.years);
  }
  return tenor;
}

const inRangeXtoY =(n) =>{
  // the remaining in between range 10^-10 and 10^-30
  if (n < (1/Math.pow(8,10)) && n >(1/Math.pow(10,50))) return true;
  // the remaining in between range 1-10^-10 and 1-10^-30
  if ((1-n) < (1/Math.pow(8,10)) && (1-n) >(1/Math.pow(10,50))) return true;
  return false;
}
export function toTenor (years) {
  let m, r, has_months, has_weeks, has_days;
  has_months = false;
  has_weeks = false;
  has_days = false;

  // If a single year was provided format it in years or months. 
  const isWholeNumber = (num) => num % 1 === 0 ;

  const y2n = function (y) {

    if(Number.isInteger(y)) {
      return y + 'y';
    } else if(isWholeNumber(y * 12) || inRangeXtoY((y*12)%1)) {
      return Math.round(y * 12) + 'm';
    } else if(isWholeNumber(y * 52) || inRangeXtoY((y*52)%1)) {
      return Math.round(y * 52) + 'w';
    } else {
      return Math.round(y * 365) + 'd';
    }

  };

  if(typeof years === 'string') {
    return y2n(parseFloat(years));
  }

  if (typeof years === 'number') {
    return y2n(years);
  }
  if (years.length === 1) {
    return y2n(years[0]);
  }

  // For spreads join the years with a " x ".  For butterflys, make it compact
  // by removing the spaces.

  m = years.map(y => {
    if (Number.isInteger(y)) {
      return y.toString();
    } else if (isWholeNumber(y * 12) || inRangeXtoY((y*12)%1)) {
      has_months = true;
      return Math.round(y * 12) + 'm';
    } else if (isWholeNumber(y * 52) || inRangeXtoY((y*52)%1)) {
      has_weeks = true;
      return Math.round(y * 52) + 'w';
    } else {
      has_days = true;
      return Math.round(y * 365) + 'd';
    }
  });

  if (years.length === 2) {
    r = 'x';
  } else {
    r = (has_months) ? ' ' : ((has_weeks) ? ' ': 'x');
  }

  return m.join(r);
}

export function toRBATenor (years, start_date) {
  let runs = getRbaRuns();
  let today = new Date();
  let date = new Date();
  date.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  date.setDate(1);
  if (date.getMonth() != 0){
    while (date.getDay() != 2) {
      date = addDays(date, 1); 
    }
    if (date < today) {
      date = addMonths(date, 1);
    }
    date.setDate(1);
  } else {
    date = addMonths(date, 1);
  }

  const dateToTenor = function (date) {
    let arr = new Date(date).toString().split(" ");
    return (arr[1] + arr[3].slice(2));
  };

  let tenor = "";
  for (let year of years) {
    if (years[0] == 1000 && start_date) {
      if (year == 1000) tenor = dateToTenor(start_date);
      else tenor += (" x " + dateToTenor(addMonths(start_date, year - 1000)));
    } else {
      let run = runs[year - 1001];
      let arr = run?.[0].split(" ");
      let str = arr?.[1] + arr?.[2];
      if (tenor == "") tenor = str;
      else tenor += (" x " + str);
    }
  }
  return tenor;
}

export function tenorToYear (tenor) {

  tenor = tenor.toLowerCase();

  let years = [];
  if (tenor == 'on' || tenor == '1bd'){
    tenor = '1d';
  }
  
  tenor = tenor.replaceAll("x", " ");
  tenor = tenor.replaceAll(",", " ");
  tenor = tenor.replaceAll("   ", " ").replaceAll("  ", " ");
  let split_tenor = tenor.trim().split(/\s|(?<=\d[d|w|m|y])(?=\d)/g);

  split_tenor.forEach((t) => {

    t = t.trim();
    if (t.match(/[a-zA-Z]{3}[0-9]{2}/g)) t = (rbaToYear(t)).toString();
    
    if(!isTenor(t)) {
      if (t) console.error(`Passed in tenor is not a tenor, tenor: ${JSON.stringify(t)}`);
      return null;
    }

    let num, suffix;
    suffix = t.match(/[a-zA-Z]/g)?.[0];
    num = t.split(suffix)[0];

    switch(suffix) {
      case 'y':
      case null:
      case undefined:
        years.push(Number(num));
        break;
      case 'm':
        years.push(Number(num) / 12);
        break;
      case 'w':
        years.push(Number(num) / 52);
        break;
      case 'd':
        years.push(Number(num) / 365);
        break;
      default:
        throw new Error(`Unexpected tenor received: ${t} type ${typeof t}`);
    }
  });

  return years;
}

//Rounds to the nearest 0.5mil
export function toVolume (volume) {
  volume = round(volume*2, 0)/2;
  return volume;
}

//Rounds to the nearest 0.5mil
export function toVolumeString (volume) {
  volume = round(volume*2, 0)/2;
  return volume.toString();
}

export function toBrokerage (brokerage) {
  // Make sure brokerage is a number (and not a string).

  if (typeof brokerage !== 'number') {
    throw Error('Parameter is not a number: ' + typeof brokerage);
  }

  // Give integer values 2 decimal places.

  return brokerage.toFixed(2);
}

export function round(n, d) {
  // Round n to d decimal places
  // This returns a number, not a string

  let r = +(Math.round(n + `e+${d}`) + `e-${d}`);
  return r;
}

export function roundToNearest(n, v) {
  // round n to the nearest v value
  // 1 no dp, 2 for 0.5, 100 for 2 dp, 1000 for 3dp ...

  return Math.round(n * v) / v;
}

export function roundUp(n, d) {
  // Round n to d decimal places
  // This returns a number, not a string

  n = round(n, 8); //prevent rounding up floating point errors
  let r = +(Math.ceil(n + `e+${d}`) + `e-${d}`);
  return r;
}

export function roundUpToNearest(n, v) {
  // round n to the nearest v value
  // 1 no dp, 2 for 0.5, 100 for 2 dp, 1000 for 3dp ...

  n = round(n, 8); //prevent rounding up floating point errors
  return Math.ceil(n * v) / v;
}

export function getFloatingPoint(value){
  let regex = /([.,]{1}\d*?)0*$/;
  // return value.match(regex);
  return regex.exec(value)?.[1];
}

export function yearsToSortCode (years, fwd) {
  // This function create a single number that allows the prices to be sorted by
  // their tenor.  It puts these tenors in the order given:

  // 1, 3, 5, 1x3, 1x5, 3x5, 1x3x5

  const maxTenor = 100; // Maximum tenor is 100 years.
  let m, sortCode;

  // Workaround to get valid sortCode for fwds. Could probably be better designed.
  if (fwd != null) { years = years.concat([fwd]); }
  
  m = Math.pow(maxTenor*10, years.length); // Increased by a factor of 10, else sort codes can overlap (eg. 3m 30 == 6m 5)
  sortCode = 0;

  for (let y of years) {
    sortCode += y * m;
    m /= maxTenor*10; // See above comment
  }

  return sortCode;
}

/**
 * Creates and returns at date objct with zeroed time (ie. 12am) using a given date, or the current date if none is provided
 * @param {Date || date string} d date object to be used as reference
 * @returns {Date} the zeroed date
 */
export function getTimelessDate (d = new Date()) {
  const isDateObject = (date) => Object.prototype.toString.call(date) === '[object Date]';
  if (!isDateObject(d) && typeof d === "string") {
    d = new Date(d);
  }
  if (!isDateObject(d)) {
    console.error("Could not generate timeless date from given value.");
    return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function timestampToDate (s) {
  let a;
  const d = new Date(s);

  // Get the date as 'dd Mon hh:mm:ss'

  a = d.toString(d).split(' ');
  return a[2] + ' ' + a[1];
}

export function timestampToDateTime (s) {
  let a, b;
  const d = new Date(s);

  // Get the date as 'dd Mon hh:mm:ss'

  a = d.toString(d).split(' ');
  b = [a[2], a[1], a[4]].join(' ');

  return b;
}

// Formats a date to the following format "Day dd Mon, YYYY"
export function timestampToYearDate (s) {

  const date = new Date(s);

  let a = date.toString().split(' ');

  return [a[0], a[1], a[2] + ',', a[3]].join(' ');
}

// Formats a date to the following format "YYYY-mm-dd"
export function timestampToISODate (s) {
  const date = new Date(s);

  return convertDateToString(date);
}

// converts a date object to the following format: "YYYY-mm-dd" in the
// current timezone
export function convertDateToString(date) {
  if(!date) {
    return '';
  }

  date = new Date(date);

  const offset = date.getTimezoneOffset();
  let d = new Date(date.getTime() - (offset * 60 * 1000));

  return d.toISOString().split('T')[0];
}

/**
 * Splits a single tenor into its number, and its suffixed duration character
 * @param {string} tenor
 * @returns {[string, string]}
 */
export function breakTenor(tenor) {
  if(typeof tenor !== 'string') {
    return [undefined, undefined];
  }

  let regex = /d|w|m|y/gi;
  let suffix = tenor.match(regex)?.[0];
  let prefix = tenor.split(suffix)[0];
  return [prefix, suffix ?? 'y'];
}
/**
 * Remove the zero trailing for the mids.
 * Does not handle letters in the string. Returns undefined
 * @param {string} mid
 * @returns {string}
 */
export function removeTrailZero(mid, sig_fig = 2) {
  if (typeof mid == 'number') {
    mid = mid.toFixed(7);
  }

  if (isNaN(mid) || mid == null) return "-";
  let point = mid.indexOf('.');
  if (point !== -1 && (mid.length - point) > sig_fig) {
    let regex = RegExp(`^-?(\\d+)(\\.\\d{1,${sig_fig}}(\\d*[1-9]+)*)?`, "g");
    let r = regex.exec(mid)?.[0];
    return r;
  } else {
    return (+mid).toFixed(sig_fig).toString();
  }
}

/**
 * Adds a tenor to a date.
 * If the new date falls on a weekend, or a NSW public holiday, rolls the date
 * forward until it is a business day
 * @param {string} tenor
 * @param {Date} date
 * @returns {string} Date string in format of "YYYY-mm-dd"
 */
export function addTenorToDate(tenor, date) {
  if(!tenor || !date) {
    return '';
  }

  if(!isTenor(tenor)) {
    return '';
  }

  let [prefix, suffix] = breakTenor(tenor);

  let result;
  switch(suffix) {
    case 'y':
      result = addYears(date, parseInt(prefix));
      break;
    case 'm':
      result = addMonths(date, parseInt(prefix));
      break;
    case 'w':
      result = addDays(date, parseInt(prefix) * 7);
      break;
    case 'd':
      result = addDays(date, parseInt(prefix));
      break;
  }

  return convertDateToString(result);
}

/* Specifically for RBA OIS products */
export function addTenorToDays(tenor, date, product=null) {
  if(!tenor || !date) {
    return '';
  }

  if(!isTenor(tenor)) {
    return '';
  }

  tenor = tenor.toLowerCase();
  if (tenor == "on"){
    tenor = "1d";
  } else if (!isNaN(tenor)) {
    tenor = tenor + 'd';
  }

  let [prefix, suffix] = breakTenor(tenor);

  let result;
  switch(suffix) {
    case 'y':
      result = addYears(date, parseInt(prefix),product);
      break;
    case 'm':
      result = addMonths(date, parseInt(prefix),product);
      break;
    case 'w':
      result = addDays(date, parseInt(prefix) * 7,product);
      break;
    case 'd':
      result = addDays(date, parseInt(prefix), product);
      break;
  }

  return result;
}

export function shapeToStr(s) {
  switch(s) {
    case 0: return "Outright";
    case 1: return "Spread";
    case 2: return "Butterfly";
    default: return "Unknown";
  }
}

export function bidToString (bid) {
  return (bid) ? "Bid" : "Offer";
}

let init = false;
let holidaysArr = [];
let usHoliday = [];
let nzHoliday = [];
let jpHoliday = [];

function initHolidaysArr() {
  // Push AU holidays
  pushHolidays(holidaysArr, hd);
  // Push US holidays
  for (let i = new Date().getFullYear(); i <= new Date().getFullYear() + 100; i++) {
    usHoliday.push(...(us.getHolidays(i, "en").map(y => timestampToISODate(y.date.split(" ")[0]) )) );
  }
  // Push NZ holidays
  for (let i = new Date().getFullYear(); i <= new Date().getFullYear() + 100; i++) {
    nzHoliday.push(...(nz.getHolidays(i, "en").map(y => timestampToISODate(y.date.split(" ")[0]) )) );
  }
  // Push JP holidays
  pushHolidays(jpHoliday, jp);

  init = true;
}

function pushHolidays(arr, d) {
  for (let i = new Date().getFullYear(); i <= new Date().getFullYear() + 100; i++) {
    arr.push(...(d.getHolidays(i, "en").map(y => timestampToISODate(y.start))));
  }
}
// Adds days to a date and returns the date
// If the date ends up on a weekend, rolls the date forward to the next monday
export function addDays(date, days, product=null) {

  if(!date) {
    return null;
  }
  let result = new Date(date);
  result.setDate(result.getDate() + +days);

  rollDateForward(result,product);
  return result;
}

// Adds months to a date and returns the date
// If the date ends up on a weekend, rolls the date forward to the next monday unless
// the rolled forward date would end up in the next month, in which case the date
// is rolled back to the closest business day
export function addMonths(date, months,product=null) {
  if(!date) {
    return null;
  }
  let result = new Date(date);
  let d = result.getDate();
  result.setMonth(result.getMonth() + +months);
  if (result.getDate() != d) {
    result.setDate(0);
  }

  rollDateForwardOrBackward(result,product);
  return result;
}

// Adds years to a date and returns the date
// If the date ends up on a weekend, rolls the date forward to the next monday
export function addYears(date, years,product=null) {
  if(!date) {
    return null;
  }
  let result = new Date(date);
  result.setFullYear(result.getFullYear() + +years);

  rollDateForward(result,product);
  return result;
}

// Returns true if passed in tenor is a day, week, month or year tenor (1d, 1w, 1m, 1y)
export function isTenor(tenor) {
  return /^((?:\d)+(d|w|m|y)?)|ON$/gi.test(tenor);
}

// returns if a date is on the weekend or not
function isWeekend(date) {
  return (date.getDay() === 0 || date.getDay() === 6);
}

// returns true if date is a public holiday otherwise returns false
function isHoliday(date, product=null) {
  let _holidays = holidaysArr;
  let newDate = new Date(date);
  if (newDate!= "Invalid Date"){
    
    // Hard code product type based on product id
    // The UsHoliday 
    if ([7,8,28,29,30,31,32].includes(product)) { _holidays = _holidays.concat(usHoliday).sort((a,b) => a - b);}
    
    // NZ Holiday
    if ([10, 11, 12, 13,14].includes(product)) { _holidays = nzHoliday.sort((a,b) => a - b);}
    if ([15, 16].includes(product)) { _holidays = nzHoliday.concat(usHoliday).sort((a,b) => a - b);}
    
    // JP Holiday
    if ([22].includes(product)) { _holidays = jpHoliday.sort((a,b) => a - b);}
    if ([26].includes(product)) { _holidays = jpHoliday.concat(usHoliday).sort((a,b) => a - b);}

    if (newDate && _holidays.includes(timestampToISODate(newDate)) ) return true;
  
  // let time = timestampToISODate(newDate); //newDate.getTime();
  // for (let holiday of _holidays) {
  //   let holidayTime = holiday;  //.getTime();
  //   if (holidayTime < time) continue;
  //   else if (holidayTime == time) return true;
  //   else if (holidayTime > time) return false;
  // }
  }
  return false;
}

// 
/**
 * IsBusinessDay is taken into product context.
 * If product belonges to group product Cross Currency Swap, 
 * bussinessdays will be excluded from AUS public holiday and other Business center
 * i.e. with BBSW/SOFR Australian and The Us public holidays will not be counted 
 * 
 * @param {*} date 
 * @param {*} product 
 * @returns Notes: True if the date is not a weekend OR australian public holiday Or other Business Center
 */
export function isBusinessDay(date, product=null) {
  return !(isWeekend(date) || isHoliday(date,product));
}

// If a date is on the weekend, rolls the date forward to the next monday.
// warning: this does affect the original date object
function rollDateForward(date,product){

  if (!init) initHolidaysArr();

  if(isBusinessDay(date,product)) {
    return;
  }
  date.setDate(date.getDate() + 1);
  rollDateForward(date,product);
}

/**
 * If a date is on a public holiday, rolls the date forward to the next non public
 * holiday UNLESS the date is at the end of the month, in which case the day rolls
 * backwards to the closest previous business day.
 *
 * @param {Date} date - NOTE: this function is modified by running this function
 */
function rollDateForwardOrBackward(date,product) {
  if (isBusinessDay(date,product)) {
    return;
  }

  // rolls the date forward. if a business day is rolled to, the function will return
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  while (date.getDate() !== lastDayOfMonth.getDate()) {
    if (isBusinessDay(date,product)) {
      return;
    }
    date.setDate(date.getDate() + 1);
  }
  // if the function gets to this point, then the date must be end of the month and still
  // not a business day, in which case we roll backwards to the closest previous business day
  while (!isBusinessDay(date,product)) {
    date.setDate(date.getDate() - 1);
  }
}

export function efpspsToDate(str) {
  let d = new Date(`${str.slice(-3)} 1 ${new Date().getFullYear()} 00:00:00`);
  let yr_last = +str.slice(3,4);
  while (d.getFullYear() % 10 != yr_last) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

/**
 * @param month - the initial date month
 * @param year - the initial date year
 * @returns {Date} - the Date of the Thursday following the first Friday of the month
**/
export function getEFPSPS_Thursday (month, year) { 
  const d = new Date(`${month} 01, ${year} 00:00:00`);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let x = d.getDay();
  if (x > days.indexOf("Fri") ) {
    d.setDate(d.getDate() + (6) + 6);
  } else {
    d.setDate(d.getDate() + (5-x) + 6);
  }
  return d;
}

export function toEFPSPSTenor (start_date) {
  let monthSymbols = {2: "H", 5: "M", 8: "U", 11: "Z"};
  let months = {2: "Mar", 5: "Jun", 8: "Sep", 11: "Dec"};
  let date = new Date(start_date);
  if (!monthSymbols[date.getMonth()] || !months[date.getMonth()]) return null;
  return "IR" + monthSymbols[date.getMonth()] + date.getFullYear().toString()[3] + " " + months[date.getMonth()];
}

export function getEFPSPS_Dates () {
 
  let EFPSPS_Dates = [];

  let months = {2: 'March', 5: 'June', 8: 'September', 11: 'December'};
  let initial = {2: 'H', 5: 'M', 8: 'U', 11: 'Z'};

  let today = new Date();
  let monthDiff =  ((today.getMonth() + 1) % 3);
  if (monthDiff == 0) {
    let date = getSecondThursday(today.getMonth() + 1, today.getFullYear());
    date.setDate(date.getDate() - 1);
    if (date.getTime() < today.getTime()) {
      today = addMonths(today, 3);
    }
  } else {
    today = addMonths(today, 3 - monthDiff);
  }

  for (let i = 1; i <= 12; i++){
    EFPSPS_Dates.push({
      uid : i, 
      date : getEFPSPS_Thursday(months[today.getMonth()], today.getFullYear()), 
      tenor: `IR${initial[today.getMonth()]}${today.getFullYear().toString().slice(3)} ${months[today.getMonth()].substring(0,3)}`
    });

    today = addMonths(today, 3);
  }
  return EFPSPS_Dates;
}
// Gets the thursday following the first friday of the month
export function getSecondThursday(month, year){
  let date = new Date("2023-"+month+"-01");
  if (year) date.setFullYear(year);
  while (true){
    if (date.getDay() == 5) break;
    date.setDate(date.getDate() + 1);
  } 
  date.setDate(date.getDate() + 6);
  return date;
}

export function convertLegToTitle (leg){
  switch (leg) {
    case "1T": {
      return "T";
    }
    case "3M": {
      return "Q";
    }
    case "6M": {
      return "S";
    }
    case "1Y": {
      return "A";
    }
  }
}

// Allow minus number, decimal, characters from 0-9
export function isCharNumber(c) {return (c >= '0' && c <= '9')|| (c === 'Backspace' || c === 'Delete' || c === 'Enter'||c === '.' || c === '-');}

// Reset array to null
export function handleReset(arr) {for (let i of Object.keys(arr)) {arr[i] = null;} return arr;}

export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Break down the tickets into each bank in individual trades 
// Mainly Useful when more than 2 banks in the trade
function getRelativeTrades (tickets, mapped) {
  let relativeTrades = {};

  for (let ticket of tickets) {
    let bid = bank_divisions.get(ticket.bid_bank_division_id).bank_id;
    let offer = bank_divisions.get(ticket.offer_bank_division_id).bank_id;

    if (!relativeTrades[bid]) {
      relativeTrades[bid] = {
        lastLegBid: true, 
        years: [ticket.year], 
        prices: [ticket.price], 
        confo: "", 
        tickets: [ticket],
      };
    } else {
      relativeTrades[bid].lastLegBid = true; 
      if (!relativeTrades[bid].years.includes(ticket.year)) {
        relativeTrades[bid].years.push(ticket.year); 
        relativeTrades[bid].prices.push(ticket.price); 
      }
      relativeTrades[bid].tickets.push(ticket);
    }
    
    if (!relativeTrades[offer]) {
      relativeTrades[offer] = {
        lastLegBid: false, 
        years: [ticket.year], 
        prices: [ticket.price], 
        confo: "", 
        tickets: [ticket], 
      };
    } else {
      relativeTrades[offer].lastLegBid = false; 
      if (!relativeTrades[offer].years.includes(ticket.year)) {
        relativeTrades[offer].years.push(ticket.year); 
        relativeTrades[offer].prices.push(ticket.price); 
      }
      relativeTrades[offer].tickets.push(ticket);
    }
  }

  for (let idx in relativeTrades) {
    let trade = relativeTrades[idx];
    if (trade.years.length == 3) trade.bid = !trade.lastLegBid;
    else trade.bid = trade.lastLegBid;
    delete trade.lastLegBid;
  }

  return relativeTrades;
}

// Breakdown the given ticket into a summary
function getTicketBreakdown (tick, subject, bid, onlyTicket = false, mapped) {
  let pid = tick.product_id;
  let tenor = pid == 20 ? toRBATenor([tick.year]) : pid == 17 ? toEFPSPSTenor(tick.start_date) : toTenor(tick.year);
  let paySchedule = pid == 1 ? convertLegToTitle(tick.fixed_leg) + convertLegToTitle(tick.floating_leg) : "";
  let bank = banks.get(subject).bank;
  let str = "";

  // For EFP, SPS EFP
  if ([2,17].includes(pid)) {
    // Assemble breakdown
    // Outright
    if (onlyTicket) {
      str += `Notional: ${numberWithCommas(mapped["data"]["notional"])}\n`;
      str += `${bank} ${bid ? "BUY" : "SELL"} ${mapped["data"]["Lot"]} ${mapped["data"]["EFPInfo"]} @ ${parseFloat(mapped["data"]["FutStrike"]).toFixed(4)}\n`
      str += `${bank} ${bid ? "PAY" : "REC"}: ${(parseFloat(mapped["data"]["rate"])*100).toFixed(4)}%\n`;
      str += `Start Date: ${new Date(mapped["data"]["startDate"]).toLocaleDateString()}`;
    } else {
    // Spread, Fly
      str += `${tenor} ${bank} ${bid ? "PAY" : "REC"} ${tick.volume}m @ ${tick.price} \n ${bank} ${bid ? "BUY" : "SELL"} ${mapped["data"]["Lot"]} ${mapped["data"]["EFPInfo"]} @ ${parseFloat(mapped["data"]["FutStrike"]).toFixed(4)} = ${(parseFloat(mapped["data"]["rate"])*100).toFixed(4)}%\n`
    }
  } else {
    // For other products
    // Assemble breakdown
    if (onlyTicket) {
      str += `Notional: ${numberWithCommas(tick.volume*1000000)}\n`;
      str += `Tenor: ${tenor} ${paySchedule ?? ""}\n`;
      str += `Rate: ${tick.price}\n`;
      str += `Start Date: ${new Date(tick.start_date).toLocaleDateString()}`;
    } else {
      let opposing = banks.get(bank_divisions.get(bid ? tick.offer_bank_division_id : tick.bid_bank_division_id).bank_id).bank
      str += `${tenor} ${bank} ${bid ? "PAY" : "REC"} ${opposing} ${!bid ? "PAY" : "REC"} ${tick.volume}m @ ${tick.price}\n`;
    }
  }
  return str;
}

export async function generateConfo (tickets, mapped) {
  let pid = tickets[0].product_id;
  let prodName = products.name(tickets[0].product_id);
  
  let relativeTrades = getRelativeTrades(tickets, mapped);
  let trade_ov_ids = [];
  
  // for each bank in the overall trade, generate a confo from its perspective
  for (let id in relativeTrades) {
    let paySchedule, totalRate, summaryLine;
    let bankTrade = relativeTrades[id];
    let tenor = pid == 20 ? toRBATenor(bankTrade.years) : (pid == 17 || pid == 27) ? toEFPSPSTenor(bankTrade.tickets[0].start_date) : toTenor(bankTrade.years);
    let breakdown = "";
    let opposingBanks = [];

    for (let ticket of bankTrade.tickets) {
      let bid = (id == bank_divisions.get(ticket.bid_bank_division_id).bank_id);
      let opposing = bid ? bank_divisions.get(ticket.offer_bank_division_id).bank_id : bank_divisions.get(ticket.bid_bank_division_id).bank_id
      if (!opposingBanks.includes(opposing)) opposingBanks.push(opposing);
      if (!trade_ov_ids.includes(ticket.trade_id_ov)) trade_ov_ids.push(ticket.trade_id_ov);

      if (pid == 1) {
        let temp = convertLegToTitle(ticket.fixed_leg) + convertLegToTitle(ticket.floating_leg);
        if (paySchedule == null) paySchedule = temp;
        else if (paySchedule != temp) paySchedule = ""; // This means it will continue to fail for each following iteration
      }

      breakdown += getTicketBreakdown(ticket, id, bid, bankTrade.tickets.length == 1, mapped[bankTrade.tickets.indexOf(ticket)]);
    }

    if (opposingBanks.length == 1) {
      summaryLine = `${banks.get(id).bank} ${bankTrade.bid ? "PAY" : "REC"} ${banks.get(opposingBanks[0]).bank} ${!bankTrade.bid ? "PAY" : "REC"} \n`
    }

    tenor += (" " + (paySchedule ?? ""));

    // calculate overall price
    if (bankTrade.prices.length == 1) totalRate = bankTrade.prices[0];
    else if (bankTrade.prices.length == 2) totalRate = spreadPrice(bankTrade.prices[1], bankTrade.prices[0]);
    else totalRate = flyPrice(bankTrade.prices[1], bankTrade.prices[0], bankTrade.prices[2]);
    if (products.isPercentageProd(pid) && bankTrade.prices.length > 1) totalRate = round(totalRate*100, 7);

    // assemble confo
    bankTrade.confo += `${tenor} ${prodName} @ ${totalRate}\n`;
    bankTrade.confo += `${summaryLine ?? ""}\n`;
    bankTrade.confo += `${breakdown}\n`;
    bankTrade.confo += `MW: ${new Array(bankTrade.tickets.length).fill("NA").join(", ")}`;
    bankTrade.confo += `$-- ${bankTrade.tickets.map((t) => {return trade_ov_ids.indexOf(t.trade_id_ov)+1;}).join(", ")}`;
    bankTrade.confo = bankTrade.confo.trim();

    relativeTrades[id] = bankTrade.confo;
  }
  return [relativeTrades, trade_ov_ids];
}

/**
 * Function to convert number to its ordinal string equivalent. Eg, given 31, returns "31st"
 * @param {Integer} num 
 * @return {String}
 */
export function toOrdinalNumeral(num) {
  if (num % 1 !== 0) { console.error("Given number is not an integer."); return undefined; }
  if (num >= 10 && num <= 20) { return num + "th"; }
  switch (num % 10) {
    case 1:
      return num + "st";
    case 2:
      return num + "nd";
    case 3:
      return num + "rd";
    default:
      return num + "th";
  }
}