'use strict';

const { sessions } = require('./map.js');
const uuid = require('uuid');
const { query } = require('./db');
const config = require('../config.json');
const { logger } = require('./utils/logger.js');
const { sendToAllClients, addToGatewayQueue, removeFromGatewayQueue } = require('./send.js');

module.exports.gw_connect = async function (req, res) {
  // This is a shared secret for gateway connections.
  const secret = config.gateway.secret;

  // Check that the shared secret is correct.

  if (req.body.secret !== secret) {
    logger.error(`Gateway secret was incorrect: "${req.body.secret}"`);
    res.status(401).send({ response: 'Incorrect shared secret' });
    return;
  }

  // Login is successful.  Update the user's session with a random identifier
  // and keep track of the sessions that are for gateways.

  const userId = uuid.v4();
  req.session.userId = userId;
  let newGW = {
    id: userId,
    is_gateway: true,
    is_pocbot: false,
    blp_connected: false,
    is_markit: false,
    user: req.body.user,
    ip: req.body.ip,
  }
  sessions.set(userId, newGW);

  // Get all quote information from the database.

  try {
    let pg_result;

    pg_result = await query('SELECT * FROM quotes');
    // Send a simple message of success to the gateway.

    res.set('Content-Type', 'application/json');
    res.status(200).send({ all_quotes: pg_result.rows });
  } catch (err) {
    res.status(500).send({ response: err.message });
  }

  logger.info('Gateway has connected %s', userId);

  // Notify all clients that gateway has connected

  let gwCount = 0;
  sessions.forEach((sess) => {if (sess.is_gateway) gwCount++;});
  sendToAllClients({gateway_connected: newGW});
  addToGatewayQueue(userId);
};

module.exports.gw_disconnect = function (req, res) {
  // Log out the user, destroy the session and close userId's websocket connection.
  // Get the user's session and make sure it exists

  const sess = sessions.get(req.session.userId);
  if (typeof sess === 'undefined') {
    logger.warn('Gateway without a session tried to disconnect');
    res.status(401).send();
    return;
  }

  removeFromGatewayQueue(req.session.userId);
  let gwCount = 0;
  sessions.forEach((sess) => {if (sess.is_gateway) gwCount++;});
  sendToAllClients({setGatewayCount: gwCount});

  // Get the websocket from the session

  if (sess.hasOwnProperty('socket')) {
    // Close the connection, if one was created. 
    const ws = sess.socket;
    if (ws) ws.close();
  }

  // Destroy the session...

  logger.log('Gateway has disconnected %d', req.session.userId);
  req.session.destroy(function () {
    // Send a simple message of success to the gateway.
    res.send({ result: 'OK', message: 'Session destroyed' });
  });

  // If no Gateway sessions exist, notify all clients

  if (gwCount == 0) {
    sendToAllClients({ gateway_connected: false });
  }
};
