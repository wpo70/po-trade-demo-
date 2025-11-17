<script>
  import { createEventDispatcher } from 'svelte';
  import EditableLeg from './EditableLeg.svelte';
import Leg from './Leg.svelte';
import FastTrade from './FastTrade.svelte';
import { clickOutside } from '../common/click_outside.js';
import { addDays, addMonths, toTenor, yearsToSortCode, toRBATenor, toEFPSPSTenor, timestampToISODate } from '../common/formatting.js';
import prices from '../stores/prices';
import filters from '../stores/filters';
import products from '../stores/products';

const dispatch = createEventDispatcher();

let ctxMenuTarget = null;

export let price;
export let open_dv = false;

const isInterest = price?.eoi;

let year_ft;
let bid_ft;
let price_ft;
let vol_ft;
let firm_ft;
let order_ft;

$: setVals(price);
function setVals() {
  if(isInterest){
    year_ft = price.years;
    bid_ft = price.bid;
    firm_ft = false;
    order_ft = price;
    price_ft = price.price;
    vol_ft = null;
  } else {
    let order = price.links.at(-1);
    year_ft = order.years;
    bid_ft = order.bid;
    price_ft = order.price;
    vol_ft = order.volume.toFixed(2);
    firm_ft = order.firm;
    order_ft = order;
  }
}

function findAndUpdatePrice(list){
  for (const p of list){
    if (p.order_id === price.order_id && price != p){
        price = p;
        break;
    }
  }
}

$: {
  let check = $prices[price.product_id];
  if(!isInterest){
    const list = prices.derivedFromAll(price.links)
    findAndUpdatePrice(list);
    price_ft = price.links[0].price;
    vol_ft = price.links[0].volume.toFixed(2);
  } else {
    let shape = price.years.length - 1;
    const direction = price.bid ? 'bids' : 'offers';
    const productId = price.product_id;

    let tenor;
    if(productId == 17 || productId == 27){ // EFP SPS
      tenor = toEFPSPSTenor(price.start_date);
    } else if(products.isFwd(productId)) { // FWDs
      tenor = toTenor(price.fwd) + toTenor(price.years);
    } else if(productId == 18) {  // SPS
      if(price.start_date != null){
        const today = new Date();
        shape = (new Date(price.start_date).getFullYear() - today.getFullYear()) * 12 + (new Date(price.start_date).getMonth() - today.getMonth());
        tenor = timestampToISODate(price.start_date);
      } else {
        let currentDate = new Date();
        shape = price.fwd * 12;
        tenor = timestampToISODate(addDays(addMonths(currentDate, (price.fwd * 12)), 1));
      }
    } else if(productId == 20 ){ // RBAOIS
      tenor = toRBATenor(price.years, price.start_date);
    } else {  // Standard product
      tenor = toTenor(price.years);
    }

    let tenorRow;
    for(const [idx, row] of $prices[productId][shape].entries()){
      if(row.tenor === tenor){
        tenorRow = idx;
      }
    }

    const list = $prices[productId][shape][tenorRow][direction].filter(item => item.eoi);
    findAndUpdatePrice(list);

    price_ft = price.price;
    vol_ft = price.volume;
  }
  setVals();
}

$: {
  if(!isInterest){
    price.links.sort(function(a, b) {
      return yearsToSortCode(a.years) - yearsToSortCode(b.years);
    });
  }
}

$: if (filters.shouldFilterOrder(price, price.links?.length > 1)) dispatch("close");

function refresh(e) {
  open_dv = e.detail.open_dv;
  price = price;
}
</script>

<div class="legs" use:clickOutside on:click_outside={() => dispatch('close')} bind:this={ctxMenuTarget}>
  {#if isInterest}
    <div class="header">
      {#key price}
        <EditableLeg order={price} {open_dv} on:editableUpdated={refresh} on:updatedVol={((e) => {vol_ft = e.detail.vol})}/>
      {/key}
      {#if price.trader_id!= 0}
        <FastTrade {year_ft} {bid_ft} {firm_ft} {price_ft} {vol_ft} {order_ft} product_id={price.product_id} {isInterest} {ctxMenuTarget}
          canDelete={true} on:close on:closeLegs={() => dispatch('close')}/>
      {/if}
    </div> 
  {:else if price.links.length === 1}
    <div class="header">
      {#key price}
        <EditableLeg order={price.links[0]} {open_dv} on:editableUpdated={refresh} on:updatedVol={((e) => {vol_ft = e.detail.vol})}/>
      {/key}

      <!-- For the case of Bank_id not equal to 0 (POC) -->
      <!-- So there is only one link in the price -->
      <!-- Convert the side of order: if bid= true, return false -->
      {#if price.links[0].trader_id!= 0}
          <FastTrade {year_ft} {bid_ft} {firm_ft} {price_ft} {vol_ft} {order_ft} product_id={price.product_id}
                      canDelete={true} {ctxMenuTarget} on:close/>
      {/if}
    </div>
  {:else if price.links.length > 1}
    <div class="header" >

      <Leg order={price} {ctxMenuTarget} on:close/>

    </div>
    <div>
      {#key price}
        {#each price.links as order (order.order_id)}
          <EditableLeg {order} {open_dv} on:editableUpdated={refresh} on:updatedVol={((e) => {vol_ft = e.detail.vol})}/>
        {/each}
      {/key}
    </div>
  {/if}
</div>

<style>
.legs {
  background-color: var(--cds-ui-02);
}
.header {
  background-color: var(--cds-highlight);
}
</style>
