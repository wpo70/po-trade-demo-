'use strict';

const { sessions } = require('./map.js');
const uuid = require('uuid');
const { logger } = require('./utils/logger.js');

// Shared secret for pb_connection

const SECRET = 'confobot';

module.exports.cb_connect = async function (req, res) {
  // First, check that the given secret is correct

  if (req.body.secret !== SECRET) {
    logger.error(`CONFO-BOT secret was incorrect: "${req.body.secret}"`);
    res.status(401).send({ response: 'Incorrect shared secret' });
    return;
  }

  // Login is successful. 
  // Create a poc-bot session only if no others are connected already

  for (const sess of sessions.values()) {
    if (sess.is_confobot) {
      logger.error(`Attempted to connect more than 1 CONFO-BOTs`);
      res.status(409).send({ response: 'Cannot connect more than 1 CONFO-BOT at a time' });
      return;
    }
  }

  const userId = uuid.v4();
  req.session.userId = userId;
  sessions.set(userId, {
    is_pocbot: false,
    is_gateway: false,
    is_confobot: true,
    is_markit: false,
    blp_connected: false,
    sheet_connected: false
  });

  res.set('Content-Type', 'application/json');
  res.status(200).send({ connection: 'connected' });

  logger.info('CONFO-BOT has connected: %d', userId);
};

module.exports.cb_disconnect = async function (req, res) {
  const sess = sessions.get(req.session.userId);
  if (typeof sess === 'undefined') {
    logger.warn('CONFO-BOT without a session tried to disconnect');
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

  logger.info('CONFO-BOT has disconnected', req.session.userId);
  req.session.destroy(function () {
    // Send a simple message of success to the POC-BOT.
    res.send({ result: 'OK', message: 'Session destroyed' });
  });
};
