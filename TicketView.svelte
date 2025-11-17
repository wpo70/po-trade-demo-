<script>
  import Locked from "carbon-icons-svelte/lib/Locked.svelte";
  import Unlocked from "carbon-icons-svelte/lib/Unlocked.svelte";
  import EventSchedule from "carbon-icons-svelte/lib/EventSchedule.svelte";
  import {
    isTenor,
    timestampToDateTime,
    toPrice,
    toRBATenor,
    toTenor,
    toVolume,
    convertLegToTitle,
    timestampToISODate,
    toEFPSPSTenor,
    roundToNearest,
    genericToTenor,
    tenorToYear,
  } from "../common/formatting.js";
  import bank_divisions from "../stores/bank_divisions.js";
  import { Checkbox, Select, SelectItem, TextInput } from "carbon-components-svelte";
  import Sef from "./Sef.svelte";
  import bic from '../stores/bic.js';
  import active_product from "../stores/active_product.js";
  import currency_state from "../stores/currency_state.js";
  import { onMount, createEventDispatcher  } from 'svelte';
  import dailyfx from "../stores/fxrate.js";
  import products from "../stores/products.js";
  import ocos from "../stores/ocos.js";
  import brokers from "../stores/brokers.js";

  export let editable = false;
  export let tickets;
  export let openTicket = false;

  const dispatch = createEventDispatcher();

  let active_prod = $active_product;
  let fxrate;
  let fxRateIsInvalid = false;
  let fxRateErrorMessage = null;
  $: { 
    active_prod = tickets?.tickets[0]?.product_id ?? $active_product;
    // Add fx extension in each ticket object
    let fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state);
    fxrate = fx.override ? fx.override: fx.value;
  }
  
  let isCrossCurrency = false;
  $:  isCrossCurrency = products.isXccy(active_prod);
  $: {
    if (tickets.tickets.length > 0 && isCrossCurrency) {
      tickets.tickets.forEach(ticket => {if (ticket.fx == undefined) ticket.fx = fxrate});
    }
  }
  /**
   * @typedef {ticket}
   * @property {} bid
   * @property {} offer
   * @property {number} bid_bank_division_id
   * @property {double | null} bid_brokerage
   * @property {string | null} breaks
   * @property {string | null} thereafter
   * @property {string} currency
   * @property {number | null} lots
   * @property {number} offer_bank_division_id
   * @property {double | null} offer_brokerage
   * @property {double} price
   * @property {number} product_id
   * @property {boolean} sef
   * @property {date} start_date
   * @property {date} timestamp
   * @property {number} volume
   * @property {number | double} year
   * @property {double}  fx
  */

  function bic_handler(newBicId, ticketIdx, bid_or_offer) {
    const bid = (bid_or_offer == 'bid' ? true : (bid_or_offer == 'offer' ? false : null));
    if(bid == null) return;
    const bicObj = bic.getBic(newBicId);
    if (bid)
      tickets.tickets[ticketIdx].bic_bid = bicObj;
    else
      tickets.tickets[ticketIdx].bic_offer = bicObj;
  }

  function group_handler(bankDivId, ticketIdx, bid_or_offer){
    const bid = (bid_or_offer == 'bid');

    if(bid) tickets.tickets[ticketIdx].bid_bank_division_id = bankDivId;
    else tickets.tickets[ticketIdx].offer_bank_division_id = bankDivId;

    const editedOrderId = tickets.tickets[ticketIdx][bid_or_offer].order_id;

    for (let index in tickets.tickets){
      if(index == ticketIdx) continue;

      const ticket = tickets.tickets[index];

      if(ticket.bid.order_id == editedOrderId)
        tickets.tickets[index].bid_bank_division_id = bankDivId;

      else if (ticket.offer.order_id == editedOrderId)
        tickets.tickets[index].offer_bank_division_id = bankDivId;
    }
  }
  
  let years = []; // Stores unique list of years
  let prices = []; // Stores unique list of yields
  let yields = []; // Stores list yields for each ticket
  let rightsToBreak = tickets.tickets.map((t) => { return {rtb: false, breaksInvalid: false, thereafterInvalid: false}});

  $: getYears(tickets.tickets);
  function getYears () {
    years = [];
    prices = [];
    yields = [];
    for (let t of tickets.tickets) {
      yields.push(toPrice(t.price));
      if (!years.includes(t.year)) {
        years.push(t.year);
        prices.push(t.price);
      }
    }
  }

  // update the other legs of a trade when one yield is updated
  let lockedLeg = null;
  function calcSpread () {
    let spread = 0;
    if (prices.length == 1) {
      spread = prices[0];
    } else if (prices.length == 2) {
      spread = prices[1] - prices[0];
    } else if (prices.length == 3) {
      spread = 2*prices[1] - prices[0] - prices[2];
    }
    return spread;
  }

  function roundPrice (price, is_wing = false) { return roundToNearest(price, (is_wing ? 1 : 10)*1000000); }

  function handleYieldUpdate (year, price) {
    let tradesSpread = calcSpread();
    for (let i = 0; i < years.length; i++) {
      if (years[i] == year) {
        prices[i] = roundPrice(isNaN(parseFloat(price)) ? parseFloat(0) : parseFloat(price), years.length == 3 && i != 2);
        if (years.length == 2) {
          if (i == 1) prices[0] = roundPrice(prices[1] - tradesSpread);
          else if (i == 0) prices[1] = roundPrice(tradesSpread + prices[0]);
        } else if (years.length == 3) {
          if (i == 1) {
            let changeNeeded = (tradesSpread - calcSpread());
            if (lockedLeg == years[0]) {
              prices[2] = roundPrice(prices[2] - changeNeeded, true);
            } else if (lockedLeg == years[2]) {
              prices[0] = roundPrice(prices[0] - changeNeeded, true);
            } else {
              prices[0] = roundPrice(prices[0] - changeNeeded/2, true);
              prices[2] = roundPrice(prices[2] - changeNeeded/2, true);
            }
          } else if (i == 0 || i == 2) {
            if (lockedLeg == years[1]) {
              if (i == 0) {
                prices[2] = roundPrice(2*prices[1] - prices[0] - tradesSpread, true);
              } else {
                prices[0] = roundPrice(2*prices[1] - prices[2] - tradesSpread, true);
              }
            } else {
              prices[1] = roundPrice((tradesSpread + prices[0] + prices[2])/2);
            }
          }
        }
        break;
      }
    }
    for (let i = 0; i < years.length; i++) {
      for (let j = 0; j < tickets.tickets.length; j++) {
        if (tickets.tickets[j].year == years[i]) {
          tickets.tickets[j].price = prices[i];
          yields[j] = toPrice(prices[i]);
        }
      }
    }
  }

  function handleLockLeg (year) {
    if (lockedLeg == year) {
      lockedLeg = null;
    } else {
      lockedLeg = year;
    }
  }
  
  function handleBlurYield (i) {
    handleYieldUpdate(tickets.tickets[i].year, yields[i]);
  }
  
  //***** Right To Break ******
  let break_options = ["","1D","6M","1Y","2Y","3Y","4Y","5Y","6Y","7Y","8Y","9Y","10Y","11Y","12Y","15Y","20Y","25Y","30Y"];
  let thereafterOptions = ["","1D","1M", "3M", "6M","1Y","2Y","3Y","4Y","5Y","6Y","7Y","8Y","9Y","10Y"];
  // Set default right to break
  $: if (rightsToBreak.length == 0) rightsToBreak = tickets.tickets.map((t) => { return {rtb: false, breaksInvalid: false, thereafterInvalid: false}});
  $: setRTB(tickets); 
  
  function setRTB () {
    for (let i = 0; i < tickets.tickets.length; i++) {
      if (tickets.tickets[i].breaks || tickets.tickets[i].thereafter){
      // (tickets.tickets[i].breaks && tickets.tickets[i].breaks == "")) || (tickets.tickets[i].breaks && tickets.tickets[i].breaks != "") {
        rightsToBreak[i].rtb = true;
      } else if (tickets.tickets[i].breaks == null && tickets.tickets[i].thereafter == null) {
        rightsToBreak[i].rtb = false;
      } else if (!editable){
        rightsToBreak[i].rtb = false;
      }
    }
  }

  $: {
     // Validate Value right to break
    for (let i = 0; i < tickets.tickets.length; i++) {
      if (rightsToBreak[i].rtb) {
        rightsToBreak[i].breaksInvalid = (isTenor(tickets.tickets[i].thereafter) && !isTenor(tickets.tickets[i].breaks)) ? true : false;
      
        // Thereafter can be null or "" while breaks have an absolute value
        // rightsToBreak[i].thereafterInvalid = break_options.includes(tickets.tickets[i].breaks) && !thereafterOptions.includes(tickets.tickets[i].thereafter) ? true : false;
    }
  }
}

  function copyToAllLegs (i) {
    let breaks = tickets.tickets[i].breaks;
    let thereafter = tickets.tickets[i].thereafter;
    for (let i = 0; i < tickets.tickets.length; i++) {
      if (tenorToYear(breaks)[0] <= tickets.tickets[i].year) {
        tickets.tickets[i].breaks = breaks;
        tickets.tickets[i].thereafter = thereafter;
        rightsToBreak[i].rtb = true;
      }
    }
  }

  function addRemoveRTB (event, i) {
    rightsToBreak[i].rtb = event.detail;
    if (event.detail == false) {
      tickets.tickets[i].breaks = "";
      tickets.tickets[i].thereafter = "";
    }
  }
  function handleRightToBreak(e, i, type) {
  
  if (type == "breaks") {
    tickets.tickets[i].breaks = e.target.value;
    rightsToBreak[i].breaksInvalid = false;
  }
  if (type == "thereafter" ) {
    tickets.tickets[i].thereafter = e.target.value;
    rightsToBreak[i].thereafterInvalid = false;
  }
}

function setDefaultRightToBreak(e, i) {
  if (e.detail) tickets.tickets[i].rtb_handler();
}

function handleBlurBro (i, bid) {
  if (bid) {
    let bro = tickets.tickets[i].bid_brokerage;
    if (bro == '') tickets.tickets[i].bid_brokerage = null;
    else tickets.tickets[i].bid_brokerage = parseFloat(bro);
  } else {
    let bro = tickets.tickets[i].offer_brokerage;
    if (bro == '') tickets.tickets[i].offer_brokerage = null;
    else tickets.tickets[i].offer_brokerage = parseFloat(bro);
  }
}

function handlekeydownFX(event) {
  // FIXME: prevent keystroke ENTER or invalid input
  // handle invalid value
  if (!between(event.target.valueAsNumber,0,1) || event.target.value == '') {
    fxRateIsInvalid = true;
    fxRateErrorMessage = "The input value is invalid. AUDUSD is expected higher than 0 and lower than 1.";
  } 
}
  // Override fx fxRateIsInvalid
function handleBlurFX(i) {
  tickets.tickets[i].fx = parseFloat(tickets.tickets[i].fx);
}
function between (x, min, max) {
  return x>=min && x<=max;
}
$: {
  if (!fxRateIsInvalid) fxRateErrorMessage=null;
}

// Handle Index and Payment Frequency
// Leg: T -> T, 3m -> Q, 6m -> S, Y -> Y
// For example: 3m -3m IRS in AUD: productType should be AUD IRS QQ

let productName =[];
$: setPaymentFreq(openTicket);
onMount(() => {if (tickets.tickets.length !== 0 ) {setPaymentFreq ()}});

function setPaymentFreq () { // TODO: This shoud be moved to the tickets constructor
  for (let i = 0; i < tickets.tickets.length; i++) {
    if ([1,2,18,19,28, 29, 30, 31, 32].includes(tickets.tickets[i].product_id)) {
      if (tickets.tickets[i].product_id == 18) {
        // SPOT SPS90D & SPOT SPS180D have a different year setting up, limit for two options "3M" "6M" only 
        if (!tickets.tickets[i].fixed_leg) tickets.tickets[i].fixed_leg = tickets.tickets[i].year == 0.5 ?"6M" : "3M";
        if (!tickets.tickets[i].floating_leg) tickets.tickets[i].floating_leg = tickets.tickets[i].year == 0.5 ?"6M" : "3M";
        productName[i] = `SPOT SPS${tickets.tickets[i].fixed_leg == "6M" ? "180D": "90D"}`;
      } else {
        // use QQ for years <= 3, SS for years > 3
        if (!tickets.tickets[i].fixed_leg) tickets.tickets[i].fixed_leg = tickets.tickets[i].year <= 3 ? "3M" : "6M";
        if (!tickets.tickets[i].floating_leg) tickets.tickets[i].floating_leg = tickets.tickets[i].year <= 3 ? "3M" : "6M";
        productName[i] = `${products.currency(tickets.tickets[i].product_id)} ${products.name(tickets.tickets[i].product_id)} ${convertLegToTitle(tickets.tickets[i].fixed_leg)}${convertLegToTitle(tickets.tickets[i].floating_leg)}`;
      }
    }
  }
}
function handlePaymentFreq(e, i, leg) {
  if (e) {
    if (tickets.tickets[i].product_id == 18) {
      tickets.tickets[i].floating_leg = e.target.value;
      tickets.tickets[i].fixed_leg = e.target.value;
      productName[i] = `SPOT SPS${e.target.value == "6M" ? "180D": "90D"}`;
    } else {
      if (leg == "float" ) {
        tickets.tickets[i].floating_leg = e.target.value;
        productName[i] = `${products.currency(tickets.tickets[i].product_id)} ${products.name(tickets.tickets[i].product_id)} ${convertLegToTitle(tickets.tickets[i].fixed_leg)}${convertLegToTitle(tickets.tickets[i].floating_leg)}`;
      } else {
        tickets.tickets[i].fixed_leg = e.target.value;
        productName[i] = `${products.currency(tickets.tickets[i].product_id)} ${products.name(tickets.tickets[i].product_id)} ${convertLegToTitle(tickets.tickets[i].fixed_leg)}${convertLegToTitle(tickets.tickets[i].floating_leg)}`;
      }
    }
  }
}

function getSTIRFwd(ticket) {
  if (typeof ticket.fwd === "number") { return ticket.fwd * 12; }

  const today = new Date();
  const start = new Date(ticket.start_date);
  const diff = (start - today) / (1000 * 60 * 60 * 24 * 30) ;

  return Math.round(diff);
};

// OCO
let isOCO_offer;
let isOCO_bid;
$: {
  let c = $ocos;
  const checkBic = (t, bid) => {if (!t["bic_"+bid]?.bank_id) console.error(`Bank combination is unhandled in BIC rules. Error caused by ${bid}`)};
  isOCO_bid = tickets.tickets.map((t) => { checkBic(t, "bid"); return ocos.isOCO(t.bic_bid.bank_id, t.product_id) });
  isOCO_offer = tickets.tickets.map((t) => { checkBic(t, "offer"); return ocos.isOCO(t.bic_offer.bank_id, t.product_id) });
}

</script>


{#each tickets.tickets as ticket, i (i)}
  <div class="ticket ticket_view" >
    <div class="tenor-container" >
      <div style="display:flex; flex-grow: 1;">
        <p class="tenor-label" style="text-align: left; padding-right: 0; padding-left: 5px">{products.name(ticket.product_id)}{'\u2003'}{genericToTenor(ticket)}&ensp;@&ensp;</p>
        <input class="yield-input"
        type="number"
        contenteditable
        disabled={(!editable || (years.length == 1))}
        step="any"
        on:keypress={(e) => { if (e.key == "Enter") handleBlurYield(i); e.view.blur();}}
        on:blur={(e) => handleBlurYield(i)}
        bind:value={yields[i]}
        />
        {#if years.length == 3}
          {#if lockedLeg == ticket.year || !editable}
            <div class="tenor-label" on:click={() => handleLockLeg(ticket.year)}><Locked style="align-self: center; height: 100%; margin-left: 5px;"/></div>
          {:else}
            <div class="tenor-label" on:click={() => handleLockLeg(ticket.year)}><Unlocked style="align-self: center; height: 100%; margin-left: 5px;"/></div>
          {/if}
        {/if}
      </div>
      {#if editable}
        <Sef bind:ticket={ticket} disabled={!editable}/>
      {:else}
        <p class="tenor-label" style="width: fit-content; padding-right: 5px;">{ticket.sef ? "ON SEF": "OFF SEF"}{'\u2003'}{ticket.clearhouse}</p>
      {/if}
    </div>
    <div class="sef-container" />
    <dl>
      <div class="bos-container">
        <div class="hdr-container">
          <h6 class="left-col ob-label">Offer</h6>
          <h6 class="right-col ob-label">Bid</h6>
        </div>

        <div class="bo-container bo-header">
                                                   <!-- OFFER -->
          <div class="left-col" style="padding-bottom: 0;">
            <div style="display: flex; padding-bottom: 8px; border-bottom: 1px dashed #aaaaaa;">
              <div style="width: 35%; align-self: center; padding-left: 8px;">
                <strong>Group</strong>
              </div>
              <div class="lightSelect" style="width: 65%">
                <Select 
                  selected={ticket.offer_bank_division_id} 
                  on:update={e => group_handler(e.detail, i, 'offer')}
                  disabled={!editable}>
                  {#each bank_divisions.getBankDivisions(bank_divisions.get(ticket.offer_bank_division_id).bank_id) as bank_div}
                    <SelectItem value={bank_div.bank_division_id} text={bank_div.name}/>
                  {/each}
                </Select>
              </div>
            </div>
                <!-- BIC Offer-side -->
            <div style="display: flex; padding-bottom: 8px; {products.isFuturesProd(tickets.tickets[0].product_id) ? "border-bottom: 1px dashed #aaaaaa;" : ""}">
              <div style="width: 35%; align-self: center; padding-left: 8px;">
                <strong>Bic</strong>
              </div>
              <div class="lightSelect" style="width: 65%">
                <Select 
                  selected={ticket.bic_offer.id} 
                  on:update={e => bic_handler(e.detail, i, 'offer')}
                  disabled={!editable}>
                  {#each bic.getBankBics(ticket.bic_offer.bank_id) as bank_bic}
                    <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
                  {/each}
                </Select>
              </div>
            </div>
            {#if products.isFuturesProd(tickets.tickets[0].product_id)}
              <div style="display: flex;">
                <div style="width: 35%; align-self: center; padding-left: 8px;">
                  <strong>FutAccount</strong>
                </div>
                <div class="fut_account" style="width: 65%">
                  <TextInput
                    bind:value={tickets.tickets[i].offer_fut_acc}
                    disabled={!editable}
                  />
                </div>
              </div>
            {/if}
          </div>
                                                    <!-- BID -->
          <div class="right-col" style="padding-bottom: 0;">
            <div style="display: flex; padding-bottom: 8px; border-bottom: 1px dashed #aaaaaa;">
              <div style="width: 35%; align-self: center; padding-left: 8px;">
                <strong>Group</strong>
              </div>
              <div class="lightSelect" style="width: 65%">
                <Select 
                  selected={ticket.bid_bank_division_id} 
                  on:update={e => group_handler(e.detail, i, 'bid')}
                  disabled={!editable}>
                  {#each bank_divisions.getBankDivisions(bank_divisions.get(ticket.bid_bank_division_id).bank_id) as bank_div}
                    <SelectItem value={bank_div.bank_division_id} text={bank_div.name}/>
                  {/each}
                </Select>
              </div>
            </div>
            <div style="display: flex; padding-bottom: 8px; {products.isFuturesProd(tickets.tickets[0].product_id) ? "border-bottom: 1px dashed #aaaaaa;" : ""}">
              <div style="width: 35%; align-self: center; padding-left: 8px;">
                <!-- BIC Bid-side -->  
                <strong>Bic</strong> 
              </div>
              <div class="lightSelect" style="width: 65%">
                <Select 
                  selected={ticket.bic_bid.id} 
                  on:update={e => bic_handler(e.detail, i, 'bid')}
                  disabled={!editable}>
                  {#each bic.getBankBics(ticket.bic_bid.bank_id) as bank_bic}
                    <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
                  {/each}
                </Select>
              </div>
            </div>
            {#if products.isFuturesProd(tickets.tickets[0].product_id)}
              <div style="display: flex;">
                <div style="width: 35%; align-self: center; padding-left: 8px;">
                  <strong>FutAccount</strong>
                </div>
                <div class="fut_account" style="width: 65%">
                  <TextInput
                    bind:value={tickets.tickets[i].bid_fut_acc}
                    disabled={!editable}
                  />
                </div>
              </div>
            {/if}
          </div>
        </div>

        <div class="tot-vols-container">
          <div class="left-col">
            <dt>Volume</dt>
            <dd>{toVolume(ticket.volume)}</dd>

            {#if products.isFuturesProd(tickets.tickets[0].product_id)}
              <dt>Futures Price</dt>
              <dd>{ticket.fut_strike.toFixed(4)}</dd>
              <dt>Yield</dt>
              <dd>{(100 - ticket.fut_strike + ticket.price/100).toFixed(4)}</dd>
            {/if}

            {#if ticket.lots != null}
              <dt>Lots</dt>
              <dd>{ticket.lots}</dd>
            {/if}

            {#if ticket.offer_brokerage != null}
              <dt>Brokerage</dt>
              <dd><input
                type="number"
                id="brokerage"
                class="bro-input"
                contenteditable
                disabled={!editable}
                step="any"
                on:blur={() => handleBlurBro(i, false)}
                on:keypress={(e) => { if (e.key == "Enter") {handleBlurBro(i, false); e.view.blur()}}}
                bind:value={ticket.offer_brokerage}/></dd>
            {/if}
          </div>

          <div class="right-col">
            <dt>Volume</dt>
            <dd>{toVolume(ticket.volume)}</dd>

            {#if tickets.tickets[0].product_id == 2 || tickets.tickets[0].product_id == 17}
              <dt>Futures Price</dt>
              <dd>{ticket.fut_strike.toFixed(4)}</dd>
              <dt>Yield</dt>
              <dd>{(100 - ticket.fut_strike + ticket.price/100).toFixed(4)}</dd>
            {/if}

            {#if ticket.lots != null}
              <dt>Lots</dt>
              <dd>{ticket.lots}</dd>
            {/if}

            {#if ticket.bid_brokerage != null}
              <dt>Brokerage</dt>
              <dd><input
                type="number"
                id="brokerage"
                class="bro-input"
                contenteditable
                disabled={!editable}
                step="any"
                on:blur={() => handleBlurBro(i, true)}
                on:keypress={(e) => { if (e.key == "Enter") {handleBlurBro(i, true); e.view.blur()}}}
                bind:value={ticket.bid_brokerage}/></dd>
            {/if}
          </div>
        </div>
        <!--FX RATE -->
        {#if isCrossCurrency}
          <div class="fx">
              <div class="index-freq" style="flex-direction: row;
            background-color: var(--cds-ui-03);  justify-content: center; align-items: center;
            display: flex; padding-bottom: 2px;">
              <dt>FX Rate &nbsp &nbsp</dt>
            </div>
            <div style="display: flex;">
              <dt style="align-self: center;">{products.currency(active_prod)}USD</dt>
              <dd style="margin-left: 5%;">
                <input
                  type="number"
                  id="fx-rate"
                  class="fx-input"
                  contenteditable
                  disabled={false}
                  step="any"
                  on:blur={() => handleBlurFX(i)}
                  on:keydown={handlekeydownFX}
                  on:keypress={(e) => { if (e.key == "Enter") {handleBlurFX(i); e.view.blur()}}}
                  bind:value={ticket.fx}/>
              </dd>
            </div>
            <!-- VOL IN USD -->
            <div  style="display: flex;">
              <dt style="align-self: center;">Trade volume in USD</dt>
              <dd style="margin-left: 5%;">
                <input
                  type="number"
                  id="vol-in-usd"
                  class="fx-input vol-usd-input"
                  disabled={true}
                  value={(ticket.fx *ticket.volume).toFixed(6)}/>
              </dd>
            </div>
          </div>
        {/if}

        <!-- Start Right To Break -->
        <div class="rtb">
          <div style="display: flex;">
            <dt style="align-self: center;">Right To Break</dt>
            <dd style="margin-left: 30px;"><Checkbox checked={rightsToBreak[i].rtb} on:check={(e) => {setDefaultRightToBreak(e, i);addRemoveRTB(e, i)}} disabled={!editable}/></dd>
          </div>
          {#if rightsToBreak[i].rtb}
            <div style="display: flex;">
              <Select
                labelText="Breaks"
                selected={ticket.breaks} 
                invalid={rightsToBreak[i].breaksInvalid}
                on:change={e => handleRightToBreak(e, i,"breaks")}
                required 
                disabled={!editable}>
                <!-- <SelectItem text="-" value={""} hidden/> -->
                {#each break_options as option}
                  {#if tenorToYear(option)[0] <= ticket.year}
                    <SelectItem value={option} text={option === "" ? "-" : option}/>
                  {/if}
                {/each}
              </Select>
              <Select
                labelText="Thereafter"
                bind:selected={ticket.thereafter}
                bind:invalid={rightsToBreak[i].thereafterInvalid}
                required
                disabled={!editable}>
                <!-- <SelectItem text="-" value={""} hidden/> -->
                {#each thereafterOptions as option}
                  <SelectItem value={option} text={option === "" ? "-" : option}/>
                {/each}
              </Select>
            </div>
            <div style="height: 5px;"></div>
            <button class="rtb-button" type="button" style="background-color: {editable ? "#0F62FE" : "#525252"};" on:click={() => copyToAllLegs(i)} disabled={!editable} enabled><strong>Copy To All Legs</strong></button>
          {/if}
        </div>
        <!-- End Right To Break -->

         <!-- Start Index - PayFreq For AUD (IRS, EFP, FWD IRS), USD products only-->
        {#if ([1,2,18,19, 28, 29,30,31,32].includes(ticket.product_id))}
        <div style="display: flex; flex-direction: column;">
          <!-- Title -->
          <div class="index-freq" style="flex-direction: row;
          background-color: var(--cds-ui-03);  justify-content: center; align-items: center;
          border-top: 1px dashed #aaaaaa;
          display: flex;  gap: 2px; padding-bottom: 2px;">
        
            <dt>Reset & Payment Frequency: &nbsp &nbsp {productName[i]}</dt>
          </div>
          <!-- legs' details -->
          <div class="index-freq" style="margin-top: 5px; flex-direction: row;
          background-color: var(--cds-ui-03);  justify-content: center; align-items: center;
          border-top: 1px dashed #aaaaaa;
          display: flex;  gap: 2px; padding-top: 2px; padding-bottom: 2px;">
            <div class="left-col">
              <dt style="padding-top: 7px;">Fixed Leg: &nbsp &nbsp</dt>
            
              <div class="lightSelect">
              <!-- Payment Frequency IRS/EFP Group Only-->
                  <Select
                  selected={ticket.fixed_leg}
                  on:change={e =>handlePaymentFreq(e, i, "fixed")}
                  required
                  disabled={!editable}>
                  {#if (ticket.product_id == 18)}
                    <SelectItem value={"3M"} text={"3M"}/>
                    <SelectItem value={"6M"} text={"6M"}/>
                  {:else}
                    <SelectItem value={"1T"} text={"1T"}/>
                    <SelectItem value={"3M"} text={"3M"}/>
                    <SelectItem value={"6M"} text={"6M"}/>
                    <SelectItem value={"1Y"} text={"1Y"}/>
                  {/if}   
                  </Select>
              </div>
            </div>

            <div class="right-col" >
              <dt  style="padding-top: 7px;">Floating Leg: &nbsp &nbsp </dt>
                <div class="lightSelect">
                <!-- Payment Frequency IRS/EFP Group Only-->
                    <Select
                    selected={ticket.floating_leg}
                    on:change={e =>handlePaymentFreq(e, i, "float")}
                    required
                    disabled={!editable}>
                    {#if (ticket.product_id == 18)}
                      <SelectItem value={"3M"} text={"3M"}/>
                      <SelectItem value={"6M"} text={"6M"}/>
                    {:else}
                      <SelectItem value={"1T"} text={"1T"}/>
                      <SelectItem value={"3M"} text={"3M"}/>
                      <SelectItem value={"6M"} text={"6M"}/>
                      <SelectItem value={"1Y"} text={"1Y"}/>
                    {/if}          
                    </Select>
                  </div>
            </div>
          </div>    
        </div>
        {/if}
      <!-- End Index - PayFreq -->
      
      <!-- {#if ticket.fwd != null} -->
        <div class="start-container">
          <div style="display:flex;">
            <dt style="align-self: center;">Start Date</dt>
            <dd style="margin-left: 65px;">{timestampToISODate(ticket.start_date)}</dd>
          </div>
        </div>
      <!-- {/if} -->

      <!-- VCON SENDER'S UUID -->
      {#if products.isFuturesProd(ticket.product_id)}
      <div style="margin-top: 5px; flex-direction: row;
      background-color: var(--cds-ui-03);  justify-content: center; align-items: center;
      border-top: 1px dashed #aaaaaa;
      display: flex;  padding-top: 8px; padding-bottom: 8px;">
        <div style="width: 100%">
          <dt style="padding-right: 8px;">VCON Sender's UUID:</dt>
          <div class="vconSelector">
            <Select noLabel={true} bind:selected={tickets.tickets[i].vconSender} disabled={!editable}>
              {#each brokers.getVCONAccounts() as sender}
                <SelectItem value={sender.vcon_account} text={`${sender.name} - ${sender.vcon_account}`}/>
              {/each}
            </Select>
          </div>
        </div>
      </div>
      {/if}
      <!-- END OF VCON SENDER'S UUID -->
    </dl>
  </div>
  <div style="display:flex; color:var(--cds-text-03);flex-direction: column; padding-top: 5px;">
   
    <div style="width: 50%;">
      <dt style="padding:1px 0.5rem 0px 3px;"><EventSchedule style="vertical-align:middle; margin-bottom:2px;"/>&nbsp;&nbsp;Execution&nbsp;Time:</dt>
      <dd>{timestampToDateTime(ticket.timestamp)}</dd>
    </div>
  </div>
  <br />
{/each}

<style>
  .sef-container {
    float: right;
    margin-bottom: 3px;
  }
  .bo-header {
    background-color: var(--cds-ui-03);
    display: flex;
    font-size: 1.1em;
  }
  .ticket {
    width: 100%;
    border: 2px solid #aaaaaa;
  }
  .tenor-container {
    border-bottom: 2px solid #aaaaaa;
    background-color: var(--cds-decorative-01);
    display: flex;
  }
  .tenor-label {
    font-weight: bold;
    font-size: 1.2em;
    white-space: nowrap;
  }
  .ob-label {
    text-align: center;
    padding-bottom: 0 !important;
    border-bottom: 1px dashed #aaaaaa;
    padding-right: 0 !important;
  }
  .bos-container {
    width: 100%;
  }
  .bo-container {
    display: flex;
    border-bottom: 1px dashed #aaaaaa;
  }
  .hdr-container {
    width: 100%;
    display: flex;
  }
  .tot-vols-container {
    width: 100%;
    display: flex;
  }
  .start-container {
    width: 100%;
    border-top: 1px dashed #aaaaaa;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .left-col {
    width: 50%;
    padding-bottom: 8px;
    padding-top: 2px;
  }
  .right-col {
    width: 50%;
    border-left: 1px dashed #aaaaaa;
    padding-bottom: 8px;
    padding-top: 2px;
  }
  :global(.ticket_view dt) {
    white-space: nowrap;
    font-weight: bold;
    float: left;
    clear: left;
    margin-left: 0.5rem;
  }
  :global(.ticket_view dd) {
    white-space: nowrap;
    margin-left: 150px;
  }
  :global(.highlight-vol) {
    background-color: rgb(170, 110, 110);
  }
  .yield-input {
    font-weight: bold;
    font-size: 1.2em;
    border: 0;
    background-color: var(--cds-decorative-01);
    color: #F4F4F4;
    width: 35%;
  }
  .bro-input {
    border: 0;
    background-color: #262626;
    width: 100%;
    font-size: 15.5px;
    color: #F4F4F4;
    margin: 0;
    padding: 0;
  }
  .fx {
    border-top: 1px dashed #aaaaaa;
    text-align: center;
    padding-top: 5px;
    padding-bottom: 5px;
  }
  .fx-input{
    border: 0;
    background-color: #262626;
    width: 100%;
    font-size: 15.5px;
    color: #F4F4F4;
    margin: 0;
    padding: 0;
  }
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
      -webkit-appearance: none;
  }
  .rtb {
    border-top: 1px dashed #aaaaaa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-bottom: 3px;
  }
  .rtb-button{
    color: #FFFFFF;
    text-align: center;
  }
  :global(.rtb .bx--select-input:disabled) {
    color: #F4F4F4;
  }
  :global(.fut_account .bx--text-input:disabled) {
    -webkit-text-fill-color: #F4F4F4;
    background-color: #393939;
  }
  :global(.lightSelect .bx--select-input:disabled) {
    color: #F4F4F4;
    background-color: #393939;
  }
  :global(.index-freq .lightSelect .bx--select-input__wrapper ) {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  :global(.index-freq .lightSelect .bx--select-input) {
    background-color: #616161;
  }
  :global(.vconSelector .bx--select-input) {
    height: 24px;
  }
  :global(.vconSelector .bx--select-input:disabled) {
    color: #F4F4F4;
  }
</style>
