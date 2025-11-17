'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.insertOrders = async function (orders) {
  // Loop over the array of orders and add them to the database in separate
  // transactions.  Return all of the new order IDs.  Although this code allows
  // for an array of orders to be inserted, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and add each order to the database, returning its ID.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let order of orders) {
    pg_row = await insert_order(order);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of new order_ids.
  return rows;
};

module.exports.updateOrders = async function (orders) {
  // Loop over the array of orders and update them in the database in separate
  // transactions.  Return all of the new order IDs.  Although this code allows
  // for an array of orders to be inserted, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and update each order in the database.

  for (let order of orders) {
    pg_row = await update_order(order);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of new order_ids.
  return rows;
};

// To delete an order set the closed time.
// if no time was specified, use NOW()

module.exports.deleteOrders = async function (order_ids, time) {
  try {
    if (time)
      await query('UPDATE orders SET time_closed = ($2) WHERE order_id = ANY($1)', [order_ids, time]);
    else
      await query('UPDATE orders SET time_closed = NOW() WHERE order_id = ANY($1)', [order_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteOrders: %s', JSON.stringify(order_ids));
  }
};

// Update an order in the database.  ORDER is an object with properties matching
// the database orders table.

async function insert_order(order) {
  // Initialise the query string and array.

  let a = [];
  let f = [];
  let v = [];

  // The Bloomberg gateway will provide either or both of the yield and dv01.

  makeQueryArrays(order, a, f, v, ['order_id', 'offer_brokerage', 'bid_brokerage', 'objectType']);

  // Assemble the insert query string

  let qs;
  qs = 'INSERT INTO orders (';
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

// Update an order in the database.  ORDER is an object with properties matching
// the database orders table.

async function update_order(order) {
  // Initialise the query string and array.

  let a = [order.order_id];
  let f = [];
  let v = [];

  // The Bloomberg gateway will provide either or both of the yield and dv01.

  makeQueryArrays(order, a, f, v, ['order_id', 'objectType']);

  // Assemble the update query string

  let qs;
  qs = 'UPDATE orders SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE order_id = $1 RETURNING *';

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
