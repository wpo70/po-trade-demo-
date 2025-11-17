'use strict';

const { sendToAllClients, sendToConfobot } = require('./send.js');
const { activeConfobot } = require('./map.js');
const { logger } = require('./utils/logger.js');
const { initialData } = require('./db/initial_data.js');
const { updateTradeMwId } = require('./db/trades');

// NOTE: HARD CODED CONFO-BOT broker id
const CB_BROKER_ID = 16;
// Handle Messages to Ping Pong to Confo per 20s

module.exports.sendPingtoConfo =  function () {
  const msg = { PingToConfo: 0 };

  const pb_sess = activeConfobot('session');
  if (pb_sess === null ) {
    return;
  } else {
    sendToConfobot(msg);
  }

};
// Handle messages received from the poc-bot websocket

module.exports.confobotReceived = async function (message) {
  // Parse the JSON message

  const msg = JSON.parse(message);

  if (msg.hasOwnProperty('received_ping_msg')) {
    return;
  } else {

    // To limit print out ping msg on Potrade

    logger.info(`Received message from CONFO-BOT: ${message}`);
  }
  // Ensure a pot-bot session exists

  const pb_sess = activeConfobot('session');
  if (pb_sess === null) {
    logger.error('Received message when no CONFO-BOT session exists');
    return;
  }

  var confobot_message = {};
  var client_message = {};

  if (msg.hasOwnProperty('initialize_me')) {confobot_message = await initialData(CB_BROKER_ID);}
  
  if (msg.hasOwnProperty('update_ov_id')) {
    console.log(msg);
    // FIXME: Should be uncomment when switch to kafka App
    // client_message.update_ov_id = await updateTradeMwId(
    //   msg.update_ov_id['product_type'], 
    //   msg.update_ov_id['ov_id'],
    //   msg.update_ov_id['mw_id'], 
    //   msg.update_ov_id['mw_status'],
    //   msg.update_ov_id['mw_message'],
    //   msg.update_ov_id['comments']
    // );
  }
   
  // Send messages to appropriate recipient(s)

  if (Object.keys(confobot_message).length > 0) {sendToConfobot(confobot_message);}

  if (Object.keys(client_message).length > 0) {sendToAllClients(client_message);}
};