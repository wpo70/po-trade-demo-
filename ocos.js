'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.modifyOCO = async function (json) {
  let {bank_id, ocos} = json;
  let data = await query("UPDATE banks SET ocos = $2 WHERE bank_id = $1 RETURNING bank_id, ocos", [bank_id, ocos]);
  return data.rows;
};

module.exports.clearAllOCOs = async function () {
  let data = await query("UPDATE banks SET ocos = $1 RETURNING bank_id, ocos", [[]])
  return data.rows;
};

module.exports.setOCOColour = async function (json) {
  let {bank_id, oco_colour} = json;
  let data = await query("UPDATE banks SET oco_colour = $2 WHERE bank_id = $1 RETURNING bank_id, oco_colour", [bank_id, oco_colour]);
  return data.rows[0];
};