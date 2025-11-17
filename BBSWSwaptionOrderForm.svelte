<script>

import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox
} from 'carbon-components-svelte';

import SwaptionTicket from './SwaptionTicket.svelte';
import SwaptionOrderForm from './SwaptionOrderForm.svelte';

import { onMount } from 'svelte';
import { createEventDispatcher } from "svelte";

import { addDays, addMonths, addYears, convertDateToString, isTenor } from '../../common/formatting.js';
import { mapSwaption } from '../../common/ov_trade_mapper.js';
import Validator from "../../common/validator.js";
import websocket from "../../common/websocket";
import { getSwaptionBrokerage } from '../../common/brokerages';

import swaption_quotes from '../../stores/swaption_quotes';
import traders from '../../stores/traders';
import bic from '../../stores/bic';
import swaption_orders from '../../stores/swaption_orders';

export let option_expiry;
export let swap_term;
// export let premium_bp;
// export let strike_rate;
export let copied = null;

// fields on the form
let fields;

// variables relating to the confirmation modal
let is_confirm_modal_open = false;
let confirm_checked;
let buyer_bank_division;
let seller_bank_division;
let bic_buyer;
let bic_seller;
let swaption_ticket;
let isValidBrokerages;
let buyerIsInvalid;
let sellerIsInvalid;

$: {
  if (copied != null){
    copyValues();
  }
}

function handleOptionType (str) {
  str = str.toLowerCase();

  if (str == "s" || str.slice(0,3) == "str") {
    return "Straddle";
  } else if (str == "p" || str.slice(0,3) == "pay") {
    return "Payers";
  } else if (str == "r" || str.slice(0,3) == "rec") {
    return "Receivers";
  } else {
    return "Straddle";
  }
}

// Values Copied from the Recent trades table
function copyValues(){
  fields.buyer_id = copied.buyer_id
  fields.seller_id = copied.seller_id

  fields.option_type = handleOptionType(copied.option_type);
  fields.notional.str = copied.notional ?? "";
  fields.strike_rate.str = copied.strike_rate ?? "";
  fields.option_expiry.str = copied.option_expiry ? copied.option_expiry.toLowerCase() : "";
  fields.swap_term.str = copied.swap_term ? copied.swap_term.toLowerCase() : "";

  fields.expiry_date.str = copied.expiry_date ? convertDateToString(copied.expiry_date) : "";
  fields.swap_start_date.str = copied.swap_start_date ? convertDateToString(copied.swap_start_date) : "";
  fields.premium_date.str = copied.premium_date ? convertDateToString(copied.premium_date) : "";

  fields.premium_bp.str = copied.premium_bp;
  fields.sef = copied.sef ?? false,
  fields.settlement = copied.settlement ?? "Physical";
  fields.spot_or_fwd = copied.spot_or_fwd ?? "";
  fields.clearhouse = copied.clearhouse ?? "LCH";
}

// dispatched events
const dispatch = createEventDispatcher();
const handleReset = () => dispatch('reset');

// these fields can update other tables
$: updateOptionExpiry(option_expiry);
$: updateSwapTerm(swap_term);

// these fields can be overriden
$: updatePremiumBp(premium_bp_override ?? swaption_quotes.getBBSW(swap_term, option_expiry)?.premium?.toFixed(2));
$: updateStrikeRate(strike_rate_override ?? swaption_quotes.getBBSW(swap_term, option_expiry)?.strike?.toFixed(4));

// these fields are automatically calculated dates that can be overriden
$: if(fields) updatePremiumDate(premium_date_override ?? addTenorToDate(fields.option_expiry.str, fields.date.str));
$: if(fields) updateExpiryDate(expiry_date_override ?? addTenorToDate(fields.option_expiry.str, fields.date.str));
$: if(fields) updateSwapStartDate(swap_start_date_override ?? calcSwapStartDate(fields.expiry_date.str));

// this is a read only, automatically calculated value
$: if (fields) fields.swap_maturity_date.str = calcSwapMaturityDate(fields.swap_term.str);

const updateOptionExpiry = (val) => {
  if(fields) {
    fields.option_expiry.str = val ?? '';
  }
};

const updateSwapTerm = (val) => {
  if(fields) {
    fields.swap_term.str = val ?? '';
  }
};

const updatePremiumBp = (val) => {
  if(fields) {
    fields.premium_bp.str = val ?? '';
  }
};

const updateStrikeRate = (val) => {
  if(fields) {
    fields.strike_rate.str = val ?? '';
  }
};

const updatePremiumDate = (val) => {
  if(fields) {
    fields.premium_date.str = val ?? '';
  }
};

const updateExpiryDate = (val) => {
  if(fields) {
    fields.expiry_date.str = val ?? '';
  }
};

const updateSwapStartDate = (val) => {
  if(fields) {
    fields.swap_start_date.str = val ?? '';
  }
};

// these fields are the overrides
$: premium_bp_override = nullOrVal(premium_bp_override);
$: strike_rate_override = nullOrVal(strike_rate_override);
$: expiry_date_override = nullOrVal(expiry_date_override);
$: swap_start_date_override = nullOrVal(swap_start_date_override);
$: premium_date_override = nullOrVal(premium_date_override);

// if the value is an empty string, return null, otherwise return the value
const nullOrVal = (val) => {
  return val === '' ? null : val;
};

// checking fields are valid
$: if (fields) fields.notional.invalid = fields.notional.isInvalid(Validator.scanVolume);
$: if (fields) fields.strike_rate.invalid = fields.strike_rate.isInvalid(Validator.scanPrice);
$: if (fields) fields.expiry_date.invalid = fields.expiry_date.isInvalid(Validator.scanDate);
$: if (fields) fields.option_expiry.invalid = fields.option_expiry.isInvalid(Validator.scanTenorShape);
$: if (fields) fields.date.invalid = fields.date.isInvalid(Validator.scanDate);
$: if (fields) fields.swap_term.invalid = fields.swap_term.isInvalid(Validator.scanTenorShape);
$: if (fields) fields.swap_start_date.invalid = fields.swap_start_date.isInvalid(Validator.scanDate);
$: if (fields) fields.premium_date.invalid = fields.premium_date.isInvalid(Validator.scanDate);
$: if (fields) fields.premium_bp.invalid = fields.premium_bp.isInvalid(Validator.scanPrice);

$: if (fields) fields.breaks.invalid =
  (fields.thereafter.str !== '') ?
    fields.breaks.isInvalid(Validator.scanRequiredText)
    : false;

$: if (fields) fields.thereafter.invalid =
  (fields.breaks.str !== '') ?
    fields.thereafter.isInvalid(Validator.scanRequiredText)
    : false;

const defaultValues = () => {
  fields.buyer_id = -1;
  fields.seller_id = -1;
  fields.option_type = 'Straddle';
  fields.date.reset();
  fields.notional.reset();
  fields.strike_rate.reset();
  fields.breaks.reset();
  fields.thereafter.reset();
  fields.option_expiry.reset();
  fields.expiry_date.reset();
  fields.swap_term.reset();
  fields.swap_start_date.reset();
  fields.premium_date.reset();
  fields.premium_bp.reset();
  fields.swap_maturity_date.reset();
  fields.sef = false;
  fields.settlement = 'Physical';
  fields.spot_or_fwd = 'Fwd';
  fields.clearhouse = 'LCH';

  strike_rate_override = null;
  premium_bp_override = null;
  expiry_date_override = null;
  swap_start_date_override = null;
  premium_date_override = null;

  fields.date.str = convertDateToString(new Date());

  copied = undefined;
  swaption_ticket = undefined;
  handleReset();
};

onMount(defaultValues);

// breaks a tenor into a prefix (the number) and a suffix
// (whether the prefix is a year, month, week or day)
const breakTenor = (tenor) => {
  let regex = /d|w|m|y/gi;
  let suffix = tenor.match(regex)?.[0];
  let prefix = tenor.split(suffix)[0];
  return [prefix, suffix];
};

// adds a tenor to a date
// if the new date fall on a weekend, or a nsw public holiday, rolls the date
// forward until it is a business day
const addTenorToDate = (tenor, date) => {
  if(!tenor || !date) {
    return '';
  }

  if(!isTenor(tenor)) {
    return '';
  }

  let [prefix, suffix] = breakTenor(tenor);

  let result;
  switch(suffix) {
    case 'y':
      result = addYears(date, parseInt(prefix));
      break;
    case 'm':
      result = addMonths(date, parseInt(prefix));
      break;
    case 'w':
      result = addDays(date, parseInt(prefix) * 7);
      break;
    case 'd':
      result = addDays(date, parseInt(prefix));
      break;
  }

  return convertDateToString(result);
};

// calculates the swap start date, which is the option expiry date + 1
const calcSwapStartDate = (option_expiry_date) => {
  if(!option_expiry_date) {
    return '';
  }

  let result = addDays(option_expiry_date, 1);

  return convertDateToString(result);
};

// calculates the swap maturity date, which is QQ when the tenor is equal to or
// less than 3, otherwise is SS
const calcSwapMaturityDate = (tenor) => {
  if(!tenor) {
    return '';
  }

  if(!isTenor(tenor)) {
    return '';
  }

  let [prefix, suffix] = breakTenor(tenor);

  if(!suffix || suffix.toLowerCase() === 'y') {
    if(parseInt(prefix) <= 3) {
      return 'QQ';
    } else {
      return 'SS';
    }
  } else {
    return 'QQ'
  }
};


// handler for the submit button on the form.
// checks all the values are valid, maps the swaption to a ticket that can be
// passed to oneview, and then opens the confirmation modal
const handleSubmit = () => {
  // set all the fields to dirty
  fields.notional.dirty = true;
  fields.strike_rate.dirty = true;
  fields.expiry_date.dirty = true;
  fields.breaks.dirty = true;
  fields.thereafter.dirty = true;
  fields.option_expiry.dirty = true;
  fields.date.dirty = true;
  fields.swap_term.dirty = true;
  fields.swap_start_date.dirty = true;
  fields.premium_date.dirty = true;
  fields.premium_bp.dirty = true;

  // check if all the fields are valid
  fields.notional.invalid = fields.notional.isInvalid(Validator.scanVolume);
  fields.strike_rate.invalid = fields.strike_rate.isInvalid(Validator.scanPrice);
  fields.expiry_date.invalid = fields.expiry_date.isInvalid(Validator.scanDate);
  fields.option_expiry.invalid = fields.option_expiry.isInvalid(Validator.scanTenorShape);
  fields.date.invalid = fields.date.isInvalid(Validator.scanDate);
  fields.swap_term.invalid = fields.swap_term.isInvalid(Validator.scanTenorShape);
  fields.swap_start_date.invalid = fields.swap_start_date.isInvalid(Validator.scanDate);
  fields.premium_date.invalid = fields.premium_date.isInvalid(Validator.scanDate);
  fields.premium_bp.invalid = fields.premium_bp.isInvalid(Validator.scanPrice);

  fields.breaks.invalid =
  (fields.breaks.str === '' && fields.thereafter.str !== '') ?
    fields.breaks.isInvalid(Validator.scanRequiredText)
    : false;

  fields.thereafter.invalid =
  (fields.thereafter.str === '' && fields.breaks.str !== '') ?
    fields.thereafter.isInvalid(Validator.scanRequiredText)
    : false;
  // if any of the fields are invalid, return
  if(
    fields.notional.invalid || fields.strike_rate.invalid || fields.expiry_date.invalid ||
    fields.breaks.invalid || fields.thereafter.invalid || fields.option_expiry.invalid ||
    fields.date.invalid || fields.swap_term.invalid || fields.swap_start_date.invalid ||
    fields.premium_date.invalid || fields.premium_bp.invalid
  ) {
    return;
  }

  if(
    fields.buyer_id === -1 ||
    fields.seller_id === -1
  ) {
    console.log("trader not set");
    return;
  }

  if(fields.buyer_id === undefined){
    buyerIsInvalid = true;
    return
  }else if(fields.seller_id === undefined){
    sellerIsInvalid = true;
    return
  }

  // Calculate the brokerages
  let buy_bkge, sell_bkge;
  buy_bkge = getSwaptionBrokerage(fields.buyer_id, fields.premium_bp.value, fields.notional.value);
  sell_bkge = getSwaptionBrokerage(fields.seller_id, fields.premium_bp.value, fields.notional.value);
  const bicPair = bic.getMatchingBic(fields.seller_id, fields.buyer_id, -1); // swaptions has no product id so we pass in -1.
  bic_buyer = bicPair.bic_bid;
  bic_seller = bicPair.bic_offer;

  // format the fields to an object that can be mapped to a submittable
  // swaption ticket
  swaption_ticket = {
    buyer: traders.get(+fields.buyer_id), // y
    seller: traders.get(+fields.seller_id), // y
    option_type: fields.option_type, // n
    notional: fields.notional.value, // y
    strike_rate: fields.strike_rate.value, // y
    expiry_date: fields.expiry_date.value, // y
    breaks: fields.breaks.value, // y
    thereafter: fields.thereafter.value, // y
    option_expiry: fields.option_expiry.value, // y
    date: fields.date.value, // y
    swap_term: fields.swap_term.value, // y
    swap_start_date: fields.swap_start_date.value, // y
    premium_date: fields.premium_date.value, // y
    premium_bp: fields.premium_bp.value, // y
    swap_maturity_date: fields.swap_maturity_date.value ?? fields.swap_maturity_date.str, // n
    sef: fields.sef, // y
    settlement: fields.settlement, // y (kinda)
    spot_or_fwd: fields.spot_or_fwd, // y
    clearhouse: fields.clearhouse,
    buyer_brokerage: buy_bkge,
    seller_brokerage: sell_bkge,
    timestamp: new Date(),
    bic_buyer: bic_buyer,
    bic_seller: bic_seller,
    trade_id_ov: `TRADE-${new Date().getTime()}-${swaption_orders.getTradeIdMax() + 1}`,
  };

  confirm_checked = false;
  is_confirm_modal_open = true;
};

// handler for when confirmation button is hit.
// submits the ticket, closes the modal and resets the form
const handleConfirm = () => {
  swaption_ticket.buyer.bank_division_id = +buyer_bank_division;
  swaption_ticket.seller.bank_division_id = +seller_bank_division;
  swaption_ticket.bic_buyer = bic_buyer;
  swaption_ticket.bic_seller = bic_seller;

  let ticket = mapSwaption(swaption_ticket);
  //FIXME: this should be swaption trade rather than "order"
  let order = {
    buyer_id: swaption_ticket.buyer.trader_id,
    seller_id: swaption_ticket.seller.trader_id,
    option_type: swaption_ticket.option_type,
    notional: swaption_ticket.notional,
    strike_rate: swaption_ticket.strike_rate,
    expiry_date: swaption_ticket.expiry_date,
    option_expiry: swaption_ticket.option_expiry,
    date: swaption_ticket.date,
    swap_term: swaption_ticket.swap_term,
    swap_start_date: swaption_ticket.swap_start_date,
    premium_date: swaption_ticket.premium_date,
    premium_bp: swaption_ticket.premium_bp,
    swap_maturity_date: swaption_ticket.swap_maturity_date,
    sef: swaption_ticket.sef,
    settlement: swaption_ticket.settlement,
    spot_or_fwd: swaption_ticket.spot_or_fwd,
    timestamp: swaption_ticket.timestamp,
    buyer_bank_division: buyer_bank_division,
    seller_bank_division: seller_bank_division,
    breaks: swaption_ticket.breaks,
    thereafter: swaption_ticket.thereafter,
    clearhouse: swaption_ticket.clearhouse,
    buyer_brokerage: swaption_ticket.buyer_brokerage,
    seller_brokerage: swaption_ticket.seller_brokerage,
    rba: false,
    bic_buyer: swaption_ticket.bic_buyer,
    bic_seller: swaption_ticket.bic_seller,
    trade_id_ov: swaption_ticket.trade_id_ov
  };

  if(copied && Array.isArray(copied.order_ids)) {
    websocket.deleteSwaptionOrders(copied.order_ids);
  }

  // Save the order in the DB & submit the ticket
  websocket.addSwaptionOrder([order]);
  
  //websocket.submitOvTickets([ticket]);
  websocket.submitTickets([ticket]);

  // Update the swaption brokerages
  let brokerages = [];
  if (order.buyer_brokerage !== null) {
    brokerages.push({
      isSwaption: true,
      bank_id: traders.get(order.buyer_id).bank_id,
      brokerage: order.buyer_brokerage,
    });
  }
  if (order.seller_brokerage !== null) {
    brokerages.push({
      isSwaption: true,
      bank_id: traders.get(order.seller_id).bank_id,
      brokerage: order.seller_brokerage,
    });
  }
  websocket.updateBrokerages(brokerages);

  is_confirm_modal_open = false;
  confirm_checked = false;
  defaultValues();
};

</script>

<!-- CONFIRMATION MODAL -->
<ComposedModal
  bind:open={is_confirm_modal_open}
  on:submit={handleConfirm}>

  <ModalHeader label="Swaption Ticket" title="Confirm Ticket"/>

  <ModalBody style="margin-bottom: 1rem">
    {#if swaption_ticket}
      <SwaptionTicket
        values={swaption_ticket}
        bind:buyer_bank_division
        bind:seller_bank_division
        bind:bic_buyer
        bind:bic_seller
        bind:isValidBrokerages
        buy_bkge_default={swaption_ticket.buyer_brokerage}
        sell_bkge_default={swaption_ticket.seller_brokerage}
        bind:confirm_checked
        />
    {/if}

    <div style="margin: 10px;">
      <Checkbox labelText="Confirm" bind:checked={confirm_checked}/>
    </div>

  </ModalBody>

  <ModalFooter
    primaryButtonText="Confirm"
    primaryButtonDisabled={!confirm_checked || !isValidBrokerages}/>
</ComposedModal>

<SwaptionOrderForm
  {defaultValues}
  bind:fields
  on:submit={handleSubmit}
  bind:premium_bp_override
  bind:premium_date_override
  bind:swap_start_date_override
  bind:expiry_date_override
  bind:strike_rate_override
  bind:buyerIsInvalid
  bind:sellerIsInvalid />