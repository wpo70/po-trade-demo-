const { makeQueryArrays, query } = require(".");
const { logger } = require("../utils/logger");


module.exports.addSwaptionStructure = async function(structures) {
  const rows = [];
  var pg_row;

  for (let structure of structures) {
    pg_row = await insert_structure(structure);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  return rows;
};

module.exports.updateSwaptionStructures = async function(structures) {
  const rows = [];
  var pg_row;

  for (let structure of structures) {
    pg_row = await update_structure(structure);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  return rows;
};

module.exports.deleteSwaptionStructures = async function(ids) {
  try {
    await query('DELETE FROM swaption_market_structures WHERE id = ANY($1)', [ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteSwaptionStructures: %s', JSON.stringify(ids));
  }
};

async function insert_structure(structure) {
  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(structure, a, f, v, ['id']);

  let qs = '';
  qs = 'INSERT INTO swaption_market_structures (';
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
    logger.error('Query: %s', qs);
    rows = [];
  }
  return rows;
}

async function update_structure(structure) {
  let a = [structure.id];
  let f = [];
  let v = [];

  makeQueryArrays(structure, a, f, v, ['id']);

  let qs = '';
  qs += 'UPDATE swaption_market_structures SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE id = $1 RETURNING *';

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


