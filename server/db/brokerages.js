'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.updateBrokerages = async function (brokerages) {
  // update each brokerage found in brokerages

  let rows = [];
  let pg_row;

  for (let brokerage of brokerages) {
    pg_row = await update_brokerage(brokerage);
    if (pg_row.length !== 0) {
      rows = rows.concat(pg_row);
    }
  }

  return rows;
};

async function update_brokerage (brokerage) {
  // Initialise the query string and arrays

  let a = [brokerage.bank_id];
  let f = ['trade_count', 'brokerage_sum'];
  let v = ['trade_count + 1', 'brokerage_sum + ' + brokerage.brokerage];

  // Assemble the update brokerage query string

  let qs = 'UPDATE brokerages SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE bank_id = $1 RETURNING *';

  let rows;
  if (brokerage?.isSwaption) {
    rows = handleSwaptionBrokerageQuery(brokerage, qs, a);
  } else {
    rows = handleBrokerageQuery(brokerage, qs, a);
  }
  return rows;
}

async function handleBrokerageQuery(brokerage, qs, a) {
  try {
    let pg_result = await query(qs, a);
    if (pg_result.rows.length > 0) {
      qs = 'UPDATE brokerages SET ';
      if (pg_result.rows[0].month != (new Date().getMonth() + 1)) {
        qs += `monthly_brokerage_sum = ${brokerage.brokerage}`;
        qs += ', monthly_trade_count = 1';
        qs += `, month = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')`;
      } else {
        qs += `monthly_brokerage_sum = monthly_brokerage_sum + ${brokerage.brokerage} `;
        qs+= ', monthly_trade_count = monthly_trade_count + 1 ';
      }
      qs += 'WHERE bank_id = $1 RETURNING *';
      pg_result = await query(qs, a);
    }
    return pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    return [];
  }
}

async function handleSwaptionBrokerageQuery(brokerage, qs, a) {
  try {
    let pg_result = await query(qs, a);
    if (pg_result.rows.length > 0) {
      qs = 'UPDATE brokerages SET ';
      if (pg_result.rows[0].swaption_month != (new Date().getMonth() + 1)) {
        qs += `swaption_monthly_brokerage_sum = ${brokerage.brokerage}`;
        qs += ', swaption_monthly_trade_count = 1';
        qs += `, swaption_month = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')`;
      } else {
        qs += `swaption_monthly_brokerage_sum = swaption_monthly_brokerage_sum + ${brokerage.brokerage} `;
        qs += ', swaption_monthly_trade_count = swaption_monthly_trade_count + 1 ';
      }
      qs += 'WHERE bank_id = $1 RETURNING *';
      pg_result = await query(qs, a);
    }
    return pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    return [];
  }
}

module.exports.updateMonthsTotalBrokerage = async function () {
  try {
    await query("call update_months_total_brokerages()");
  } catch (err) {
    logger.error("Major Error: Failed to update months brokerage totals");
  }
}