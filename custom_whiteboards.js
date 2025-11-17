'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.getUserCustomWBs = async function (broker_id) {
  let data = await query('SELECT * FROM custom_whiteboards WHERE broker_id = $1 ORDER BY board_id ASC', [broker_id]);
  return !data.rowCount ? [] : data.rows.map(wb => {
    wb.prices_blueprint.length = Object.keys(wb.prices_blueprint).length;
    wb.prices_blueprint = Array.from(wb.prices_blueprint);
    return wb;
  });
};

module.exports.addNewCustomWB = async function (broker_id, wb) {
  wb.broker_id = broker_id;
  wb.prices_blueprint = Object.assign({}, wb.prices_blueprint);
  let p = [], f = [], v = [];
  makeQueryArrays(wb, p, f, v);
  let qs = 'INSERT INTO custom_whiteboards (' + f.join(', ') + ') VALUES (' + v.join(', ') + ') RETURNING *';
  try {
    const data = await query(qs, p);
    let ret = data.rows[0];
    delete ret.broker_id;
    ret.prices_blueprint.length = Object.keys(ret.prices_blueprint).length;
    ret.prices_blueprint = Array.from(ret.prices_blueprint);
    return ret;
  } catch (err) {
    logger.error("Adding new custom wb failed");
    return null;
  }
};

module.exports.updateCustomWB = async function (wb) {
  wb.prices_blueprint = Object.assign({}, wb.prices_blueprint);
  let params = [wb.board_id];
  let q_subs = [];
  for (let field in wb) {
    if (field != "board_id") {
      params.push(wb[field]);
      q_subs.push(`${field} = $${q_subs.length+2}`);
    }
  }
  let qs = 'UPDATE custom_whiteboards SET ' + q_subs.join(", ") + ' WHERE board_id = $1 RETURNING *';
  try {
    const data = await query(qs, params);
    if (!data.rowCount) { throw new Error(); }
  } catch (err) {
    logger.error("Request to update WB failed: " + wb.board_id);
    return false;
  }
};

module.exports.deleteCustomWB = async function (wb_id) {
  if (typeof wb_id != "number") {
    wb_id = wb_id?.board_id;
  }
  if (typeof wb_id != "number") {
    logger.error("Request to delete WB failed: The parameter was not a WB id nor a whiteboard object:");
    logger.error(wb_id);
    return false;
  }
  try {
    const data = await query('DELETE FROM custom_whiteboards WHERE board_id = $1', [wb_id]);
    if (!data.rowCount) { throw new Error(); }
  } catch (err) {
    logger.error("Request to delete WB failed: The provided id was not found in the database:" + wb_id);
    return false; 
  }
}

module.exports.swapCustomWBs = async function (broker_id, boards_msg) {
  let { board_id1, board_id2 } = boards_msg;
  try {
    const resp = await query("call swap_custom_whiteboard_ids($1, $2, $3)", [broker_id, board_id1, board_id2]);
  } catch (err) {
    logger.error("Request to swap WBs failed: " + board_id1 + ", " + board_id2);
    return false;
  }
}