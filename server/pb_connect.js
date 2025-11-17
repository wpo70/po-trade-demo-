'use strict';

const { sessions } = require('./map.js');
const uuid = require('uuid');
const config = require('../config.json');
const { logger } = require('./utils/logger.js');

// Shared secret for pb_connection

const SECRET = config.pocbot.secret;

module.exports.pb_connect = async function (req, res) {
  // First, check that the given secret is correct

  if (req.body.secret !== SECRET) {
    logger.error(`POC-BOT secret was incorrect: "${req.body.secret}"`);
    res.status(401).send({ response: 'Incorrect shared secret' });
    return;
  }

  // Login is successful. 
  // Create a poc-bot session only if no others are connected already

  for (const sess of sessions.values()) {
    if (sess.is_pocbot) {
      logger.error(`Attempted to connect more than 1 POC-BOTs`);
      res.status(409).send({ response: 'Cannot connect more than 1 POC-BOT at a time' });
      return;
    }
  }

  const userId = uuid.v4();
  req.session.userId = userId;
  sessions.set(userId, {
    is_pocbot: true,
    is_gateway: false,
    is_confobot: false,
    is_markit: false,
    blp_connected: false,
    sheet_connected: false

  });

  res.set('Content-Type', 'application/json');
  res.status(200).send({ connection: 'connected' });

  logger.info('POC-BOT has connected: %d', userId);
};

module.exports.pb_disconnect = async function (req, res) {
  const sess = sessions.get(req.session.userId);
  if (typeof sess === 'undefined') {
    logger.warn('POC-BOT without a session tried to disconnect');
    res.status(401).send();
    return;
  }

  // Get the websocket from the session

  if (sess.hasOwnProperty('socket')) {
    // Close the connection, if one was created. 
    const ws = sess.socket;
    if (ws) ws.close();
  }

  // Destroy the session...

  logger.info('POC-BOT has disconnected', req.session.userId);
  req.session.destroy(function () {
    // Send a simple message of success to the POC-BOT.
    res.send({ result: 'OK', message: 'Session destroyed' });
  });
};
