'use strict';

import { addMonths, addTenorToDate, isTenor, toTenor, convertLegToTitle, toEFPSPSTenor, round } from './formatting.js';
import { flyPrice, spreadPrice } from './calculations';
import traders from '../stores/traders.js';
import ticker from '../stores/ticker.js';
import banks from '../stores/banks.js';
import products from '../stores/products.js';
import interest_groups from '../stores/interest_groups.js';
import bank_divisions from '../stores/bank_divisions.js';


import Holidays from 'date-holidays';
import axios from 'axios';
import { getRbaRuns } from './rba_handler.js';


// Initialize global holiday date object

var hd = new Holidays('AU');

// Initialize fx rate api key

const FX_API_KEY = '6CEV5Q0AAAAHUUGN';

// The field names found in the OV maps are difficult to learn.
// However they are the field names found in OV and cannot be changed.
// Thus, this code is susceptible to typos, does not welcome change,
// and is difficult to read/debug/learn/modify.

export async function mapTrades(tickets) {

  let mapped_tickets = [];

  let o_bank, o_trader, o_interest_group, o_sbd;
  let b_bank, b_trader, b_interest_group, b_sbd;
  let totalRate, packageSize;

  // calculate overall price
  packageSize = tickets.tickets.length;
  totalRate = calculateTotalPrice(tickets);

  for (let ticket of tickets.tickets) {
    // Get bank and trader name of offer and bid
    o_trader = traders.get(ticket.offer.trader_id);
    o_bank = banks.get(o_trader.bank_id);
    o_interest_group = interest_groups.get(ticket.offer_bank_division_id);
    o_sbd = bank_divisions.get(ticket.offer_bank_division_id);

    b_trader = traders.get(ticket.bid.trader_id);
    b_bank = banks.get(b_trader.bank_id);
    b_interest_group = interest_groups.get(ticket.bid_bank_division_id);
    b_sbd = bank_divisions.get(ticket.bid_bank_division_id);

    // Set common trade object values
    // Change stateCode from 'Draft' to 'active' to fix mechanism on OV-PROD
    let mapped_ticket = {
      'objectType': 'TRADE',
      'productType': null,
      'updatedUser': 'POTrade',
      'trade_id_ov': ticket.trade_id_ov,
      'stateCode': 'active',
      'comments': 'POTrade',
      'totalRate': totalRate, // total Rate for all tickets
      'packageSize': packageSize, // total number of the legs 
      'data': {
        'AUTO-SEND FOR CLEARING': false,
        'SEF': ticket.sef,

        // Counterparty A (bid side)

        'cpty': b_bank.ov_bank_id , // short code bank name
        'CptyDirectionA': true, // always buyer (bid), set true
        'CptyATrader': b_trader.ov_trader_id, // trader id (use ov trader id)
        'bbg': b_trader.bbg_id, // trader's bloomberg id
        'TeraCptyA': b_sbd.firm_id, // bank's tera counterparty id
        'TeraUser1': b_sbd.account_id, // bank's tera user id
        'Interest Group': b_interest_group, // bank's interest group
        'Brokerage_A': ticket.bid_brokerage, // brokerage of bid
        'ClearingMemberID_A': b_sbd.clearing_id,
        "BicCptyA": ticket.bic_bid.markitbiccode,

        // Counterparty B (offer side)

        'cpty_2': o_bank.ov_bank_id , // short code bank name
        'CptyDirectionB': false, // always receiver (offer), set false
        'CptyBTrader': o_trader.ov_trader_id, // trader id (use ov trader id)
        'bbg2': o_trader.bbg_id, // trader's bloomberg id
        'TeraCptyB': o_sbd.firm_id, // bank's tera counterparty id
        'TeraUser2': o_sbd.account_id, // bank's tera user id
        'Interest Group B': o_interest_group, // bank's interest group
        'Brokerage_B': ticket.offer_brokerage, // brokerage of offer
        'ClearingMemberID_B': o_sbd.clearing_id,
        "BicCptyB": ticket.bic_offer.markitbiccode,

        // COMMON VALUES

        'tradeDateTime': ticket.timestamp,
        'referenceDate': toDateString(ticket.timestamp),
        'Tenor': toTenor(ticket.year),
        'notional': ticket.volume * 1000000,
        'currency': ticket.currency, // 3 character code
        'Cleared':ticket.clearhouse,
        'startDate': toDateString(ticket.start_date),
        'breakclause': ticket.breaks,
        'BreakThereafter': ticket.thereafter,
      }
    };
    if (products.isFwd(ticket.product_id)) { mapped_ticket.data['fwd'] = ticket.fwd; }

    // Then call the appropriate function to add product specific keys/values
    // NOTE: THIS IS HARD CODED TO EXPECT PRODUCT_IDS TO REMAIN CONSTANT

    switch (ticket.product_id) {
      case 1:
        mapIRSTrade(ticket, mapped_ticket);
        break;
      case 2:
        mapEFPTrade(ticket, mapped_ticket);
        break;
      case 3:
        mapOISTrade(ticket, mapped_ticket);
        break;
      case 4:
        map3v1Trade(ticket, mapped_ticket);
        break;
      case 5:
        map6v3Trade(ticket, mapped_ticket);
        break;
      case 6:
        mapBOBTrade(ticket, mapped_ticket);
        break;
      case 7:
        mapAUDUSDTrade(ticket, mapped_ticket);
        break;
      case 8:
        mapAUDUSDTrade(ticket, mapped_ticket);
        break;
      case 9:
        mapAUDUSDTrade(ticket, mapped_ticket);
        break;
      case 10:
        mapIRSTradeNZD(ticket, mapped_ticket);
        break;
      case 11:
        mapOISTradeNZD(ticket, mapped_ticket);
        break;
      case 12:
        map3v1TradeNZD(ticket, mapped_ticket);
        break;
      case 13:
        map6v3TradeNZD(ticket, mapped_ticket);
        break;
      case 14:
        mapBOBTradeNZD(ticket, mapped_ticket);
        break;
      case 15:
        await mapNZDUSDTrade(ticket, mapped_ticket);
        break;
      case 16:
        await mapNZDUSDTrade(ticket, mapped_ticket);
        break;
      case 17:
        mapSPSEFPTrade(ticket, mapped_ticket);
        break;
      case 18:
        mapIRSTrade(ticket, mapped_ticket);
        break;
      case 19:
        mapIRSTrade(ticket, mapped_ticket);
        break;
      case 20:
        mapRBAOISTrade(ticket, mapped_ticket);
        break;
      case 21:
        mapIRSTradeJPY(ticket, mapped_ticket);
        break;
      case 22:
        await mapJPYUSDTrade(ticket, mapped_ticket);
        break;
      case 23:
        map3v1Trade(ticket, mapped_ticket);
        break;
      case 24:
        map6v3Trade(ticket, mapped_ticket);
        break;
      case 25:
        mapBOBTrade(ticket, mapped_ticket);
        break;
      case 26:
        mapAUDUSDTrade(ticket, mapped_ticket);
        break;
      case 27:
        mapSPS90Trade(ticket, mapped_ticket);
        break;
      case 28:
        mapSOFRSPREADTradeUSD(ticket, mapped_ticket);
        break;
      case 29:
        mapIRSSWAPTradeUSD(ticket, mapped_ticket);
        break;
      case 30:
        mapFFSWAPSTradeUSD(ticket, mapped_ticket);
        break;
      case 31:
        mapSOFRFFBASISTradeUSD(ticket, mapped_ticket);
        break;
      case 32:
        mapCMELCHBASISTradeUSD(ticket, mapped_ticket);
        break;
      default:
        throw new Error('Encountered unknown product in trade mapping');
    }

    mapped_tickets.push(mapped_ticket);
  }

  return mapped_tickets;
}

// Add fields related to the RBAOIS product

function mapRBAOISTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'RBAOIS';

  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);

  let days = getRbaRuns()[ticket.year - 1001][4];
  mapped_ticket.data.endDate = toDateString(addTenorToDate(days+"d", ticket.start_date));
  delete mapped_ticket.data.Tenor;
  if (mapped_ticket.data.breakclause == null || mapped_ticket.data.breakclause == '') delete mapped_ticket.data.breakclause;
  if (mapped_ticket.data.BreakThereafter == null || mapped_ticket.data.BreakThereafter == '') delete mapped_ticket.data.BreakThereafter;

  delete mapped_ticket.data.bbg;
  delete mapped_ticket.data.bbg2;
}

export function mapRBAOIS(ticket) {
  // Get bank and trader name of offer and bid
  let sef = ticket.sef;
  let rba = ticket.rba;
  let b_trader = traders.get(ticket.fixed_payer_id);
  let b_bank = banks.get(b_trader.bank_id);
  let b_interest_group = interest_groups.get(ticket.fixed_bank_division_id);
  let b_sbd = bank_divisions.get(ticket.fixed_bank_division_id);

  let o_trader = traders.get(ticket.floating_payer_id);
  let o_bank = banks.get(o_trader.bank_id);
  let o_interest_group = interest_groups.get(ticket.floating_bank_division_id);
  let o_sbd = bank_divisions.get(ticket.floating_bank_division_id);

  // Set common trade object values
  // Change stateCode from 'Draft' to 'active' to fix mechanism on OV-PROD
  let mapped_ticket = {
    'objectType': 'TRADE',
    'productType': (rba ? 'RBAOIS' : 'AUD OIS'),
    'updatedUser': 'POTrade',
    'stateCode': 'active',
    'comments': 'POTrade',
    'trade_id_ov': ticket.trade_id_ov,
    'data': {
      'AUTO-SEND FOR CLEARING': false,
      'SEF': sef,

      // Counterparty A (bid side)

      'cpty': b_bank.ov_bank_id , // Short code bank name
      'CptyDirectionA': true, // always buyer (bid), set true
      'CptyATrader': b_trader.ov_trader_id, // trader id (use ov trader id)
      //'bbg': b_trader.bbg_id, // trader's bloomberg id
      'TeraCptyA': b_sbd.firm_id, // bank's tera counterparty id
      'TeraUser1': b_sbd.account_id, // bank's tera user id
      'Interest Group': b_interest_group, // bank's interest group
      'Brokerage_A': ticket.bid_brokerage, // brokerage of bid
      'ClearingMemberID_A': b_sbd.clearing_id,
      "BicCptyA": ticket.bic_bid.markitbiccode,

      // Counterparty B (offer side)

      'cpty_2': o_bank.ov_bank_id, // Short code bank name
      'CptyDirectionB': false, // always receiver (offer), set false
      'CptyBTrader': o_trader.ov_trader_id, // trader id (use ov trader id)
      //'bbg2': o_trader.bbg_id, // trader's bloomberg id
      'TeraCptyB': o_sbd.firm_id, // bank's tera counterparty id
      'TeraUser2': o_sbd.account_id, // bank's tera user id
      'Interest Group B': o_interest_group, // bank's interest group
      'Brokerage_B': ticket.offer_brokerage, // brokerage of offer
      'ClearingMemberID_B': o_sbd.clearing_id,
      "BicCptyB": ticket.bic_offer.markitbiccode,

      // COMMON VALUES
      // RBAOIS: Send Fixed End Date, Start Date instead of Tenor

      'tradeDateTime': ticket.timestamp,
      'referenceDate': toDateString(ticket.timestamp),
      ...(!rba && {'Tenor': ticket.term}),
      'endDate': ticket.expiry_date,
      'notional': ticket.notional * 1000000,
      'currency': ticket.currency, // 3 character code
      'rate': swapPrice(ticket.rate).toFixed(8),
      'startDate': toDateString(ticket.start_date),
      'Cleared': ticket.clearhouse,
    }
  };

  if (isTenor(ticket.breaks)) {
    mapped_ticket.data['breakclause'] = ticket.breaks;
  }
  if (isTenor(ticket.thereafter)) {
    mapped_ticket.data['BreakThereafter'] = ticket.thereafter;
  }

  return mapped_ticket;

}

export function mapRBASwaption(ticket) {
  let output = mapSwaption(ticket);
  let prodType;
  if (ticket.option_type == "Straddle") {
    prodType = "RBAOISSwaption";
  } else if (ticket.option_type == "Payers") {
    prodType = "RBAOISSwaptionPayers";
  } else if (ticket.option_type == "Receivers") {
    prodType = "RBAOISSwaptionReceivers";
  }
  output.productType = prodType;
  output.data['Leg2.index'] = 'AUD-AONIA-1D';
  output.data['Leg1.schedule.payFreq'] = '3m';
  output.data['Leg2.schedule.payFreq'] = '3m';
  output.data['Leg1.schedule.basis'] = 'ACT360';
  output.data['OptionOnProduct.schedule.endTenor'] = '';
  return output;
}

export function mapSwaption(ticket){

  let buyer = {
    bank: banks.get(ticket.buyer.bank_id),
    ov_id: ticket.buyer.ov_trader_id,
    bank_division: bank_divisions.get(ticket.buyer.bank_division_id),
    interest_group: interest_groups.get(ticket.buyer.bank_division_id)
  };

  let seller = {
    bank: banks.get(ticket.seller.bank_id),
    ov_id: ticket.seller.ov_trader_id,
    bank_division: bank_divisions.get(ticket.seller.bank_division_id),
    interest_group: interest_groups.get(ticket.seller.bank_division_id)
  };

  let physicalSettlement;

  // TODO: work out how to handle cleared physical settlement (probably physical with some other changed field)
  if(ticket.settlement === 'Physical') {
    physicalSettlement = true;
  } else if(ticket.settlement === 'Swap') {
    physicalSettlement = false;
  }

  let spotPremium = ticket.spot_or_fwd === 'Spot' ? true : false;

  let prodType;
  if (ticket.option_type == "Straddle") {
    prodType = "SwaptionStraddle";
  } else if (ticket.option_type == "Payers") {
    prodType = "SwaptionPayers";
  } else if (ticket.option_type == "Receivers") {
    prodType = "SwaptionRecievers";
  }

  let mapped_ticket = {
    'objectType': 'TRADE',
    'productType': prodType,
    'updatedUser': 'POTrade',
    'stateCode': 'active',
    'comments': 'POTrade',
    'trade_id_ov': ticket.trade_id_ov,
    'data': {
      'AUTO-SEND FOR CLEARING': false,
      'SEF': ticket.sef,
      'currency': 'AUD',

      // Counterparty A (bid side)

      'cpty': buyer.bank.ov_bank_id , // short code bank name
      'CptyDirectionA': true, // always buyer (bid), set true
      'CptyATrader': buyer.ov_id, // trader id (use ov trader id)
      //'bbg': b_trader.bbg_id, // trader's bloomberg id
      'TeraCptyA': buyer.bank_division.firm_id, // bank's tera counterparty id
      'TeraUser1': buyer.bank_division.account_id, // bank's tera user id
      'Interest Group': buyer.interest_group, // bank's interest group
      'Brokerage_A': ticket.buyer_brokerage, // brokerage of bid TODO
      'ClearingMemberID_A': buyer.bank_division.clearing_id,
      "BicCptyA": ticket.bic_buyer.markitbiccode,

      // Counterparty B (offer side)

      'cpty_2': seller.bank.ov_bank_id , // short code bank name
      'CptyDirectionB': false, // always receiver (offer), set false
      'CptyBTrader': seller.ov_id, // trader id (use ov trader id)
      //'bbg2': o_trader.bbg_id, // trader's bloomberg id
      'TeraCptyB': seller.bank_division.firm_id, // bank's tera counterparty id
      'TeraUser2': seller.bank_division.account_id, // bank's tera user id
      'Interest Group B': seller.interest_group, // bank's interest group
      'Brokerage_B': ticket.seller_brokerage, // brokerage of offer TODO
      'ClearingMemberID_B': seller.bank_division.clearing_id,
      "BicCptyB": ticket.bic_seller.markitbiccode,

      // COMMON VALUES

      'tradeDateTime': ticket.timestamp,
      'referenceDate': toDateString(ticket.date),
      'notional': ticket.notional * 1000000,
      'SpotPremium': spotPremium,
      'basisPoint': ticket.premium_bp,
      'PhysicalSettlement': physicalSettlement,
      'Leg1.schedule.startDate': toDateString(ticket.swap_start_date),
      'Leg1.schedule.endTenor': ticket.swap_term,
      'OptionOnProduct.strike': ticket.strike_rate / 100,
      'OptionOnProduct.schedule.fixingDate': toDateString(ticket.premium_date),
      'OptionOnProduct.schedule.endDate': toDateString(ticket.expiry_date),
      'OptionOnProduct.schedule.endTenor': ticket.option_expiry,

      //non required fields
      'breakclause': ticket.breaks,
      'BreakThereafter': ticket.thereafter,
      'Cleared': ticket.clearhouse,

      // FIXME: these may not be the correct conventions, 
      // Ignore this issue as this can be fixed from TPP MARKIT
      'Leg2.index': ticket.swap_maturity_date === 'QQ' ? 'AUD-BBSW-3M' : 'AUD-BBSW-6M',
      'Leg1.schedule.payFreq': ticket.swap_maturity_date === 'QQ' ? '3m' : '6m',
      'Leg2.schedule.payFreq': ticket.swap_maturity_date === 'QQ' ? '3m' : '6m',
    }
  };

  return mapped_ticket;
}

// Add fields related to the IRS product

function mapIRSTrade(ticket, mapped_ticket) {
  // use QQ for years <= 3, SS for years > 3
  if (ticket.product_id == 1) {
    if (ticket.fixed_leg) {
      mapped_ticket.productType = `AUD IRS ${convertLegToTitle(ticket.fixed_leg)}${convertLegToTitle(ticket.floating_leg)}`;
      mapped_ticket['IRFixed.schedule.payFreq'] =  ticket.fixed_leg;
      mapped_ticket['IRFloat.schedule.payFreq'] =  ticket.floating_leg;
    } else {
      if (ticket.year <= 3) mapped_ticket.productType = 'AUD IRS QQ';
      else mapped_ticket.productType = 'AUD IRS SS';
    }
  } else if (ticket.product_id == 18) {
    if (ticket.fixed_leg) {
      mapped_ticket.productType = `SPOT SPS${convertLegToTitle(ticket.fixed_leg) == "Q" ? "90D" : "180D"}`;
      mapped_ticket['IRFixed.schedule.payFreq'] =  ticket.fixed_leg;
      mapped_ticket['IRFloat.schedule.payFreq'] =  ticket.floating_leg;
    } else {
      if (ticket.year == 0.5) mapped_ticket.productType = 'SPOT SPS180D';
      else mapped_ticket.productType = 'SPOT SPS90D';
    }
  } else if (ticket.product_id == 19) {
    if (ticket.fixed_leg) {
      mapped_ticket.productType = `AUD FWD IRS ${convertLegToTitle(ticket.fixed_leg)}${convertLegToTitle(ticket.floating_leg)}`;
      mapped_ticket['IRFixed.schedule.payFreq'] =  ticket.fixed_leg;
      mapped_ticket['IRFloat.schedule.payFreq'] =  ticket.floating_leg;
    } else {
      if (ticket.year <= 3) mapped_ticket.productType = 'AUD FWD IRS QQ';
      else mapped_ticket.productType = 'AUD FWD IRS SS';
    }
  }
  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);
}


// Add fields related to the EFP product

function mapEFPTrade(ticket, mapped_ticket) {
  // use QQ for years <= 3, SS for years > 3
  if (ticket.fixed_leg) {
    mapped_ticket.productType = `AUD EFP ${convertLegToTitle(ticket.fixed_leg)}${convertLegToTitle(ticket.floating_leg)}`;
    mapped_ticket['IRFixed.schedule.payFreq'] =  ticket.fixed_leg;
    mapped_ticket['IRFloat.schedule.payFreq'] =  ticket.floating_leg;
  } else {
    ticket.year <= 3 ? mapped_ticket.productType = 'AUD EFP QQ' : mapped_ticket.productType = 'AUD EFP SS';
  }

  let fut_strike = ticket.fut_strike;
  mapped_ticket.data.FutStrike = fut_strike.toFixed(4);

  // Set EFP basis point rate

  let efp_rate = 100 - fut_strike + (ticket.price / 100);
  efp_rate = swapPrice(efp_rate);
  setPrice(mapped_ticket, efp_rate);

  mapped_ticket.data['EFP_Spread'] = ticket.price.toFixed(10);

  // EFPs also have lots and efp info fields

  mapped_ticket.data.Lot = ticket.lots;

  let ticker_string = tickerString(ticket.year, ticket.start_date);
  mapped_ticket.data.EFPInfo = ticker_string;

  mapped_ticket.data.future_accountA = ticket.bid_fut_acc;
  mapped_ticket.data.future_accountB = ticket.offer_fut_acc;
  mapped_ticket.data.vconSender = ticket.vconSender;
}

// Add fields related to the 3v1 product

function map3v1Trade(ticket, mapped_ticket) {
  if (ticket.product_id == 23) {
    mapped_ticket.productType = 'AUD FWD 3v1';
  } else {
    mapped_ticket.productType = 'AUD 3v1';
  }

  // 3v1 is bp price
  // Set price on different location for 3v1

  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

// Add fields related to the 6v3 product

function map6v3Trade(ticket, mapped_ticket) {
  if (ticket.product_id == 24) {
    mapped_ticket.productType = 'AUD FWD 6v3';
  } else {
    mapped_ticket.productType = 'AUD 6v3';
  }
  // 6v3 is bp price

  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

// Add fields related to the AUD/USD product

function mapAUDUSDTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'AUD USD XCCY';
  // AUD/USD is bp price

  // let bp_price = basisPrice(ticket.price);
  mapped_ticket.data['Leg2.rate'] = ticket.price.toFixed(8);

  // Set domestic notional

  mapped_ticket.data['Leg2.notional'] = ticket.volume * 1000000;

  // Set FX Conversion rate

  //let fx_rate = await exchangeRate('AUD', 'USD');
  //mapped_ticket.data['fxRate'] = fx_rate;
  mapped_ticket.data['fxRate'] = ticket.fx;

  // Set leg1 tenor

  mapped_ticket.data['Leg1.schedule.endTenor'] = toTenor(ticket.year);

  // XCCY product type

  if (ticket.product_id == 26) {
    mapped_ticket.data['xccyProductType'] = "FWD BBSW/SOFR";
  } else {
    mapped_ticket.data['xccyProductType'] = products.name(ticket.product_id);
  }
}

// Add fields related to the OIS product

function mapOISTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'AUD OIS';
  let s_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, s_price);
}

// Add fields related to the BOB product

function mapBOBTrade(ticket, mapped_ticket) {
  if (ticket.product_id == 25) {
    mapped_ticket.productType = 'AUD FWD BOB';
  } else {
    mapped_ticket.productType = 'AUD BOB';
  }
  // BOB is bp price
  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

/**
 * Maps an SPS EFP trade. Maps to the SPS product type.
 * @param {import('./ticket.js').default} ticket
 * @param {Record<string, unknown} mapped_ticket - the mapped trade ticket that can be handed to oneview
 *
 * NOTE: this function modifies the passed in "mapped_ticket" param
 * Moved code - from commit 7fade8048647f8b60eedfb48520b43211f0fdfce
 */
function mapSPSEFPTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'SPS EFP';

  let fut_strike = ticket.fut_strike;
  if (fut_strike == undefined) {
    console.error("Futures Strike Price Not Found");
    return;
  }
  mapped_ticket.data.FutStrike = fut_strike.toFixed(4);

  // Set EFP basis point rate
  let efp_rate = 100 - fut_strike + (ticket.price / 100);
  efp_rate = swapPrice(efp_rate);
  setPrice(mapped_ticket, efp_rate);

  mapped_ticket.data['EFP_Spread'] = ticket.price.toFixed(10);

  mapped_ticket.data.Lot = ticket.lots;

  let ticker_string = toEFPSPSTenor(new Date(ticket.start_date)).slice(0,-4);
  mapped_ticket.data.EFPInfo = ticker_string;

  let start = new Date(ticket.start_date);
  let date = addMonths(start, 3);
  date.setDate(1);
  // eslint-disable-next-line no-constant-condition
  while (true){
    if (date.getDay() == 5) break;
    date.setDate(date.getDate() + 1);
  }
  date.setDate(date.getDate() + 6);
  mapped_ticket.data["endDate"] = (date.getFullYear()+"-"+((date.getMonth() < 9 ? "0" : "")+(date.getMonth()+1))+"-"+date.getDate());
  delete mapped_ticket.data["Tenor"];

  mapped_ticket.data.future_AccountA = ticket.bid_fut_acc;
  mapped_ticket.data.future_AccountB = ticket.offer_fut_acc;
  mapped_ticket.data.vconSender = ticket.vconSender;
}

function mapSPS90Trade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'SPS90D';

  let start = new Date(ticket.start_date);
  let fixing = new Date(ticket.start_date);
  fixing.setDate(fixing.getDate() - 1);
  let end = addMonths(start, 3);
  end.setDate(1);
  // eslint-disable-next-line no-constant-condition
  while (true){
    if (end.getDay() == 5) break;
    end.setDate(end.getDate() + 1);
  }
  end.setDate(end.getDate() + 6);

  mapped_ticket.data["startDate"] = toDateString(start)
  mapped_ticket.data["fixingDate"] = toDateString(fixing)
  mapped_ticket.data["endDate"] = toDateString(end)

  delete mapped_ticket.data["Tenor"];

  let rate = swapPrice(ticket.price);
  setPrice(mapped_ticket, rate);
}


/* ------- New Zealand Dollar ------- */


function mapIRSTradeNZD(ticket, mapped_ticket) {
  // All of NZD IRS are NZD IRS SQ
  mapped_ticket.productType = `NZD IRS SQ`;
  mapped_ticket['IRFixed.schedule.payFreq'] =  "6M";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "3M";

  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);
}

function mapOISTradeNZD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'NZD OIS';
  let s_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, s_price);
}

function map3v1TradeNZD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'NZD 3v1';

  // 3v1 is bp price
  // Set price on different location for 3v1

  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

function map6v3TradeNZD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'NZD 6v3';

  // 6v3 is bp price
  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

function mapBOBTradeNZD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'NZD BOB';

  // BOB is bp price
  // let bp_price = basisPrice(ticket.price);
  setPrice(mapped_ticket, ticket.price);
  mapped_ticket.data['TargetIndex_IRFloat.rate'] = ticket.price.toFixed(8);
}

async function mapNZDUSDTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'NZD USD XCCY';

  // AUD/USD is bp price
  // let bp_price = basisPrice(ticket.price);
  mapped_ticket.data['Leg2.rate'] = ticket.price.toFixed(8);

  // Set domestic notional
  mapped_ticket.data['Leg2.notional'] = ticket.volume * 1000000;

  // Set FX Conversion rate
  let fx_rate;

  // TODO: Replace with bloomberg
  // Need to update
  fx_rate = await exchangeRate('NZD', 'USD');
  mapped_ticket.data['fxRate'] = fx_rate;

  // Set leg1 tenor

  mapped_ticket.data['Leg1.schedule.endTenor'] = toTenor(ticket.year);

  // XCCY product type

  mapped_ticket.data['xccyProductType'] = products.name(ticket.product_id);
}


/* ------- Japanese Yen ------- */


async function mapJPYUSDTrade(ticket, mapped_ticket) {
  mapped_ticket.productType = 'JPY USD XCCY';
  mapped_ticket.data['Leg2.rate'] = ticket.price.toFixed(8);
  mapped_ticket.data['Leg2.notional'] = ticket.volume * 1000000;

  // Set FX Conversion rate
  let fx_rate;
  // TODO: Replace with bloomberg
  fx_rate = await exchangeRate('JPY', 'USD');
  mapped_ticket.data['fxRate'] = fx_rate;

  mapped_ticket.data['Leg1.schedule.endTenor'] = toTenor(ticket.year);
  mapped_ticket.data['xccyProductType'] = products.name(ticket.product_id);
}

function mapIRSTradeJPY(ticket, mapped_ticket) {
  // use QQ for years <= 3, SS for years > 3
  ticket.year <= 3 ? mapped_ticket.productType = 'JPY IRS QQ' : mapped_ticket.productType = 'JPY IRS SS';

  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);
}
//------------------- Mapping Trade USD------------------
// Available indexes
// ----USD-Federal Funds-H.15
// USD-Federal Funds
// USD-SOFR-COMPOUND
// USD-SOFR-OIS-Compound
// USD-BSBY
// USD-Federal Fund
// USD-Federal Funds-H.15-OIS-COMPOUND
// USD-Federal Funds-OIS Compound
/**
 * Glossary
 * DV01 - The interest rate risk of bond or portfolio of bonds by estimating the price change in dollar terms in response to change in yield by a single basis point.
 * SOFR SWAP TRADE TYPE 
 * SPREAD-OVER UST: Fixed rate risk transfer vs floating rate (SOFR), Bid/Ask levels quoted in bps spread to corresponding US Treasury benchmark issue.
 * BUTTERFLY : Fixed rate risk transfer vs floating rate (SOFR). Bid/Ask levels quoted in bps spread of 3 distinct tenors. The shortest and longest maturity legs
 * are traded in equivalent directions; the risk of the intermediate maturity leg is equal and opposite to the sum of the other two legs.
 * SWITCH(SOFR Spreadover Curve): Fixed rate risk transfer vs floating rate (SOFR). Bid/Ask levels quoted in bps spread of the simultaneous purchase and sale of two distinct tenors. 
 * OUTRIGHT : Plain vanilla IR Swap trade – Fixed rate risk transfer vs floating rate (SOFR).
 */
function mapSOFRSPREADTradeUSD(ticket, mapped_ticket) {

  mapped_ticket.productType = 'SOFRSPREAD';
  mapped_ticket['IRFixed.schedule.payFreq'] =  "1Y";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "1Y";
  let fut_strike = ticket.fut_strike;
  mapped_ticket.data.FutStrike = fut_strike?.toFixed(4);
  
  let sofr_rate;
  // Set SOFR SPREAD basis point rate
  if (fut_strike === 0 || fut_strike === null) {
    sofr_rate = ticket.price;
  } else {
    sofr_rate = 100 - (fut_strike === 0 || fut_strike === null ? 100 : fut_strike) + (ticket.price / 100);
    mapped_ticket.data['sofr_Spread'] = ticket.price.toFixed(10);
  }
  let sp_price = swapPrice(sofr_rate);
  setPrice(mapped_ticket, sp_price);

}

function mapIRSSWAPTradeUSD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'IRSSWAP';
  mapped_ticket['IRFixed.schedule.payFreq'] =  "1Y";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "1Y";

  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);

};

function mapFFSWAPSTradeUSD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'FFSWAPS';
  mapped_ticket['IRFixed.schedule.payFreq'] =  "1Y";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "1Y";

  let sp_price = swapPrice(ticket.price);
  setPrice(mapped_ticket, sp_price);

};

function mapSOFRFFBASISTradeUSD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'SOFRFFBASIS';
  mapped_ticket['IRFixed.schedule.payFreq'] =  "1Y";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "1Y";

  setPrice(mapped_ticket, ticket.price);

};

function mapCMELCHBASISTradeUSD(ticket, mapped_ticket) {
  mapped_ticket.productType = 'CMELCHBASIS';
  mapped_ticket['IRFixed.schedule.payFreq'] =  "1Y";
  mapped_ticket['IRFloat.schedule.payFreq'] =  "1Y";

  setPrice(mapped_ticket, ticket.price);

};
// Set the price in given mapped_trade

function setPrice(mapped_ticket, price) {
  mapped_ticket.data.rate = price.toFixed(8);
}

function swapPrice(price) {
  return price / 100;
}

// Return the price of a basis product price

function basisPrice(price) {
  return price / 10000;
}

const calculateTotalPrice =(tickets) =>{
  let totalRate;
  switch (tickets.tickets.length) {
    case 1:
      totalRate =  tickets.tickets[0].price;
      break;
    case 2:
      totalRate =  spreadPrice(tickets.tickets[1].price,tickets.tickets[0].price);
      break;
    default:
      totalRate =  flyPrice(tickets.tickets[1].price, tickets.tickets[0].price, tickets.tickets[2].price);
      break;
  }
  // Ticket maritwire, package details accept BasisPoint value
  // Xccy, bs (bps) --> (bps)
  // irs, efp, ois (%) --> (bps)

  return ( !products.isBasisSwap(tickets.tickets[0].product_id) && !products.isXccy(tickets.tickets[0].product_id) ) ? (totalRate*100).toFixed(4) : totalRate.toFixed(4);
}

export function tickerString(year, start) {
  let ticker_string = '';

  if (year <= 5) {
    ticker_string += 'YM';
  } else {
    ticker_string += 'XM';
  }

  // Use today's date for getting future code H|M|U|Z
  // --> Fix it to caculate on start date

  let date = new Date(start);
  let future_code = futureCode(date);
  ticker_string += future_code;

  // Add number to end, last digit of current year

  let current_year = date.getFullYear() % 10;
  ticker_string += current_year;
  
  return ticker_string;
}

function futureCode(date) {
  const isHoliday = function (date) {
    // Return true if the given date is on a weekend/holiday, false otherwise

    if (date.getDay() === 0 || date.getDay() === 6) {
      return true;
    }

    // Returns an object if is holiday, false otherise
    // so don't just return isHoliday

    let is_holiday = hd.isHoliday(date);
    return is_holiday ? true : false;
  };

  while (isHoliday(date)) {
    console.log('today is a public holiday... using yesterday\'s date instead');
    date.setDate(date.getDate() - 1);
  }

  // Initialise rollover dates

  const THIS_YEAR = date.getFullYear();
  const LAST_YEAR = THIS_YEAR - 1;

  const DEC_15_PREV = new Date(LAST_YEAR, 11, 15, 12);
  const JAN_01 = new Date(THIS_YEAR, 0, 1, 0, 0);
  const MAR_15 = new Date(THIS_YEAR, 2, 15, 12);
  const JUN_15 = new Date(THIS_YEAR, 5, 15, 12);
  const SEP_15 = new Date(THIS_YEAR, 8, 15, 12);
  const DEC_15 = new Date(THIS_YEAR, 11, 15, 12);

  // Convert start date to locale date and set at 12:00
  let LOCALE_DATE = new Date(date).toLocaleDateString();
  let DATE = new Date(LOCALE_DATE.split("/")[2],LOCALE_DATE.split("/")[1], LOCALE_DATE.split("/")[0], 12);

  if (DATE.getTime() < DEC_15_PREV.getTime()) {
    throw new Error(`futureCode(): received date earlier than 15 Dec ${LAST_YEAR}`);
  }

  // From 15 Dec previous year 12:00 to 15 Mar 11:59, use 'H'

  if (DATE.getTime() >= DEC_15_PREV.getTime() && DATE.getTime() < MAR_15.getTime()) {
    // If date is less than JAN_01 00:00 add 1 to year

    if (DATE.getTime() < JAN_01.getTime()) {
      DATE.setFullYear(DATE.getFullYear() + 1);
    }

    return 'H';
  }

  // From 15 Mar 12:00 to 15 Jun 11:59, use 'M'
  

  if (DATE.getTime() >= MAR_15.getTime() && DATE.getTime() < JUN_15.getTime()) {
    return 'M';
  }

  // From 15 Jun 12:00 to 15 Sep 11:59, use 'U'

  if (DATE.getTime() >= JUN_15.getTime() && DATE.getTime() < SEP_15.getTime())  {
    return 'U';
  }

  // From 15 Sep 12:00 to 15 Dec 12:00, use 'Z'

  if (DATE.getTime() >= SEP_15.getTime() && DATE.getTime() < DEC_15.getTime()) {
    return 'Z';
  }

  // Beyond dec_15 use 'H' and increase year by 1

  if (DATE.getTime() >= DEC_15.getTime()) {
    DATE.setFullYear(DATE.getFullYear() + 1);
    return 'H';
  }
}

function toDateString(date) {
  let d = new Date(date);
  return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
}

async function exchangeRate(from, to) {
  let url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${FX_API_KEY}`;

  return axios.get(url)
    .then(resp => resp.data['Realtime Currency Exchange Rate']['5. Exchange Rate'])
    .catch(err => {
      console.log(err);
    });
}