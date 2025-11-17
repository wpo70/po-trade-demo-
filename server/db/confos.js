'use strict';

const { query, makeQueryArrays } = require('.');
const { activeGateway } = require('../map');
const { sendToAllClients } = require('../send');
const { logger } = require('../utils/logger.js');

const refreshIntervals = new Map();

/** Start interval to refresh the MW ids in the confo every 9 seconds, stopping automatically when all ids are found  */
function autoRefreshInterval(confo_id) {
  function needsRefreshing(confos) {
    for (let confo of confos) {
      const ids_str = confo.split("MW:")[1];
      if (ids_str.includes("NA")) { return true; }
    }
    return false;
  }

  if (!activeGateway('userId')) { return; }

  const interval = setInterval(async (id) => {
    let result = await updateConfosMW(id);
    sendToAllClients({refresh_confos: result});
    if (!needsRefreshing(Object.values(result.confos))) {
      clearInterval(refreshIntervals.get(id));
    }
  }, 9000, confo_id);

  refreshIntervals.set(confo_id, interval);
}

module.exports.updateConfosMW = updateConfosMW;
async function updateConfosMW(id) {
  let result = await query(`call update_confo_mw_values(${id})`);
  return JSON.parse(result.rows[0].update_result);
}

module.exports.getAllConfos = async function () {
  let results = (await query('SELECT * FROM confos ORDER BY confo_id DESC')).rows;
  let deletes = [];
  let now = new Date().getDate();
  results = results.filter(c => {
    if (new Date(c.time_submitted).getDate() >= now) { return true; }
    deletes.push(c.confo_id);
  });
  if (deletes.length) {
    let delete_confos = await deleteConfos(deletes);
    sendToAllClients({delete_confos});
  }
  return results;
}

module.exports.insertConfos = async function (confo) {
  let ids = (await query(
      "Select trade_id from "
      + "unnest($1::TEXT[]) WITH ORDINALITY AS t(ov_id, idx) "
      + "LEFT JOIN trades on trades.trade_id_ov = ov_id "
      + "ORDER BY idx", [confo.trade_ids])
    ).rows;
    
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
      autoRefreshInterval(rows[0].confo_id);
  } catch (err) {
      logger.error(err.message);
      logger.error('Query: %s', qs);
      rows = [];
  }
  return rows;
};

module.exports.deleteConfos = deleteConfos;
async function deleteConfos(confo_ids) {
  let pg_result;
  try {
    pg_result = await query('DELETE FROM confos WHERE confo_id = ANY($1) returning *', [confo_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteconfos: %s', JSON.stringify(confo_ids));
  }
  return pg_result.rows.map((row) => row.confo_id);
};