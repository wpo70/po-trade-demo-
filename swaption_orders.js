'use strict';

const { makeQueryArrays, query } = require(".");
const { logger } = require("../utils/logger");

module.exports.refreshSwaptionOrders = async function (broker_id) {
  const permission = await query(`SELECT broker_id, permission -> 'Not Anonymous' AS anonpermission FROM brokers WHERE broker_id = $1`,[broker_id]);
  let latest_orders = await query('SELECT * FROM swaption_orders ORDER BY timestamp ASC');
  let data = latest_orders.rows;
  if(!permission.rows[0].anonpermission){
    data.forEach(row => {
      row.markit_id = "XXXXXXXX";
      row.trade_id_ov = "TRADE-XXXXXXXXXX";
    });
  }
  return data;
};

module.exports.insertSwaptionOrder = async function (orders) {

  const rows = [];
  var pg_row;

  // Loop over the array and add each order to the database, returning its ID.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let order of orders) {
    pg_row = await insert_order(order, 'swaption_orders');
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return an array of orders

  return rows;
};

const swaptionsCount = async function () {
  let qs = "SELECT count(*) FROM swaption_orders";

  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
  }

  return rows[0].count;
};
module.exports.swaptionsCount = swaptionsCount;

// Returns the amount of trades in the database that occured in the current month

const swaptionsThisMonth = async function () {
  let qs = ` SELECT count(*) FROM swaption_orders
    WHERE EXTRACT(MONTH FROM timestamp AT TIME ZONE '-10') = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')
    AND EXTRACT(YEAR FROM timestamp AT TIME ZONE '-10') = EXTRACT(YEAR FROM NOW() AT TIME ZONE '-10');`;

  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
  }

  return rows[0].count;
};
module.exports.swaptionsThisMonth = swaptionsThisMonth;

const swaptionsToday = async function () {
  let qs = ` SELECT count(*) FROM swaption_orders
    WHERE EXTRACT(MONTH FROM timestamp AT TIME ZONE '-10') = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')
    AND EXTRACT(YEAR FROM timestamp AT TIME ZONE '-10') = EXTRACT(YEAR FROM NOW() AT TIME ZONE '-10')
    AND EXTRACT(DAY FROM timestamp AT TIME ZONE '-10') = EXTRACT(DAY FROM NOW() AT TIME ZONE '-10');`;

  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
  }
  return rows[0].count;
};
module.exports.swaptionsToday = swaptionsToday;

const swaptionsPending = async function () {
  let qs = ` SELECT count(*) FROM swaption_orders
    WHERE markit_status != 'Accepted/Affirmed/Released' OR markit_status IS NULL;`;

  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
  }
  return rows[0].count;
};
module.exports.swaptionsPending = swaptionsPending;

module.exports.getAllSwaptionCounts = async function () {
  return {
    total: await swaptionsCount(),
    monthly: await swaptionsThisMonth(),
    daily: await swaptionsToday(),
    pending: await swaptionsPending(),
  };
};

async function insert_order(order, table_name) {

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(order, a, f, v, ['order_id',  'bic_buyer', 'bic_seller']);

  let qs;
  qs = `INSERT INTO ${table_name} (`;
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') RETURNING *';

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
