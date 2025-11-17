'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');
const config = require('../../config.json');
const { temp_pass } = require('../email_handler.js');

module.exports.insertBrokers = async function (brokers) {
  // Loop over the array of brokers and add them to the database in separate
  // transactions.  Return all of the new brokers.  Although this code allows
  // for an array of brokers to be inserted, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and add each broker to the database, returning itself.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let broker of brokers) {
    pg_row = await insert_broker(broker);
    if (pg_row.length !== 0) {
      temp_pass(pg_row[0].email, pg_row[0].firstname, pg_row[0].new_password);
      delete pg_row[0].new_password;
      delete pg_row[0].password;
      rows.push(pg_row[0]);
    }
  }

  // Return the array of new brokers.
  return rows;
};

module.exports.updateBrokers = async function (brokers) {
  // Loop over the array of brokers and update them in the database in separate
  // transactions.  Return all of the new brokers. Although this code allows
  // for an array of brokers to be updated, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and update each broker in the database.

  for (let broker of brokers) {
    pg_row = await update_broker(broker);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of updated brokers.

  return rows;
};

// Deletes a broker from the database
module.exports.deleteBrokers = async function (broker_ids) {

  let pg_result;
  try {
    pg_result = await query('UPDATE brokers SET active = false WHERE broker_id = ANY($1) returning *', [broker_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deletebrokers: %s', JSON.stringify(broker_ids));
  }
  return pg_result.rows.map((row) => row.broker_id);
};

async function insert_broker(broker) {
  // Initialise the query string and array.

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(broker, a, f, v, ['broker_id']);
  // TODO Checking for valid username. Currently done in the frontend.
  // Assemble the insert query string

  let qs;
  qs = 'INSERT INTO brokers (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') ON CONFLICT ON CONSTRAINT brokers_pkey';
  qs += ' DO UPDATE SET ';
  qs += f.map((val, idx) => val + '=' + v[idx]).join(',');
  qs += ',active = true';
  qs += ' WHERE brokers.active = false';
  qs += ' RETURNING *';

  // Now execute the query
  let rows;
  let new_password = Math.random().toString(36).slice(-8);
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
    await query(`UPDATE brokers SET password = PGP_SYM_ENCRYPT($1, '${config.database.encryption_key}') WHERE broker_id = $2`, [new_password, rows[0].broker_id]);
    rows[0].new_password = new_password;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}

async function update_broker(broker) {
  // Initialise the query string and array.

  let a = [broker.broker_id];
  let f = [];
  let v = [];

  makeQueryArrays(broker, a, f, v, ['broker_id']);

  // Assemble the update query string

  let qs;
  qs = 'UPDATE broker_list SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE broker_id = $1 RETURNING *';

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
