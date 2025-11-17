<script>

  import {
    Select,
    SelectItem,
    TextInput,
    Button,
    Checkbox,
    ComposedModal,
    ModalBody,
    ModalFooter,
    ModalHeader,
  } from "carbon-components-svelte";

  import { createEventDispatcher } from "svelte";
  import { addDays, isBusinessDay, convertDateToString, isTenor, addTenorToDays, tenorToYear } from '../../common/formatting.js';
  import { mapRBAOIS } from "../../common/ov_trade_mapper.js";

  import traders from "../../stores/traders.js";
  import brokers from '../../stores/brokers.js';
  import bic from '../../stores/bic.js';
  import orders from "../../stores/orders.js";
  import RBAOIS_TradeObject from '../../common/rbaois_trade.js';

  import user from '../../stores/user.js';
  import OisTicket from "./OISTicket.svelte";
  import websocket from "../../common/websocket.js";
  import CustomDatePicker from "../Utility/CustomDatePicker.svelte";
  import CustomComboBox from "../Utility/CustomComboBox.svelte";
  import { getRateForDates } from "../../common/pricing_models.js";

  export let rba_dates = [];
  export let rba_runs = [];
  export let copied = null;

  // Permission
  let traderApproved;
  $: traderApproved = user.getPermission($brokers)["Approve Trades"];

  // variables relating to the confirmation modal
  let is_confirm_modal_open = false;
  let confirm_checked;
  let isValidBrokerages;
  let fixed_bank_division;
  let floating_bank_division;

  let floating_payer_id;
  let fixed_payer_id;
  let bic_bid;
  let bic_offer;
  let ois_tickets;
  let ois_start_date;
  let rba_start_date;
  let spread_ois_start_date;
  let spread_rba_start_date;

  let spread = false;
  let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let spot = addDays(today, 1);
  let invalidTerm = true;
  let invalidRate = true;
  let invalidNotional = true;
  let spread_invalidTerm = true;
  let invalid_start = false;
  let invalid_end = false;
  let invalid_spread_start = false;
  let invalid_spread_end = false;
  let fixedIsInvalid = false; 
  let floatingIsInvalid = false; 

  $: invalidTerm = fields.term == null ? false : !isTenor(fields.term);
  $: if (fixed_payer_id) fixedIsInvalid = false;
  $: if (floating_payer_id) floatingIsInvalid = false;
  $: spread_invalidTerm = fields.spread_term == null ? false : !isTenor(fields.spread_term);
  $: invalidNotional = fields.notional == null ? false : isNaN(fields.notional) || fields.notional.toString().includes(" ");
  $: invalidRate = fields.rate == null || fields.rate === '' ? false : isNaN(fields.rate) || fields.rate.toString().includes(" ");

  // fields on the form
  let fields = {
    fixed_payer_id: null,
    floating_payer_id: null,
    notional: null,
    rate: null,
    start_date: null,
    expiry_date: null,
    spread_start_date: null,
    spread_expiry_date: null,
    term: null,
    spread_term: null,
    sef: false,
    rba: true,
    breaks: '',
    thereafter: '',
    spread_breaks: '',
    spread_thereafter: '',
    clearhouse: 'LCH',
  };

  let ois_dates = ["1D","1W","1M","2M","3M","4M","5M","6M","9M","1Y","18M","2Y"];

  $: {
    if (copied != null){
      copyValues();
      copied = null;
    }
  }

  // Values Copied from the Recent trades table
  function copyValues(){
    let fixed_id = fields.fixed_payer_id;
    let floating_id = fields.floating_payer_id;
    let vol = fields.notional;

    defaultValues();

    if (copied.fixed_payer_id !== null && copied.fixed_payer_id !== undefined){
      fields.fixed_payer_id = copied.fixed_payer_id;
      fixed_payer_id = copied.fixed_payer_id;
    } else if (fixed_id > 0) {
      fields.fixed_payer_id = fixed_id;
      fixed_payer_id = fixed_id;
    }

    if (copied.fixed_payer_id !== null && copied.floating_payer_id !== undefined){
      fields.floating_payer_id = copied.floating_payer_id;
      floating_payer_id = copied.floating_payer_id;
    } else if (floating_id > 0) {
      fields.floating_payer_id = floating_id;
      floating_payer_id = floating_id;
    }

    if (copied.notional !== '') fields.notional = copied.notional;
    else if (vol) fields.notional = vol;

    fields.rate = copied.rate == null?"":copied.rate;
    fields.expiry_date = copied.expiry_date == null?null:copied.expiry_date;
    fields.term = copied.term == null?"":copied.term;
    fields.start_date = copied.start_date == null?null:copied.start_date;
    if (copied.spread_start_date){
      spread = true;
      fields.spread_expiry_date = copied.spread_expiry_date == null?null:copied.spread_expiry_date;
      fields.spread_term = copied.spread_term == null?null:copied.spread_term;
      fields.spread_start_date = copied.spread_start_date == null?null:copied.spread_start_date;
    }

    fields.sef = copied.sef?true:false;
    fields.rba = copied.rba?true:false;
    fields.breaks = copied.breaks ?? '';
    fields.thereafter = copied.thereafter ?? '';
    fields.clearhouse = copied.clearhouse;
  }

  // dispatched events
  const dispatch = createEventDispatcher();
  const handleReset = () => dispatch('reset');

  // these fields are automatically calculated dates that can be overriden
  $: {
    if (fields.term && fields.start_date && !fields.rba){
      fields.expiry_date = addTenorToDays(fields.term, fields.start_date);
    }
  }
  $: {
    if (fields.spread_term && fields.spread_start_date && !fields.rba){
      fields.spread_expiry_date = addTenorToDays(fields.spread_term, fields.spread_start_date);
    }
  }
  // default Value on order form
  const defaultValues = () => {
    fields.fixed_payer_id = null;
    fixed_payer_id = "";
    fields.floating_payer_id = null;
    floating_payer_id = "";
    fields.notional = null;
    fields.rate = null;
    fields.expiry_date = null;
    fields.term = null;
    fields.start_date = null;
    fields.spread_expiry_date = null;
    fields.spread_term = null;
    fields.spread_start_date = null;
    ois_start_date = '';
    rba_start_date = '';
    spread_ois_start_date = '';
    spread_rba_start_date = '';
    fields.sef = false;
    fields.rba = true;
    fields.breaks = '';
    fields.thereafter = '';
    fields.spread_breaks = '';
    fields.spread_thereafter = '';
    fields.clearhouse = 'LCH';

    spread = false;

    ois_tickets = null;
    handleReset();
  };

  // onMount(defaultValues);

  const convertStringToDate = (str) => {
    if(!str) {
      return '';
    }

    let months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
              Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};

    str = str.split(" ");
    let date = new Date(parseInt("20"+str[2]), months[str[1]], parseInt(str[0]));
    return date;
  };

  // handler for the submit button on the form.
  // checks all the values are valid, maps the rba ois to a ticket that can be
  // passed to oneview, and then opens the confirmation modal
  const handleSubmit = () => {
    ois_tickets = [];

    // if any of the fields are invalid, return
    if(invalidNotional || invalidRate || invalidTerm || fixedIsInvalid || floatingIsInvalid || (spread && spread_invalidTerm)) {
      return;
    }
    
    invalid_start = false;
    invalid_end = false;
    invalid_spread_start = false;
    invalid_spread_end = false;
    fixedIsInvalid = false;
    floatingIsInvalid = false;
    
    if (fields.start_date == null) {
      invalid_start = true;
      return;
    } else if (fields.expiry_date == null) {
      invalid_end = true;
      return;
    } else if (spread && fields.spread_start_date == null) {
      invalid_spread_start = true;
      return;
    } else if (spread && fields.spread_expiry_date == null) {
      invalid_spread_end = true;
      return;
    }

    if(fields.fixed_payer_id === null || fields.floating_payer_id === null) {
      return;
    }

    if ( fixed_payer_id === undefined) {
      fixedIsInvalid = true;
      return
    }else if (floating_payer_id === undefined) {
      floatingIsInvalid = true;
      return;
    }

    // floating => offer; fixed => bid; // rba ois product id is 20; ois product id is 14;
    const bicPair = bic.getMatchingBic(floating_payer_id, fixed_payer_id, (fields.rba ? 20 : 14)); 
    bic_bid = bicPair.bic_bid;
    bic_offer = bicPair.bic_offer;
    
    if (spread) {
      // Construct first trade
      let ois_ticket_0 = new RBAOIS_TradeObject(fields, floating_payer_id, fixed_payer_id, bic_offer, bic_bid, fields.breaks, fields.thereafter, fields.term, fields.start_date, fields.expiry_date);
      ois_tickets.push(ois_ticket_0);
      
      // Construct sencond trade
      // "spread_ " fields represent the second trade against with orginal trade
      let ois_ticket_1 = new RBAOIS_TradeObject(fields, fixed_payer_id, floating_payer_id,  bic_bid,  bic_offer, fields.spread_breaks, fields.spread_thereafter, fields.spread_term, fields.spread_start_date, fields.spread_expiry_date);
    
      ois_tickets.push(ois_ticket_1);
      
      if (ois_tickets[0].start_date < ois_tickets[1].start_date){
        if (fields.rba){
          for (let run of rba_runs){
            let split = new Date(ois_tickets[0].start_date).toString().split(" ");
            if (run[0].includes(split[1] + " " + split[3].slice(2))){
              let mid = run[2];
              ois_tickets[0].rate = mid;
              ois_tickets[1].rate = (parseFloat(mid) + parseFloat(fields.rate)).toFixed(4);
              break;
            }
          }
        } else {
          let d1 = new Date(ois_tickets[0].start_date);
          let d2 = new Date(ois_tickets[0].expiry_date);
          let mid = getRateForDates(d1, d2);
          ois_tickets[0].rate = mid;
          ois_tickets[1].rate = (parseFloat(mid) + parseFloat(fields.rate)).toFixed(4);
        }
      } else {
        if (fields.rba){
          for (let run of rba_runs){
            if (run[0].includes(convertDateToString(ois_tickets[1].start_date))){
              let mid = run[2];
              ois_tickets[1].rate = mid;
              ois_tickets[0].rate = (parseFloat(mid) - parseFloat(fields.rate)).toFixed(4);
              break;
            }
          }
        } else {
          let d1 = new Date(ois_tickets[1].start_date);
          let d2 = new Date(ois_tickets[1].expiry_date);
          let mid = getRateForDates(d1, d2);
          ois_tickets[1].rate = mid;
          ois_tickets[0].rate = (parseFloat(mid) - parseFloat(fields.rate)).toFixed(4);
        }
      }
    } else {
      // Construct single outright trade
      let ois_ticket = new RBAOIS_TradeObject(fields, fixed_payer_id, floating_payer_id,  bic_bid, bic_offer,  fields.breaks, fields.thereafter, fields.term, fields.start_date, fields.expiry_date);
      ois_tickets.push(ois_ticket);
    }

    // open the confirmation modal
    confirm_checked = false;
    is_confirm_modal_open = true;
  };

  // sends a standard ois trade through.
  // creates a offer and bid order.
  // inserts the trade into trades table.
  const processesTradeWithOrders = async (legs) => {
    const leg = await legs[0];

    // first we need to translate the field names from the leg into two orders
    const broker_id = brokers.get(user.get()).broker_id;
    const years = parseFloat(tenorToYear(leg.term));

    let offer_order = {
      product_id: leg.product_id,
      bid: false,
      firm: true,
      years: [years],
      price: leg.rate,
      volume: leg.notional,
      trader_id: leg.floating_payer_id,
      broker_id: broker_id,
      time_placed: leg.timestamp,
      time_closed: leg.timestamp,
      muted: false,
      currency_code: leg.currency,
      fwd: null,
      start_date: leg.start_date,
      offer_brokerage: leg.offer_brokerage,
      bid_brokerage: leg.bid_brokerage,
    };

    let bid_order = structuredClone(offer_order);
    bid_order.bid = true;
    bid_order.trader_id = leg.fixed_payer_id;

    // make the trade ticket (order ids will be added in the backend after orders are submitted)
    let tradeTicket = {
      product_id: leg.product_id,
      year: years,
      price: leg.rate,
      volume: leg.notional,
      offer_brokerage: leg.offer_brokerage,
      bid_brokerage: leg.bid_brokerage,
      currency: leg.currency,
      timestamp: leg.timestamp,
      offer_bank_division_id: leg.floating_bank_division_id,
      bid_bank_division_id: leg.fixed_bank_division_id,
      sef: leg.sef,
      breaks: leg.breaks,
      thereafter: leg.thereafter,
      start_date: leg.start_date,
      clearhouse: leg.clearhouse,
      offer_trader_id: leg.floating_payer_id,
      bid_trader_id: leg.fixed_payer_id,
      trade_id_ov: leg.trade_id_ov
    };

    // submit the two orders and trade
    websocket.submitTicketWithOrders(offer_order, bid_order, tradeTicket);

    if(legs[1]) {
      // do the same for next leg
      legs.shift();
      processesTradeWithOrders(legs);
    }
  };

  // handler for when confirmation button is hit.
  // submits the ticket, closes the modal and resets the form
  const handleConfirm = async () => {
    if (ois_tickets[1]){
      // Add extra fields on contrcting RBAOIS tradeObject
      ois_tickets[1].fixed_bank_division_id = +fixed_bank_division;
      ois_tickets[1].floating_bank_division_id = +floating_bank_division;

      ois_tickets[0].fixed_bank_division_id = +floating_bank_division;
      ois_tickets[0].floating_bank_division_id = +fixed_bank_division;
      
      // Maping tickets
      let ticket1 = mapRBAOIS(ois_tickets[0]);
      let ticket2 = mapRBAOIS(ois_tickets[1]);
      //Previously Sending to Oneview
      //websocket.submitOvTickets([ticket1, ticket2]);

      // Now Sending to Markit
      websocket.submitTickets([ticket1, ticket2]);

      // Send Trade to DB via websocket
      processesTradeWithOrders(ois_tickets);

      // Remove OCO orders
      orders.removeOCOOrders([ticket1, ticket2]);
    } else {
      // Add extra fields on contrcting RBAOIS tradeObject
      ois_tickets[0].fixed_bank_division_id = +fixed_bank_division;
      ois_tickets[0].floating_bank_division_id = +floating_bank_division;

      // Mapping RBAOIS ticket befor sending out
      let ticket = mapRBAOIS(ois_tickets[0]);
      //Previous sending to OneView
      // websocket.submitOvTickets([ticket]);

      //Now sending to Markit
      websocket.submitTickets([ticket]);

      //Process trade Object send to DB via websocket
      processesTradeWithOrders(ois_tickets);

      // remove OCO orders
      orders.removeOCOOrders([ticket]);
    }
    is_confirm_modal_open = false;
    confirm_checked = false;
    defaultValues();
  };

  function setFixedPayerField(){
    fields.fixed_payer_id = parseInt(fixed_payer_id);
  }

  function setFloatingPayerField(){
    fields.floating_payer_id = parseInt(floating_payer_id);
  }

  function handleRBAChange(){
    if (fields.rba){
      ois_start_date = '';
      spread_ois_start_date = '';
    } else {
      rba_start_date = '';
      spread_rba_start_date = '';
    }
    fields.start_date = null;
    fields.term = null;
    fields.expiry_date = null;
    fields.spread_start_date = null;
    fields.spread_term = null;
    fields.spread_expiry_date = null;
  }

  function handleStartDate(whichField){
    let date = null;
    switch (whichField){
      case 1: {
        if (rba_start_date === '') return;
        spread_ois_start_date = "";
        ois_start_date = '';
        if (!fields.rba){
          fields.spread_start_date = null;
          fields.spread_term = null;
          fields.spread_expiry_date = null;
        }
        
        for (let run of rba_runs){
          if (run[0].includes(rba_dates[rba_start_date])){
            date = convertStringToDate(run[0]);
            let expiry = convertStringToDate(run[1]);
            fields.term = run[4] + "d";
            fields.expiry_date = expiry;
            fields.start_date = date;
            fields.rba = true;
            break;
          }
        }
        break;
      };
      case 2: {
        if (ois_start_date === '') return;
        spread_rba_start_date = "";
        rba_start_date = "";
        date = addTenorToDays(ois_dates[ois_start_date], new Date());
        fields.start_date = date;
        fields.rba = false;
        fields.term = null;
        fields.expiry_date = null;
        break;
      };
      case 3: {
        if (spread_rba_start_date === '') return;
        spread_ois_start_date = "";
        ois_start_date = "";
        
        if (!fields.rba){
          fields.start_date = null;
          fields.term = null;
          fields.expiry_date = null;
        }
        
        for (let run of rba_runs){
          if (run[0].includes(rba_dates[spread_rba_start_date])){
            date = convertStringToDate(run[0]);
            let expiry = convertStringToDate(run[1]);
            fields.spread_term = run[4] + "d";
            fields.spread_expiry_date = expiry;
            fields.spread_start_date = date;
            fields.rba = true;
            break;
          }
        }
        break;
      };
      case 4: {
        if (spread_ois_start_date === '') return;
        spread_rba_start_date = "";
        rba_start_date = "";
        date = addTenorToDays(ois_dates[spread_ois_start_date], new Date());
        fields.spread_start_date = date;
        fields.rba = false;
        fields.spread_term = null;
        fields.spread_expiry_date = null;
        break;
      };
    }
  }

  function handleManualDate(whichDate, event){
    if (!event.detail.selectedDates[0]) return;
    fields.rba = false;
    spread_rba_start_date = "";
    rba_start_date = "";
    let date = new Date(event.detail.selectedDates[0]);
    switch (whichDate){
      case 1: {
        if (!isBusinessDay(date)) fields.start_date = addDays(date, 1);
        else fields.start_date = date;
        break;
      };
      case 2: {
        if (fields.start_date && fields.term) fields.term = null;
        if (!isBusinessDay(date)) fields.expiry_date = addDays(date, 1);
        else fields.expiry_date = date;
        break;
      };
      case 3: {
        if (!isBusinessDay(date)) fields.spread_start_date = addDays(date, 1);
        else fields.spread_start_date = date;
        break;
      };
      case 4: {
        if (fields.spread_start_date && fields.spread_term) fields.spread_term = null;
        if (!isBusinessDay(date)) fields.spread_expiry_date = addDays(date, 1);
        else fields.spread_expiry_date = date;
        break;
      };
    }
  }

  function handleSpread(){
    spread = !spread;
    if (!spread) {
      fields.spread_start_date = null;
      fields.spread_term = null;
      fields.spread_expiry_date = null;
    }
  }
  
  let break_options = ["1D","6M","1Y","2Y","3Y","4Y","5Y","6Y","7Y","8Y","9Y","10Y","11Y","12Y","15Y","20Y","25Y","30Y"];
  let spread_breaksNeeded;
  let breaksNeeded;
  $: spread_breaksNeeded = (fields.spread_breaks != "" || fields.spread_thereafter != "");
  $: breaksNeeded = (fields.breaks != "" || fields.thereafter != "");

  function isDateGreaterThan(date1, date2) {
    date1 = new Date(date1);
    date2 = new Date(date2);
    return (date1 > date2);
  }

  function isTermGreaterThan(term1, term2) {
    if(!term2) return true;
    term1 = tenorToYear(term1);
    term2 = tenorToYear(term2);
    return(term1 > term2);        
  }
</script>


  <!-- CONFIRMATION MODAL -->
  <ComposedModal
    bind:open={is_confirm_modal_open}
    on:submit={handleConfirm}>

    <ModalHeader label="Trade Ticket" title="Confirm Ticket"/>

    <ModalBody style="margin-bottom: 1rem">
      {#if ois_tickets && is_confirm_modal_open}
        <OisTicket
          values={ois_tickets}
          bind:fixed_bank_division
          bind:floating_bank_division
          bind:bic_bid
          bind:bic_offer
          bind:isValidBrokerages
          defaults={{ offer:ois_tickets[spread ? 1 : 0].offer_brokerage, bid:ois_tickets[spread ? 1 : 0].bid_brokerage }}
          key={spread ? 1 : 0}
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

  <!-- FORM -->
  <form style="width: 400px;" on:submit|preventDefault={handleSubmit}>
    <div class="orderForm">
      <div class="cell">
        <div class="element">
          <p class="label">Payer</p>
          <CustomComboBox
          on:select={setFixedPayerField}
          invalid={fixedIsInvalid}
          invalidText="Please select Trader"
          items={
            $traders.map(trader => {
              return {
                id: trader.trader_id,
                text: traders.fullName(trader),
                ...trader
              }
            })
          }
          itemToString={traders.fullName} 
          bind:selectedId={fixed_payer_id}
        />
        </div>
        <div class="element">
          <p class="label">Receiver</p>
          <CustomComboBox
          on:select={setFloatingPayerField}
          invalid={floatingIsInvalid}
          invalidText="Please select Trader"
          items={
            $traders.map(trader => {
              return {
                id: trader.trader_id,
                text: traders.fullName(trader),
                ...trader
              }
            })
          }
          itemToString={traders.fullName} 
          bind:selectedId={floating_payer_id}
        />
        </div>
      </div>

      <div class="cell">
        <div class="separator ">Dates</div>
        <div class="element">
          <div style="display: flex; justify-content: center; padding-right:10%">
            <p style="font-size: small; text-align: center;">RBA OIS&ensp;</p>
            <input type="radio" bind:group={fields.rba} value={true} name="rba" required on:change={handleRBAChange}>
          </div>
          <div style="display: flex; justify-content: center; padding-left:10%">
            <p style="font-size: small; text-align: center;">OIS&ensp;</p>
            <input type="radio" bind:group={fields.rba} value={false} name="rba" required on:change={handleRBAChange}>
          </div>
        </div>
        <div class="element">
          <p class="label">Start Date</p>
          <div style="flex-grow: 1;">
            <div style="display: flex;">
              <div style="width: 50%;">
                <div style="display: flex; justify-content: center;">
                </div>
                <Select
                  bind:selected = {rba_start_date}
                  on:change={() => handleStartDate(1)}>
                  <SelectItem text="" hidden/>
                  {#each rba_dates as option, i}
                    <SelectItem text={option} value={i}/>
                  {/each}
                </Select>
              </div>
              <div style="width: 50%;">
                <Select
                  bind:selected={ois_start_date}
                  on:change={() => handleStartDate(2)}>
                  <SelectItem text="" hidden/>
                  {#each ois_dates as option, i}
                    <SelectItem text={option} value={i}/>
                  {/each}
                </Select>
              </div>
            </div>
            <CustomDatePicker min_date={fields.term == null || fields.term.toLowerCase() == 'on' ? today : spot}
              bind:value={fields.start_date}
              bind:disabled={fields.rba}
              on:change={(e) => handleManualDate(1, e)}
              invalid_text="Invalid Date"
              bind:invalid={invalid_start}/>
          </div>
        </div>
        <div class="element">
          <p class="label">Term</p>
          <TextInput
            bind:value={fields.term}
            bind:invalid={invalidTerm}
            bind:disabled={fields.rba}
            invalidText="Invalid Tenor"
            size="sm"
            required />
        </div>
        <div class="element">
          <p class="label">Termination</p>
          <CustomDatePicker min_date={fields.start_date? fields.start_date : spot}
            bind:value={fields.expiry_date}
            bind:disabled={fields.rba}
            on:change={(e) => handleManualDate(2, e)}
            invalid_text="Invalid Date"
            bind:invalid={invalid_end}/>
        </div>
        <div class="element">
          <!-- Break Clause -->
          <div class="element">
            <p class="label">Break</p>
            <Select
              bind:selected={fields.breaks}
              required={breaksNeeded}>
              <SelectItem text="-" value="" hidden/>
              {#each break_options as option}
                <SelectItem value={option}/>
              {/each}
            </Select>
          </div>
          <!-- Thereafter -->
          <div class="element">
            <p class="label">&ensp; Thereafter</p>
            <Select
              bind:selected={fields.thereafter}
              required={breaksNeeded}>
              <SelectItem text="-" value="" hidden/>
              {#each break_options as option}
                <SelectItem value={option}/>
              {/each}
            </Select>
          </div>
        </div>

        {#if !spread}
          <div class="element">
            <p class="spreadButton" on:click={handleSpread}>Add Spread Leg</p>
          </div>
        {:else}
          <div class="separator " on:click={handleSpread}>Spread Leg</div>
          <div class="element">
            <p class="label">Start Date</p>
            <div style="flex-grow: 1;">
              <div style="display: flex;">
                {#if fields.rba}
                  <div style="width: 100%;">
                    <Select
                      bind:selected = {spread_rba_start_date}
                      on:change={() => handleStartDate(3)}>
                      <SelectItem text="" hidden/>
                      {#each rba_dates as option, i}
                        {#if isDateGreaterThan(option, fields.start_date)}
                          <SelectItem text={option} value={i}/>
                        {/if}
                      {/each}
                    </Select>
                  </div>
                {:else}
                  <div style="width: 100%;">
                    <Select
                      bind:selected={spread_ois_start_date}
                      on:change={() => handleStartDate(4)}>
                      <SelectItem text="" hidden/>
                      {#each ois_dates as option, i}
                        {#if isTermGreaterThan(option, fields.term)}
                            <SelectItem text={option} value={i}/>
                          {/if}
                      {/each}
                    </Select>
                  </div>
                {/if}
              </div>
              <CustomDatePicker min_date={fields.spread_term == null || fields.spread_term.toLowerCase() == 'on' ? today : spot}
                bind:value={fields.spread_start_date}
                bind:disabled={fields.rba}
                on:change={(e) => handleManualDate(3, e)}
                invalid_text="Invalid Date"
                bind:invalid={invalid_spread_start}/>
            </div>
          </div>
          <div class="element">
            <p class="label">Term</p>
            <TextInput
              bind:value={fields.spread_term}
              bind:invalid={spread_invalidTerm}
              bind:disabled={fields.rba}
              invalidText="Invalid Tenor"
              size="sm"
              required />
          </div>
          <div class="element">
            <p class="label">Termination</p>
            <CustomDatePicker min_date={fields.spread_start_date? fields.spread_start_date : spot}
              bind:value={fields.spread_expiry_date}
              bind:disabled={fields.rba}
              on:change={(e) => handleManualDate(4, e)}
              invalid_text="Invalid Date"
              bind:invalid={invalid_spread_end}/>
          </div>
          <div class="element">
            <!-- Break Clause -->
            <div class="element">
              <p class="label">Break</p>
              <Select
                bind:selected={fields.spread_breaks}
                required={spread_breaksNeeded}>
                <SelectItem text="-" value="" hidden/>
                {#each break_options as option}
                  <SelectItem value={option}/>
                {/each}
              </Select>
            </div>
            <!-- Thereafter -->
            <div class="element">
              <p class="label">&ensp; Thereafter</p>
              <Select
                bind:selected={fields.spread_thereafter}
                required={spread_breaksNeeded}>
                <SelectItem text="-" value="" hidden/>
                {#each break_options as option}
                  <SelectItem value={option}/>
                {/each}
              </Select>
            </div>
          </div>
        {/if}
      </div>

      <div class="cell">
        <div class="separator ">Details</div>
        <div class="element">
          <p class="label">Rate</p>
          <TextInput
            bind:value={fields.rate}
            bind:invalid={invalidRate}
            invalidText="Invalid Rate"
            size="sm"
            required />
        </div>
        <div class="element">
          <p class="label">Notional</p>
          <TextInput
            bind:value={fields.notional}
            bind:invalid={invalidNotional}
            invalidText="Invalid Volume"
            size="sm"
            required />
        </div>
        <div class="element" style="display:flex">
          <div  style="padding-left:10%; width:50%; display: flex; align-items: center;">
            <p class="label" style="width:70px;">SEF Trade</p>
            <Checkbox  bind:checked={fields.sef}/>
          </div>
          <div style="display:flex; gap:10px; width:50%; align-items: center; justify-content: center;">
            <p class="label" style="width: 30px;">ASX</p>
            <input type="radio" bind:group={fields.clearhouse} value="ASX" name="clearhouse" required>
            <p class="label" style="width: 30px;">LCH</p>
            <input type="radio" bind:group={fields.clearhouse} value="LCH" name="clearhouse" required>
          </div>
        </div>
      </div>
    </div>

    <div class="submit-container">
      <Button kind="secondary" on:click={defaultValues} >Clear</Button>
      <Button type="submit" kind="primary" disabled={!traderApproved}>Submit</Button>
    </div>
  </form>

<style>
  .orderForm {
    margin-top: 1.5rem;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  /* .column {
    width: 50%;
    min-height: 600px;
    height: calc(100vh - 300px);
  } */

  .cell {
    padding-bottom: 1rem;
  }

  .element {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 1rem;
    width: 100%;
  }

  /* .topCell .element {
    height: 17%;
  }
  .bottomCell .element {
    height: 20.5%;
  } */

  .label {
    color: white;
    font-size: small;
    width: 90px;
  }
  .spreadButton {
    width: 50%;
    text-align: center;
    height: 20px;
    background-color: var(--cds-ui-04);
    font-size: small;
    align-self: center;
  }
  .submit-container {
    /* margin-top: 2rem; */
    justify-content: center;
    display: flex;
    gap: 2rem 1rem;
  }

  .separator {
    margin-top: 10px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    text-align: center;
    width: 100%;
    font-weight: bold;
  }

  .separator::before,
  .separator::after {
    content: '';
    flex: 1;
    margin-left: 25%;
    margin-right: 25%;
    border-bottom: 1px solid var(--cds-text-secondary);
  }

  .separator:not(:empty)::before {
    margin-right: .25em;
  }

  .separator:not(:empty)::after {
    margin-left: .25em;
  }
  
  :global(.element .bx--list-box__wrapper){
    width:100%;
  }

  :global(.swaption-overriden) {
    color: black;
    background-color: lemonchiffon;
  }
</style>
