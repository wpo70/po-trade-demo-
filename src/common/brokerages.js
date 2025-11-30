'use strict';

import { round } from '../common/formatting.js';

// This file contains all functionality for the logic behind brokerage
// calculations, including trade caps, monthly caps, tenor discounts
// The calculated brokerage here will be the actual brokerage of the
// Trade i.e. what the bank will be charged
// NOTE: Hard coded to expect the bank_ids to remain the same as they are currently
// Using bank names will break the code if bank names change
// Using bank_ids will break the code if bank order changes
/*
bank_id   bank
    1     NAB
    2     JPM
    3     NOM
    4     BNP
    5     MUF
    6     ING
    7     CIBC
    8     CBA
    .     .
    .     .
    .     .
    26    RBC
*/

import quotes from '../stores/quotes.js';
import brokerages from '../stores/brokerages.js';
import traders from '../stores/traders.js';
import banks from '../stores/banks.js';
import { getRbaRuns } from './rba_handler.js';

// Default brokerage fees per bank (low_fee for <=2yr, high_fee for >2yr)
// These are the standard rates from the brokerage agreements
const BANK_FEES = {
  'NAB':       { low_fee: 0.02, high_fee: 0.03 },
  'CBA':       { low_fee: 0.02, high_fee: 0.03 },
  'WBC':       { low_fee: 0.02, high_fee: 0.03 },
  'ANZ':       { low_fee: 0.02, high_fee: 0.03 },
  'JPM':       { low_fee: 0.03, high_fee: 0.035 },
  'JP Morgan': { low_fee: 0.03, high_fee: 0.035 },
  'NOM':       { low_fee: 0.02, high_fee: 0.03 },
  'Nomura':    { low_fee: 0.02, high_fee: 0.03 },
  'BNP':       { low_fee: 0.02, high_fee: 0.03 },
  'MUF':       { low_fee: 0.02, high_fee: 0.03 },
  'ING':       { low_fee: 0.02, high_fee: 0.03 },
  'CIBC':      { low_fee: 0.02, high_fee: 0.03 },
  'UBS':       { low_fee: 0.02, high_fee: 0.03 },
  'MST':       { low_fee: 0.02, high_fee: 0.03 },
  'Morgan Stanley': { low_fee: 0.02, high_fee: 0.03 },
  'SGEN':      { low_fee: 0.02, high_fee: 0.03 },
  'Societe Generale': { low_fee: 0.02, high_fee: 0.03 },
  'BOA':       { low_fee: 0.02, high_fee: 0.03 },
  'TD':        { low_fee: 0.02, high_fee: 0.03 },
  'GS':        { low_fee: 0.02, high_fee: 0.03 },
  'BJA':       { low_fee: 0.02, high_fee: 0.03 },
  'MIZ':       { low_fee: 0.02, high_fee: 0.03 },
  'Mizuho':    { low_fee: 0.02, high_fee: 0.03 },
  'CITI':      { low_fee: 0.02, high_fee: 0.03 },
  'Citi':      { low_fee: 0.02, high_fee: 0.03 },
  'DB':        { low_fee: 0.02, high_fee: 0.03 },
  'RBC':       { low_fee: 0.02, high_fee: 0.03 },
  'BAR':       { low_fee: 0.02, high_fee: 0.03 },
  'HSBC':      { low_fee: 0.02, high_fee: 0.03 },
  'Macquarie': { low_fee: 0.02, high_fee: 0.03 },
  'MAC':       { low_fee: 0.02, high_fee: 0.03 },
  'SCB':       { low_fee: 0.02, high_fee: 0.03 },
  'Standard Chartered': { low_fee: 0.02, high_fee: 0.03 },
  'SG':        { low_fee: 0.02, high_fee: 0.03 },
};

// Map bank names to brokerage calculation functions
const BANK_BRO_FUNCTIONS = {
  'NAB': getNABBro,
  'CBA': getCBABro,
  'WBC': getWBCBro,
  'ANZ': getANZBro,
  'JPM': getJPMBro,
  'JP Morgan': getJPMBro,
  'NOM': getNOMBro,
  'Nomura': getNOMBro,
  'BNP': getBNPBro,
  'MUF': getMUFBro,
  'ING': getINGBro,
  'CIBC': getCIBCBro,
  'UBS': getUBSBro,
  'MST': getMSTBro,
  'Morgan Stanley': getMSTBro,
  'SGEN': getSGENBro,
  'Societe Generale': getSGENBro,
  'BOA': getBOABro,
  'TD': getTDBro,
  'GS': getDefaultBro,
  'BJA': getBJABro,
  'MIZ': getMIZBro,
  'Mizuho': getMIZBro,
  'CITI': getCITIBro,
  'Citi': getCITIBro,
  'DB': getDBBro,
  'RBC': getRBCBro,
  'BAR': getBARBro,
  'HSBC': getDefaultBro,
  'Macquarie': getDefaultBro,
  'MAC': getDefaultBro,
  'SCB': getDefaultBro,
  'Standard Chartered': getDefaultBro,
  'SG': getDefaultBro,
};

// Get bank fees - either from BANK_FEES or use defaults
function getBankFees(bank_name) {
  return BANK_FEES[bank_name] || { low_fee: 0.02, high_fee: 0.03 };
}

// Enhance bro_info with fees if not present
function enhanceBroInfo(bro_info, bank_name) {
  const fees = getBankFees(bank_name);
  return {
    ...bro_info,
    low_fee: bro_info?.low_fee ?? fees.low_fee,
    high_fee: bro_info?.high_fee ?? fees.high_fee,
    monthly_brokerage_sum: bro_info?.monthly_brokerage_sum ?? 0,
    specific_fee: bro_info?.specific_fee ?? {}
  };
}

export function getBrokerage(order, volume) {
  let brokerage;

  // Get bank info
  let bank_id = traders.get(order.trader_id).bank_id;
  let bank = banks.get(bank_id);
  let bank_name = bank?.bank || 'Unknown';
  
  // Get brokerage info for bank and enhance with fees
  let bro_info = brokerages.get(bank_id);
  bro_info = enhanceBroInfo(bro_info, bank_name);

  // Handle EFP products (product_id 2 and 17) separately
  // EFP doesn't have quotes in the same way, so use simplified calculation
  if (order.product_id === 2 || order.product_id === 17) {
    brokerage = getEFPBrokerage(order, volume, bro_info);
    brokerage = round(brokerage, 2);
    return brokerage;
  }

  // Get the brokerage function for this bank
  let broFunc = BANK_BRO_FUNCTIONS[bank_name] || getDefaultBro;
  brokerage = broFunc(bro_info, order, volume);

  // Return brokerage to 2 decimal places
  brokerage = round(brokerage, 2);
  return brokerage;
}

// EFP Brokerage calculation
// Uses a simplified PV calculation with the order price as the rate
function getEFPBrokerage(order, volume, bro_info) {
  let year = order.years[0];
  let rate = order.price || 4.5; // Default rate if not set
  
  // Fee based on tenor
  let pid = order.product_id;
  let fee = bro_info.specific_fee?.[pid] ?? (year <= 2 ? bro_info.low_fee : bro_info.high_fee);
  
  // Compound interval: quarterly (4) for <=3 years, semi (2) for >3 years
  let comp_intv = year <= 3 ? 4 : 2;
  
  // Calculate PV
  let notional = volume * 1000000;
  let comp_rate = rate / (comp_intv * 100);
  let nper = year * comp_intv;
  let pmt = (fee / (comp_intv * 10000)) * notional;
  
  // PV formula
  let num = pmt * (Math.pow(1 + comp_rate, nper) - 1);
  let den = comp_rate * Math.pow(1 + comp_rate, nper);
  
  let brokerage = num / den;
  
  // Apply monthly discount if applicable
  if (bro_info.monthly_brokerage_sum > 75000) {
    brokerage *= 0.3;
  } else if (bro_info.monthly_brokerage_sum > 30000) {
    brokerage *= 0.5;
  }
  
  return brokerage;
}

// Default brokerage function for banks without specific rules
function getDefaultBro(bro_info, order, volume) {
  let year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) {
    rate = null;
    year = order.years[1];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }
  
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);
  
  let brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);
  
  return brokerage;
}

// Brokerage Logic for NAB bank_id 1
function getNABBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // If monthly total bro > $75,000, 70% off notional
  if (bro_info.monthly_brokerage_sum > 75000) { brokerage *= 0.3; }
  // If monthly total bro > $30,000, 50% off notional
  else if (bro_info.monthly_brokerage_sum > 30000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for JPM bank_id 2
function getJPMBro(bro_info, order, volume) {
  let year, fee;
  let rate = order?.price;

  // Spreads half notional on greater leg
  // Flys charged on body only

  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) {
    rate = null;
    year = order.years[1];
    volume = volume / 2;
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  // If monthly total bro > $50,000, 50% off notional
  if (bro_info.monthly_brokerage_sum > 50000) { volume = volume / 2; }

  let brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // Rest of trades capped @1000
  if (brokerage > 5000) { brokerage = 5000; }

  return brokerage;
}

// Brokerage Logic for NOM bank_id 3
function getNOMBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 30000) { brokerage *= 0.5; }

  if (year > 2 && brokerage > 2000) { brokerage = 2000; }

  return brokerage;
}

// Brokerage Logic for BNP bank_id 4
function getBNPBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on width of years using minimum notional
  // Flys charged on lesser leg of the fly
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) {
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // 50% discount if monthly total brokerage > $15,000
  if (bro_info.monthly_brokerage_sum > 15000) brokerage /= 2;

  return brokerage;
}

// Brokerage Logic for MUF bank_id 5
function getMUFBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on half the greater leg
  // Flys charged on the body
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread() || order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (order.isSpread() && (order.years[0] > 2 && order.years[0] <= 1000) && (order.years[1] > 2 && order.years[1] <= 1000)) brokerage /= 2;

  if (bro_info.monthly_brokerage_sum > 25000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for ING bank_id 6
function getINGBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on half the greater leg
  // Flys charged on the body
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread() || order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (order.isSpread() && (order.years[0] > 2 && order.years[0] <= 1000) && (order.years[1] > 2 && order.years[1] <= 1000)) brokerage /= 2;

  if (bro_info.monthly_brokerage_sum > 30000) {
    brokerage *= 0.5;
  }

  return brokerage;
}

// Brokerage Logic for CIBC bank_id 7
function getCIBCBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on half the greater leg
  // Flys charged on the body
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread() || order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (order.isSpread() && (order.years[0] > 2 && order.years[0] <= 1000) && (order.years[1] > 2 && order.years[1] <= 1000)) brokerage /= 2;

  if (bro_info.monthly_brokerage_sum > 25000) { brokerage *= 0.5; }
  
  return brokerage;
}

// Brokerage Logic for CBA bank_id 8
function getCBABro(bro_info, order, volume) {
  // First 10 Trades capped @500 per Trade
  // Volume discount
  // If monthly total bro > $20,000, 50% off notional
  // If monthly total bro > $35,000, 70% off notional

  let brokerage, year, fee;
  let rate = order?.price;
  // Spreads charged on width of years using minimum notional
  // Flys charged on lesser leg of the fly  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  // year <= 2, fee = 0.02
  // year > 2, fee = 0.03
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // If monthly total bro > $35,000, 70% off notional
  if (bro_info.monthly_brokerage_sum > 35000) { brokerage *= 0.3; }
  // If monthly total bro > $20,000, 50% off notional
  else if (bro_info.monthly_brokerage_sum > 20000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for WESP bank_id 13
function getWBCBro(bro_info, order, volume) {
  // Vol discounts
  // If month total > $25,000, 50% off notional
  // If month total > $50,000, 70% off notional

  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on width of years using minimum notional
  // Flys charged on lesser leg of the fly
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) {
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);
  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // If month total > $50,000, 70% off notional
  if(bro_info.monthly_brokerage_sum > 50000) {
    brokerage *= 0.3;
  // If month total > $25,000, 50% off notional
  } else if (bro_info.monthly_brokerage_sum > 25000) {
    brokerage *= 0.5;
  }

  // Not to be less than $300 per ticket (base ticket processing cost)
  if (brokerage < 300) { brokerage = 300; }

  return brokerage;
}

// Brokerage Logic for UBS bank_id 14
function getUBSBro(bro_info, order, volume) {
  let brokerage;

  if (order.isOutright()) {
    brokerage = getBaseBrokerage(order.years[0], volume, bro_info.low_fee, order?.product_id, order?.price);
  } else if (order.isSpread() || order.isButterfly()) {
    brokerage = getBaseBrokerage(order.years[1], volume, bro_info.low_fee, order?.product_id, null);
  }

  // If monthly total bro > $15,000, volume halved
  if (bro_info.monthly_brokerage_sum > 15000) { brokerage *= 0.5; }

  // Curves and Butterflies capped @ 500
  if (brokerage > 500 && (order.isSpread() || order.isButterfly())) { brokerage = 500; }

  // Rest of trades capped @1000
  if (brokerage > 1000) { brokerage = 1000; }

  return brokerage;
}

// Brokerage Logic for ANZ bank_id 15
function getANZBro(bro_info, order, volume) {
  let year, fee;
  let rate = order?.price;
  // Spreads charged on width of years using minimum notional
  // Flys charged on lesser leg of the fly
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) {
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  // year <= 2, fee = 0.02
  // year > 2, fee = 0.035
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  let brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  // If monthly total bro > $50,000, 50% off notional
  if (bro_info.monthly_brokerage_sum > 50000) { brokerage *= 0.5; }

  // Not to be less than $274 per ticket (base ticket processing cost)
  if (brokerage < 274) { brokerage = 274; }
  
  return brokerage;
}

// Brokerage Logic for MST bank_id 16
function getMSTBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 25000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for SGEN bank_id 17
function getSGENBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  // Spreads charged on half the greater leg
  // Flys charged on the body
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread() || order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (order.isSpread() && (order.years[0] > 2 && order.years[0] <= 1000) && (order.years[1] > 2 && order.years[1] <= 1000)) brokerage /= 2;

  if (bro_info.monthly_brokerage_sum > 30000) { brokerage *= 0.5; }

  if (brokerage < 274) { brokerage = 274; }

  return brokerage;
}

// Brokerage Logic for BOA bank_id 18
function getBOABro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 40000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for TD bank_id 19
function getTDBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  // Spreads charged on half the greater leg
  // Flys charged on the body
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread() || order.isButterfly()) {
    rate = null;
    year = order.years[1];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (order.isSpread() && (order.years[0] > 2 && order.years[0] <= 1000) && (order.years[1] > 2 && order.years[1] <= 1000)) brokerage /= 2;

  if (bro_info.monthly_brokerage_sum > 25000) { brokerage *= 0.5; }

  if (brokerage < 275) { brokerage = 275; }

  return brokerage;
}

// Brokerage Logic for BJA bank_id 22
function getBJABro(bro_info, order, volume) {
  let brokerage, year;
  let pid = order.product_id;
  let fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);
  if (order.isOutright()) {
    fee = bro_info.specific_fee?.outrights?.[pid] ?? fee;
    brokerage = getBaseBrokerage(order.years[0], volume, fee, pid, order?.price);
  } else if (order.isSpread()) { 
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
    brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, null);
  } else if (order.isButterfly()) {
    year = order.years[0];
    brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, null);
  }
  // Max brokerage $750
  if (brokerage > 750) { brokerage = 750; }
  // Min brokerage $250
  if (brokerage < 250) { brokerage = 250; }

  return brokerage;
}

// Brokerage Logic for MIZ bank_id 23
function getMIZBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;

  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 30000) { brokerage *= 0.5; }

  return brokerage;
}

// Brokerage Logic for CITI bank_id 24
function getCITIBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    let gaps = [order.years[1] - order.years[0], order.years[2] - order.years[1]];
    if (gaps[0] == 1 && gaps[1] == 1){
      year = 1;
    } else {
      year = gaps[0] + gaps[1];
      volume /= 2;
    }
    rate = null;
  }

  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (brokerage < 275) { brokerage = 275; }

  return brokerage;
}

// Brokerage Logic for DEUT bank_id 25
function getDBBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 30000) { brokerage *= 0.5; }

  if (brokerage > 3000) { brokerage = 3000; }

  return brokerage;
}

// Brokerage Logic for RBC bank_id 26
function getRBCBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    year = order.years[0];
  }
  let pid = order.product_id;
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  if (bro_info.monthly_brokerage_sum > 40000) { brokerage *= 0.3; }
  else if (bro_info.monthly_brokerage_sum > 20000) { brokerage *= 0.5; }

  if (brokerage > 2000) { brokerage = 2000; }

  return brokerage;
}

// Brokerage Logic for Barclays bank_id 27
function getBARBro(bro_info, order, volume) {
  let brokerage, year, fee;
  let rate = order?.price;
  
  if (order.isOutright()) {
    year = order.years[0];
  } else if (order.isSpread()) { 
    rate = null;
    // Spread:  Charged on the width of the spread on the minimum notional 
    year = (order.years[0] <= 2 || order.years[0] > 1000) && (order.years[1] <= 2 || order.years[1] > 1000) ? order.years[1] : order.years[1] - order.years[0];
  } else if (order.isButterfly()) {
    rate = null;
    // Fly : The volume of the body charged on the shorter tenor of the fly 
    year = order.years[0];
  }
  let pid = order.product_id;

  // Less than 2 years maturity -- 0.02 bp dvo1 on notional 
  // Greater than 2 years maturity -- 0.035 bp dvo1 on notional
  fee = bro_info.specific_fee?.[pid] ?? ((order.years.some(y => y >= 1000) || order.years.at(-1) <= 2) ? bro_info.low_fee : bro_info.high_fee);

  brokerage = getBaseBrokerage(year, volume, fee, order?.product_id, rate);

  return brokerage;
}


// calculate the brokerage of a single trade, given year, volume, and order

function getBaseBrokerage(year, volume, fee, id, r) {
  // Get the compound interval
  let quoteYear;
  if (year > 500) {
    let rbas = getRbaRuns();
    let daycount;
    if (year < 1000) { 
      daycount = rbas[year*2 - 1001][4];
    } else {
      daycount = rbas[year - 1001][4];
    }
    year = daycount/365;
    if (daycount < 45) quoteYear = 1/12;
    else quoteYear = 2/12;
  } else {
    quoteYear = year;
  }
  let comp_intv = getCompIntv(year);

  // NOTE: Hard coded to expect OIS product_id === 3 (with certain exceptions where rate is provided)

  let rate;
  switch(id) {
    case 1: case 3: case 10: case 14: case 18: case 19: case 20:
      rate = r;
      break;
    default:
      rate = null;
  }
  if (!rate) {
    try {
      rate = quotes.mid(3, [quoteYear]);
    } catch {
      quoteYear = Math.ceil(quoteYear);
      rate = quotes.mid(3, [quoteYear]);
    }
  }

  // Calculate the brokerage

  let brokerage = calculatePV(
    volume,
    fee,
    year,
    rate,
    comp_intv
  );

  return brokerage;
}

// Given a tenor, determine compound interval as integer

function getCompIntv(year) {
  // if tenor is less than or equal to 3
  // use quarterly (4), else, use semi-semi (2)

  if (year <= 3)
    return 4;
  else
    return 2;
}

// Calculate the present value given
// volume (in millions), fee (percentage), tenor (in years),
// rate (percentage), comp_intv (integer)

function calculatePV(volume, fee, year, rate, comp_intv) {
  // Calculate values used in function

  // True notional, times volume (in millions) by 1 million

  let notional = volume * 1000000;

  // Divide rate by compound interval*100

  let comp_rate = rate / (comp_intv * 100);

  // Number of periods is tenor * compound interval

  let nper = year * comp_intv;

  // Calculate pmt

  let pmt = (fee / (comp_intv * 10000)) * notional;

  // Calculate numerator and denomonator of pv

  let num = pmt * (Math.pow(1 + comp_rate, nper) - 1);
  let den = comp_rate * Math.pow(1 + comp_rate, nper);

  // Calculate pv

  let pv = num / den;

  return pv;
}



/*=================
      Swaptions
  =================*/


export function getSwaptionBrokerage(trader_id, prem_bp, notional) {
  let brokerage;

  // Get brokerage info for bank
  let bank_id = traders.get(trader_id).bank_id;
  let bro_info = brokerages.get(bank_id);

  // Determine base brokerage, with banks rates, and then apply per-bank conditions
  brokerage = getBaseSwaptionBrokerage(bro_info, prem_bp, notional);

  let brokerage_cap = getSwaptionBrokerageCap(bank_id);

  switch (bank_id) {
    case 1: // NAB
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    // case 2:
    //   brokerage = getJPMSwapBro();
    //   break;
    case 3: // NOM
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    // case 4:
    //   brokerage = getBNPSwapBro();
    //   break;
    case 5: // MUF
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 6: // ING
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 7: // CIBC
      if (bro_info.swaption_monthly_brokerage_sum > 50000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 8: // CBA
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 9: case 10: case 11: case 12: // Test banks
      console.log("Using test bank, so brokerage will be innacurate (and not saved to db).");
      brokerage = 10;
      break;
    case 13: // WBC
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 14: // UBS
      if (bro_info.swaption_monthly_brokerage_sum > 15000) { brokerage *= 0.5; }
      break;
    case 15: // ANZ
      if (bro_info.swaption_monthly_brokerage_sum > 50000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 16:
      if (bro_info.swaption_monthly_brokerage_sum > 25000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 17: // SGEN
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 18: // BOA
      if (bro_info.swaption_monthly_brokerage_sum > 15000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 19: // TD
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    // case 20:
    //   brokerage = getGSSwapBro();
    //   break;
    // case 21:
    //   brokerage = getCSSwapBro();
    //   break;
    case 22: // BJA
      if (bro_info.swaption_monthly_brokerage_sum > 25000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 23: // MIZ
      if (bro_info.swaption_monthly_brokerage_sum > 20000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 24: // CITI
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 25: // DB
      if (bro_info.swaption_monthly_brokerage_sum > 25000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 26: // RBC
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    case 27: // BARC - Volume discount on 50% per trade to apply after monthly total brokerage exceeds $30,000 AUD per month.
      if (bro_info.swaption_monthly_brokerage_sum > 30000) { brokerage *= 0.5; }
      if (brokerage_cap !== -1 && brokerage > brokerage_cap) { brokerage = brokerage_cap; }
      break;
    default:
      //FIXME: ADD BANKS RATHER THAN USING DEFAULT
      console.error('Attempted to get brokerage of unknown bank_id ' + bank_id);
  }

  brokerage = round(brokerage, 2);
  return brokerage;
}

function getBaseSwaptionBrokerage(bro_info, bp, notional) {
  // Handle test banks which don't have rates in store (is handled by try catch later, but this hides the error - could be removed for prod)
  if (!bro_info?.bank_id) { return 0; }

  let brokerage = 0;
  let brokerage_bp = 0;

  // Determine range the order is in and it's associated brokerage bp
  try {
    for (let [i, value] of bro_info.swaption_bp_ranges.entries()) {
      if (bp < value) {
        continue;
      } else {
        brokerage_bp = bro_info.swaption_bp_brokerage_rates[i];
        break;
      }
    }
    if (brokerage_bp === 0) { throw Error; }
  } catch (err) {
    console.error("Brokerage rate data not pulled from db or data is invalid.");
  }

  // Use above to determine brokerage   CALC: notional*brokerage_bp/10000
  //      param notional is passed to function in millions
  brokerage = notional*brokerage_bp*100;
  
  return brokerage;
}

export function getSwaptionBrokerageCap(bank_id) {
  switch (bank_id) {
    case 1: // NAB
      return 2500;
    case 3: // NOM
      return 1000;
    case 5: // MUF
      return 3500;
    case 6: // ING
      return 3500;
    case 7: // CIBC
      return 2000;
    case 8: // CBA
      return 3500;
    case 13: // WBC
      return 2500;
    case 15: // ANZ
      return 2000;
    case 16: // MST
      return 1000;
    case 17: // SGEN
      return 3500;
    case 18: // BOA
      return 3500;
    case 19: // TD
      return 3500;
    case 22: // BJA
      return 1000;
    case 23: // MIZ
      return 2500;
    case 24: // CITI
      return 2000;
    case 25: // DB
      return 2000;
    case 26: // RBC
      return 3500;
    case 27: // BARC - Trades capped @ $3500 AUD per trade  
      return 3500;
    default:
      return -1;
  }
}
