const config = require('../config.json');
const { logger } = require('./utils/logger.js');

const { insertTradesAPI } = require('./db/trades');
const { sendToMarkit } = require('./send.js');
const { TradeObject } = require('./tradeObject');
const { setFWDMids_Api } = require('./db/quotes.js');
const { sendToAllClients} = require('./send.js');
// hash IDs
const Hashids = require("hashids");
const hashids = new Hashids(`${config.database.encryption_key}`, 12);

function replaceIds (obj, replaceFunc) {
  if (obj == null) return obj;
  for (const key of Object.keys(obj)) {
    if (obj[key] == null) continue;
    if (typeof obj[key] === "object")
      obj[key] = replaceIds(obj[key], replaceFunc);
    else if ( key === "roleId") 
      obj[key] = replaceFunc(obj[key]);
  }
  return obj;
}
module.exports.encodeMiddleware = function(req, res, next) {
  var _json = res.json;
  res.json = (obj) => {
    res.json = _json;
    obj = replaceIds(obj, (v) => hashids.encode(v));
    return res.json(obj);
  };
  next();
};
module.exports.decodeMiddleware = function(req, res, next){
  try {
    req.query = replaceIds(req.query, (v) => hashids.decode(v)[0]);
    req.body = replaceIds(req.body, (v) => hashids.decode(v)[0]);
  } catch (e) {
    logger.error(`could not decode id: `, e);
    return res.sendStatus(404);
  }
  next();
};

module.exports.trades = async function (req, res) {
  if (Object.keys(req.body).length === 0) {
    logger.error("Bad request %d", req.body);
    return res.status(400).send({
      timestamp: new Date().toUTCString(),
      status: 400,
      message: "Bad Request"
    });
  }
  else {
    try {
      await TradeObject(req)
        .then(result =>{
          // Write to Database
          insertTradesAPI(req.body, req.user.user.userEmail)
            .then( 
              // Send to Markit with trades & ID
              trades => sendToMarkit({ submit_tickets: trades }))
            .catch( (e) =>{
              logger.error("Unable to update Trade to Database", e);
            });

          return res.status(200).send(
            {
              result: 'OK',
              message: { 
                updatedUser: req.user.user.userEmail, 
                stateCode: "success", 
                createdAt: new Date().toUTCString() 
              },
              data: req.body
            }
          );
        })
        .catch(Error => {
          return res.status(400).send({
            timestamp: new Date().toUTCString(),
            status: 400,
            message: "Bad Request " + Error
          });}
        );
    } catch (Error) {
      return res.status(400).send({
        timestamp: new Date().toUTCString(),
        status: 400,
        message: "Bad Request " + Error
      });}
  }
};

module.exports.fwd_mids_api = async function (req, res) {
  if (Object.keys(req.body).length === 0) {
    logger.error("Bad request %d", req.body);
    return res.status(400).send({
      timestamp: new Date().toUTCString(),
      status: 400,
      message: "Bad Request"
    });
  }
  else {
    
    try {
        // Write to Database
        setFwdApi(req.body)
        .then(result =>{
    
          return res.status(200).send(
            {
              result: 'OK',
              message: { 
                stateCode: "success", 
                createdAt: new Date().toUTCString() 
              },
              data: req.body
            }
          );
        })
        .catch(Error => {
          console.log(Error);
          return res.status(400).send({
            timestamp: new Date().toUTCString(),
            status: 400,
            message: "Bad Request " + Error
          });}
        );
    } catch (Error) {
      console.log(error)
      return res.status(400).send({
        timestamp: new Date().toUTCString(),
        status: 400,
        message: "Bad Request " + Error
      });}
  }
};

async function setFwdApi (msg) {
  var client_message = {};
  if (msg.hasOwnProperty('set_sheet_data')) {
    client_message.set_fwd_mids = {};

    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_IRS')) {
      client_message.set_fwd_mids["1"] = await setFWDMids_Api(JSON.parse(JSON.stringify(msg.set_sheet_data["Set_Forward_IRS"])), 1);
    }
    
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_3v1')) {
      client_message.set_fwd_mids["4"] = await setFWDMids_Api(JSON.parse(JSON.stringify(msg.set_sheet_data["Set_Forward_3v1"])), 4);
    }
    
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_6v3')) {
      client_message.set_fwd_mids["5"] = await setFWDMids_Api(JSON.parse(JSON.stringify(msg.set_sheet_data["Set_Forward_6v3"])), 5);
    }
    
    if (msg.set_sheet_data.hasOwnProperty('Set_Forward_B/S')) {
      client_message.set_fwd_mids["8"] = await setFWDMids_Api(JSON.parse(JSON.stringify(msg.set_sheet_data["Set_Forward_B/S"])), 8);
    }

  } else {
    throw Error
  }
  if (Object.keys(client_message).length > 0) {
    sendToAllClients(client_message);
  }
}