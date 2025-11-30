'use strict';

// This is a map of HTTP user IDs to sessions.  The sessions contain information
// like whether the client is a gateway, whether it is alive and the websocket.

module.exports.sessions = new Map();

module.exports.activeGateway = function (w) {
  // Return the active gateway, being the first gateway in sessions.  If there
  // are none, return null.  W must be either 'userId' or 'session' to select
  // whether to return the active gateway's userId or its session.

  for (const [uid, sess] of module.exports.sessions) {
    if (sess.is_gateway) {
      switch (w) {
        case 'userId':
          return uid;
        case 'session':
          return sess;
        default:
          throw new Error('Parameter W is not recognised');
      }
    }
  }

  return null;
};

module.exports.isActiveGateway = function (session) {
  // Return true if 'sess' is the session of the active gateway

  for (const sess of module.exports.sessions.values()) {
    if (sess.is_gateway && sess === session) {
      return true;
    }
  }
  return false;
};

module.exports.isSpreadSheetConnected = function () {
  // Return true if 'sess' is the session of the active gateway

  for (const sess of module.exports.sessions.values()) {
    if (sess.is_gateway && sess.sheet_connected) {
      return true;
    }
  }
  return false;
};

module.exports.activePocbot = function (w) {
  // Return the active Pocbot, being the first Pocbot in sessions.  If there
  // are none, return null.  W must be either 'userId' or 'session' to select
  // whether to return the active Pocbot's userId or its session.

  for (const [uid, sess] of module.exports.sessions) {
    if (sess.is_pocbot) {
      switch (w) {
        case 'userId':
          return uid;
        case 'session':
          return sess;
        default:
          throw new Error('Parameter W is not recognised');
      }
    }
  }

  return null;
};
module.exports.activeMarkit = function (w) {
  // Return the active markit, being the first markit in sessions.  If there
  // are none, return null.  W must be either 'userId' or 'session' to select
  // whether to return the active markit's userId or its session.

  for (const [uid, sess] of module.exports.sessions) {
    if (sess.is_markit) {
      switch (w) {
        case 'userId':
          return uid;
        case 'session':
          return sess;
        default:
          throw new Error('Parameter W is not recognised');
      }
    }
  }

  return null;
};
module.exports.MarkitLoggedIn = function (w) {
  // Return the active markit, being the first markit in sessions.  If there
  // are none, return null.  W must be either 'userId' or 'session' to select
  // whether to return the active markit's userId or its session.

  for (const [uid, sess] of module.exports.sessions) {
    if (sess.is_markit && sess.is_markit_active) {
      switch (w) {
        case 'userId':
          return uid;
        case 'session':
          return sess;
        default:
          throw new Error('Parameter W is not recognised');
      }
    }
  }

  return null;
};
module.exports.activeConfobot = function (w) {
  // Return the active gateway, being the first gateway in sessions.  If there
  // are none, return null.  W must be either 'userId' or 'session' to select
  // whether to return the active gateway's userId or its session.

  for (const [uid, sess] of module.exports.sessions) {
    if (sess.is_confobot) {
      switch (w) {
        case 'userId':
          return uid;
        case 'session':
          return sess;
        default:
          throw new Error('Parameter W is not recognised');
      }
    }
  }

  return null;
};

