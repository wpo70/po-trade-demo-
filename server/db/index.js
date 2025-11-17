'use strict';

// This is built on node-postgres.  https://node-postgres.com/
// Import this module with "import { query, getClient } from './db'"

const { Pool } = require('pg');
const config = require('../../config.json');
const { logger } = require('../utils/logger.js');

// Create a pool of connections

const pool = new Pool({
  user: config.database.user,
  host: config.database[config.env].host,
  database: config.database[config.env].database,
  password: config.database.password,
  port: config.database.port
});

// Create a simple query method.  This executes a query and returns the result.
// In the QUERY_STRING $1 is replaced with the first element of the PARAMS
// array, $2 with the second and so on.

// The result that is returned has properties result.rows (array of objects),
// result.fields (array of objects with name and dataTypeId), result.command
// (string "SELECT", "INSERT", "UPDATE", "DELETE", etc.) and result.rowCount
// (int).

module.exports.query = async function (query_string, params) {
  // Measure the time it takes to run the query.

  var pg_result = false;
  const start = Date.now();

  // Execute the query 

  try {
    pg_result = await pool.query(query_string, params);
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', query_string);
    throw err;
  }

  // Log the time it took to run the query.

  const duration = Date.now() - start;
  logger.info('executed query %O', { query_string, duration, rows: pg_result.rowCount });

  // Return the result.

  return pg_result;
};

// The getClient function returns a client from the pool.  This allows a
// transaction to be run (BEGIN, COMMIT, ROLLBACK).  When the transaction is
// over call client.release.  An error will be logged if this is not done within
// 10 seconds.

module.exports.getClient = async function () {
  // Get a client from the pool.

  const client = await pool.connect();

  // Save the true query and release methods before we monkey patch them.

  const query = client.query;
  const release = client.release;

  // Create a timeout of 10 seconds, after which we will log this client's last
  // query.

  const timeout = setTimeout(() => {
    logger.warn('A client has been checked out for more than 10 seconds!');
    logger.warn(`The last executed query on this client was: ${client.lastQuery}`);
  }, 10000);

  // Monkey patch the query method to keep track of the last query executed

  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  // Monkey patch the release method to return the client to its original state.

  client.release = () => {
    // clear our timeout

    clearTimeout(timeout);

    // set the methods back to their old un-monkey-patched version

    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  // Return the client

  return client;
};

// Given an object with one or more optional properties that equal a table's
// fields, return arrays that can be used to construct query strings.  Array F
// is the list of property/field names.  Array A is the array of the values.
// Array V is an array of '$N' strings that are used to reference the V values
// in the query string.  Fields in the array EXCLUDED are excluded from the
// processing.

module.exports.makeQueryArrays = function (obj, a, f, v, excluded) {
  // Loop over the properties of the object.

  for (let field in obj) {
    if (!excluded?.includes(field)) {
      a.push(obj[field]);
      f.push(field);
      v.push('$' + a.length);
    }
  }
};
