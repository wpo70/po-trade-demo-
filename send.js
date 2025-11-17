'use strict';

const { sessions, activePocbot, activeConfobot, activeMarkit } = require('./map.js');
const { logger } = require('./utils/logger.js');

module.exports.sendToAllClients = function (msg) {
  // If the message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToAllClients: message has no content');
    return;
  }

  // Convert the message to JSON.

  let message = JSON.stringify(msg);

  // Loop over the client websockets

  for (const sess of sessions.values()) {
    if (sess?.hasOwnProperty('socket') && !sess.is_gateway) {
      sess.socket.send(message);
    }
  }
};

module.exports.sendToOneClient = function (ws, msg) {
  // Convert the message to JSON and send it to the given socket.  If the
  // message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToOneClient: message has no content');
    return;
  }

  // JSON the message and send it.
  let message = JSON.stringify(msg);
  ws.send(message);
};

let queue = [];
module.exports.count = {}; // Requests made count = { uid: # of reqs }

module.exports.addToGatewayQueue = function (uid) {
  queue.push(uid);
  module.exports.count[uid] = 0;
};

module.exports.removeFromGatewayQueue = function (uid) {
  delete module.exports.count[uid];
  let index = queue.indexOf(uid);
  if (index >= 0) {
    queue.splice(index, 1);
    return true;
  }
  return false;
};

module.exports.sendToSpecificGateway = function (id, msg) {
  let sess = sessions.get(id);
  let message = JSON.stringify(msg);
  if (sess?.hasOwnProperty('socket')) sess.socket.send(message);
  else logger.error("Message cannot be sent to specific session as the session has not websocket");
}

module.exports.sendToGateway = function (msg) {
  // If the message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToGateway: message has no content');
    return;
  }

  // Get the first websocket to a gateway and convert the message to JSON.
  
  if (queue == []) {
    for (const [uid] of module.exports.sessions) {
      queue.push(uid);
      module.exports.count[uid] = 0;
    }
  }

  queue.sort((a,b) => module.exports.count[a] - module.exports.count[b]);

  module.exports.count[queue[0]]++;
  let sess = sessions.get(queue[0]);
  queue.push(queue[0]);
  queue.splice(0,1);

  let message = JSON.stringify(msg);

  // Send the message.

  if (sess?.hasOwnProperty('socket')) {
    sess.socket.send(message);
  } else {
    // There is no gateway.
    logger.error('Could not send message to a gateway because none are connected %s', message);
  }
};

module.exports.sendToPocbot = function (msg) {
  // If the message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToPocbot: message has no content');
    return;
  }

  // Get the poc-bot websocket and convert the message to JSON

  const sess = activePocbot('session');
  let message = JSON.stringify(msg);

  if (sess?.hasOwnProperty('socket')) {
    sess.socket.send(message);
  } else {
    // POC-BOT is not connected

    logger.error('Could not send message to POC-BOT because its not connected %s', message);
  }
};
module.exports.sendToConfobot = function (msg) {
  // If the message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToConfobot: message has no content');
    return;
  }

  // Get the confo-bot websocket and convert the message to JSON

  const sess = activeConfobot('session');
  let message = JSON.stringify(msg);

  if (sess?.hasOwnProperty('socket')) {
    sess.socket.send(message);
  } else {
    // CONFO-BOT is not connected

    logger.error('Could not send message to CONFO-BOT because its not connected %s');
  }
};

module.exports.sendToMarkit = function (msg) {
  // If the message has no content don't send anything.

  if (Object.keys(msg).length === 0) {
    logger.error('sendToMarkit: message has no content');
    return;
  }

  // Get the markit websocket and convert the message to JSON

  const sess = activeMarkit('session');
  let message = JSON.stringify(msg);

  if (sess?.hasOwnProperty('socket')) {
    sess.socket.send(message);
  } else {
    // MARKIT is not connected

    logger.error('Could not send message to MARKIT because its not connected %s', message);
  }
};