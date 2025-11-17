'use strict';

const { makeQueryArrays, query } = require('.');
const { daily_brokerage_report } = require('../email_handler');
const { genericToTenor, isBusinessDay, addTenorToDate, getRbaRuns, addMonths, toTenor } = require('../utils/formatter');
const { logger } = require('../utils/logger.js');
const config = require('../../config.json');

module.exports.refreshTrades = async function (broker_id) {
  const permission = await query(`SELECT broker_id, permission -> 'Not Anonymous' AS anonpermission FROM brokers WHERE broker_id = $1`,[broker_id]);
  const latest_orders = await query('SELECT * FROM trades ORDER BY timestamp ASC');
  let data = latest_orders.rows;
  if(!permission.rows[0].anonpermission){
    data.forEach(row => {
      row.markit_id = "XXXXXXXX";
      row.trade_id_ov = "TRADE-XXXXXXXXXX";
    });
  }
  return data;
};

module.exports.insertTickets = async function (tickets) {
  // Loop over the array of trades and insert them in the database in separate
  // transactions.

  const rows = [];
  var pg_row;

  // Loop over the array and update each order in the database.
  for (let ticket of tickets.tickets) {
    pg_row = await insertTicket(ticket);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of inserted trades

  return rows;
};

// Returns the amount of trades in the database

const tradeCount = async function () {
  let qs = "SELECT count(*) FROM trades";

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
module.exports.tradeCount = tradeCount;

// Returns the amount of trades in the database that occured in the current month

const tradesThisMonth = async function () {
  let qs = ` SELECT count(*) FROM trades
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
module.exports.tradesThisMonth = tradesThisMonth;

const tradesToday = async function () {
  let qs = ` SELECT count(*) FROM trades
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
module.exports.tradesToday = tradesToday;

const tradesPending = async function () {
  let qs = ` SELECT count(*) FROM trades
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
module.exports.tradesPending = tradesPending;

module.exports.getAllTradeCounts = async function () {
  return {
    total: await tradeCount(),
    monthly: await tradesThisMonth(),
    daily: await tradesToday(),
    pending: await tradesPending(),
  };
};

async function insertTicket(ticket) {

  // add trader id fields
  const bid_trader_id = await query(`SELECT trader_id FROM orders WHERE "order_id" = ${ticket.bid.order_id}`);
  const offer_trader_id = await query(`SELECT trader_id FROM orders WHERE "order_id" = ${ticket.offer.order_id}`);
  ticket.bid_trader_id = bid_trader_id.rows[0].trader_id;
  ticket.offer_trader_id = offer_trader_id.rows[0].trader_id;

  // Initialise the query string and array.

  let maturity;
  switch (ticket.product_id) {
    case 17:
    case 27:
      let start = new Date(ticket.start_date);
      maturity = addMonths(start, 3);
      maturity.setDate(1);
      // eslint-disable-next-line no-constant-condition
      while (true){
        if (maturity.getDay() == 5) break;
        maturity.setDate(maturity.getDate() + 1);
      }
      maturity.setDate(maturity.getDate() + 6);
      break;
    case 20:
      maturity = new Date((await getRbaRuns())[ticket.year - 1000][1]);
      break;
    default:
      maturity = addTenorToDate(toTenor([ticket.year]), ticket.start_date);
      break;
  }

  let a = [ticket.offer.order_id, ticket.bid.order_id, ticket.bic_offer.id, ticket.bic_bid.id, maturity];
  let f = ['offer_order_id', 'bid_order_id', 'offer_bic_id', 'bid_bic_id', 'maturity_date'];
  let v = ['$1', '$2', '$3', '$4', '$5'];

  makeQueryArrays(ticket, a, f, v, ['offer', 'bid', 'bic_bid', 'bic_offer', 'fx', 'fixed_leg', 'floating_leg', 'fwd', 'offer_fut_acc', 'bid_fut_acc', 'vconSender']);

  // Assemble the insert query string

  let qs = 'INSERT INTO trades (';
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
/**
 * This function deprecated as Oneview RestApi is no longer available. Maybe used in another occasion. 
 * @param {*} trade_ov_id 
 * @param {*} product_type 
 * @returns 
 */
module.exports.updateTradeOvId = async function updateTradeOvId(trade_ov_id, product_type) {
  // logger.info(trade_ov_id, product_type);
  
  // reverse the order ID;
  await trade_ov_id.reverse();
  
  // Assemble the insert query string
  let table;
  let column;
  switch (product_type) {
    case 'SwaptionStraddle':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'SwaptionRecievers':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'SwaptionPayers':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'RBAOISSwaption':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'RBAOISSwaptionPayers':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'RBAOISSwaptionReceivers':
      table = 'swaption_orders';
      column = 'order_id';
      break;
    case 'SPS30D':
      return;
    default:
      table = 'trades';
      column = 'trade_id';
      break;
  }
  let v ="";
  for (let n in trade_ov_id) {
    v += "('";
    v += trade_ov_id[n];
    v += "',";
    v += ++n; 
    v += "),";
  }
  let qs = 
    `   UPDATE ${table} as t SET 
       	trade_id_ov = c.new_value 
       	FROM ( VALUES 
         	${v.slice(0, -1)}
      ) AS c(new_value, id_)
       	WHERE ${column} IN(
       		Select ${column} from (
       			SELECT *,row_number() over (order by ${column} desc )  
       			FROM  ${table} ORDER BY ${column} DESC FETCH FIRST ${trade_ov_id.length} ROWS ONLY
       			) x where row_number = c.id_);`;
  // Now execute the query
  logger.info(qs, v);
  let rows;
  try {
    const pg_result = await query(qs);
    rows = pg_result.rows;
    logger.info(rows);
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
};
/**
 * This function is used to received Message from markitwire and then parse markit id and markit status to trades Table
 * @param {*} product_type 
 * @param {*} trade_id_ov 
 * @param {*} markit_id 
 * @param {*} markit_status 
 * @returns 
 */
module.exports.updateTradeMwId = async function updateTradeMwId(product_type,trade_id_ov, markit_id, markit_status, mw_message, comments) {
  let table;
  switch (product_type) {
    case 'SwaptionStraddle':
      table = 'swaption_orders';
      break;
    case 'SwaptionRecievers':
      table = 'swaption_orders';
      break;
    case 'SwaptionPayers':
      table = 'swaption_orders';
      break;
    case 'RBAOISSwaption':
      table = 'swaption_orders';
      break;
    case 'RBAOISSwaptionPayers':
      table = 'swaption_orders';
      break;
    case 'RBAOISSwaptionReceivers':
      table = 'swaption_orders';
      break;
    case 'SPS30D':
      table = 'trades_api';
      break;
    case 'SPS90D':
    case 'RBAOIS':
      if (comments == 'POTL') {table = 'trades_api';} else {table='trades';}
      break;
    default:
      table = 'trades';
      break;
  }

  // Checking markitwire status
  let qs_checking_status = `SELECT markit_status FROM ${table}
    WHERE trade_id_ov='${trade_id_ov}'`;
  
  // Assemble the insert query string
  let qs = 
    `   UPDATE ${table} 
       	SET markit_id=${markit_id? markit_id : null}, markit_status='${markit_status??''}'
        WHERE trade_id_ov='${trade_id_ov}' RETURNING *`;
  
  // Now execute the query
  console.log(qs);
  let rows;
  try {
    let pg_result_checking_status = await query(qs_checking_status);
    // Limit overupdating from markitwire 
    console.log(pg_result_checking_status.rows)
    if (pg_result_checking_status.rows[0].markit_status !== 'Accepted/Affirmed/Released') {
      try {
        const pg_result = await query(qs);
        rows = pg_result.rows;
        if(rows.length > 0) {
          rows.forEach((row, index) => {
            row.table = table;
            rows[index] = row;
            row.message = mw_message;
          });
        }
      } catch (e) {
        logger.error(e.message);
      }
    }
    console.log(rows);
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
};
module.exports.insertTradesAPI = async function (trades, user) {
  // Loop over the array of trades and insert them in the database in separate
  // transactions.

  const rows = [];
  var pg_row;

  // Loop over the array and update each order in the database.
  for (let trade of trades) {
    try {
      pg_row = await insertTrade(trade, user);
      if (pg_row.length !== 0) {
        rows.push(pg_row[0]);
      }

    } catch(e) {
      console.error(e);
    }
  }

  // Return the array of inserted trades

  return trades;
};
/**
 * This function is used to insert trades from Potrade Liquidity to Trades_api table
 * @param {*} trade 
 * @param {Integer} user
 * @returns 
 */
async function insertTrade(trade, user) {
  
  // add trader id fields
  const broker = await query(`SELECT broker_id FROM brokers WHERE username='${user}'`);
  let trade_id = await query(`SELECT max(trade_id) from trades_api`);
  trade.updatedUser = broker.rows[0].broker_id;
  trade.trade_id = ++trade_id.rows[0].max;
  trade.trade_id_ov = "TRADE-" + new Date().getTime() + "-"+`${trade.trade_id}`;
  trade.comments = "POTL";
  // Initialise the query string and array.

  let a = [];
  let f = [];
  let v = [];
  console.log(trade);
  makeQueryArrays(trade, a,f,v, ['objectType', 'stateCode','comments']);

  // Assemble the insert query string
  let qs = 'INSERT INTO trades_api (';
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

module.exports.generateEODReport = async function generateEODReport () {

  let email = config.reconcilliation.email;

  if (!email || !isBusinessDay(new Date())) return;

  let result = await query(`
    SELECT p.product, t.product_id, t.trade_id_ov, t.year, t.offer_brokerage, t.bid_brokerage, t.currency, t.timestamp, o.fwd, t.start_date, b_bid.bank as bid_bank, b_offer.bank as offer_bank
    FROM trades t
    JOIN products p ON t.product_id = p.product_id
    JOIN bank_divisions bd_offer ON t.offer_bank_division_id = bd_offer.bank_division_id
    JOIN banks b_offer ON bd_offer.bank_id = b_offer.bank_id
    JOIN bank_divisions bd_bid ON t.bid_bank_division_id = bd_bid.bank_division_id
    JOIN banks b_bid ON bd_bid.bank_id = b_bid.bank_id
    JOIN orders o ON t.offer_order_id = o.order_id
    WHERE t.timestamp > now() - interval '24 hours'
    AND NOT bd_offer.bank_division_id = ANY(ARRAY[12, 13, 14])
    AND NOT bd_bid.bank_division_id = ANY(ARRAY[12, 13, 14])
    AND (t.markit_status <> 'Failed' OR t.markit_status is null);  
  `);
  let monthlyTotal = (await query(`
    SELECT (SUM(offer_brokerage) + SUM(bid_brokerage)) as total
    FROM trades
    WHERE date_trunc('month', (TIMEZONE('Australia/Sydney', timestamp))) = date_trunc('month', (TIMEZONE('Australia/Sydney', current_timestamp)))
    AND NOT offer_bank_division_id = ANY(ARRAY[12, 13, 14])
    AND NOT bid_bank_division_id = ANY(ARRAY[12, 13, 14])
    AND (markit_status <> 'Failed' OR markit_status is null)`
  )).rows[0].total ?? 0;

  let trades = result.rows;
  let grandTotal = 0;
  let bankTotals = {};
  let tradeTotals = [];

  let groupedTrades = {};
  for (let trade of trades) {
    grandTotal += (trade.bid_brokerage + trade.offer_brokerage);

    if (!bankTotals[trade.bid_bank]) bankTotals[trade.bid_bank] = {brokerage: 0, trade_count: 0}
    if (!bankTotals[trade.offer_bank]) bankTotals[trade.offer_bank] = {brokerage: 0, trade_count: 0}

    if (trade.bid_brokerage) {bankTotals[trade.bid_bank].brokerage += trade.bid_brokerage; bankTotals[trade.bid_bank].trade_count++;}
    if (trade.offer_brokerage) {bankTotals[trade.offer_bank].brokerage += trade.offer_brokerage; bankTotals[trade.offer_bank].trade_count++;}
          
    let group = trade.trade_id_ov.split('-')[2];
    if (!groupedTrades[group]) groupedTrades[group] = [];
    groupedTrades[group].push(trade);
  }

  for (let [key, group] of Object.entries(groupedTrades)) {

    group.sort((a, b) => {return a.year - b.year;});

    let tenorFields = {years: [], start_date: group[0].start_date, product_id: group[0].product_id, fwd: group[0].fwd};
    let brokerage = 0;
    let currency = group[0].currency;
    let product = group[0].product;
    let time = new Date(group[0].timestamp).toLocaleTimeString()

    for (let trade of group) {
      tenorFields.years.push(trade.year);
      brokerage += (trade.bid_brokerage + trade.offer_brokerage);
    }

    tradeTotals.push({tenor: await genericToTenor(tenorFields), brokerage, currency, product, time});
  }

  daily_brokerage_report(email, {grandTotal, bankTotals, tradeTotals, monthlyTotal});
}