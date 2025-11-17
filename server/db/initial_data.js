'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');
const { refreshTrades, tradeCount, tradesThisMonth, tradesToday, tradesPending } = require('./trades.js');
const { refreshLiquidityTrades, getAllLiquidityCounts } = require ('./liquidity_trades.js');
const { getMonthsTotalBrokerage } = require('./brokerages.js');
const { getInitPrefs } = require('./preferences.js');
const { refreshSwaptionOrders, swaptionsCount, swaptionsThisMonth, swaptionsToday, swaptionsPending } = require('./swaption_orders.js');
const { getUserCustomWBs } = require('./custom_whiteboards');
const { getAllConfos } = require('./confos');


module.exports.initialData = async function (broker_id) {
  // Prepare a response with all of the initial data that the client needs to
  // get going.

  var app_response = {};
  var pg_result;

  try {
    // Get the user details

    pg_result = await query('SELECT * FROM broker_list WHERE broker_id = $1', [broker_id]);
    app_response = { user: pg_result.rows[0] };

    // Get the array of products

    pg_result = await query('SELECT * FROM products where active = true ORDER BY product_id');
    app_response.init_products = pg_result.rows;

    // Get the banks

    pg_result = await query('SELECT * FROM banks');
    app_response.init_banks = pg_result.rows;

    // Get the bic

    pg_result = await query('SELECT * FROM bic');
    app_response.init_bic = pg_result.rows;

    // Get the brokers

    pg_result = await query('SELECT * FROM broker_list');
    app_response.init_brokers = pg_result.rows;

    //Get the broker preferences

    pg_result = await getInitPrefs(broker_id, app_response.init_products);
    app_response.init_prefs = pg_result;

    // Get the brokers custom whiteboards

    pg_result = await getUserCustomWBs(broker_id);
    app_response.init_custom_wbs = pg_result;

    // Get the traders

    pg_result = await query('SELECT * FROM live_traders');
    app_response.init_traders = pg_result.rows;

    // Get all quotes

    pg_result = await query('SELECT * FROM quotes');
    app_response.init_quotes = pg_result.rows;

    // Get all swaption quotes

    pg_result = await query('SELECT * FROM swaption_quotes');
    app_response.init_swaption_quotes = pg_result.rows;

    // Get all rba swaption quotes

    pg_result = await query('SELECT * FROM rba_swaption_quotes');
    app_response.init_rba_swaption_quotes = pg_result.rows;

    // Get all swaption orders

    pg_result = await refreshSwaptionOrders(broker_id);
    app_response.init_swaption_orders = pg_result;

    // Get all current orders

    pg_result = await query('SELECT * FROM live_orders');
    app_response.insert_orders = pg_result.rows;

    // Get all live swaption orders
    pg_result = await query('SELECT * FROM live_swaption_orders');
    app_response.insert_swaption_live_orders = pg_result.rows;

    // Get the brokerages

    pg_result = await query('SELECT * FROM brokerages');
    app_response.init_brokerages = pg_result.rows;

    // Get the interest_groups

    pg_result = await query('SELECT * FROM interest_groups');
    app_response.init_interest_groups = pg_result.rows;

    // Get tera bank information

    pg_result = await query('SELECT * FROM bank_divisions');
    app_response.init_bank_divisions = pg_result.rows;

    // Get the stored inputs for calculators

    pg_result = await query('SELECT * FROM calc_inputs');
    app_response.init_calc_inputs = pg_result.rows;

    // Get the confos

    app_response.init_confos = await getAllConfos();
    
    // Get the current pending reviews

    pg_result = await query('SELECT * FROM trade_reviews');
    app_response.init_trade_reviews = pg_result.rows;

    // Get the current notifications, if any
    pg_result = await query('SELECT * FROM notifications WHERE broker_id = $1', [broker_id]);
    app_response.init_notifications = pg_result.rows;

    // Get Liquidity Trades

    pg_result = await refreshLiquidityTrades(broker_id);
    app_response.init_liquidityTrades = pg_result;

    // Get the trades

    pg_result = await refreshTrades(broker_id);
    app_response.init_trades = pg_result;

    // Get the total number of trades

    pg_result = await tradeCount();
    app_response.trade_count = pg_result;

    // Get the total number of trades this month

    pg_result = await tradesThisMonth();
    app_response.monthly_trades = pg_result;

    // Get the total number of trades today

    pg_result = await tradesToday();
    app_response.daily_trades = pg_result;

    // Get total number of pending trades

    pg_result = await tradesPending();
    app_response.pending_trades = pg_result;

    // Get total number of swaptions

    pg_result = await swaptionsCount();
    app_response.swaptions_count = pg_result;

    // Get number of monthly swaptions

    pg_result = await swaptionsThisMonth();
    app_response.monthly_swaptions = pg_result;

    // Get number of daily swaptions

    pg_result = await swaptionsToday();
    app_response.daily_swaptions = pg_result;

    // Get number of pending swaptions

    pg_result = await swaptionsPending();
    app_response.pending_swaptions = pg_result;

    // Get all liquidity trade counts

    pg_result = await getAllLiquidityCounts();
    app_response.refresh_liquidity_counts = pg_result;

    // Get the swaption market structures

    pg_result = await query('SELECT * FROM swaption_market_structures ORDER BY id ASC');
    app_response.init_swaption_structure = pg_result.rows;

    // Get the fx rate

    pg_result = await query('SELECT * FROM fxrate');
    app_response.init_fxrate = pg_result.rows;

    // Get the rba dates

    pg_result = await query('SELECT * FROM rba_dates');
    app_response.init_rba_dates = pg_result.rows;

    // Get the eod emails 
    pg_result = await query('SELECT * FROM eod');
    app_response.init_eod = pg_result.rows;

  } catch (err) {
    logger.error('Initial data error: %s', err.message);
  }

  return app_response;
};