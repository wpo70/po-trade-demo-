'use strict';

const axios = require('axios');
var fs = require('fs');
const config = require('../config.json');
const { logger } = require('./utils/logger');
const { updateTradeOvId } = require('./db/trades');

const BASE_URL = config.oneview.prod.base_url;

// API endpoint for sending trades

const TRADE_URL = BASE_URL + config.oneview.trade_endpoint;

// API endpoint for updating mids

const UPDATE_MID_URL = BASE_URL + config.oneview.mid_endpoint;
const MKTENV_ID = config.oneview.prod.mkt_env_id;
const SYSNAME = config.oneview.sysname;

// API endpoint for authentication

const AUTH_TOKEN_URL = BASE_URL + config.oneview.auth_endpoint;
const USERNAME = config.oneview.prod.username;
const PASSWORD = config.oneview.prod.password;
const AUTH_TOKEN_PATH = 'auth/ov_auth_token.txt';

// Determine which API endpoint is required for given msg
/**
 *
 * @sendToOneview Thisfunction had been deprecated
 * Potrade no longer sends updated mid/ trades/  to Oneview
 */

module.exports.sendToOneview = async function (msg) {
  // if (msg.hasOwnProperty('submit_ov_tickets')) sendTickets(msg.submit_ov_tickets);
  // if (msg.hasOwnProperty('update_mid')) updateMid(msg.update_mid);
  // if (msg.hasOwnProperty('update_mids')) updateMids(msg.update_mids);
};

function sendTickets(tickets) {
  logger.info('sending trades to Oneview');

  let auth_token = getAuthToken();
  let header = { headers: { Authorization: auth_token } };

  postToApiWithRetry(TRADE_URL, tickets, header);
}

function updateMid(mid) {
  logger.info('sending mid update to Oneview');

  // if no nmx_security exists for mid, return

  if (mid.nmx_security === '') return;

  // prepare mid to send to OV

  let m;

  mid.override ? m = mid.override : m = mid.mid;

  // Format mid, determine quote type based on basis

  let ovf = getOVMidQT(mid.product_id, m);

  // Generate the object that will be send to OV

  let body = [
    {
      'mktEnvId': MKTENV_ID,
      'quotes': [
        {
          'extSystem': SYSNAME,
          'quoteType': ovf.qt,
          'underlyingRef': mid.nmx_security,
          'mid': ovf.m
        }
      ]
    }
  ];

  // Construct header

  let auth_token = getAuthToken();
  let header = { headers: { Authorization: auth_token } };

  // Send mid to numerix

  postToApiWithRetry(UPDATE_MID_URL, body, header);
}

function updateMids(mids) {
  logger.info('sending mids update to Oneview');

  // Generate object to send to OV

  let body = [
    {
      'mktEnvId': MKTENV_ID,
      'quotes': []
    }
  ];

  for (let mid of mids) {
    // if no nmx_security exists for mid, skip 

    if (mid.nmx_security === '') continue;

    let ovf = getOVMidQT(mid.product_id, mid.mid);

    body[0].quotes.push(
      {
        'extSystem': SYSNAME,
        'quoteType': ovf.qt,
        'underlyingRef': mid.nmx_security,
        'mid': ovf.m
      }
    );
  }

  // if no mids to update, return

  if (body[0].quotes.length === 0) return;

  // Construct header

  let auth_token = getAuthToken();
  let header = { headers: { Authorization: auth_token } };

  // Send quote to numerix

  postToApiWithRetry(UPDATE_MID_URL, body, header);
}

// Methods to post to the API

function postToApiWithRetry(url, body, header) {
  axios.post(url, body, header)
    .then(resp => {
      if (resp.hasOwnProperty('status') && resp.hasOwnProperty('statusText')) {
        logger.info(`${resp.status} ${resp.statusText}`);
        // Update trade_id_ov on database
        const regex = /\bTRADE[a-zA-Z]*/;
        
        if (resp.data.data.successes[0].key.match(regex)) {
          let  t = [];
          resp.data.data.successes.forEach(e => t.push(e.key));
          updateTradeOvId(t,resp.data.data.successes[0]['productType']);
        }
      } else {
        logger.info('%O', resp);
      }
    })
    .catch(err => {
      if (err && err.hasOwnProperty('response') && err.response && err.response.hasOwnProperty('status') && err.response.status && err.response.status === 401) {
        logger.info('401 error received. updating auth token and trying again');

        // Update auth token and try again

        updateAuthToken()
          .then(resp => {
            logger.info('successfully updated auth token');

            setAuthToken(resp.data.data.token);

            let auth_token = getAuthToken();
            header.headers.Authorization = auth_token;
            postToApi(url, body, header);
          })
          .catch(err => {
            logger.info('could not update auth token %O', err);
          });
      } else {
        logger.info('%O', err);
      }
    });
}

// Simple post request with response logging

function postToApi(url, body, header) {
  axios.post(url, body, header)
    .then(resp => {
      if (resp.hasOwnProperty('status') && resp.hasOwnProperty('statusText')) {
        logger.info(`${resp.status} ${resp.statusText}`);
        // Update trade_id_ov on database
        const regex = /\bTRADE[a-zA-Z]*/;
        
        if (resp.data.data.successes[0].key.match(regex)) {
          let  t = [];
          resp.data.data.successes.forEach(e => t.push(e.key));
          updateTradeOvId(t);
        }     
      } else {
        logger.info('%O', resp);
      }
    })
    .catch(err => {
      if (err.hasOwnProperty('response') && err.response.hasOwnProperty('status') && err.response.hasOwnProperty('statusText')) {
        logger.info(`${err.response.status} ${err.response.statusText}`);
      } else {
        logger.info('%O', err.response.data.data.errors);
      }
    });
}

function updateAuthToken() {
  logger.info('updating Oneview auth token');

  // Obtain token by post to AUTH_TOKEN_URL with username and password

  const body = { loginName: USERNAME, password: PASSWORD };
  return axios.post(AUTH_TOKEN_URL, body, null);
}

// Set the Auth Token value

function setAuthToken(token) {
  fs.writeFileSync(AUTH_TOKEN_PATH, token, "utf-8");
}

// Obtain the auth token from the authentication file

function getAuthToken() {
  let token = fs.readFileSync(AUTH_TOKEN_PATH, "utf-8");
  return 'Bearer ' + token;
}

// If product is IRS, EFP, OIS, use decimal
// Else use basis
// NOTE: hard coded product ids

function getOVMidQT(p, m) {
  let ovf = {};

  if (p === 1 || p === 2 || p === 3) {
    ovf.m = m / 100;
    ovf.qt = 'Rate';
  } else if (p === 4 || p === 5 || p === 6 || p === 7 || p === 8 || p === 9) {
    ovf.m = m / 10000;
    ovf.qt = 'Spread';
  }

  return ovf;
}
