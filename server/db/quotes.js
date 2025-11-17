'use strict';

const { getClient, makeQueryArrays, query } = require('.');
const { logger } = require('../utils/logger.js');
const { getGeneralPreferences } = require('./preferences');
const { roundToNearest } = require('../utils/formatter');
const CustomSpline = require('../custom_spline');
  
// This function will update the currency type when give the message "get_currency"
// When currency is NZD, it will get the Quotes_NZD instead of quotes
// The quotes_NZD table will be periodically (per 5m) updated from the Bloomberg gateway

let quote_table_name = "quotes";

let calcIRS = true; // align with store calcIrs's value default at True
let lin_interp = true;
setCalculationBoolsFromPrefernce();

async function setCalculationBoolsFromPrefernce () {
  const gen_prefs = await getGeneralPreferences();
  calcIRS = gen_prefs.calcIRS;
  lin_interp = gen_prefs.interpchoice;
}

module.exports.setCalcIRS_quotes = function (bool = true) {
  calcIRS = bool;
};

module.exports.setLinearInterp = function (bool = true) {
  lin_interp = bool;
};

module.exports.updateQuotes = updateQuotes;
async function updateQuotes (quotes, _calcIRS = calcIRS) {
  // Loop over the array of indicators and add them to the database in a single
  // transaction.  This is a bulk initialisation of all quotes for a product.
  // The data has come from the Bloomberg gateway.
  // logger.info('In updateQuotes():\n %s', JSON.stringify(quotes));
  if (_calcIRS && quotes.some(q => q.product_id == 2)) {
    quotes = quotes.filter(q => q.product_id != 1 || q.year > 1);
  }

  let prodYears = {};
  let prodQuotes = {};
  for (let q of quotes ) {

    // Add flags for if the mids and dv01s are stale.
    q.mid_is_stale = !q.hasOwnProperty('mid');
    q.dv01_is_stale = !q.hasOwnProperty('dv01');

    if (!prodYears[q.product_id]) {
      prodYears[q.product_id] = [q.year];
      prodQuotes[q.product_id] = [q];
    } else {
      prodYears[q.product_id].push(q.year);
      prodQuotes[q.product_id].push(q);
    }
  }

  let needsSpline = {};
  for (let prod in prodYears) {
    let years = (await query(`SELECT year, mid, currency_code FROM quotes WHERE product_id = ${prod}`)).rows;
    for (let year of years) {
      if (!prodYears[prod].includes(year.year)) {
        let quote = {product_id: parseInt(prod), year: year.year, currency_code: year.currency_code, mid_is_stale: true, dv01_is_stale: true};
        if (calcIRS && prod == 1 && year.year <= 1) quote.mid = year.mid;
        prodQuotes[prod].push(quote); 
        needsSpline[prod] = true;
      } else {
        let quote = prodQuotes[prod][prodYears[prod].indexOf(year.year)];
        if (quote.mid == undefined || quote.dv01 == undefined) {
          needsSpline[prod] = true;
        }
      }
    }
  }

  quotes = [];
  for (let prod in prodQuotes) {
    if (needsSpline[prod]) quotes.push(...await interpolateQuotes(prodQuotes[prod]));
    else quotes.push(...prodQuotes[prod]);
  }

  // TODO: Store exact values in db and perform handling/rounding in front end
  // Loop through the array of indicators and changing the mid to an eighth of a basis point
  quotes.forEach((q)=>{
    if(q.mid !== undefined){
      if (q.product_id == 1 || q.product_id == 3 || q.product_id == 10 ||
      q.product_id == 14 || q.product_id == 20 || q.product_id == 21){
        let inv = 1.0 / 0.00125;
        q.mid = (Math.round(q.mid * inv) / inv).toFixed(5);
      } else if (q.product_id == 27){
        let inv = 1.0 / 0.00125;
        q.mid = (Math.round((100 - q.mid) * inv) / inv).toFixed(5);
      } else {
        let inv = 1.0 / 0.125;
        q.mid = (Math.round(q.mid * inv) / inv).toFixed(5);
      }
    }else{
      q.mid == 0;
    }
  });

  var rows = [];

  try {
    // Get a client connection to the database and start a transaction.

    const client = await getClient();
    await client.query('BEGIN');

    // Loop over the array and add each object to it.

    for (let quote of quotes) {
      const pg_row = await update_quote(client, quote);
      rows.push(pg_row);
    }

    // Commit the transaction and close the database connection.

    await client.query('COMMIT');
    await client.release();
  } catch (err) {
    logger.error('updateQuotes: %s', err.message);
  }

  if (_calcIRS && quotes.some(q => q.product_id == 2)) {
    let irsQuotes = await module.exports.calcImpliedIRS();
    let irsRows = await updateQuotes(irsQuotes, false);
    rows.push(...irsRows);
  }
  // Return the updated quotes.
  return rows;
}

module.exports.setFWDMids = async function (data, pid) {
  
  let columns, fwdsTenors;
  let caseWhenStr = ""
  let params = [];
  
  // Minimum size of 3x3 otherwise assume bad data 
  if (Object.values(data).length > 2) columns = Object.values(data);
  else return null;
  if (Object.values(columns[0]).length > 2) fwdsTenors = Object.values(columns[0]);
  else return null;
  
  columns.splice(0, 1) // Remove Header col
  fwdsTenors.splice(0, 1) // Remove null corner

  for (let i = 0; i < columns.length; i++) {
    let cells = Object.values(columns[i]);
    let year = tenorToYear(cells[0])[0];
    cells.splice(0, 1) // Remove Tenor cell

    let row = {}
    for (let j = 0; j < cells.length; j++) {
      row[tenorToYear(fwdsTenors[j])[0]] = cells[j]
    }
    caseWhenStr = caseWhenStr + ` WHEN ${year} THEN '${JSON.stringify(row)}'::json`;
  }

  let result = await query(`UPDATE ${quote_table_name} SET fwd_mids = (CASE year ${caseWhenStr} END) WHERE product_id = ${pid} RETURNING year, fwd_mids`);
  return result.rows;
}
/**
 * THis function used for sheet send fwd mids  via api
 * @param {*} data 
 * @param {*} pid 
 * @returns 
 */
module.exports.setFWDMids_Api = async function (data, pid) {
  let columns;
  // Minimum size of 3x3 otherwise assume bad data 
  if (Object.values(data).length > 2) columns = Object.values(data);
  else return null;
  let caseWhenStr ="";

  for (let i = 0; i < columns.length; i++) {
    let year =  columns[i]['0']
    delete columns[i]['0'];
    caseWhenStr = caseWhenStr + ` WHEN ${year} THEN '${JSON.stringify(columns[i])}'::json`;
  }

  let result = await query(`UPDATE ${quote_table_name} SET fwd_mids = (CASE year ${caseWhenStr} END) WHERE product_id = ${pid} RETURNING year, fwd_mids`);
  return result.rows;
}

function isTenor(tenor) {
  return /^((?:\d)+(d|w|m|y)?)|ON$/gi.test(tenor);
}

function tenorToYear (tenor) {

  tenor = tenor.toLowerCase();

  let years = [];
  if (tenor == 'on' || tenor == '1bd'){
    tenor = '1d';
  }
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

// Update a quote in the database using the CLIENT connection.  QUOTE is an
// object with properties matching the database quotes table: product_id, year,
// and optional one or more of yield and dv01.  The data has come from the
// Bloomberg gateway so reset the override field to NULL at the same time.

async function update_quote (client, quote) {
  // Initialise the query string and array.
  // logger.info('In update_quote():\n %s', JSON.stringify(quote));

  let a = [quote.product_id, quote.year, quote.currency_code];
  let f = [];
  let v = [];

  // If the provided quote has a mid then reset the override

  // if (quote.hasOwnProperty('mid')) {
  //   a.push(null);
  //   f.push('override');
  //   v.push('$4');
  // }

  // The Bloomberg gateway will provide either or both of the yield and dv01.

  makeQueryArrays(quote, a, f, v, ['product_id', 'year','currency_code']);

  // Assemble the update query string

  let qs;
  qs = `UPDATE ${quote_table_name} SET (`;
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE product_id = $1 AND year = $2 AND currency_code = $3 RETURNING *';

  // Now execute the query

  // logger.info(qs);
  var pg_result, row;
  try {
    pg_result = await client.query(qs, a);

    // Make sure a row was updated.  If not the combination of product_id and year
    // does not yet exist and an error is raised

    if (pg_result.rowCount !== 1 || !pg_result.hasOwnProperty('rows') || pg_result.rows.length !== 1) {
      throw new Error('An attempt to update the quotes table affected other than 1 row:', pg_result.rowCount);
    }

    row = pg_result.rows[0];
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
  }
  // logger.info('update_quote rows %d %s', pg_result.rowCount, JSON.stringify(row));

  // Return the updated row

  return row;
}

module.exports.overrideQuote = async function (override) {
  // Override the mid for a single quote.
  // The data has come from a client and should be refelected back to all clients.
  
  // Assemble the update query string
  let qs;
  qs = `UPDATE ${quote_table_name} SET override = $3 WHERE product_id = $1 AND year = $2 AND currency_code = $4 RETURNING *`;
  let a = [override.product_id, override.year,  override.override, override.currency_code];
  // Now execute the query and return the updated row.

  var rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
};

module.exports.getTickerSecurities = async function (ticker_securities) {
  // Prepare a response with all of the initial data that the client needs to
  // get going.

  try {
    let pg_result = await query('SELECT * FROM tickers ORDER BY ticker_id');

    // This is an asynchronous function, Fill the ticker array with the query
    // result.

    for (let row of pg_result.rows) {
      ticker_securities.push(row);
    }
  } catch (err) {
    logger.error('getTickerSecurities(): %s', err.message);
  }
};

module.exports.getEodSecurities = async function (eod_securities) {
  try {
    let test = await query(`SELECT security FROM quotes WHERE security <> ''`);
    for(let row of test.rows){
      eod_securities.push(row);
    }
  } catch (err) {
    logger.error('getEodSecurities: %s', err.message);
  }
};

module.exports.getQuotes = async function (product_id, currency_code) {
  var rows = null;
  try {
    let pg_result = await query(`SELECT * FROM ${quote_table_name} q WHERE q.product_id=$1 q.currency_code = $2 ORDER BY q.year`, [product_id, currency_code]);
    rows = pg_result.rows;
  } catch (err) {
    logger.error('getQuotes(): %s', err.message);
  }
  return rows;
};

// Exported differently so that getQuotesAtYears can be called in getMMP

async function getQuotesAtYears(product_id, years, currency_code) {
  var rows = null;
  try {
    let pg_result = await query(`SELECT * FROM ${quote_table_name} q WHERE q.product_id=$1 AND q.year=$2::double precision AND q.currency_code = $3 ORDER BY q.year`, [product_id, years, currency_code]);
    rows = pg_result.rows;
  } catch (err) {
    logger.error('getQuotesAtYears(): %s', err.message);
  }
  return rows;
}

module.exports.calcImpliedIRS = async function () {
  let efpQuotes = await query("SELECT * FROM quotes WHERE product_id = 2 ORDER BY year asc");
  let irsQuotes = await query("SELECT * FROM quotes WHERE product_id = 1 AND (year = 1 OR year = 0.75 OR year = 0.5) ORDER BY year asc");
  let futures = await query("SELECT last_mid FROM tickers WHERE property = 'xma' OR property = 'yma' ORDER BY property");

  let data = [];

  for (let q of irsQuotes.rows) {
    data.push({product_id: 1, year: q.year, mid: q.mid, currency_code: 'AUD', dv01: q.dv01});
  }

  for (let q of efpQuotes.rows) {
    let fut = q.year <= 5 ? futures.rows[1].last_mid : futures.rows[0].last_mid;
    let mid = roundToNearest(100 - fut + 0.01*(q.override ?? q.mid), 800);
    data.push({product_id: 1, year: q.year, mid: mid, currency_code: 'AUD', dv01: q.dv01});
  }

  let new_data = [];
  if (data.length == 0) {
    return new_data;
  } else {
    return await interpolateQuotes(data);
  }
}

async function interpolateQuotes (rows) {
  let overrides = await query(`SELECT year, override FROM quotes WHERE product_id = ${rows[0].product_id} AND override IS NOT NULL`);
  // Sort the data by start date
  let data = rows.slice();
  data.sort((a, b) => a.year - b.year);

  if (overrides.rows.length > 0){
    for (let row of overrides.rows) {
      for (let d of data) {
        if (d.year == row.year) {
          d.override = row.override; 
          break;
        } 
      }
    }
  }

  // Get the x and y values for the interpolation  
  let x1 = data.filter(row => row.mid != undefined || row.override != undefined).map(d => d.year);
  let y1 = data.filter(row => row.mid != undefined || row.override != undefined).map(d => d.override ?? d.mid);
  let x2 = data.filter(row => row.dv01 != undefined).map(d => d.year);
  let y2 = data.filter(row => row.dv01 != undefined).map(d => d.dv01);

  if (y1.length < 3 || y2.length < 3) return rows; // Not enough data to interpolate
  
  // Initialize the spline with the x and y values
  let midSpline = new CustomSpline(x1, y1, lin_interp);
  let dv01Spline = new CustomSpline(x2, y2, lin_interp);

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].dv01 == null && !rows[i].security) rows[i].dv01 = dv01Spline.at(rows[i].year);
    if (rows[i].mid == null && rows[i].override == null && !rows[i].security) rows[i].mid = midSpline.at(rows[i].year);
    if (isNaN(rows[i].mid)) delete rows[i].mid;
    if (isNaN(rows[i].dv01)) delete rows[i].dv01;
  }

  return rows;
}

module.exports.getPriceHistory = async function (years, pid, fwd, start) {
  let values = [years, pid, [9,10,11]];
  if (fwd != null) values.push(fwd);
  if (start) values.push(start);
  let result = await query(
    `SELECT DISTINCT CASE WHEN ts.trade_id is not null then true else false end traded, os.bank, os.bid, os.price, os.time_placed, os.order_id, os.product_id, os.reference, os.years${start ? ", os.start_date" : ""}${fwd != null ? ", os.fwd" : ""}
    From trades ts RIGHT OUTER JOIN 
      (SELECT o.*, b.bank from orders o JOIN traders t on o.trader_id = t.trader_id JOIN banks b on t.bank_id = b.bank_id 
      WHERE o.years = $1 ${fwd != null ? ("and (o.fwd = $4" + (start ? " or o.start_date = $5)" : ")")) : (start ? "and o.start_date = $4": "")} and o.product_id = $2 and o.eoi = false and o.time_closed is not null and not (b.bank_id = ANY($3))
      ORDER BY o.time_placed DESC LIMIT 5) os
    ON os.bid = true and ts.bid_order_id = os.order_id or os.bid = false and ts.offer_order_id = os.order_id
    ORDER BY os.time_placed DESC`, values);
  result.input_data = {years, product_id: pid, fwd, start_date: start};
  return result;
}

module.exports.getQuotesAtYears = getQuotesAtYears;