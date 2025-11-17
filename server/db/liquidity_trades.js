'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');
  
module.exports.refreshLiquidityTrades = async function (broker_id) {
  const permission = await query(`SELECT broker_id, permission -> 'Not Anonymous' AS anonpermission FROM brokers WHERE broker_id = $1`,[broker_id]);
  const trades = await query('SELECT * FROM trades_api ORDER BY timestamp ASC');
  let data = trades.rows;
  if(!permission.rows[0].anonpermission){
    data.forEach(row => {
      row.markit_id = "XXXXXXXX";
      row.trade_id_ov = "TRADE-XXXXXXXXXX";
    });
  }
  return data;
};

// Returns the amount of trades in the database

const liquidityCount = async function () {
  let qs = "SELECT count(*) FROM trades_api";

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
module.exports.tradeCount = liquidityCount;

// Returns the amount of trades in the database that occured in the current month

const liquidityThisMonth = async function () {
  let qs = ` SELECT count(*) FROM trades_api
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
module.exports.tradesThisMonth = liquidityThisMonth;

const liquidityToday = async function () {
  let qs = ` SELECT count(*) FROM trades_api
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
module.exports.tradesToday = liquidityToday;

const liquidityPending = async function () {
  let qs = ` SELECT count(*) FROM trades_api
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
module.exports.tradesPending = liquidityPending;

module.exports.getAllLiquidityCounts = async function () {
  return {
    total: await liquidityCount(),
    monthly: await liquidityThisMonth(),
    daily: await liquidityToday(),
    pending: await liquidityPending(),
  };
};