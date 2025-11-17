'use strict';

const { sendToAllClients, sendToMarkit, sendToConfobot } = require('./send.js');
const { activeMarkit } = require('./map.js');
const { logger } = require('./utils/logger.js');
const { updateTradeMwId } = require('./db/trades');

// Handle Messages to Ping Pong to Markit per 20s

module.exports.sendPingtoMarkit =  function () {
  const msg = { PingToMarkit: 0 };

  const markit_sess = activeMarkit('session');
  if (markit_sess === null ) {
    return;
  } else {
    sendToMarkit(msg);
  }

};
// Handle messages received from the markitwire websocket

module.exports.markitReceived = async function (message, sess) {
  
  // Parse the JSON message

  const msg = JSON.parse(message);

  if (msg.hasOwnProperty('received_ping_msg')) {
    return;
  } else if (msg.hasOwnProperty('markit_tradeObj')) {
    sendToConfobot(msg);
  } else {

    // To limit print out ping msg on Potrade

    logger.info(`Received message from MARKIT: ${message}`);
  }
  // Ensure a markit session exists

  const markit_sess = activeMarkit('session');
  if (markit_sess === null) {
    logger.error('Received message when no MARKIT session exists');
    return;
  }

  var markit_message = {};
  var client_message = {};

  if (msg.hasOwnProperty('markit_connection')) {
    client_message = { markit_connection : msg.markit_connection };}
  if (msg.hasOwnProperty('markit_connection_env')) {
    // Modify session
    if (sess.is_markit) sess.is_markit_active = true;
    // Send message to all clients
    client_message = { markit_connection_env: msg.markit_connection_env };
  }
  if (msg.hasOwnProperty('markit_active')) {
    // Modify session
    if (sess.is_markit) sess.is_markit_active = msg.markit_active;
    // Send message to all clients
    client_message = { markit_active: msg.markit_active };
  }
  if (msg.hasOwnProperty('update_ov_id')) {
    var msg_ = JSON.parse(msg.update_ov_id);
    try {
      client_message.update_ov_id = await updateTradeMwId(
        msg_.product_type, 
        msg_.ov_id,
        msg_.mw_id, 
        msg_.mw_status,
        msg_.mw_message,
        msg_.comments);
    } catch (e) {
      logger.error(e);
    }
  }  
  // Send messages to appropriate recipient(s)

  if (Object.keys(markit_message).length > 0) {sendToMarkit(markit_message);}

  if (Object.keys(client_message).length > 0) {sendToAllClients(client_message);}
};