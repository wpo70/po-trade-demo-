'use strict';


const { makeQueryArrays, query } = require(".");
const { logger } = require("../utils/logger");

module.exports.insertSwaptionQuotes = async function (quotes) {

  const rows= [];
  var pg_row;

  // Loop over the array and add each quote to the database, returning its ID.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let quote of quotes) {
    pg_row = await insert_quote(quote);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return an array of quotes

  return rows;
};

async function insert_quote(quote) {

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(quote, a, f, v, ['swaption_quote_id']);

  let qs;
  qs = 'INSERT INTO swaption_quotes (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') ON CONFLICT ON CONSTRAINT swaption_quotes_swap_year_option_year_key';
  qs += ' DO UPDATE SET ';
  qs += f.map((val, idx) => val + '=' + v[idx]).join(',');
  qs += ' RETURNING *';

  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query : %s', qs);
    rows = [];
  }

  return rows;
}

