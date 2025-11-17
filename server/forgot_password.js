const { query } = require('./db');
const { logger } = require('./utils/logger.js');
const { forgot_password } = require('./email_handler.js');


module.exports.handle_forgot_password = async function (req, res) {
  let userEmail = req.body.userEmail;
  try {
    if (await check_email(userEmail) === true) {
      let password = generate_password();
      await update_db(userEmail, password);
      await forgot_password(userEmail, password);
    }else{
      throw new Error("Invalid Email"); 
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message});
  }
  return res.status(201).json({
    msg: "you should receive an email",
  });
};



async function check_email(email) {
  // Query Select data
  let pg_result;
  try {
    pg_result = await query(`SELECT email FROM brokers WHERE email = $1 AND active = true`, [email]);
    
    return !!pg_result?.rowCount;
  } catch (err) {
    logger.error(err.message);
    return false;
  }
}

// Upgrade to complex/unique password
function generate_password() {
  let password = Math.random().toString(36).slice(-8);
  return password;
}

async function update_db(email, password) {
  //QUERY UPDATE DATA FIELD
  let pg_result;
  let value = { password: password, timestamp: new Date().toISOString() };
  value = JSON.stringify(value);
  try {
    pg_result = await query(`UPDATE brokers SET temporary_password = $2 WHERE email = $1`, [email, value]);
    return pg_result.rows;
  } catch (err) {
    logger.error(err.message);
    pg_result.rows = [];
  }
}
