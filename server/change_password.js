'use strict';

const { query } = require("./db");
const { logger } = require('./utils/logger.js');
const config = require('../config.json');

module.exports.change_password = async function (req, res) {
  // Change the password of a logged in user

  var pg_result;
  const broker_id = req.body.broker_id;
  const current_password = req.body.current_p;
  const new_password = req.body.new_p;
  const new_password_repeat = req.body.new_p_repeat;

  // "Authenticate" the user by getting the user with
  // the given broker_id and password.

  try {
    pg_result = await query(`SELECT broker_id FROM brokers WHERE broker_id = $1 AND PGP_SYM_DECRYPT(password::bytea, '${config.database.encryption_key}') = $2`, [broker_id, current_password]);

    // If nothing returned, the given current password does not match actual current password

    if (!pg_result.hasOwnProperty('rows') || pg_result.rows.length === 0) {
      logger.error(`Failed to change password of ${broker_id}. Incorrect current password.`);
      res.status(401).send({ response: `The credentials of ${broker_id} were not recognised` });
      return;
    }

    // Current password matched, ensure new passwords match

    if (!(new_password === new_password_repeat)) {
      logger.error(`Failed to change password of ${broker_id}. New passwords don't match.`);
      res.status(412).send({ response: `${broker_id}'s new password and new password repeat don't match` });
      return;
    }

    // Update the password and send success message to the browser

    try {
      pg_result = await query(`UPDATE brokers SET password = PGP_SYM_ENCRYPT($1, '${config.database.encryption_key}') WHERE broker_id = $2`, [new_password, broker_id]);

      logger.info(`User ${broker_id} updated their password`);
      res.set('Content-Type', 'application/json');
      res.status(200).send({ result: 'OK', message: 'Changed password' });
    } catch (err) {
      logger.error('In change_password(), UPDATE query: %s', err.message);
      res.status(500).send({ response: err.message });
    }
  } catch (err) {
    logger.error('In change_password(), SELECT query: %s', err.message);
    res.status(500).send({ response: err.message });
  }
};

// After logging in with temporary password, Redirects to new page and changes password.
module.exports.change_temporary_password = async function (req, res) {
  const broker_id = req.body.broker_id;
  const new_password = req.body.new_p;

  // Update the password and send success message to the browser
  try {
    let pg_result = await query(`UPDATE brokers SET password = PGP_SYM_ENCRYPT($1, '${config.database.encryption_key}'), temporary_password = NULL WHERE broker_id = $2 RETURNING *`, [new_password, broker_id]);
    if (!pg_result.rows) {
      throw new Error("fail pass");
    }
    logger.info(`User ${broker_id} updated their password`);
    res.set('Content-Type', 'application/json');
    res.status(200).send({ result: 'OK', message: 'Changed password' });
  } catch (err) {
    logger.error('In change_password(), UPDATE query: %s', err.message);
    res.status(500).send({ response: err.message });
  }
};