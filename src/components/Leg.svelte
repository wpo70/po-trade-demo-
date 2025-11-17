<script>
import Marked from "./Marked.svelte";
import {
  toTenor,
  bidToString,
  toPrice,
  toVolumeString,
  toBPPrice,
  toRBATenor,
  removeTrailZero
} from "../common/formatting.js";
import traders from "../stores/traders.js";
import FastTrade from "./FastTrade.svelte";
import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();

export let order;
export let ctxMenuTarget = null;
export let isInterest = false;

let year_ft = order.years;
let bid_ft = order.bid;
let price_ft = order.price;
let vol_ft = order.volume;
let firm_ft = order.firm;
let order_ft = order;
let lastname = traders.get(order.trader_id).lastname;
let order_is_old = true;
if (traders.name(order.trader_id).split(" ")[0] == "Trader"){
  lastname = traders.name(order.trader_id);
}

$: {
  order_ft = order;
  price_ft = order.price;
  vol_ft = order.volume;
  order_is_old = new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0);
}

</script>
{#if price_ft == null}
  <div class="leg">
    {#if order.bid}
      Interest to Pay
    {:else}
      Interest to Rec
    {/if}
    &nbsp
    {order.product_id == 20 ? toRBATenor(order.years) : toTenor(order.years)}
    &nbsp
    {traders.bankName(order.trader_id)}
    {lastname}
  </div>
{:else}
  <div class="leg">
    {#if !isInterest}
      {#if order.bid}
        Give
      {:else}
        Take
      {/if}
    {:else}
      {#if order.bid}
        Interest to Pay
      {:else}
        Interest to Rec
      {/if}
    {/if}
    {order.product_id == 20 ? toRBATenor(order.years) : toTenor(order.years)}
    {bidToString(order.bid)}
    {#if !isInterest}
      <Marked mark={order.priceIsGood()}>{(order.product_id == 1 || order.product_id == 3 || order.product_id == 20) && order.years.length != 1 ? removeTrailZero(toBPPrice(order.price)) : removeTrailZero(toPrice(order.price))}</Marked>
      {order_is_old ? '❄️' : order.firm ? "" : "⛔"}{order.isBelowMMP() ? "⚠️" : ""}
    {/if}
    {toVolumeString(order.volume)}
    {traders.bankName(order.trader_id)}
    {lastname}
  </div>

  {#if order.trader_id == 0}

  <FastTrade {year_ft} {bid_ft} {firm_ft} {price_ft} {vol_ft} {order_ft} product_id={order.product_id} {ctxMenuTarget}
              canDelete={true} on:close={() => dispatch('close')}/>
  {/if}
{/if}
<style>
.leg {
  height: 32px;
  padding-top: 6px;
  padding-left: 6px;
  padding-right: 6px;
  white-space: nowrap;
  border-bottom: 2px solid white;
  text-align: center;
}
</style>