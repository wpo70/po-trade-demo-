const { validateLegalEntity, validateInterestGroup, validateBIC } = require('./db/banks');

const TradeObject = (req) =>{
  return new Promise ((resolve, reject) => {
    req.body.forEach(async trade => {
    //FIXME: validate productType POTL based on database
      if (!trade.hasOwnProperty("productType") || typeof trade["productType"] != 'string' || !["SPS90D", "SPS30D","RBAOIS"].includes(trade["productType"])
      ) reject(new Error('Product Type is missing or invalid '));
      
      if (
        !trade.hasOwnProperty("data")
      ) reject(new Error('Data is missing or invalid'));

      // validate the date format
      if (
        !trade.data.hasOwnProperty("fixingDate") || typeof trade.data["fixingDate"] != 'string' || !isValidDate(trade.data["fixingDate"])
      ) reject(new Error('Fixing Date is missing or not in a valid format YYYY-MM-DD'));

      if (
        !trade.data.hasOwnProperty("startDate") || typeof trade.data["startDate"] != 'string' || !isValidDate(trade.data["startDate"])
      ) reject(new Error('StartDate is missing or not in a valid format YYYY-MM-DD '));

      if (
        !trade.data.hasOwnProperty("endDate") || typeof trade.data["endDate"] != 'string' || !isValidDate(trade.data["endDate"])
      ) reject(new Error('End Date is missing or not in a valid format YYYY-MM-DD'));

      // Compare fixing date, start date, end date
      if (!compareDates (trade.data["fixingDate"], trade.data["startDate"], trade.data["endDate"])) reject (new Error('End Date must be not earlier than Start Date of Fixing Date'));
      
      if (
        !trade.data.hasOwnProperty("rate") || typeof trade.data['rate'] != 'number'
      ) reject(new Error('Rate is missing or invalid '));

      if (
        !trade.data.hasOwnProperty("notional") || typeof trade.data['notional'] != 'number'
      ) reject(new Error('Notional is missing or invalid '));

      // Validate cpty to our database
      if (!trade.data.hasOwnProperty("cpty") || typeof trade.data["cpty"] != 'string' ) reject(new Error('Cpty is missing or invalid '));

      // Validate Interest Group
      if (!trade.data.hasOwnProperty("Interest Group") || typeof trade.data["Interest Group"] != 'string') reject(new Error('Interest Group is missing or invalid '));

      // Validate Trader
      if (
        !trade.data.hasOwnProperty("CptyATrader") || typeof trade.data["CptyATrader"] != 'string'
      ) reject(new Error('CptyATrader is missing or invalid '));

      // Validate Bic code
      if (
        !trade.data.hasOwnProperty("BicCptyA") || typeof trade.data["BicCptyA"] != 'string') reject(new Error('BicCptyA is missing or invalid '));

      // Validate cpty to our database
      if (
        !trade.data.hasOwnProperty("cpty_2")|| typeof trade.data["cpty_2"] != 'string' ) reject(new Error('cpty_2 is missing or invalid '));

      // Validate Interest Group
      if (
        !trade.data.hasOwnProperty("Interest Group B") || typeof trade.data["Interest Group B"] != 'string') reject(new Error('Interest Group B is missing or invalid '));

      // Validate Trader
      if (
        !trade.data.hasOwnProperty("CptyBTrader") || typeof trade.data["CptyBTrader"] != 'string'
      ) reject(new Error('CptyBTrader is missing or invalid '));

      // Validate Bic code
      if (
        !trade.data.hasOwnProperty("BicCptyB") || typeof trade.data["BicCptyB"] != 'string') reject(new Error('BicCptyB is missing or invalid '));

      if (
        !trade.data.hasOwnProperty("Brokerage_A") || typeof trade.data['Brokerage_A'] != 'number'
      ) reject(new Error('Brokerage_A is missing or invalid '));

      if (
        !trade.data.hasOwnProperty("Brokerage_B") || typeof trade.data['Brokerage_B'] != 'number'
      ) reject(new Error('Brokerage_B is missing or invalid '));

      // Validate bank, bic, group
      await validateLegalEntity(trade.data["cpty"]).then(result => {if (!result) reject(new Error ('Cpty is missing or invalid '));});
      await validateBIC(trade.data["cpty"], trade.data["BicCptyA"]).then(result => {if (!result) reject(new Error('Combination of Cpty, Interest Group, BicCpty A is missing or invalid '));});
      await validateInterestGroup(trade.data["cpty"], trade.data["Interest Group"]).then(result => {if (!result) reject(new Error('Combination of Cpty, Interest Group, BicCpty A is missing or invalid '));});
      await validateLegalEntity(trade.data["cpty_2"]).then(result => {if (!result) reject(new Error ('Combination of Cpty_2 is missing or invalid '));});
      await validateBIC(trade.data["cpty_2"], trade.data["BicCptyB"]).then(result => {if (!result) reject(new Error('Combination of Cpty_2, Interest Group B, BicCpty B is missing or invalid '));});
      await validateInterestGroup(trade.data["cpty_2"], trade.data["Interest Group B"]).then(result => {if (!result) reject(new Error('Combination of Cpty_2, Interest Group B, BicCpty B is missing or invalid '));});
     
      // Check if cpty and cpty_2 are the same
      if (trade.data["cpty_2"] == trade.data["cpty"]) reject(new Error('Trade can be executed by the same counterparties. Please check cpty and cpty_2'));
      resolve(true);

    });
  });
};

function compareDates (fixingDate, startDate, endDate) {
  // Fixing date is the date before StartDate
  // EndDate must not be before startDate and fixing Date
  var fixing = new Date(fixingDate).getTime();
  var start = new Date(startDate).getTime();
  var end = new Date(endDate).getTime();
  console.log(fixing, start,end);
  if (end < start)  return false;
  if (end < fixing)  return false;
  return true;
}
function isValidDate(date) {
  // Date format: YYYY-MM-DD
  var datePattern = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;
  // Check if the date string format is a match
  var matchArray = date.match(datePattern);
  if (matchArray == null) {
    return false;
  }
  
  // Remove any non digit characters
  var dateString = date.replace(/\D/g, '');
  // Parse Integer values from the date string
  var year = parseInt(dateString.substr(0, 4));
  var month = parseInt(dateString.substr(4, 2));
  var day = parseInt(dateString.substr(6, 2));
  
  // define the number of days per month
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Leap years
  if (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)) {
    daysInMonth[1] = 29;
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return false;
  }
  return true;
}
module.exports.TradeObject = TradeObject;