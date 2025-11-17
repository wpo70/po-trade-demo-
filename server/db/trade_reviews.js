'use strict';

const { query, makeQueryArrays } = require('.');
const { logger } = require('../utils/logger.js');

module.exports.insertTradeReviews = async function (tradeReviews) {

  const rows = [];
  var pg_row;
  for (let review of tradeReviews) {
    pg_row = await insert_review(review);
    if (pg_row.length !== 0) {
      rows.push(pg_row[0]);
    }
  }

  return rows;
};

module.exports.updateTradeReviews = async function (review) {

  const rows = [];
  var pg_row;
  
  pg_row = await update_review(review);
  if (pg_row.length !== 0) {
    rows.push(pg_row[0]);
  }

  return rows;
};

async function insert_review(review) {

  let a = [];
  let f = [];
  let v = [];

  makeQueryArrays(review, a, f, v, ['review_id']);

  let qs;
  qs = 'INSERT INTO trade_reviews (';
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

async function update_review(review) {

  let a = [review.review_id];
  let f = [];
  let v = [];

  makeQueryArrays(review, a, f, v, ['review_id', 'acknowledged']);

  let qs;
  qs = 'UPDATE trade_reviews SET (';
  qs += f.join(',');
  qs += ') = (';
  qs += v.join(',');
  qs += ') WHERE review_id = $1 RETURNING *';

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

module.exports.deleteTradeReviews = async function (review_ids) {
  try {
    await query('DELETE FROM trade_reviews WHERE review_id = ANY($1)', [review_ids]);
  } catch (err) {
    logger.error(err.message);
    logger.error('deleteTradeReviews: %s', JSON.stringify(review_ids));
  }
};
