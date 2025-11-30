'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.updateConfosMW = async function (id) {
  let result = await query(`call update_confo_mw_values(${id})`);
  return JSON.parse(result.rows[0].update_result);
}

module.exports.insertConfos = async function (confo) {
  let ids = (await query("SELECT trade_id, markit_id from trades where trade_id_ov = ANY($1)", [confo.trade_ids])).rows;
  
  let markit_ids = ids.map(r => r.markit_id ?? "NA");
  let start = new Date().getTime();
  while (markit_ids.some((id) => id == null || id == "NA") && (new Date().getTime() - start) < 2000) {
    markit_ids = (
      await query("Select markit_id from trades where trade_id_ov = ANY($1)", [confo.trade_ids])
    ).rows.map(r => r.markit_id ?? "NA");
    await new Promise(res => setTimeout(res, 250));
  }

  for (let id in confo.confos) {
    confo.confos[id] += `\n\nMW: ${markit_ids.join(", ")}`;
  }
    
  confo.trade_ids = ids.map(r => r.trade_id);
  let rows = [];

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(confo, a, f, v, ['confo_id']);
  // TODO Checking for valid username. Currently done in the frontend.
  // Assemble the insert query string

  let qs;
  qs = 'INSERT INTO confos (';
  qs += f.join(',');
  qs += ') VALUES (';
  qs += v.join(',');
  qs += ') ON CONFLICT ON CONSTRAINT confos_pkey';
  qs += ' DO UPDATE SET ';
  qs += f.map((val, idx) => val + '=' + v[idx]).join(',');
  qs += ' RETURNING *';

  // Now execute the query
  try {
      const pg_result = await query(qs, a);
      rows = pg_result.rows;
  } catch (err) {
      logger.error(err.message);
      logger.error('Query: %s', qs);
      rows = [];
  }
  return rows;
};

module.exports.deleteConfos = async function (confo_ids) {

  let pg_result;
  try {
    pg_result = await query('DELETE FROM confos WHERE confo_id = ANY($1) returning *', [confo_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteconfos: %s', JSON.stringify(confo_ids));
  }
  return pg_result.rows.map((row) => row.confo_id);
};