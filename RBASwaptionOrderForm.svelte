<script>

  import {
    ComposedModal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Checkbox,
  } from 'carbon-components-svelte';

  import CustomDatePicker from '../Utility/CustomDatePicker.svelte';
  import SwaptionTicket from './SwaptionTicket.svelte';
  import SwaptionOrderForm from './SwaptionOrderForm.svelte';

  import bic from './../../stores/bic';

  import { onMount } from 'svelte';
  import { createEventDispatcher } from "svelte";

  import traders from '../../stores/traders';
  import { addDays, convertDateToString } from '../../common/formatting.js';
  import { mapRBASwaption } from '../../common/ov_trade_mapper.js';
  import Validator from "../../common/validator.js";
  import websocket from "../../common/websocket";
  import { getSwaptionBrokerage } from '../../common/brokerages';
  import swaption_orders from '../../stores/swaption_orders';

  export let swap_term;
  export let premium_bp;
  export let strike_rate;
  export let expiry_date;
  export let maturity_date;
  export let start_date;

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
    if (copied != null && copied != undefined){
      copyValues();
    }
  }

  function handleOptionType (str) {
    if (str == "Straddle" || str == "Receivers" || str == "Payers") {
      return str;
    }

    str = str.toLowerCase();

    if (str == "straddle" || str == "str" || str == "s") {
      return "Straddle";
    } else if (str == "payers" || str == "pay" || str == "p") {
      return "Payers";
    } else if (str == "receivers" || str == "recievers" || str == "rec" || str == "r") {
      return "Receivers";
    } else {
      return "Straddle";
    }
  }

  function copyValues() {
    
    fields.buyer_id = copied.buyer_id;
    fields.seller_id = copied.seller_id;

    fields.option_type = handleOptionType(copied.option_type);
    fields.notional.str = copied.notional ?? '';
    fields.strike_rate.str = copied.strike_rate ?? '';
    fields.swap_term.str = copied.swap_term ?? '';
    fields.premium_bp.str = copied.premium_bp ?? '';
    fields.settlement = copied.settlement ?? '';
    fields.spot_or_fwd = copied.spot_or_fwd ?? '';
    fields.sef = copied.sef;
    fields.clearhouse = copied.clearhouse;

    fields.expiry_date.str = copied.expiry_date ? convertDateToString(copied.expiry_date) : "";
    fields.swap_start_date.str = copied.swap_start_date ? convertDateToString(copied.swap_start_date) : "";
    fields.premium_date.str = copied.premium_date ? convertDateToString(copied.premium_date) : "";
    fields.swap_maturity_date.str = copied.swap_maturity_date ? convertDateToString(copied.swap_maturity_date) : "";
  }

  // dispatched events
  const dispatch = createEventDispatcher();
  const handleReset = () => dispatch('reset');

  $: updateSwapTerm(swap_term);

  // these fields can be overriden
  $: updatePremiumBp(premium_bp_override ?? premium_bp);
  $: updateStrikeRate(strike_rate_override ?? strike_rate);
  $: updateExpiryDate(expiry_date_override ?? expiry_date);
  $: updateSwapMaturityDate(swap_maturity_date_override ?? maturity_date);
  $: updateSwapStartDate(swap_start_date_override ?? start_date);

  // these fields are automatically calculated dates that can be overriden
  $: if(fields) updatePremiumDate(premium_date_override ?? fields.expiry_date.str);
  // $: if(fields) updateSwapStartDate(swap_start_date_override ?? calcSwapStartDate(fields.expiry_date.str));

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
      fields.expiry_date.value = new Date(val);
      fields.expiry_date.str = val ?? '';
    }
  };

  const updateSwapStartDate = (val) => {
    if(fields) {
      fields.swap_start_date.str = val ?? '';
    }
  };

  const updateSwapMaturityDate = (val) => {
    if(fields) {
      fields.swap_maturity_date.value = new Date(val);
      fields.swap_maturity_date.str = val ?? '';
    }
  };

  // these fields are the overrides
  $: premium_bp_override = nullOrVal(premium_bp_override);
  $: strike_rate_override = nullOrVal(strike_rate_override);
  $: expiry_date_override = nullOrVal(expiry_date_override);
  $: swap_start_date_override = nullOrVal(swap_start_date_override);
  $: premium_date_override = nullOrVal(premium_date_override);
  $: swap_maturity_date_override = nullOrVal(swap_maturity_date_override);

  // if the value is an empty string, return null, otherwise return the value
  const nullOrVal = (val) => {
    return val === '' ? null : val;
  };

  // checking fields are valid
  $: if (fields) fields.notional.invalid = fields.notional.isInvalid(Validator.scanVolume);
  $: if (fields) fields.strike_rate.invalid = fields.strike_rate.isInvalid(Validator.scanPrice);
  $: if (fields) fields.expiry_date.invalid = fields.expiry_date.isInvalid(Validator.scanDate);
  $: if (fields) fields.date.invalid = fields.date.isInvalid(Validator.scanDate);
  $: if (fields) fields.swap_term.invalid = fields.swap_term.isInvalid(Validator.scanTenorShape);
  $: if (fields) fields.swap_start_date.invalid = fields.swap_start_date.isInvalid(Validator.scanDate);
  $: if (fields) fields.premium_date.invalid = fields.premium_date.isInvalid(Validator.scanDate);
  $: if (fields) fields.premium_bp.invalid = fields.premium_bp.isInvalid(Validator.scanPrice);

  // these fields can be empty
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

    swaption_ticket = undefined;
    handleReset();
  };

  onMount(defaultValues);

  // calculates the swap start date, which is the option expiry date + 1
  const calcSwapStartDate = (option_expiry_date) => {
    if(!option_expiry_date) {
      return '';
    }

    let result = addDays(option_expiry_date, 1);

    return convertDateToString(result);
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
    fields.date.dirty = true;
    fields.swap_term.dirty = true;
    fields.swap_start_date.dirty = true;
    fields.premium_date.dirty = true;
    fields.premium_bp.dirty = true;

    // check if all the fields are valid
    fields.notional.invalid = fields.notional.isInvalid(Validator.scanVolume);
    fields.strike_rate.invalid = fields.strike_rate.isInvalid(Validator.scanPrice);
    fields.expiry_date.invalid = fields.expiry_date.isInvalid(Validator.scanDate);
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
      fields.breaks.invalid || fields.thereafter.invalid || fields.date.invalid ||
      fields.swap_term.invalid || fields.swap_start_date.invalid || fields.premium_date.invalid ||
      fields.premium_bp.invalid
    ) {
      return;
    }

    if(
      fields.buyer_id === -1 ||
      fields.seller_id === -1
    ) {
      console.log('trader not set');
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
      trade_id_ov: `TRADE-${new Date().getTime()}-${swaption_orders.getTradeIdMax() + 1}`
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

    let ticket = mapRBASwaption(swaption_ticket);

    let trade = {
      buyer_id: swaption_ticket.buyer.trader_id,
      seller_id: swaption_ticket.seller.trader_id,
      option_type: swaption_ticket.option_type,
      notional: swaption_ticket.notional,
      strike_rate: swaption_ticket.strike_rate,
      expiry_date: swaption_ticket.expiry_date,
      date: swaption_ticket.date,
      swap_term: swaption_ticket.swap_term,
      swap_start_date: swaption_ticket.swap_start_date,
      premium_date: swaption_ticket.premium_date,
      premium_bp: swaption_ticket.premium_bp,
      swap_maturity_date: swaption_ticket.swap_maturity_date.getTime() ? convertDateToString(swaption_ticket.swap_maturity_date) : swaption_ticket.swap_maturity_date,
      sef: swaption_ticket.sef,
      settlement: swaption_ticket.settlement,
      spot_or_fwd: swaption_ticket.spot_or_fwd,
      timestamp: new Date(),
      buyer_bank_division: buyer_bank_division,
      seller_bank_division: seller_bank_division,
      breaks: swaption_ticket.breaks,
      thereafter: swaption_ticket.thereafter,
      clearhouse: swaption_ticket.clearhouse,
      buyer_brokerage: swaption_ticket.buyer_brokerage,
      seller_brokerage: swaption_ticket.seller_brokerage,
      rba: true,
      bic_buyer: swaption_ticket.bic_buyer,
      bic_seller: swaption_ticket.bic_seller,
      trade_id_ov: swaption_ticket.trade_id_ov
    };

    // Save the trade in the DB & submit the ticket
    websocket.addSwaptionOrder([trade]);
    
    // websocket.submitOvTickets([ticket]);
    websocket.submitTickets([ticket]);

    // Update the swaption brokerages
    let brokerages = [];
    if (trade.buyer_brokerage !== null) {
      brokerages.push({
        isSwaption: true,
        bank_id: traders.get(trade.buyer_id).bank_id,
        brokerage: trade.buyer_brokerage,
      });
    }
    if (trade.seller_brokerage !== null) {
      brokerages.push({
        isSwaption: true,
        bank_id: traders.get(trade.seller_id).bank_id,
        brokerage: trade.seller_brokerage,
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
  bind:sellerIsInvalid
>
  <div style="display: none;" slot="option_expiry"/>
  <div class="element" slot="swap_maturity_date">
    <p class="label">Maturity Date</p>
    {#if fields && fields.swap_maturity_date}
      <CustomDatePicker
        statics={false}
        bind:value={fields.swap_maturity_date.str}
        bind:invalid={fields.swap_maturity_date.invalid}
        invalid_text={fields.swap_maturity_date.error_message}
        min_date='today'
        inputClass={swap_maturity_date_override ? 'swaption-overriden' : ''}
        on:change={(e) => {
          if(fields.swap_maturity_date.str !== e.detail.dateStr) {
            swap_maturity_date_override = e.detail.dateStr;
          }
        }}/>
    {/if}
  </div>
</SwaptionOrderForm>


<style>
  .element {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .label {
    color: white;
    font-size: small;
    width: 80px;
  }
</style>
