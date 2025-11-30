'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');
const { refreshTrades, tradeCount, tradesThisMonth, tradesToday, tradesPending } = require('./trades.js');
const { refreshLiquidityTrades, getAllLiquidityCounts } = require ('./liquidity_trades.js');
const { getMonthsTotalBrokerage } = require('./brokerages.js');
const { getInitPrefs } = require('./preferences.js');
const { refreshSwaptionOrders, swaptionsCount, swaptionsThisMonth, swaptionsToday, swaptionsPending } = require('./swaption_orders.js');
const { getUserCustomWBs } = require('./custom_whiteboards');

// Helper to safely execute queries and return empty array on error
async function safeQuery(queryString, params = []) {
  try {
    const result = await query(queryString, params);
    return result.rows || [];
  } catch (err) {
    logger.error(`Query failed: ${err.message}`);
    return [];
  }
}

// Helper to safely execute functions and return fallback on error
async function safeExecute(fn, fallback = []) {
  try {
    const result = await fn();
    return result || fallback;
  } catch (err) {
    logger.error(`Function failed: ${err.message}`);
    return fallback;
  }
}

module.exports.initialData = async function (broker_id) {
  var app_response = {};

  try {
    // Get the user details
    const user = await safeQuery('SELECT * FROM broker_list WHERE broker_id = $1', [broker_id]);
    app_response = { user: user[0] || {} };

    // Get the array of products
    app_response.init_products = await safeQuery('SELECT * FROM products where active = true ORDER BY product_id');

    // Get the banks
    app_response.init_banks = await safeQuery('SELECT * FROM banks');

    // Get the bic
    app_response.init_bic = await safeQuery('SELECT * FROM bic');

    // Get the brokers
    app_response.init_brokers = await safeQuery('SELECT * FROM broker_list');

    // Get the broker preferences
    app_response.init_prefs = await safeExecute(() => getInitPrefs(broker_id, app_response.init_products), []);

    // Get the brokers custom whiteboards
    app_response.init_custom_wbs = await safeExecute(() => getUserCustomWBs(broker_id), []);

    // Get the traders
    app_response.init_traders = await safeQuery('SELECT * FROM live_traders');

    // Get all quotes
    app_response.init_quotes = await safeQuery('SELECT * FROM quotes');

    // Get all swaption quotes
    app_response.init_swaption_quotes = await safeQuery('SELECT * FROM swaption_quotes');

    // Get all rba swaption quotes
    app_response.init_rba_swaption_quotes = await safeQuery('SELECT * FROM rba_swaption_quotes');

    // Get all swaption orders
    app_response.init_swaption_orders = await safeExecute(() => refreshSwaptionOrders(broker_id), []);

    // Get all current orders
    app_response.insert_orders = await safeQuery('SELECT * FROM live_orders');

    // Get all live swaption orders
    app_response.insert_swaption_live_orders = await safeQuery('SELECT * FROM live_swaption_orders');

    // Get the brokerages
    await safeExecute(() => getMonthsTotalBrokerage(), null);
    app_response.init_brokerages = await safeQuery('SELECT * FROM brokerages');

    // Get the interest_groups
    app_response.init_interest_groups = await safeQuery('SELECT * FROM interest_groups');

    // Get tera bank information
    app_response.init_bank_divisions = await safeQuery('SELECT * FROM bank_divisions');

    // Get the stored inputs for calculators
    app_response.init_calc_inputs = await safeQuery('SELECT * FROM calc_inputs');

    // Get the confos
    app_response.init_confos = await safeQuery('SELECT * FROM confos');
    
    // Get the current pending reviews
    app_response.init_trade_reviews = await safeQuery('SELECT * FROM trade_reviews');

    // Get the current notifications
    app_response.init_notifications = await safeQuery('SELECT * FROM notifications WHERE broker_id = $1', [broker_id]);

    // Get Liquidity Trades
    app_response.init_liquidityTrades = await safeExecute(() => refreshLiquidityTrades(broker_id), []);

    // Get the trades
    app_response.init_trades = await safeExecute(() => refreshTrades(broker_id), []);

    // Get the total number of trades
    app_response.trade_count = await safeExecute(() => tradeCount(), 0);

    // Get the total number of trades this month
    app_response.monthly_trades = await safeExecute(() => tradesThisMonth(), 0);

    // Get the total number of trades today
    app_response.daily_trades = await safeExecute(() => tradesToday(), 0);

    // Get total number of pending trades
    app_response.pending_trades = await safeExecute(() => tradesPending(), 0);

    // Get total number of swaptions
    app_response.swaptions_count = await safeExecute(() => swaptionsCount(), 0);

    // Get number of monthly swaptions
    app_response.monthly_swaptions = await safeExecute(() => swaptionsThisMonth(), 0);

    // Get number of daily swaptions
    app_response.daily_swaptions = await safeExecute(() => swaptionsToday(), 0);

    // Get number of pending swaptions
    app_response.pending_swaptions = await safeExecute(() => swaptionsPending(), 0);

    // Get all liquidity trade counts
    app_response.refresh_liquidity_counts = await safeExecute(() => getAllLiquidityCounts(), {});

    // Get the swaption market structures
    app_response.init_swaption_structure = await safeQuery('SELECT * FROM swaption_market_structures ORDER BY id ASC');

    // Get the fx rate
    app_response.init_fxrate = await safeQuery('SELECT * FROM fxrate');

    // Get the rba dates
    app_response.init_rba_dates = await safeQuery('SELECT * FROM rba_dates');

    // Get the eod emails 
    app_response.init_eod = await safeQuery('SELECT * FROM eod');

  } catch (err) {
    logger.error('Critical initial data error: %s', err.message);
  }

  return app_response;
};
