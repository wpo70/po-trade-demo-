'use strict';

const nodemailer = require('nodemailer');
const mailgen = require('mailgen');
const config = require('../config.json');
const fs = require('fs');
var handlebars = require('handlebars');

const mailGenerator = new mailgen({
  theme: 'default',
  product: {
    // Appears in header & footer of e-mails
    name: 'PO Capital Markets Pty Ltd',
    link: 'http://potrade.tech/',
    logo: 'https://lirp.cdn-website.com/df6043b7/dms3rep/multi/opt/pocapital-001-270w.png',
    logoHeight: "130px",
  }
});

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  auth: {
    user: config.mail.auth.user,
    pass: config.mail.auth.pass
  }
});
const readFile = function(replacements){
  const source = fs.readFileSync(__dirname + '/eod-template.html', 'utf-8').toString();
  let template = handlebars.compile(source);
  let htmlToSend = template(replacements);
  return htmlToSend;
}
/** send mail from testing account */
module.exports.temp_pass = async function (userEmail, userName, password) {
  // create reusable transporter object using the default SMTP transport
  let email = {
    body: {
      name: userName,
      intro: 'Welcome to PO Trade! We\'re very excited to have you on board.',
      action: {
        instructions: 'Your temporary password is:'+
          `<p style="text-align: center; color: black; font-size: 24px; font-weight: bold">${password}</p>`+
          'Please click below to go back to PO Trade:',
        button: {
          color: '#22BC66', // Optional action button color
          text: 'Click Here',
          link: 'http://potrade.tech/'
        }
      },
      outro: 'Need help, or have questions? Just reply to this email, we\'d love to help.'
    }
  };
  
  // Generate an HTML email with the provided contents
  let emailBody = mailGenerator.generate(email);
  
  let message = {
    from: 'PO Capital <reports@pocapital.com.au>', // sender address
    to: userEmail, // list of receivers
    subject: "Welcome to PO Trade", // Subject line
    html: emailBody, // html body
  };

  transporter.sendMail(message);
};

// Forgot password function

module.exports.forgot_password = async function (address, password){

  let email = {
    body: {
      title: 'PO Trade Password Reset',
      intro: 'You have received this email because a password reset for this account was requested.',
      action: {
        instructions: 'Click the button below to return to the login page. You can use the following temporary password to log in:<br>' 
          + `<p style="text-align: center; color: black; font-size: 24px; font-weight: bold">${password}</p>`,
        button: {
          color: '#22BC66', // Optional action button color
          text: 'Click Here',
          link: 'http://potrade.tech/'
        }
      },
      outro: 'This link will expire in 30 minutes. <br> If you did not request a password reset, no further action is required on your part.'
    }
  };
  
  // Generate an HTML email with the provided contents
  let emailBody = mailGenerator.generate(email);
  

  let message = {
    from: 'PO Capital <reports@pocapital.com.au>', // sender address
    to: address, // list of receivers
    subject: "Password Reset", // Subject line
    html: emailBody, // html body
  };

  transporter.sendMail(message);
};

// Daily Brokerage Report function

module.exports.daily_brokerage_report = async function (address, data){

  let tradeSummary = `<p style="font-weight: bold;">Today's trades: </p><table style="white-space: nowrap;">`;
  let bankSummary  = `<p style="font-weight: bold;">Banks Involved: </p><table style="white-space: nowrap;">`;
  let totalSummary = `<p style="font-weight: bold;">Grand Total: ${data.grandTotal.toFixed(2)}</p>`;
  let monthlyTotal = `<p style="font-weight: bold;">Total this month: ${data.monthlyTotal.toFixed(2)}</p>`;

  if (data.tradeTotals.length > 0) {
    for (let trade of data.tradeTotals) {
      tradeSummary += (`<tr>
                          <td style="padding: 0 6px;">${trade.time}:</td>
                          <td style="padding: 0 6px;">${trade.tenor}</td>
                          <td style="padding: 0 6px;">${trade.currency}</td>
                          <td style="padding: 0 6px;">${trade.product}</td>
                          <td style="padding: 0 6px;">-</td>
                          <td style="padding: 0 6px;">$${trade.brokerage.toFixed(2)}</td>
                        </tr>`);
    }
  
    for (let [bank, totals] of Object.entries(data.bankTotals)) {
      bankSummary += `<tr>
                          <td style="padding: 0 6px;">${bank}</td>
                          <td style="padding: 0 6px;">traded ${totals.trade_count} time(s)</td>
                          <td style="padding: 0 6px;">-</td>
                          <td style="padding: 0 6px;">$${totals.brokerage.toFixed(2)}</td>
                      </tr>`
    }

    tradeSummary += "</table><br>";
    bankSummary += "</table><br>";
  } else {
    tradeSummary += "<tr><td>No Trades Conducted Today</td></tr></table><br>";
    bankSummary = "";
  }

  let email = {
    body: {
      title: 'Daily Brokerage Report',
      intro: tradeSummary + bankSummary + totalSummary + monthlyTotal,
    }
  };
  
  // Generate an HTML email with the provided contents
  let emailBody = mailGenerator.generate(email);

  let message = {
    from: 'PO Capital <reports@pocapital.com.au>', // sender address
    to: address, // list of receivers
    subject: "Daily Brokerage Report", // Subject line
    html: emailBody, // html body
  };

  transporter.sendMail(message);
};

module.exports.send_report = async function (req, res){
  try {
    let addresses = req.body.addresses;
    let addressesCC = req.body.addressesCC;
    let subject = req.body.subject;
    let report = req.body.report;
    let textContent = req.body.textContent;
    let fileName = req.body.filename;
    
    let email = {
      body: {
        greeting: false,
        signature: false,
        intro: textContent,
      }
    };
    
    // Generate an HTML email with the provided contents
    let emailBody = mailGenerator.generate(email);
    let replacements ={
      name:req.body.addresses,
      date_from: new Date().toLocaleDateString(),
      title:req.body.subject,
      body:req.body.textContent
    }

    let htmlToSend = readFile(replacements);
    
    let message = {
      from: 'PO Capital <reports@pocapital.com.au>', // sender address
      to: addresses, // list of receivers
      cc: addressesCC,
      subject: subject, // Subject line
      html: htmlToSend, // html body
      attachments: [{
        filename: fileName,
        content: report
      }],
    };

      const info = await transporter.sendMail(message);

  } catch (error) {
    return res.status(500).json({ msg: error.message});
  }
  return res.status(201).json({
    msg: "you should receive an email",
  });
};