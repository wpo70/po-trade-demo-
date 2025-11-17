'use strict';

const { query } = require('./db');
const { sessions } = require('./map.js');
const uuid = require('uuid');
const { logger } = require('./utils/logger.js');
const config = require('../config.json');
const { getSecurities } = require('./gw_controller');

const jwt = require('jsonwebtoken');

module.exports.login = async function (req, res) {
  // Log in the user and set the session username.  At this point, for simplicity,
  // no authentication is being done.

  var pg_result;
  const username = req.body.username;
  const password = req.body.password;

  // "Authenticate" the user by getting the user with
  // the given username and password.

  // FIXME: Change key, move to own file

  try {
    let query_string = `SELECT broker_id, accesslevel, permission FROM brokers WHERE username = $1 AND PGP_SYM_DECRYPT(password::bytea, '${config.database.encryption_key}') = $2 AND active = true`;
    pg_result = await query(query_string, [username, password]);


    // If nothing was returned or entered password doesn't match the login failes & check with temporary_password 
    // initiated with forgot password 

    if (!pg_result.hasOwnProperty('rows') || pg_result.rows.length === 0) {
      let pg_password = await query(`SELECT temporary_password FROM brokers where username = $1`,[username]);
      let now = new Date().getTime();
      let expiry_time = new Date(pg_password.rows?.[0]?.temporary_password?.timestamp).getTime();
      if ((now - expiry_time) <= 1800000){
        let tempPass = pg_password.rows[0].temporary_password.password;
        if(password !== tempPass){
          logger.error(`Failed to log in ${username}`);
          res.status(401).send({ response: `The credentials of ${username} were not recognised` });
          return;
        }
        // Sets the temporary_password field in db to a fixed json.
        pg_result = await query(`UPDATE brokers SET temporary_password = $2 WHERE username = $1 RETURNING *`,
          [username, JSON.stringify({password: "temporary_confirmed", timestamp: new Date(3).toISOString()})]);
      }else{
        logger.error(`Failed to log in ${username}`);
        res.status(401).send({ response: `The credentials of ${username} were not recognised` });
        return;
      }
    }

    // Login is successful.  Update the user's session with a random identifier

    let userId = uuid.v4();
    req.session.userId = userId;
    sessions.set(userId, {
      is_gateway: false,
      is_pocbot: false,
      broker_id: pg_result.rows[0].broker_id,
      accesslevel: pg_result.rows[0].accesslevel,
      permission: pg_result.rows[0].permission
    });

    // Send a simple message of success to the web browser.

    logger.info(`User ${username} logged in ${userId}`);
    res.set('Content-Type', 'application/json');
    res.status(200).send({ result: 'OK', message: 'Logged in' });
  } catch (err) {
    logger.error(err.message);
    res.status(500).send({ response: err.message });
  }
};

module.exports.restLogin =async function (req,res){
  const {email, password} = req.body;
  if (!(email && password)) {
    res.status(400).send({ 
      timestamp: new Date().toUTCString(),
      status: 400,
      message: "Bad request"});
    logger.error(`Detect some alien trying to access ${req}`);
    return;
  }
  // validate if user exist in our database
  var pg_result;

  // "Authenticate" the user by getting the user with
  // the given username and password.
  try {
    let query_string = `SELECT * FROM brokers WHERE username = $1 AND PGP_SYM_DECRYPT(password::bytea, '${config.database.encryption_key}') = $2`;
    pg_result = await query(query_string, [email, password]);

    // If nothing was returned or entered password doesn't match the login failed

    if (!pg_result.hasOwnProperty('rows') || pg_result.rows.length === 0) {
      logger.error(`Failed to log in ${email}`);
      res.status(401).send({ 
        timestamp: new Date().toUTCString(),
        status: 401,
        response: `The credentials of ${email} were not recognised` });
      return;
    }

    // Send a simple message of success to the web browser.

    logger.info(`User ${email} logged in `);
    res.set('Content-Type', 'application/json');
    const user = {
      userEmail: email,
      password: password
    };

    // Set token exprire in 15min
    jwt.sign({user}, `${config.database.encryption_key}`, {expiresIn: '900s'}, (err, token) => {
      const response = {
        "data": {
          "email":pg_result.rows[0].username,
          "accessLevel": "user",
          "roleId": pg_result.rows[0].accesslevel,
          "active": pg_result.rows[0].active,
          "createdAt": "",
          "twoFactor": {},
          "timestamp": new Date().toUTCString()
        },
        "accessToken": token,
        "validUntil": new Date().getTime() + 900000,
      };
      res.status(200).send(response);
    }
    );
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ 
      timestamp: new Date().toUTCString(),
      status: 500,
      response: err.message });
  }
};
module.exports.verifyToken = (req, res, next) =>{
  const bearerheader = req.headers['authorization'];
  const token = bearerheader && bearerheader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, `${config.database.encryption_key}`, (err, user) => {
    if (err) logger.error(`Failed veryfying token ${err}`);
    if (err) return res.status(403).send({ 
      timestamp: new Date().toUTCString(),
      status: 403,
      message: {
        "name": err.name,
        "expiredAt": err.expiredAt
      }
    });
    req.user = user;
    return next();
  });
};

module.exports.logout = function (req, res) {
  // Log out the user, destroy the session and close userId's websocket connection.

  // Get the user's websocket
  logger.info('User has logged out %d', req.session.userId);

  const sess = sessions.get(req.session.userId);
  if (sess.hasOwnProperty('socket')) {
    // Close the connection, if one was created.

    const ws = sess.socket;
    if (ws) ws.close();
  }

  // Destroy the session...

  req.session.destroy(function () {
    // Send a simple message of success to the web browser.
    res.set('Content-Type', 'application/json');
    res.send({ result: 'OK', message: 'Logged out' });

  });

  // Clear User Cookie giving the waring: connect.sid has been rejected because it is already expired
  res.clearCookie('connect.sid',{path:'/'});
};
