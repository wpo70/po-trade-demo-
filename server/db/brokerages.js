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


module.exports.getMonthsTotalBrokerage = async function () {
  // get the total monthly brokerage
  // cols: bank_id, monthly_brokerage_sum, monthly_trade_count, swaption_monthly_brokerage_sum, swaption_monthly_trade_count
  //    if no trades during current month, there will be no row for the given id
  let qs = "SELECT COALESCE(sw.bank_id, op.bank_id) AS bank_id, COALESCE(sw.monthly_brokerage_sum, 0) AS monthly_brokerage_sum, " 
          + "COALESCE(sw.monthly_trade_count, 0) AS monthly_trade_count, COALESCE(op.swaption_monthly_brokerage_sum, 0) AS swaption_monthly_brokerage_sum, "
          + "COALESCE(op.swaption_monthly_trade_count, 0) AS swaption_monthly_trade_count FROM (";
  qs += createLargeQS(false);
  qs += ") sw FULL JOIN (";
  qs += createLargeQS(true);
  qs += ") op ON sw.bank_id = op.bank_id WHERE sw.monthly_trade_count IS NOT NULL OR op.swaption_monthly_trade_count IS NOT NULL";

  let rows;

  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }

  // update the db values (also resets the monthly data for those that haven't traded this month)
  try {
    let all_rows = rows;
    let banks_w_mth_trades = rows.map(i => i.bank_id);
    let all_b_ids = (await query("SELECT bank_id FROM public.brokerages")).rows.map(i => i.bank_id);
    let banks_wo_mth_trades = all_b_ids.filter(f => !banks_w_mth_trades.includes(f));
    for (let id of banks_wo_mth_trades) {
      all_rows.push({ bank_id: id, monthly_brokerage_sum: 0, monthly_trade_count: 0, swaption_monthly_brokerage_sum: 0, swaption_monthly_trade_count: 0});
    }
    for (let r of all_rows) {
      await updateMonthsTotalBrokerage(r);
    }
  } catch (err) {
    logger.error(err.message);
    logger.error('Failed to update brokerage in db');
  }

  return rows;
};

function createLargeQS(isSwaption) {
  let fields;
  if (isSwaption) {
    fields = {
      table: "public.swaption_orders",
      prefix: "swaption_",
      cptyA: "buyer",
      cptyB: "seller",
      division: "",
    };
  } else {
    fields = {
      table: "public.trades",
      prefix: "",
      cptyA: "bid",
      cptyB: "offer",
      division: "_id",
    };
  }
  
  let subq_a = `(SELECT SUM(${fields.cptyA}_brokerage) as ${fields.cptyA}_bro_sum, COUNT(${fields.cptyA}_brokerage) as ${fields.cptyA}_bro_count, `
                +  `${fields.cptyA}_bank_division${fields.division} FROM ${fields.table} `
                +  "WHERE EXTRACT(MONTH FROM timestamp AT TIME ZONE '-10') = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10') "
                +  "AND EXTRACT(YEAR FROM timestamp AT TIME ZONE '-10') = EXTRACT(YEAR FROM NOW() AT TIME ZONE '-10') "
                +  `GROUP BY ${fields.cptyA}_bank_division${fields.division}) a`;

  let subq_b = `(SELECT SUM(${fields.cptyB}_brokerage) as ${fields.cptyB}_bro_sum, COUNT(${fields.cptyB}_brokerage) as ${fields.cptyB}_bro_count, `
              +  `${fields.cptyB}_bank_division${fields.division} FROM ${fields.table} ` 
              +  "WHERE EXTRACT(MONTH FROM timestamp AT TIME ZONE '-10') = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10') "
              +  "AND EXTRACT(YEAR FROM timestamp AT TIME ZONE '-10') = EXTRACT(YEAR FROM NOW() AT TIME ZONE '-10') "
              +  `GROUP BY ${fields.cptyB}_bank_division${fields.division}) b`;

  let subq_z = `(SELECT COALESCE(b.${fields.cptyB}_bank_division${fields.division}, a.${fields.cptyA}_bank_division${fields.division}) as bank_division${fields.division}, `
            + `(COALESCE(b.${fields.cptyB}_bro_sum, 0) + COALESCE(a.${fields.cptyA}_bro_sum, 0)) as ${fields.prefix}monthly_brokerage_sum, `
            + `(COALESCE(b.${fields.cptyB}_bro_count, 0) + COALESCE(a.${fields.cptyA}_bro_count, 0)) as ${fields.prefix}monthly_trade_count `
            + `FROM ${subq_a} FULL JOIN ${subq_b} `
            + `ON (b.${fields.cptyB}_bank_division${fields.division} = a.${fields.cptyA}_bank_division${fields.division})) z`;

  let qs = `SELECT d.bank_id, SUM(z.${fields.prefix}monthly_brokerage_sum) AS ${fields.prefix}monthly_brokerage_sum, SUM(z.${fields.prefix}monthly_trade_count) AS ${fields.prefix}monthly_trade_count `
          + `FROM public.bank_divisions d RIGHT JOIN ${subq_z} `
          + `ON d.bank_division_id = z.bank_division${fields.division} GROUP BY d.bank_id ORDER BY d.bank_id ASC`;

  return qs;
}

async function updateMonthsTotalBrokerage(data) {
  let qs = `UPDATE brokerages SET monthly_brokerage_sum = ${data.monthly_brokerage_sum}, monthly_trade_count = ${data.monthly_trade_count}`
        +  `, swaption_monthly_brokerage_sum = ${data.swaption_monthly_brokerage_sum}, swaption_monthly_trade_count = ${data.swaption_monthly_trade_count}`;
  if (data.monthly_brokerage_sum) {
    qs += `, month = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')`;
  } else {
    qs += ', month = 0';
  }
  if (data.swaption_monthly_brokerage_sum) {
    qs += `, swaption_month = EXTRACT(MONTH FROM NOW() AT TIME ZONE '-10')`;
  } else {
    qs += ', swaption_month = 0';
  }
  qs += ` WHERE bank_id = ${data.bank_id}`;
  qs += ' RETURNING *';

  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}