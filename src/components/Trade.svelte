<script>
'use strict';

import { createEventDispatcher } from 'svelte';

import TradeOrder from './TradeOrder.svelte';

import { genericToTenor, roundToNearest, toEFPSPSTenor, toPrice, toRBATenor, toTenor, toVolumeString } from '../common/formatting.js';

import active_product from '../stores/active_product.js';
import currency_state from '../stores/currency_state.js';
import products from '../stores/products';
import Locked from "carbon-icons-svelte/lib/Locked.svelte";
import Unlocked from "carbon-icons-svelte/lib/Unlocked.svelte";

export let trade;
export let reviewExists = false;
export let locked;
export let size;

let dispatch = createEventDispatcher();

// ADD SUB Bank Division Validation for any bank match with NOM sub division
trade.validateBankDivision();

let num_rows = Math.max(trade.offers.length, trade.bids.length);

let offer_vol_is_greater;
let bid_vol_is_greater;

$: {
  let offer_tot_vol = trade.getTotalOfferVolume();
  let bid_tot_vol = trade.getTotalBidVolume();
  let dif = Math.abs(offer_tot_vol - bid_tot_vol);

  if (offer_tot_vol > bid_tot_vol && dif >= 1) {
    offer_vol_is_greater = true;
    bid_vol_is_greater = false;
  } else if (offer_tot_vol < bid_tot_vol && dif >= 1) {
    offer_vol_is_greater = false;
    bid_vol_is_greater = true;
  } else {
    offer_vol_is_greater = false;
    bid_vol_is_greater = false;
  }
}

const getSTIRFwd = (orders) => {
  const fwdOrder = orders.find(order => {
    return order.fwd != null;
  });

  if(fwdOrder) return fwdOrder.fwd * 12;

  // if neither of the orders had a fwd, round down the difference between the start date and today

  const order = orders[0];

  const today = new Date();
  const start = new Date(order.start_date);
  const diff = (start - today) / (1000 * 60 * 60 * 24 * 30) ;

  return Math.round(diff);
};

let _yield = toPrice(trade.price);
function handleBlurYield () {
  _yield = toPrice(roundToNearest(parseFloat(_yield), 5000000));
  dispatch("yieldUpdate", {yield: _yield, year: trade.year});
}
</script>

<div class="ticket">
  {#if products.isStir(trade.offers[0].product_id ?? $active_product) || products.isFwd(trade.offers[0].product_id ?? $active_product)}
    <div style="display: flex; width: 100%">
      <p class="tenor-label" style="padding-left: 2%; padding-right: 0% !important">
        {products.name(trade.offers[0].product_id)}
        {'\u2003'}
        {genericToTenor(Object.assign({product_id:trade.offers[0].product_id, fwd:trade.offers[0].fwd, start_date:trade.offers[0].start_date}, trade))}
        &ensp;@&ensp;
        {toPrice(trade.price)}
      </p>
      <p class="tenor-label" style="text-align: right; flex-grow: 1; padding-right: 2%;">{$currency_state}</p>
    </div>
  {:else}
    <div style="display: flex; width: 100%">
      <p class="tenor-label" style="padding-left: 2%; padding-right: 0% !important">{products.name(trade.offers[0].product_id)}{'\u2003'}{trade.offers[0].product_id == 20 ? toRBATenor([trade.year]) : toTenor(trade.year)}&ensp;@&ensp;</p>
      <input class="yield-input"
          type="number"
          contenteditable
          disabled={reviewExists || locked}
          step="any"
          on:blur={handleBlurYield}
          on:keypress={(e) => { if (e.key == "Enter") {handleBlurYield(); e.view.blur()}}}
          bind:value={_yield}
          />
      {#if size == 3}
        {#if locked || reviewExists}
          <div class="tenor-label" on:click={() => dispatch("lockLeg", {year: trade.year})}><Locked style="align-self: center; height: 100%;"/></div>
        {:else}
          <div class="tenor-label" on:click={() => dispatch("lockLeg", {year: trade.year})}><Unlocked style="align-self: center; height: 100%;"/></div>
        {/if}
      {/if}
      <p class="tenor-label" style="text-align: right; width: 50%; padding-right: 2%;">{$currency_state}</p>
    </div>
  {/if}
  <dl>
    <div class="bos-container">
      <div class="hdr-container">
        <p class="left-col ob-label">{trade.offers.length > 1 ? 'Offers' : 'Offer'}</p>
        <p class="right-col ob-label">{trade.bids.length > 1 ? 'Bids' : 'Bid'}</p>
      </div>

      {#each {length: num_rows} as _, idx}
        <div class="bo-container">
          <div class="left-col">
          {#if trade.offers[idx]}
            <TradeOrder 
              bind:trade={trade} 
              order={trade.offers[idx]}
              bid={false}
              bind:reviewExists={reviewExists}
              on:broUpdate={(e) => dispatch('broUpdate', {order_id: e.detail.order_id, brokerage: e.detail.brokerage, bid: false, year: trade.year})}
              on:bankDivisionUpdate={(e) => dispatch('bankDivisionUpdate', {order_id: e.detail.order_id, bank_div: e.detail.bank_div})}
            />
          {/if}
          </div>

          <div class="right-col">
            {#if trade.bids[idx]}
              <TradeOrder 
                trade={trade} 
                order={trade.bids[idx]}
                bid={true}
                bind:reviewExists={reviewExists}
                on:broUpdate={(e) => dispatch('broUpdate', {order_id: e.detail.order_id, brokerage: e.detail.brokerage, bid: true, year: trade.year})}
                on:bankDivisionUpdate={(e) => dispatch('bankDivisionUpdate', {order_id: e.detail.order_id, bank_div: e.detail.bank_div})}
              />
            {/if}
          </div>
        </div>
      {/each}

      <div class="tot-vols-container">
        <div class="left-col">
          {#if trade.offers.length > 1}
            <dt>&nbsp Total Volume</dt>
            <dd>{toVolumeString(trade.getTotalOfferVolume())}</dd>
          {/if}
        </div>

        <div class="right-col">
          {#if trade.bids.length > 1}
            <dt>&nbsp Total Volume</dt>
            <dd>{toVolumeString(trade.getTotalBidVolume())}</dd>
          {/if}
        </div>
      </div>

      <div class="trade-vol">
        <p><strong>Trade Volume</strong> &nbsp {toVolumeString(trade.volume)}</p>
      </div>
    </div>
  </dl>
</div>

<style>
.ticket {
  width: 100%;
  border: 2px solid #aaaaaa;
}
.tenor-label {
  font-weight: bold;
  font-size: 1.2em;
  border-bottom: 2px solid #aaaaaa;
  background-color: var(--cds-decorative-01);
  white-space: nowrap;
}
.yield-input {
  font-weight: bold;
  font-size: 1.2em;
  border-top: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 2px solid #aaaaaa;
  background-color: var(--cds-decorative-01);
  /* white-space: nowrap; */
  color: #F4F4F4;
  width: 24%;
}
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
    -webkit-appearance: none;
}
.ob-label {
  text-align: center;
  border-bottom: 1px dashed #aaaaaa;
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
.left-col {
  width: 50%;
}
.right-col {
  width: 50%;
  border-left: 1px dashed #aaaaaa;
}
.trade-vol {
  text-align: center;
}
:global(dt) {
  white-space: nowrap;
  font-weight: bold;
  float: left;
  clear: left;
  font-size: 16px;
}
:global(dd) {
  white-space: nowrap;
  margin-left: 130px;
  font-size: 16px;
}
</style>