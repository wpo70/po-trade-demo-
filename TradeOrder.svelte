<script>
'use strict';

import { Checkbox, Select, SelectItem } from 'carbon-components-svelte';

import traders from '../stores/traders.js';
import quotes from '../stores/quotes.js';
import bank_divisions from '../stores/bank_divisions.js';
import { toVolumeString, toBrokerage } from '../common/formatting.js';
import websocket from '../common/websocket.js';
import currency_state from '../stores/currency_state.js';
import { createEventDispatcher } from 'svelte';
import ticker from '../stores/ticker.js';
import orders from '../stores/orders.js';
import brokers from '../stores/brokers.js';
import trade_reviews from '../stores/trade_reviews.js';
import { calcLots } from '../common/calculations.js';

export let trade; 
export let order;
export let bid;
export let reviewExists = false;

let futPrice;
let efpYield;
let lots;
setFutures();

function setFutures () {
  if (!reviewExists){
    if (order.product_id == 2) {
      if (trade.year <= 5) futPrice = (ticker.getYMA()?.ask ?? 0).toFixed(4);
      else futPrice = (ticker.getXMA()?.ask ?? 0).toFixed(4);
      efpYield = (100 - futPrice + trade.price/100).toFixed(4);
      lots = calcLots(order.volumeAtYear(trade.year), order.product_id, trade.year);
    } else if (order.product_id == 17) {
      futPrice = (ticker.getEFPStrike(new Date(order.start_date)).ask ?? 0).toFixed(4);
      efpYield = (100 - futPrice + trade.price/100).toFixed(4);
      lots = calcLots(order.volumeAtYear(trade.year), order.product_id, trade.year);
    }
  } else if (order.product_id == 2 || order.product_id == 17) {
    let trade_review = trade_reviews.getFromTrade(trade);
    if (trade_review && trade_review.trade_data && trade_review.trade_data.tickets && trade_review.trade_data.tickets.length != 0) {
      let tickets = trade_review.trade_data.tickets;
      for (let ticket of tickets) {
        if (ticket.year == trade.year) {
          futPrice = ticket.fut_strike;
          efpYield = (100 - futPrice + trade.price/100).toFixed(4);
          lots = ticket.lots;
          break;
        }
      }
    }
  }
}

$: setFutures($ticker, reviewExists);

let dispatch = createEventDispatcher();

// Order specific information
let selected_bank_division_id = trade.getBankDivision(order.order_id);

function bank_div_handler (e) {
  selected_bank_division_id = e.detail;
  trade.setBankDivision(order.order_id, selected_bank_division_id);
  dispatch("bankDivisionUpdate", {order_id: order.order_id, bank_div: selected_bank_division_id});
};

let bank 
$:{
  let b = $brokers;
  bank = traders.bankName(order.trader_id);
}
let trader = traders.get(order.trader_id);

let trader_name;
$: if (traders.name(order.trader_id).split(" ")[0] == "Trader"){
  let b = $brokers;
  trader_name = traders.name(order.trader_id);
} else {
  trader_name = trader.lastname === '' ? trader.firstname : trader.lastname;
}
let trader_bank_divisions = bank_divisions.getBankDivisions(trader.bank_id);
let brokerage = trade.getBrokerage(order.order_id, bid);
$: volume = trade.getOrderVolume(order.order_id, bid);

$: checkForBrokerage(trade.bid_brokerage, trade.offer_brokerage);

function checkForBrokerage () {
  let bro = trade.getBrokerage(order.order_id, bid);
  if (bro != null) {
    brokerage = bro;
  }
}

function overrideVol() {
  handleVolOverride(this.textContent);
}
function handleVolKeyPress(event) {
  // Enter is keyCode 13
  if (event.keyCode === 13) {
    handleVolOverride(this.textContent);
    event.preventDefault();
  }
}
function handleVolOverride(text) {
  // ignore non-numerical entries
  var ovr = parseFloat(text);
  if (isNaN(ovr) || ovr <= 0) {
    return;
  }

  // Update the order's volume

  let vol = getOrderVol(ovr);
  websocket.submitOrder({order_id: order.order_id, product_id: order.product_id, volume: vol}, true);
}

function getOrderVol(ovr) {
  if (order.isOutright()
  || order.isSpread() && order.spreadLeg(trade.year) === 'long'
  || order.isButterfly() && order.butterflyLeg(trade.year) === 'body') {
    return ovr;
  }

  let at_year = order.years[1];
  let vol = quotes.volumeAt(order.product_id, at_year, ovr, trade.year, $currency_state);

  if (order.isButterfly()) vol *= 2;

  return vol;
}

function handleBlurBro () {
  brokerage = toBrokerage(parseFloat(brokerage));
  dispatch("broUpdate", {brokerage: parseFloat(brokerage), order_id: order.order_id});
}
</script>

<div class="bo-header">
  <p class="bank-trader">&nbsp{bank} ({trader_name})</p>
</div>
<div class="bank-cpty">
  <div class="bank-div">
    <div style="padding-top:10px">&nbsp <strong>Group</strong> &nbsp</div>
    <div style="width: 70%;">
      <Select
        disabled={reviewExists} 
        selected={selected_bank_division_id} 
        on:update={bank_div_handler}>
        {#each trader_bank_divisions as bank_div}
          <SelectItem value={bank_div.bank_division_id} text={bank_div.name}/>
        {/each}
      </Select>
    </div>
  </div>
</div>

<div>
  <dt >&nbsp Order Volume {order.isBelowMMP() ? ' ⚠️' : ''}</dt>
  <dd 
    style="padding-left: 1px;"
    id="volume"
    class="editable"
    contenteditable={!reviewExists}
    on:blur={overrideVol}
    on:keypress={handleVolKeyPress}
  >
    {toVolumeString(volume)}
  </dd>

  {#if order.product_id == 2 || order.product_id == 17}
    <dt>&nbsp Futures Price</dt>
    <dd>{futPrice}</dd>
    <dt>&nbsp Yield</dt>
    <dd>{efpYield}</dd>
  {/if}
  
  {#if lots != null}
    <dt>&nbsp Lots</dt>
    <dd>{lots}</dd>
  {/if}
  
  {#if brokerage !== null}
    <dt>&nbsp Brokerage</dt>
    <dd><input
      type="number"
      id="brokerage"
      class="bro-input"
      disabled={reviewExists}
      step="any"
      on:blur={handleBlurBro}
      on:keypress={(e) => { if (e.key == "Enter") {handleBlurBro(); e.view.blur()}}}
      bind:value={brokerage}/></dd>
  {/if}
</div>


<style>
  .bro-input {
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
.bo-header {
  background-color: var(--cds-ui-03);
  display: flex;
}

:global(dd) {
  white-space: nowrap;
  margin-left: 120px;
}
:global(div.bx--form.item) {
  height: 32px;
}
:global(div.bx--select-input__wrapper) {
  height: 24px;
  position:relative;
}
:global(select.bx--select-input) {
  height: 32px;
}
:global(option.bx--select-option) {
  height: 32px;
  margin-bottom: 5px;
}

.bank-cpty{
  padding-top: 5px;
  padding-bottom: 5px;
  font-size: 16px;
  display: flex;
  flex-direction: column;

}
.bank-div {
  padding-left: 5px;
  display: flex;
}
:global(.bank-div .bx--select-input:disabled) {
  color: #F4F4F4;
  background-color: #262626;
}
</style>
