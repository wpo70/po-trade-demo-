const { query } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.overrideFX= async function (override) {
  // Override the value override for a single quote.
  // The data has come from a client and should be refelected back to all clients.
    
  // Assemble the update query string
  let qs;
  qs = `UPDATE fxrate SET override = $1 WHERE security = $2 RETURNING *`;
  let a = [override.override, override.fx];
  // Now execute the query and return the updated row.
  var rows;
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

module.exports.getFXSecurities = async function (fx_securities) {
  // Prepare a response with all of the initial data that the client needs to
  // get going.

  try {
    const pg_result = await query('SELECT * FROM fxrate');

    // This is an asynchronous function, Fill the ticker array with the query
    // result.

    for (let row of pg_result.rows) {
      fx_securities.push(row);
    }
  } catch (err) {
    logger.error('getFX_Securities(): %s', err.message);
  }
};

module.exports.updateFXSecurities = async function (fx_securities) {
  var fx_security;
  for (fx_security in fx_securities) {
  // Assemble the update query string
    let qs;
    qs = `UPDATE fxrate SET value = $1 , latest_update = NOW(), is_stale= $3, override= $4  WHERE security = $2 RETURNING *`;
    let a = [fx_securities[fx_security]['last'], fx_security, false, null];
    // Now execute the query and return the updated row.
    var rows;
    try {
      const pg_result = await query(qs, a);
      rows = pg_result.rows;
    } catch (err) {
      logger.error(err.message);
      logger.error('Query: %s', qs);
      rows = [];
    }
  }
  return rows;
};