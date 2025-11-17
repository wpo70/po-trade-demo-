const { query } = require('.');
const { logger } = require('../utils/logger.js');

const validateLegalEntity = async (bank) => {
  if (!bank) return false;
  const qs = `SELECT * FROM banks WHERE ov_bank_id='${bank}'`;
  // Now execute the query
  
  try {
    const pg_result = await query(qs);
    if (pg_result.rowCount == 0) {
      return false;
    }
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    return false;
  }
  return true;
};

const validateInterestGroup = async (bank, group) => {
  if (!bank || !group ) return false;
  const qs = `SELECT * FROM banks WHERE ov_bank_id='${bank}'`;
  
  // Now execute the query
  let rows;

  try {
    const pg_result = await query(qs);
    if (pg_result.rowCount == 0) {
      return false;
    } else {
      rows = pg_result.rows[0].bank_id;
      // Query Interest Group
      const qs_ = `SELECT * FROM interest_groups WHERE bank_id=${rows} AND name='${group}'`;
      const pg_result_ = await query(qs_);
      if (pg_result_.rowCount === 0) {
        return false;
      } else {
        return true;
      } 
    } 
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    return false;
  }
};

const validateBIC = async (bank, bic) => {
  if (!bank || !bic ) return false;
  const qs = `SELECT * FROM banks WHERE ov_bank_id='${bank}'`;

  // Now execute the query
    
  let rows;
  try {
    const pg_result = await query(qs);
    if (pg_result.rowCount == 0) {
      return false;
    } else {
      rows = pg_result.rows[0].bank_id;
      // Query BIC
      const qs_ = `SELECT * FROM bic WHERE bank_id=${rows} AND markitbiccode='${bic}'`;
      const pg_result_ = await query(qs_);
      if (pg_result_.rowCount == 0) {
        return false;
      } else { 
        return true;
      }
    } 
  } catch (err) {
    logger.error(err.message);
    logger.error('Query: %s', qs);
    return false;
  }
};

module.exports.validateLegalEntity = validateLegalEntity;
module.exports.validateInterestGroup = validateInterestGroup;
module.exports.validateBIC = validateBIC;