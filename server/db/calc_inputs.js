'use strict';


const { makeQueryArrays, query } = require(".");
const { logger } = require("../utils/logger");

module.exports.insertCalcInputs = async function (calc_inputs) {

  const rows= [];
  var pg_row;

  // Loop over the array and add each calc_input to the database, returning its ID.
  // If the insert query fails for whatever reason the return value will be empty.

  for (let calc_input of calc_inputs) {
    pg_row = await insert_calc_input(calc_input);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return an array of calc_inputs

  return rows;
};

module.exports.updateCalcInputs = async function (calc_inputs) {
  // Loop over the array of calc_inputs and update them in the database in separate
  // transactions.  Return all of the new calc_input IDs.  Although this code allows
  // for an array of calc_inputs to be inserted, in practice they will only ever come
  // one at a time.

  const rows = [];
  var pg_row;

  // Loop over the array and update each calc_input in the database.

  for (let calc_input of calc_inputs) {
    pg_row = await update_calc_input(calc_input);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  // Return the array of new calculation_ids.

  return rows;
};

// To delete an calc_input set the closed time.
// if no time was specified, use NOW()

module.exports.deleteCalcInputs = async function (calculation_ids) {
  try {
    await query('DELETE FROM calc_inputs WHERE calculation_id = ANY($1)', [calculation_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteOrders: %s', JSON.stringify(calculation_ids));
  }
};

async function update_calc_input(calc_input) {
  // Initialise the query string and array.

  let a = [calc_input.calculation_id];
  let f = [];
  let v = [];

  makeQueryArrays(calc_input, a, f, v, ['calculation_id']);

  // Assemble the update query string

  let qs;
  qs = 'UPDATE calc_inputs SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE calculation_id = $1 RETURNING *';

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

async function insert_calc_input(calc_input) {

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(calc_input, a, f, v, ['calculation_id']);

  let qs;
  qs = 'INSERT INTO calc_inputs (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') RETURNING *';

  let rows;
  try {
    const pg_result = await query(qs, a);
    rows = pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    logger.error('Query : %s', qs);
    rows = [];
  }

  return rows;
}