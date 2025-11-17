'use strict';

const { query } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.getInitPrefs = async function (broker_id, products) {
  let data = await query('SELECT * FROM preferences WHERE broker_id = $1 OR broker_id = 999', [broker_id]);
  let ret = data.rows;
  if (ret?.length == 0 || !ret?.some(r => r.broker_id == 999)) {
    logger.error("\tMajor Error: Could not get data from preferences table, so global data preferences will not be populated");
    return null;
  }
  let fwds = products.map(p => p.fwds_id).filter(f => f != null);
  // If a new product has been added, update the whiteboard jsons
  let g_changed = false;
  let changed = false;
  let g = ret.find(r => r.broker_id === 999); // global pref
  let b = null; // brokers bref if exists
  if (data.rowCount == 2) { b = ret.find(r => r.broker_id === broker_id); }

  products.forEach(p => {
    let id_str = p.product_id+"";
    if (Object.keys(g.whiteboard_tenors).indexOf(id_str) < 0) {
      g.whiteboard_tenors[p.product_id] = {};
      // Fwds have a standard list on the wb. Other products will be initially empty, and so there price groups will need to be defined manually
      if (fwds.includes(p.product_id)) {
        g.whiteboard_tenors[p.product_id].add = [[0.25,1],[0.5,1],[0.75,1],[1,1],[1.5,1],[2,1],[2,2],[5,5]];
      } else {
        g.whiteboard_tenors[p.product_id].add = [];
      }
      g.whiteboard_tenors[p.product_id].remove = [];
      g_changed = true;
    }
    if (Object.keys(g.whiteboard_favourites).indexOf(id_str) < 0) {
      g.whiteboard_favourites[p.product_id] = [];
      g_changed = true;
    }
    if (Object.keys(g.width_filters).indexOf(id_str) < 0) {
      g.width_filters[p.product_id] = {"non_firm":true,"interests":true,"legs_only":true,"filter":false,"width":100};
      g_changed = true;
    }
    if (b) {
      if (Object.keys(b.whiteboard_tenors).indexOf(id_str) < 0) {
        b.whiteboard_tenors[p.product_id] = {};
        b.whiteboard_tenors[p.product_id].add = [];
        b.whiteboard_tenors[p.product_id].remove = [];
        changed = true;
      }
      if (Object.keys(b.whiteboard_favourites).indexOf(id_str) < 0) {
        b.whiteboard_favourites[p.product_id] = [];
        changed = true;
      }
      if (Object.keys(b.width_filters).indexOf(id_str) < 0) {
        b.width_filters[p.product_id] = {"non_firm":true,"interests":true,"legs_only":true,"filter":false,"width":100};
        changed = true;
      }
    }
  });

  if (g_changed) { await query(`UPDATE preferences SET whiteboard_tenors = $1, whiteboard_favourites = $2, width_filters = $3 WHERE broker_id = 999`, [g.whiteboard_tenors, g.whiteboard_favourites, g.width_filters]); }
  if (changed) { await query(`UPDATE preferences SET whiteboard_tenors = $2, whiteboard_favourites = $3, width_filters = $4 WHERE broker_id = $1`, [broker_id, b.whiteboard_tenors, b.whiteboard_favourites, b.width_filters]); }
  
  // If the user has no preferences, set them up
  if (broker_id != 999 && data.rowCount == 1) {
    let tenors = {};
    let favourites = {};
    let width_filters = {};
    for (let key of Object.keys(g.whiteboard_tenors)) {
      tenors[key] = { add:[], remove:[] };
    }
    for (let key of Object.keys(g.whiteboard_favourites)) {
      // TODO: The following condition probably shouldn't be hard coded (should just be a blank list to start), but this was requested by Bruce
      if (key != 2 && key != 17 && key != 18 && key != 27 && key != 20 && !fwds.includes(key)) {
        favourites[key] = [[3,5,10],[5,7,10]];
      } else {
        favourites[key] = [];
      }
    }
    for (let key of Object.keys(g.width_filters)) {
      if (key == '0') width_filters[key] = {"non_firm":false,"interests":false,"legs_only":true,"filter":true,"width":0.5};
      else width_filters[key] = {"non_firm":true,"interests":true,"legs_only":true,"filter":false,"width":0.5};
    }
    let pg_result = await query('INSERT INTO preferences (broker_id, whiteboard_tenors, whiteboard_favourites, width_filters) VALUES ($1, $2, $3, $4) RETURNING *', [broker_id, tenors, favourites, width_filters]);
    ret = ret.concat(pg_result.rows);
  }
  return ret;
};

module.exports.getBrokerPreferences = async function (broker_id) {
  let data = await query('SELECT * FROM preferences WHERE broker_id = $1', [broker_id]);
  return data.rows[0];
};

module.exports.updateBrokerPreferences = async function (json) {
  let data = await query(`UPDATE preferences SET ${json.key} = $2 WHERE broker_id = $1 RETURNING ${json.key}`, [json.broker_id, json.value]);
  return data.rows[0][json.key];
};

module.exports.getGeneralPreferences = async function () {
  let general = (await query('SELECT general FROM preferences WHERE broker_id = 999')).rows[0].general;
  return general;
};

module.exports.updateCalcIRSPreference = async function (bool) {
  let general = (await query('SELECT general FROM preferences WHERE broker_id = 999')).rows[0].general ?? {};
  general.calcIRS = bool;
  await query('UPDATE preferences SET general = $1 WHERE broker_id = 999', [general]);
};

module.exports.updateCalcOISPreference = async function (bool) {
  let general = (await query('SELECT general FROM preferences WHERE broker_id = 999')).rows[0].general ?? {};
  general.calcOIS = bool;
  await query('UPDATE preferences SET general = $1 WHERE broker_id = 999', [general]);
};

module.exports.updateInterpPreference = async function (bool) {
  let general = (await query('SELECT general FROM preferences WHERE broker_id = 999')).rows[0].general ?? {};
  general.interpChoice = bool;
  await query('UPDATE preferences SET general = $1 WHERE broker_id = 999', [general]);
}
