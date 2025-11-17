'use strict';
const Holidays = require('date-holidays');
const { query } = require('../db');

const hd = new Holidays('AU', 'NSW');
const us = new Holidays('US', 'NY');
const jp = new Holidays('JP');
const nz = new Holidays('NZ', 'WGN', 'AUK');

async function isFWDProd (pid) {
  return (await query(`SELECT (EXISTS (SELECT * FROM products WHERE fwds_id = ${pid}));`)).rows[0].exists;
}

/**
 * Function to generate tenor string from given parameters, dynamically handling the product type consideration
 * @param {object} price object fields to be included where applicable for given product {
 *    product_id: integer <required>,
 *    years: integer[],
 *    fwd: integer,
 *    start_date: date
 *  }
 * @returns {String} tenor as displayed string
 */
module.exports.genericToTenor = async function genericToTenor(price_origin, specific_sps = false) {
  let price = Object.assign(!!price_origin.year && !price_origin.years ?  {years:[price_origin.year]} : {}, price_origin);
  let tenor;
  if (await isFWDProd(price.product_id)) {
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

module.exports.toTenor = toTenor;
function toTenor (years) {
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

async function toRBATenor (years, start_date) {
  let runs = await getRbaRuns();
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
      let run = runs[year - 1000];
      let arr = run?.[0].split(" ");
      let str = arr?.[1] + arr?.[2];
      if (tenor == "") tenor = str;
      else tenor += (" x " + str);
    }
  }
  return tenor;
}

function toDateString(date) {
    let datestrings = date.toString().split(" ");
    return datestrings[2] + " " + datestrings[1] + " " + datestrings[3].slice(2);
}

module.exports.getRbaRuns = getRbaRuns;
async function getRbaRuns(){
  let rba2024 = (await query("SELECT * FROM rba_dates")).rows
    .map( d => !isNaN(new Date(d.start_date)) ? new Date(d.start_date):"TBA")
    .sort((a,b) => a-b);

  let rba2024_index = 0;
  
  let result = {};
  
  let today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 1; i <= 13; i++){
    while ( today >= rba2024[rba2024_index] ) {
      rba2024_index ++;
    } 
    result[i] = [toDateString(rba2024[rba2024_index]), toDateString(rba2024[rba2024_index + 1])];
    rba2024_index ++;
  }
  return result;
}

module.exports.round = round; 
function round(n, d) {
  // Round n to d decimal places
  // This returns a number, not a string

  let r = +(Math.round(n + `e+${d}`) + `e-${d}`);
  return r;
}

module.exports.roundToNearest = roundToNearest; 
function roundToNearest(n, v) {
  // round n to the nearest v value
  // 1 no dp, 2 for 0.5, 100 for 2 dp, 1000 for 3dp ...

  return Math.round(n * v) / v;
}

// Formats a date to the following format "YYYY-mm-dd"
function timestampToISODate (s) {
  const date = new Date(s);

  return convertDateToString(date);
}

// converts a date object to the following format: "YYYY-mm-dd" in the
// current timezone
function convertDateToString(date) {
  if(!date) {
    return '';
  }

  date = new Date(date);

  const offset = date.getTimezoneOffset();
  let d = new Date(date.getTime() - (offset * 60 * 1000));

  return d.toISOString().split('T')[0];
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
module.exports.addDays = addDays;
function addDays(date, days, product=null) {

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
module.exports.addMonths = addMonths;
function addMonths(date, months,product=null) {
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
module.exports.addYears = addYears;
function addYears(date, years,product=null) {
  if(!date) {
    return null;
  }
  let result = new Date(date);
  result.setFullYear(result.getFullYear() + +years);

  rollDateForward(result,product);
  return result;
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
    if ([7,8,,28,29,30,31,32].includes(product)) { _holidays = _holidays.concat(usHoliday).sort((a,b) => a - b);}
    
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
module.exports.isBusinessDay = isBusinessDay;
function isBusinessDay(date, product=null) {
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

function toEFPSPSTenor (start_date) {
  let monthSymbols = {2: "H", 5: "M", 8: "U", 11: "Z"};
  let months = {2: "Mar", 5: "Jun", 8: "Sep", 11: "Dec"};
  let date = new Date(start_date);
  if (!monthSymbols[date.getMonth()] || !months[date.getMonth()]) return null;
  return "IR" + monthSymbols[date.getMonth()] + date.getFullYear().toString()[3] + " " + months[date.getMonth()];
}

/**
 * Adds a tenor to a date.
 * If the new date falls on a weekend, or a NSW public holiday, rolls the date
 * forward until it is a business day
 * @param {string} tenor
 * @param {Date} date
 * @returns {date}
 */
module.exports.addTenorToDate = function (tenor, date) {
  if(!tenor || !date) {
    return;
  }

  if(!isTenor(tenor)) {
    return;
  }

  let [prefix, suffix] = breakTenor(tenor);

  let result;
  switch(suffix) {
    case 'y':
      result = addYears(new Date(date), parseInt(prefix));
      break;
    case 'm':
      result = addMonths(new Date(date), parseInt(prefix));
      break;
    case 'w':
      result = addDays(new Date(date), parseInt(prefix) * 7);
      break;
    case 'd':
      result = addDays(new Date(date), parseInt(prefix));
      break;
  }

  return result;
}

// Returns true if passed in tenor is a day, week, month or year tenor (1d, 1w, 1m, 1y)
function isTenor(tenor) {
  return /^((?:\d)+(d|w|m|y)?)|ON$/gi.test(tenor);
}

/**
 * Splits a single tenor into its number, and its suffixed duration character
 * @param {string} tenor
 * @returns {[string, string]}
 */
function breakTenor(tenor) {
  if(typeof tenor !== 'string') {
    return [undefined, undefined];
  }

  let regex = /d|w|m|y/gi;
  let suffix = tenor.match(regex)?.[0];
  let prefix = tenor.split(suffix)[0];
  return [prefix, suffix ?? 'y'];
}