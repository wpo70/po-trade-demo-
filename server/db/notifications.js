'use strict';

const { query } = require('.');
// const { logger } = require('../utils/logger.js');

module.exports.getNotifications = async function (broker_id, after) {
  let after_ts = /^[^.]*/.exec(new Date(after).toISOString().replace('T', ' '))[0];
  let data = await query('SELECT * FROM notifications WHERE broker_id = $1 AND timestamp > $2', [broker_id, after_ts]);
  return data.rows;
};

module.exports.sendNotifications = async function (sender, msg) {
  // TODO: hanlde potential injections (check that $ syntax does this)
  let { brokers, subject, body } = msg;
  if (!body.length) { body = null; }
  let qs = "INSERT INTO notifications (broker_id, sender, subject, body) VALUES ";
  for (let [idx, b] of brokers.entries()) {
    qs += `(${b}, $1, $2, $3)`;
    qs += idx != brokers.length-1 ? ', ' : ' RETURNING *';
  }
  let data = await query(qs, [sender, subject, body]);
  return data.rows;
};

module.exports.deleteNotification = async function (broker_id, notification) {
  let data = await query("DELETE FROM notifications WHERE broker_id = $1 AND notification_id = $2 RETURNING *", [broker_id, notification]);
  return data.rows;
};