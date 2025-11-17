'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');


module.exports.insertTraders = async function (traders) {
  // Loop over the array of traders and add them to the database in separate
  // transactions.  Return all of the new traders.  Although this code allows
  // for an array of traders to be inserted, in practice they will only ever come
  // one at a time.

  const rows= [];
  var pg_row;

  // Loop over the array and add each trader to the database, returning itself.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let trader of traders) {
    pg_row = await insert_trader(trader);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of new traders.

  return rows;
};

module.exports.updateTraders = async function (traders) {
  // Loop over the array of traders and update them in the database in separate
  // transactions.  Return all of the new traders. Although this code allows
  // for an array of traders to be updated, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and update each trader in the database.

  for (let trader of traders) {
    pg_row = await update_trader(trader);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of updated traders.

  return rows;
};

// Deletes a trader from the database
// Returns an array of order ids deleted (if any orders need to be deleted to remove this trader)

module.exports.deleteTraders = async function (trader_ids) {

  let pg_result;
  try {
    await query('UPDATE traders SET active = false WHERE trader_id = ANY($1)', [trader_ids]);
    pg_result = await query('UPDATE orders SET time_closed = NOW() WHERE trader_id = ANY ($1) AND time_closed IS NULL RETURNING order_id;', [trader_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteTraders: %s', JSON.stringify(trader_ids));
  }

  return pg_result.rows.map((row) => row.order_id);
};

async function insert_trader(trader) {
  // Initialise the query string and array.

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(trader, a, f, v, ['trader_id']);

  // Assemble the insert query string

  let qs;
  qs = 'INSERT INTO traders (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') ON CONFLICT ON CONSTRAINT traders_ov_trader_id_key';
  qs += ' DO UPDATE SET ';
  qs += f.map((val, idx) => val + '=' + v[idx]).join(',');
  qs += ',active = true';
  qs += ' WHERE traders.active = false';
  qs += ' RETURNING *';

  // Now execute the query
  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}

async function update_trader(trader) {
  // Initialise the query string and array.

  let a = [trader.trader_id];
  let f = [];
  let v = [];

  makeQueryArrays(trader, a, f, v, ['trader_id']);

  // Assemble the update query string

  let qs;
  qs = 'UPDATE traders SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE trader_id = $1 RETURNING *';

  // Now execute the query
  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}
// Update report email
module.exports.updateReportEmail = async function (report) {
  // Initialise the query string and array.

  let a = [report[0].id];
  let f = [];
  let v = [];

  makeQueryArrays(report[0], a, f, v, ['id']);

  // Assemble the update query string

  let qs;
  qs = 'UPDATE eod SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE id = $1 RETURNING *';

  // Now execute the query
  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}

// Create report email
module.exports.insertReportEmail = async function (report) {
 // Initialise the query string and array.

 let a = [];
 let f = [];
 let v = [];

 makeQueryArrays(report[0], a, f, v, ['id']);

  // Assemble the insert query string

  let qs;
  qs = 'INSERT INTO eod (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') RETURNING *';

  // Now execute the query
  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}

module.exports.deleteReportEmails = async function (report_email_ids) {
  let rows;
  let pg_result;
  try {
    pg_result =await query('DELETE from eod WHERE id = ANY($1)', [report_email_ids]);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteReportEmails: %s', JSON.stringify(report_email_ids));
  }
  return rows;
};
