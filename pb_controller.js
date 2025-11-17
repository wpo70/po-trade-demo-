'use strict';

const { sendToAllClients, sendToPocbot } = require('./send.js');
const { activePocbot } = require('./map.js');
const { getQuotesAtYears } = require('./db/quotes.js');
const { insertOrders, updateOrders, deleteOrders} = require('./db/orders.js');
const { query } = require('./db');
const { initialData } = require('./db/initial_data.js');
const { logger } = require('./utils/logger.js');


// NOTE: HARD CODED POC-BOT broker id
const PB_BROKER_ID = 5;
// Handle Messages to Ping Pong to Post per 20s

module.exports.sendPingtoPost =  function () {
  const msg = { PingToPost: 0 };

  const pb_sess = activePocbot('session');
  if (pb_sess === null ) {
    return;
  } else {
    sendToPocbot(msg);
  }

};
// Handle messages received from the poc-bot websocket

module.exports.pocbotReceived = async function (message) {
  // Parse the JSON message

  const msg = JSON.parse(message);

  if (msg.hasOwnProperty('received_ping_msg')) {
    return;
  } else {

    // To limit print out ping msg on Potrade

    logger.info(`Received message from POC-BOT: ${message}`);
  }
  // Ensure a pot-bot session exists

  const pb_sess = activePocbot('session');
  if (pb_sess === null) {
    logger.error('Received message when no POC-BOT session exists');
    return;
  }

  var pocbot_message = {};
  var client_message = {};

  if (msg.hasOwnProperty('initialize_me')) {

    pocbot_message = await initialData(PB_BROKER_ID);
  }

  if (msg.hasOwnProperty('submit_order')) {

    let invalid_order = await validateOrderSubmit(msg.submit_order);
    if (invalid_order) {
      pocbot_message.error = invalid_order;
    } else {
      if (typeof msg.submit_order.order_id === 'undefined') {
        client_message.insert_orders = await insertOrders([msg.submit_order]);
      } else {
        client_message.update_orders = await updateOrders([msg.submit_order]);
      }
    }
  }

  if (msg.hasOwnProperty('update_orders')) {
  
    client_message.update_orders = await updateOrders(msg.update_orders);
  }

  if (msg.hasOwnProperty('update_order_volume')) {

    let order = msg.update_order_volume.order;
    let upd_vol = msg.update_order_volume.volume;
    order.volume = upd_vol;
    client_message.update_orders = await updateOrders([order]);
  }

  if (msg.hasOwnProperty('confirm_order')) {

    let order = msg.confirm_order;
    order.confirmed = true;
    client_message.update_orders = await updateOrders([order]);
  }

  if (msg.hasOwnProperty('delete_order')) {

    await deleteOrders([msg.delete_order]);
    client_message.delete_orders = [msg.delete_order];
  }

  // Send messages to appropriate recipient(s)

  if (Object.keys(pocbot_message).length > 0) {
    sendToPocbot(pocbot_message);
  }

  if (Object.keys(client_message).length > 0) {
    sendToAllClients(client_message);
  }
};

// THE FOLLOWING ARE VALIDATORS FOR VALUES GIVEN BY POC-BOT via WS

async function validateOrderSubmit(order) {
  // Validate product_id

  let invalid_p_id = await validateProductId(order.product_id);
  if (invalid_p_id) {
    return `invalid product_id: ${invalid_p_id}`;
  }

  // Validate firm is boolean

  if (typeof (order.firm) !== 'boolean') {
    return `firm is not a boolean: ${typeof(order.firm)}`;
  }

  // Validate bid is boolean

  if (typeof (order.bid) !== 'boolean') {
    return `bid is not a boolean: ${typeof(order.bid)}`;
  }

  // Validate years array is valid

  let invalid_years = await validateOrderYears(order.product_id, order.years);
  if (invalid_years) {
    return `invalid years: ${invalid_years}`;
  }

  // Validate price is a number

  if (typeof (order.price) !== 'number') {
    return `price is NaN: ${typeof(order.price)}`;
  }

  // Validate volume

  let invalid_volume = await validateOrderVolume(order.volume);
  if (invalid_volume) {
    return `invalid volume: ${invalid_volume}`;
  }

  // Validate trader id

  let invalid_trader = await validateTraderId(order.trader_id);
  if (invalid_trader) {
    return `invalid trader_id: ${invalid_trader}`;
  }

  // Order is valid

  return null;
}

async function validateProductId(p_id) {
  // Ensure product_id is a number

  if (typeof (p_id) !== 'number') {
    return `product_id is NaN: ${typeof (p_id)}`;
  }

  // Ensure product_id is a valid id in the database

  let products;
  try {
    let pg_result = await query('SELECT * FROM products where active = true');
    products = pg_result.rows;
  } catch (err) {
    logger.error('verifyProductId: error retreiving products: %s', err.message);
    return `Internal error: ${err}`;
  }

  if (!products.some(p => p.product_id === p_id)) {
    return `no product found for given product_id: ${p_id}`;
  }

  // product_id is valid

  return null;
}

async function validateYearss(p_id, yearss) {
  let invalid_yearss;
  for (let years of yearss) {
    invalid_yearss = validateOrderYears(p_id, years);
    if (invalid_yearss) return invalid_yearss;
  }
  return null;
}

async function validateOrderYears(p_id, years) {
  // Verify all years are numbers

  for (let year of years) {
    if (typeof (year) !== 'number') {
      return `year is NaN: ${typeof (year)}`;
    }
  }

  // Verify years length is 1, 2, or 3 only and ensure years are in increasing order

  let n = years.length;
  if (n < 1 || n > 3) {
    return `must be 1 to 3 years, ${n} given`;
  }
  if ((n > 1 && years[1] <= years[0]) || (n > 2 && years[2] <= years[1])) {
    return `years must be in increasing order`;
  }

  // Ensure all years in order are valid for the given p_id
  // There are special restrictions on EFPs.  No butterflys are allowed and
  // the only spreads are 3x10, 4x10 and 5x10.

  for (let year of years) {
    let quote = getQuotesAtYears(p_id, year,"AUD");
    if (quote === null || quote.length === 0) {
      return `No quote exists for given product_id ${p_id} and year ${year}`;
    }
  }

  if (p_id === 2) {
    if (n === 2 && (years[1] !== 10 || years[0] < 3 || years[0] > 5)) {
      return `EFP spreads must be 3x10, 4x10, 5x10 only`;
    }

    if (n === 3) {
      return `EFP butterflys are not allowed`;
    }
  }

  // years array is valid

  return null;
}

async function validateOrderVolume(vol) {
  // Validate volume is a number

  if (typeof (vol) !== 'number') {
    return `volume is NaN: ${typeof (vol)}`;
  }

  // Validate volume is positive (can be -1 to indicate mmp)

  if (vol <= 0 && vol !== -1) {
    return `Volume must be a positive number, got: ${vol}`;
  }

  // Volume is valid

  return null;
}

async function validateTraderId(t_id) {
  // Ensure trader_id is a number

  if (typeof (t_id) !== 'number') {
    return `trader_id is NaN: ${typeof (t_id)}`;
  }

  // Ensure trader_id is a valid id in the database

  let trader_ids;
  try {
    let pg_result = await query('SELECT trader_id FROM traders');
    trader_ids = pg_result.rows;
  } catch (err) {
    logger.error('verifyProductId: error retreiving products: %s', err.message);
    return `Internal error: ${err}`;
  }

  if (!trader_ids.some(t => t.trader_id === t_id)) {
    return `no trader found for given trader_id: ${t_id}`;
  }

  // product_id is valid

  return null;
}

async function validateOrderId(o_id) {
  // Ensure order_id is a number

  if (typeof (o_id) !== 'number') {
    return `order_id is NaN: ${typeof (t_id)}`;
  }

  // Ensure order_id is a valid id in the database

  let order_ids;
  try {
    let pg_result;
    pg_result = await query('SELECT order_id FROM live_orders');
    order_ids = pg_result.rows;
    
  } catch (err) {
    logger.error('validateOrderId: error retreiving orders: %s', err);
    return `Internal error: ${err}`;
  }

  if (!order_ids.some(t => t.order_id === o_id)) {
    return `no order found for given order_id: ${o_id}`;
  }

  // product_id is valid

  return null;
}
