'use strict';

// See http://expressjs.com/ for help and examples
// See https://github.com/websockets/ws for help and examples

// Get the modules.

const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const config = require('../config.json');

// Get the various custom middleware

const { login, logout, restLogin, verifyToken } = require('./login.js');
const { gw_connect, gw_disconnect } = require('./gw_connect.js');
const { pb_connect, pb_disconnect } = require('./pb_connect.js');
const { cb_connect, cb_disconnect } = require('./cb_connect.js');
const { markit_connect, markit_disconnect } = require('./markit_connect');
const { change_password, change_temporary_password } = require('./change_password.js');
const { trades, encodeMiddleware, decodeMiddleware, fwd_mids_api } = require("./api.js");

// Load the necessary modules.

const { sessions, activeGateway, isActiveGateway } = require('./map.js');
const { messageReceived } = require('./controller.js');
const { gatewayReceived, getSecurities, getAUDProducts, getNonAUDProducts, desiredConnections, currentConnections } = require('./gw_controller.js');
const { sendToOneClient, sendToAllClients, removeFromGatewayQueue, count, sendToSpecificGateway } = require('./send.js');
const { pocbotReceived,  sendPingtoPost } = require('./pb_controller.js');
const { confobotReceived, sendPingtoConfo } = require('./cb_controller');
const { markitReceived, sendPingtoMarkit } = require('./markit_controller');
const { temp_pass, send_report } = require('./email_handler.js');
const { logger } = require('./utils/logger.js');
const { addDays } = require('./utils/formatter.js');
const { handle_forgot_password } = require('./forgot_password');
const { generateEODReport } = require('./db/trades');
const { updateMonthsTotalBrokerage } = require('./db/brokerages');

// Instantiate the servers
const app = express();

// We need the same instance of the session parser in express and WebSocket
// server.  The default memory store is known to have a memory leak and so it is
// replaced with MemoryStore.  Later, it could optionally be replaced with a
// memory store that uses a database.  See
// http://expressjs.com/en/resources/middleware/session.html#compatible-session-stores

const sessionParser = session({
  cookie: {
    maxAge: 86400000,
    sameSite: "strict"
  },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  saveUninitialized: false,
  secret: config.https.session.secret,
  resave: false
});

// Serve static files from the 'public' folder.

const ignoreMisc = function(req) {  // Dont log HEAD requests and get requests for misc public items
  return (
    req.method != "HEAD" 
    // && req.originalUrl != '/' // Commented out to only show gets of root so as to log each IP which connects to the app
    && !["global.css", "bundle.css", "favicon.png", "bundle.js", "flags/"].some(str => req.originalUrl.includes(str))
  );
}

app.use(function (req, res, next) {
  if (ignoreMisc(req)) {
    logger.info(`${req.protocol} request: ${req.method} ${req.originalUrl} ${req.ip}`);
  }
  next();
});
app.use(express.static('public'));

// All requests to non-static routes use sessions and JSON.  This middleware
// leaves the parsed JSON object at req.body and the session information in
// req.session.

app.use(sessionParser);
app.use(express.json());
app.use(function (req, res, next) {
  // FIXME: don't log secrets. actually, encrypt the secrets
  logger.info(`REQUEST BODY ${JSON.stringify(req.body)}`);
  next();
});

//Using the global encrypt Id 
app.use(encodeMiddleware);
app.use(decodeMiddleware);

// Handle POST and DELETE requests for gateways to connect and disconnect.

app.post('/gw_connect', gw_connect);
app.delete('/gw_disconnect', gw_disconnect);
app.get('/v1/connections/gw_desired_conns', verifyToken, desiredConnections);
app.get('/v1/connections/gw_curr_conns', verifyToken, currentConnections);

// Handle POST and DELETE requests for clients to login and logout.

app.post('/login', login);
app.get('/logout', logout);

// Handle POST and DELETE requests for POC-BOT to connect and disconnect.

app.post('/pb_connect', pb_connect);
app.delete('/pb_disconnect', pb_disconnect);

// Handle POST and DELETE requests for CONFO-BOT to connect and disconnect.

app.post('/cb_connect', cb_connect);
app.delete('/cb_disconnect', cb_disconnect);

// Handle POST and DELETE requests for MARKIT to connect and disconnect.

app.post('/markit_connect', markit_connect);
app.delete('/markit_disconnect', markit_disconnect);

// Feed Data fwd mids from API
app.post('/v1/api/fwd_mids', verifyToken, fwd_mids_api);
app.post('/v1/auth/login', restLogin);

// Feed Trade from API
app.post('/v1/api/trades', verifyToken, trades);
app.get('/v1/auth/login', restLogin);
// Handle password change request

app.post('/change_password', change_password);
app.post('/change_temporary_password', change_temporary_password);

// Email Handling request
app.post('/temp_pass', temp_pass);
app.post('/handle_forgot_password', handle_forgot_password);
app.post('/send_report', send_report);

// Create an HTTP server.

const http_server = http.createServer(app);

// Create a WebSocket server completely detached from the HTTP server.

const ws_server = new WebSocket.Server({ clientTracking: false, noServer: true });

// When the http client requests a server upgrade create a connection.

http_server.on('upgrade', function (req, socket, head) {
  // Check that the user session already exists.

  sessionParser(req, {}, () => {
    if (!req.session.userId || !sessions.has(req.session.userId)) {
      logger.warn('Upgrade request did not provide a valid session cookie');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Handle the upgrade request by creating a connection.

    ws_server.handleUpgrade(req, socket, head, function (ws) {
      ws_server.emit('connection', ws, req);
    });
  });
});

// When the connection is created...

ws_server.on('connection', function (ws, req) {
  console.log('server ws on connection():');
  //console.log(ws, req);

  // Associate the connection(socket) with the session userId.

  const userId = req.session.userId;
  const sess = sessions.get(userId);
  sess.socket = ws;

  // Handle incoming ping messages by responding with a pong.

  ws.on('ping', function () {
    this.pong();
  });

  // Handle incoming pong messages by flagging that the connection is alive.

  sess.is_alive = true;
  ws.on('pong', function () {
    sess.is_alive = true;
  });
  // console.log(sess);
  // Handle incoming messages depending on whether the websocket is for a
  // gateway or not.

  if (sess.is_gateway) {
    // Handle messages from gateways
    ws.on('message', message => gatewayReceived(message, sess));

    // Log a message.
    logger.info('Opened gateway websocket %O', userId);

    // If this is the active gateway tell it to connect to blp
    if (isActiveGateway(sess)) {
      sendToOneClient(ws, { blp_connect: true });
    }
    restartGatewayRequests();
  } else if (sess.is_pocbot) {
    // Handle messages from poc-bot
    ws.on('message', message => pocbotReceived(message, sess));

    // Log a message.
    logger.info('Opened POC-BOT websocket %O', userId);
  } else if (sess.is_confobot)  {
  // Handle messages from confo-bot
    ws.on('message', message => confobotReceived(message, sess));

    // Log a message.
    logger.info('Opened CONFO-BOT websocket %O', userId);
  } else if (sess.is_markit) {
    // Handle messages from markit
    ws.on('message', message => markitReceived(message, sess));

    // Log a message.
    logger.info('Opened MARKIT websocket %O', userId);
  } else {
    // Handle messages from the browser.
    ws.on('message', message => messageReceived(message, sess));

    // Log a message.
    logger.info('Opened client websocket %O', userId);
  }

  // When the socket is closed remove the session userId from the map.

  ws.on('close', function (event) {
    // Markit disconnect
    if (sessions.get(userId).is_markit) sendToAllClients({ markit_disconnected: true });
    
    // Gateway disconnect
    sessions.delete(userId);

    if (removeFromGatewayQueue(userId)) {
      restartGatewayRequests();
      sendToAllClients({gateway_disconnected: userId});
    }
    
    logger.info(`Closed websocket - User: ${userId}, Event code: ${event}`);
  });

  // If an error occurs, log it here.  The close event will be fired immediately
  // afterwards so let the close handler take care of finding a new gateway.

  ws.on('error', function (event) {
    logger.error('Websocket error: %O', event);
  });
});

//
// Start the HTTP server.
//
const port = config.env == "prod" ? "8090" : "8080";
http_server.listen(port, function () {
  logger.info(`Listening on http://localhost:${port}`);
});

let intervals = [];
module.exports.restartGatewayRequests = restartGatewayRequests;
function restartGatewayRequests () {

  for (let [key] of Object.entries(count)) count[key] = 0;

  for (let interval of intervals) {
    clearInterval(interval);
  }
  intervals = [];
  
  let gwCount = 0;
  let t1, t2, t3, t4, t5;

  sessions.forEach((sess) => {if (sess.is_gateway) gwCount++;});

  switch (gwCount){
    case 0: 
      return;
    case 1:
      t2 = 60000; t3 = 60000; t4 = 300000; 
      break;
    case 2:
    case 3:
      t2 = 60000; t3 = 60000; t4 = 120000; 
      break;
    default: // case 4 or greater
      t2 = 30000; t3 = 30000; t4 = 120000; 
      break;
  }
  t1 = 20000/(gwCount > 5 ? 5 : gwCount);
  t5 = 30000/(gwCount > 6 ? 6 : gwCount);

  let interval;
  // Send to gateway ticker xma, yma, bbsw
  interval = setInterval(() => getSecurities("main"), t1);
  intervals.push(interval);
  // Send to gateway fut 
  interval = setInterval(() => getSecurities("fut"), t2);
  intervals.push(interval);
  // Send to gateway fx exchange rate
  interval = setInterval(() => getSecurities("fx"), t3);
  intervals.push(interval);
  // Send to gateway USD tickers
  interval = setInterval(() => getSecurities("usd"), t4);
  intervals.push(interval);
  // Send to gateway nonAUD products
  interval = setInterval(getNonAUDProducts, t4);
  intervals.push(interval);
  // Send to gateway AUD products
  interval = setInterval(getAUDProducts, t5);
  intervals.push(interval);
}

function closeAllGWs() {
  sessions.forEach((sess) => {
    if (sess.is_gateway) { sendToSpecificGateway(sess.id, {disconnect:true}); }
  });
}

const getNextTimeout = (days=1, hr=0, mn=0, s=0) => {
  const now = new Date();
  let nextTime = new Date();
  nextTime.setHours(hr, mn, s, 0);
  if (nextTime <= now || days > 1) nextTime = addDays(nextTime, days);
  return nextTime.getTime() - now.getTime();
}

// Close GWs at EOD
setGWCloseTimeout();
function setGWCloseTimeout() {
  let t = getNextTimeout(1, 19);
  setTimeout(() => {
    closeAllGWs();
    setGWCloseTimeout();
  }, t);
}

// Start Reporting Interval
const {hours, mins} = config.reconcilliation.time;
if (!!hours && !!mins && config.env == "prod") { setReportingTimeout(); }

function setReportingTimeout() {
  let t = getNextTimeout(1, hours, mins);
  setTimeout(() => {
    generateEODReport(); 
    setReportingTimeout();
  }, t);
}

// Update monthly totals brokerage
//    check everything has been updated correctly from previous days trades (no failed orders or manual entry) and handle if new month (monthly totals need resetting)
updateMonthsTotalBrokerage();
updateBroTable();
function updateBroTable() {
  let t = getNextTimeout(1, 5);
  setTimeout(() => {updateBroTable();}, t);
}

setInterval(sendPingtoMarkit, 45000);
setInterval(() => sendToAllClients({ping: 0}), 45000);