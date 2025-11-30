'use strict';

const { sendToAllClients, sendToGateway, stop, count, sendToOneClient} = require('./send.js');
const { activeGateway, sessions} = require('./map.js');
const { updateQuotes, getTickerSecurities, setFWDMids } = require('./db/quotes.js');
const { sendToOneview } = require('./ov_api.js');
const { logger } = require('./utils/logger.js');
const { query } = require('./db');
const { getFXSecurities, updateFXSecurities} = require('./db/fxrate.js');
const { getGeneralPreferences } = require('./db/preferences.js');

// Initialise a list of the securities that are regularly requested for the PO
// Trade ticker.  This is done asynchronously and it is _assumed_ that it will
// happen before the first Bloomberg controller connects.  Even if this is not
// the case it will do no harm because the getSecurities function will simply
// ask for no securities.

const ticker_securities = [];
getTickerSecurities(ticker_securities);
const fx_securities = [];
getFXSecurities(fx_securities);
// Handle messages received from a gateway websocket.
module.exports.gatewayReceived = async function (message, sess) {
  // Parse the JSON message.

  const msg = JSON.parse(message);

  // Each message type is provided under its own property.

  var client_message = {};
  // On login the gateway will have been given a response telling it whether or
  // not to connect to the Bloomberg terminal.The clients can ask for all data to initialize themselves after login.

  if (msg.hasOwnProperty('blp_connected')) {
    logger.info('Received gateway message blp_connected');
    sess.blp_connected = msg.blp_connected;
    module.exports.getSecurities("bbsw init");
    module.exports.getSecurities("rbacor init");
    module.exports.getSecurities("main");
    module.exports.getSecurities("fut");
    module.exports.getSecurities("fx");
    
    if (msg.blp_connected) {
      sess.user = msg.user;
      client_message.gateway_updated = {id: sess.id, blp_connected: msg.blp_connected, user: msg.user}
    } else {
      client_message.gateway_updated = {id: sess.id, blp_connected: msg.blp_connected}
    }
  }

  if (msg.hasOwnProperty('sheet_connected')) {
    logger.info('Received gateway message sheet_connected');
    sess.sheet_connected = msg.sheet_connected;
    if (!msg.sheet_connected) {
      sess.hasNoSheet = true;
      tryConnectSheet();
      client_message.gateway_updated = {id: sess.id, sheet_connected: msg.sheet_connected}
    } else {
      for (let sess of sessions.values()) {
        sess.hasNoSheet = false;
      }
      sess.user = msg.user;
      client_message.gateway_updated = {id: sess.id, sheet_connected: msg.sheet_connected, user: msg.user}
    }
  }

  if (msg.hasOwnProperty('got_currency')) {
    if (count[sess.id] != 0) count[sess.id]--;    
    logger.info(`Received gateway message ${JSON.stringify(msg)}`);
  }
  // If the gateway is sending security data then pass it on to all browser
  // clients.  Convert whatever

  if (msg.hasOwnProperty('security_data')) {
    if (count[sess.id] != 0) count[sess.id]--;
    let data = await parseSecurityData(msg.security_data);
    client_message.security_data = data;
  }

  // if the gateway is sending fx data then save them to the database and pass them on to all browser clients
  if (msg.hasOwnProperty('fx_data')) {
    if (count[sess.id] != 0) count[sess.id]--;    
    // Parse to browser via store
    // Parse to database
    client_message.fx_data = await updateFXSecurities(msg.fx_data);
  }
  
  // If the gateway is sending quotes data then save them to the database and
  // pass them on to all browser clients.

  if (msg.hasOwnProperty('set_quotes')) {
    if (count[sess.id] != 0) count[sess.id]--;    

    stop();
    // logger.info(message);
    client_message.set_quotes = await updateQuotes(msg.set_quotes);
    sendToOneview({ update_mids: client_message.set_quotes });
    // logger.info('set_quotes %s', JSON.stringify(client_message.set_quotes));
  }

  if (msg.hasOwnProperty('set_sheet_data')) {
    client_message.set_fwd_mids = {};
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_IRS')) {
      client_message.set_fwd_mids["1"] = await setFWDMids(JSON.parse(msg.set_sheet_data["Set_Forward_IRS"]), 1);
    }
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_3v1')) {
      client_message.set_fwd_mids["4"] = await setFWDMids(JSON.parse(msg.set_sheet_data["Set_Forward_3v1"]), 4);
    }
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_6v3')) {
      client_message.set_fwd_mids["5"] = await setFWDMids(JSON.parse(msg.set_sheet_data["Set_Forward_6v3"]), 5);
    }
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_B/S')) {
      client_message.set_fwd_mids["8"] = await setFWDMids(JSON.parse(msg.set_sheet_data["Set_Forward_B/S"]), 8);
    }
  }

  // After all parts of the message have been processed.  Send all clients an
  // update if the incoming message provides one.
  if (Object.keys(client_message).length > 0) {
    sendToAllClients(client_message);
  }
};

// If there is a gateway and it is connected to bloomberg
// send a get_securities message

module.exports.getSecurities = function (security) {
  const gw_sess = activeGateway('session');
  if (gw_sess === null || !gw_sess.blp_connected) return;

  let securities = ticker_securities.map(row => row.security);
  let fx_securities_ = fx_securities.map(row => row.security);

  // removes the 6 bbsw tickers so that they can be sent on thier own message without the fut_px_val_bp field
  // FIXME: need to use ticker_id to filter the ticker rather than slicing the array method

  let main_tickers = securities.slice(0,2).concat(securities.slice(20, 21)); // XMA | YMA | abfs
  let fut_tickers = securities.slice(2, 14).concat(securities.slice(21, 39)); // ir1 ir2 ir3 ir4 ir5 ir6 ir7 ir8 ir9 ir10 ir11 ir12 ib1 ib2 ib3 ib4 ib5 ib6 ib7 ib8 ib9 ib10 ib11 ib12 ib13 ib14 ib15 ib16 ib17 ib18 
  let bbsw_tickers = securities.slice(14, 20); // BBSW 1m 2m 3m 4m 5m 6m 
  let rbacor = securities.slice(39, 40);
  let usd_tickers = ticker_securities.filter( i => [41,42,43,44,45,46,47,48,49,50,51,52,53].includes(i.ticker_id)).map(row=>row.security);
   // ct2govt ct3govt ct4govt ct5govt ct10govt ct30govt 

  let msg;

  if (security == "main") {
    msg = {
      get_securities: {
        securities: main_tickers.slice(0,2), // XMA | YMA
        fields: ['bid', 'ask', 'fut_px_val_bp']
      }
    };
    sendToGateway(msg);
    msg = {
      get_securities: {
        securities: main_tickers.slice(2,3), //abfs
        fields: ['bid', 'ask']
      }
    };
    sendToGateway(msg);
  } else if (security == "usd") {
    msg = {
      get_securities: {
        securities: usd_tickers, // USD tickers
        fields: ['bid', 'ask', 'fut_px_val_bp']
      }
    };

    sendToGateway(msg);
  } else if (security == "fut") {
    let secs = fut_tickers;
    let now = new Date();
    if (now.getHours() == 10 && now.getMinutes() >= 29 && now.getMinutes() <= 44) {
      secs.push(...bbsw_tickers);
    }
    msg = {
      get_securities: {
        securities: secs,
        fields: ['bid', 'ask']
      }
    };
  
    sendToGateway(msg);
  } else if (security == "bbsw init") {
    msg = {
      get_securities: {
        securities: bbsw_tickers,
        fields: ['bid', 'ask']
      }
    };
  
    sendToGateway(msg);
  } else if (security == "rbacor init") {
    msg = {
      get_securities: {
        securities: rbacor,
        fields: []
      }
    };
    sendToGateway(msg);
  } else if (security == "fx") {
    msg = {
      get_fxsecurities: {
        securities: fx_securities_,
        fields: []
      }
    };
    sendToGateway(msg);
  }
};

module.exports.getSpecificSecurities = getSpecificSecurities;
function getSpecificSecurities (securities, fields) {
  const gw_sess = activeGateway('session');
  if (gw_sess === null || !gw_sess.blp_connected) return;

  let msg;

  msg = {
    get_securities: {
      securities: securities,
      fields: fields
    }
  };
  sendToGateway(msg);
}

let calcIRS = true; // align with store calcIrs's value default at True
setCalcIRSFromPrefernce();

async function setCalcIRSFromPrefernce () {
  calcIRS = (await getGeneralPreferences()).calcIRS;
}

module.exports.setCalcIRS_controller = function (bool = true) {
  calcIRS = bool;
};

module.exports.getCalcIRS = function () {
  return calcIRS;
};

module.exports.getSpecificProducts = getSpecificProducts;
async function getSpecificProducts (pids) {
  const gw_sess = activeGateway('session');
  if (gw_sess === null || !gw_sess.blp_connected) return;

  if (calcIRS && pids.includes(1)) {
    let idx = pids.indexOf(1);
    if (idx >= 0) pids.splice(idx, 1);
    if (!pids.includes(2)) pids.push(2);

    let pg_result = await query(`SELECT security FROM quotes WHERE product_id = 1 AND year IN (0.25, 0.5, 0.75, 1)`);

    let securities = pg_result.rows.map(row => row.security);
    let fields = ["PX_MID", "SW_CNV_RISK"];
    
    getSpecificSecurities(securities, fields);
  }

  for (let id of pids) {
    sendToGateway({ get_quotes: id });
    await new Promise(res => setTimeout(res, 100));
  }
}

module.exports.getAUDProducts = async function () {
  let audProds = await query("SELECT * FROM products WHERE active = true and bbg_quotes = true and currency_code = 'AUD'");
  getSpecificProducts(audProds.rows.map(p => p.product_id));
};

module.exports.getNonAUDProducts = async function () {
  let otherProds = await query("SELECT * FROM products WHERE active = true and bbg_quotes = true and currency_code != 'AUD'");
  getSpecificProducts(otherProds.rows.map(p => p.product_id));
};

// If there is a gateway and it is connected to bloomberg
// send a get_all_quotes message

module.exports.getAllQuotes = function () {
  const gw_sess = activeGateway('session');
  if (gw_sess === null || !gw_sess.blp_connected) return;

  const msg = {
    get_all_quotes: 0
  };

  sendToGateway(msg);
};

// The security data comes back from the Bloomberg gateway indexed by the
// configured securities in ticker_securities.  This function changes the
// indexes to 'xma' and 'yma'.

async function parseSecurityData (security_data) {
  var sec, row;
  let p = {};

  // Loop over the securities returned from the gateway.
  for (sec in security_data) {
    // Get the property corresponding to each security

    row = ticker_securities.find(row => (sec.toLowerCase() === row.security.toLowerCase()));

    if (!row) {
      if (security_data[sec].mid == undefined || security_data[sec].sw_cnv_risk == undefined) continue;
      let result = await query(`SELECT product_id FROM quotes WHERE security = '${sec}'`);
      let pid = result.rows[0].product_id;
      if (pid == 1 || pid == 3 || pid == 10 || pid == 14 || pid == 20 || pid == 21){
        let inv = 1.0 / 0.00125;
        security_data[sec].mid = (Math.round(security_data[sec].mid * inv) / inv).toFixed(5);
      } else if (pid == 27){
        let inv = 1.0 / 0.00125;
        security_data[sec].mid = (Math.round((100 - security_data[sec].mid) * inv) / inv).toFixed(5);
      } else {
        let inv = 1.0 / 0.125;
        security_data[sec].mid = (Math.round(security_data[sec].mid * inv) / inv).toFixed(5);
      }
      let pg_result;
      pg_result = await query(`UPDATE quotes `+ 
                              `SET mid = ${security_data[sec].mid}, dv01 = ${security_data[sec].sw_cnv_risk}, `+
                              `mid_is_stale = ${false}, dv01_is_stale = ${false} `+
                              `WHERE security = '${sec}' `+
                              `RETURNING *`);
      const msg = {
        set_quotes : pg_result.rows
      };
      sendToOneview({ update_mids: msg.set_quotes });
      sendToAllClients(msg);
    } else {
      let mid = (security_data[sec].ask + security_data[sec].bid)/2 ?? security_data[sec].last;
      if (mid && !isNaN(mid)) await query (`UPDATE tickers SET last_mid = ${mid} WHERE security = '${sec}'`);
      p[row.property] = security_data[sec];
    }
  }
  return p;
}

module.exports.updateCurrency = function (currency_state) {
  const gw_sess = activeGateway('session');
  if (gw_sess === null || !gw_sess.blp_connected) return;

  const msg = {
    update_currency: currency_state
  };
  sendToGateway(msg);
};

module.exports.updateProducts = async function() {
  const gw_sess = activeGateway('session');
  if (gw_sess ===  null || !gw_sess.blp_connected) return;
  
  // Get all quote information from the database.

  try {
    let pg_result;
    pg_result = await query('SELECT * FROM quotes');
    const msg = {
      update_products : pg_result.rows
    };
    sendToGateway(msg);
  } catch (err) {
    logger.error({ response: err.message });
  }
};

module.exports.tryConnectSheet = tryConnectSheet;
function tryConnectSheet () {
  for (const sess of sessions.values()) {
    if (sess.is_gateway && !sess.hasNoSheet) {
      sendToOneClient(sess.socket, { sheet_connect: true });
      return;
    }
  }
};
