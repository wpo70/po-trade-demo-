<script>
import { addDays, addMonths, bidToString, getEFPSPS_Dates, removeTrailZero, round, timestampToISODate, toEFPSPSTenor, toRBATenor, toTenor, toVolumeString } from '../common/formatting.js';
import { createEventDispatcher, onMount } from 'svelte';
import { calc3mSps, calc6mSps } from '../common/pricing_models';
import { addToast } from '../stores/toast';
import websocket from '../common/websocket.js';
import traders from '../stores/traders.js';
import Marked from './Marked.svelte';
import brokers from '../stores/brokers';
import products from '../stores/products';
import quotes from '../stores/quotes';
import ticker from '../stores/ticker';
import user from '../stores/user';
import { roundToNearest } from '../common/formatting.js';
import { RadioButton, RadioButtonGroup } from 'carbon-components-svelte';
import currency_state from '../stores/currency_state.js';
import active_product from '../stores/active_product.js';
import dailyfx from '../stores/fxrate.js';

const dispatch = createEventDispatcher();

export let open_dv = true;
export let order;

let fx, fxrate;
let selected_currency = products.currency(order.product_id);

// $: permission = user.getPermission($brokers); // this results in permission equals undefined. Not sure why, but the code below fixes the issue.
// TODO: Above
function updatePermission() {
  permission = user.getPermission();
}
let permission;
updatePermission();
$: $brokers && updatePermission();

let lastname = traders.get(order.trader_id).lastname;
if (traders.name(order.trader_id).split(" ")[0] == "Trader"){
  lastname = traders.name(order.trader_id);
}

$: order_is_old = new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0);

$: {
  fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state);
  if (fx) fxrate = fx.override ? fx.override : fx.value;
}; 

onMount(() => {
  getDV01(order);
});

function overridePrice(event) {
  let ovr = event.srcElement.innerText;
  if ((order.product_id == 1 || order.product_id == 3 || order.product_id == 20) && order.years.length != 1 && ovr != "") ovr = ovr/100;
  if (event.srcElement.firstChild?.firstChild) { event.srcElement.firstChild.innerText = handlePriceOverride(ovr); }
  else if (event.srcElement.firstChild) { event.srcElement.innerText = handlePriceOverride(ovr); }
}

// When the user finishes editing an editable field send it to the server.
// If the override is not a valid number reset the override by sending the server "null".
function handlePriceOverride(text) {
  if(typeof text === 'number') { text = text.toString(); }
  let ovr = text.trim().length > 0 ? +parseFloat(text).toFixed(8) : (order.eoi ? null : NaN);

  let old_price = order.price == null ? "" : (order.product_id == 1 || order.product_id == 3 || order.product_id == 20) && order.years.length != 1 ? (order.price*100).toFixed(4) : (order.price).toFixed(6);

  if (isNaN(ovr)) {
    addToast ({
      message: "Invalid price entered. Please try again.",
      type: "error",
      dismissible: true,
      timeout: 1500,
    });
    return removeTrailZero(old_price, 4);
  }

  if (order.price === ovr) return removeTrailZero(old_price, 4);

  // Update the order price

  let updated_order = JSON.parse(JSON.stringify(order));
  updated_order.price = ovr;
  if (updated_order.start_date) {
    let date = new Date(updated_order.start_date);
    updated_order.start_date = timestampToISODate(date);
  }
  let pid = updated_order.product_id;
  if (pid == 2 || (pid == 1 && (updated_order.years.length == 1 || updated_order.years.some(y => y > 3)))){
    if (updated_order.years.length == 1){
      if (updated_order.years[0] <= 5){
        updated_order.reference = $ticker.yma.ask.toFixed(4);
      }else{
        updated_order.reference = $ticker.xma.ask.toFixed(4);
      }
    }else{
      updated_order.reference = $ticker.abfs.ask.toFixed(4);
    }
  } else if(pid == 17 || pid == 27){
    let date = getEFPSPS_Dates();
    let start_date = toEFPSPSTenor(updated_order.start_date);
    let fut = ticker.get90dFutures();
    date.forEach( (val, idx) => {
      if(start_date === val.tenor){
        updated_order.reference = fut[idx].ask;
      }
    });
  } else if (pid == 18) {
    let mid;
    let today = new Date();
    today.setHours(0,0,0,0);
    let spot = updated_order.start_date ? new Date(updated_order.start_date) : addMonths(addDays(today, 1), 12*updated_order.fwd);
    spot.setHours(0,0,0,0);
    let days = Math.round(spot.getTime() - today.getTime()) / (1000*60*60*24);
    if (updated_order.years[0] == 0.25) mid = calc3mSps(days);
    else mid = calc6mSps(days);
    updated_order.reference = mid;
  } else if (products.isFwd(pid)) {
    updated_order.reference = round(quotes.get(products.nonFwd(pid), updated_order.years[0]).fwd_mids[updated_order.fwd],4);
  } else {
    updated_order.reference = quotes.mid(pid, updated_order.years);
    if (products.isPercentageProd(pid) && updated_order.years.length != 1) updated_order.reference = round(updated_order.reference*100, 7);
  }
  updated_order.reference = round(updated_order.reference, 7);
  addToast ({
      message: "Successfully updated order.",
      type: "success",
      dismissible: true,
      timeout: 1500,
    });
  websocket.submitOrder(updated_order, true);
  return ovr !== null ? removeTrailZero(ovr.toFixed(6), 4) : "";
}

// Pressing ENTER or ESC causes the editing to be exited - ENTER saves, ESC resets to last.
 
function handlePriceKeyPress(event) {
  // Enter, Up Arrow, and Down Arrow are keyCodes 13, 38, and 40
  var increment = 0.125;
  if ([1, 3, 18, 20].includes(products.nonFwd(order.product_id))) increment = 0.00125;

  if (event.keyCode === 13) {
    let ovr = event.srcElement.innerText;
    if ((order.product_id == 1 || order.product_id == 3 || order.product_id == 20) && order.years.length != 1 && ovr != "") ovr /= 100;
    event.target.innerText = handlePriceOverride(ovr);
    editCell(event, false);
    event.preventDefault();
  } else if (event.keyCode === 38){
    handlePriceOverride(order.price + increment);
    event.preventDefault();
  } else if (event.keyCode === 40){
    handlePriceOverride(order.price - increment);
    event.preventDefault();
  } else if (event.keyCode == 27){
    event.target.innerText = order.price !== null ? ([1, 3, 20].includes(order.product_id) && order.years.length != 1 ? (order.price*100).toFixed(4) : (order.price).toFixed(6)) : "";
    editCell(event, false);
    event.preventDefault();
  }
}

function overrideVol(event) {
  event.target.innerText = handleVolOverride(event.srcElement.innerText);
}

function handleVolOverride(text) {
  // ignore non-numerical entries
  if(!text) return;

  let ovr = parseFloat(text);
  let old_vol = toVolumeString(order.volume);

  if (isNaN(ovr) || ovr <= 0 ) {
    addToast ({
      message: "Invalid volume entered. Please try again.",
      type: "error",
      dismissible: true,
      timeout: 1500,
    });
    return old_vol;
  }

  if (ovr == order.volume) return old_vol;

  // Update the order volume

  let updated_order = JSON.parse(JSON.stringify(order));
  updated_order.volume = ovr;
  if (updated_order.start_date) {
    let date = new Date(updated_order.start_date);
    updated_order.start_date = timestampToISODate(date);
  }
  dispatch("updatedVol", {vol:ovr, open_dv});
  addToast ({
      message:"Successfully update order.",
      type: "success",
      dismissible: true,
      timeout: 1500,
    });
  websocket.submitOrder(updated_order, true);
  return toVolumeString(ovr);
}

// Pressing ENTER or ESC causes the editing to be exited.  Unfortunately the ESC key
// is being intercepted by the indicators drawer which cause it to close.  So the ESC
// key is not implemented yet.

function handleVolKeyPress(event, is_dv01) {
  // Enter, Up Arrow, and Down Arrow are keyCodes 13, 38, and 40
  if (event.keyCode === 13) {
    event.target.innerText = handleVolOverride(event.srcElement.innerText);
    editCell(event, false);
    event.preventDefault();
  } else if (event.keyCode === 38 && !is_dv01){
    event.target.innerText = handleVolOverride(order.volume + 25);
    event.preventDefault();
  } else if (event.keyCode === 40 && !is_dv01){
    if (order.volume > 25){
      event.target.innerText = handleVolOverride(order.volume - 25);
      event.preventDefault();
    }
  } else if (event.keyCode == 27 && !is_dv01){
    event.target.innerText = toVolumeString(order.volume);
    editCell(event, false);
    event.preventDefault();
  }
}

// Handling to disable right-click ctx menu activating the edit fields
let editing = false;
function editCell(event, edit) {
  let el = event.srcElement;
  editing = edit;
  if (editing) { el.focus(); }
  else { dispatch("editableUpdated", {open_dv}); }
}

let open_dv01, volume_mmp, dv01;
$: handleDV01(dv01); //Update volume when the Dv01 field changes

function getDV01(order) {
  dv01 = quotes.getDV01FromVol(order.product_id, order.years, order.volume, order?.fwd)
  if(order.currency_code !== selected_currency){
    dv01 = dv01 * fxrate;
  }
  dv01 = roundToNearest(dv01, 2).toString();
  return dv01;
}


function handleDV01() {
  let s;
  let pid = products.nonFwd(order.product_id);
  let dv_ = roundToNearest(dv01, 2).toString();
  
  if (pid === 5 || pid === 13 ) {
    s = 40;
  } else {
    s = 25;
  }
  if (order.years?.length == 3) s *= 2;
  if (order.currency_code == 'USD') {s = s*fxrate;}

  if (products.isStir(order.product_id)) {
    volume_mmp = quotes.mmp(order.product_id, order.years, order?.fwd) * dv_; 
  } else if (dv_) {
    volume_mmp = quotes.mmp(order.product_id, order.years, order?.fwd) * dv_ / s;
  } else {
    volume_mmp = quotes.mmp(order.product_id, order.years, order?.fwd); 
  }
  volume_mmp = roundToNearest(volume_mmp, 2);
}

</script>

<div class="leg">
  {#if !order?.eoi}
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
  {#if !permission["View Only"]}
    <div
      class="editable" 
      contenteditable={editing}
      tabindex="0"
      on:click={(e) => {if (e) {open_dv = true; editCell(e, true); }}}
      on:blur={(e) => {if (editing) {overridePrice(e); editing = false}}}
      on:keydown={handlePriceKeyPress}  
    >
      <Marked mark={order.price !== null ? order.priceIsGood() : false}>{order.price !== null ? ([1, 3, 20].includes(order.product_id) && order.years.length != 1 ? removeTrailZero((order.price*100).toFixed(4), 4) : removeTrailZero((order.price).toFixed(6), 4)) : ""}</Marked>
    </div>
    {#if !order?.eoi}
      <div
        class="editable"
        contenteditable={editing}
        tabindex="0"
        on:click={(e) => {open_dv = true; if (e) { editCell(e, true); }}}
        on:blur={(e) => {if (editing) {overrideVol(e); editing = false}}}
        on:keydown={handleVolKeyPress}
      >
        {toVolumeString(order.volume)}
      </div>
    {/if}
  {:else}
    <div class="editable" contenteditable="false">
      <Marked mark={order.priceIsGood()}>{(order.product_id == 1 || order.product_id == 3 || order.product_id == 20) && order.years.length != 1 ? removeTrailZero((order.price*100).toFixed(4), 4) : removeTrailZero((order.price).toFixed(6), 4)}</Marked>
    </div>
    {#if !order?.eoi}
      <div class="editable" contenteditable="false">
        {toVolumeString(order.volume)}
      </div>
    {/if}
  {/if}
  {#if order.volume != 0 && !order.eoi}
    {order.isBelowMMP() ? '⚠️' : ''} 
  {/if}
  {order_is_old ? '❄️' : order.firm ? '' : '⛔'}
  {traders.bankName(order.trader_id)}
  {lastname}
</div>
{#if open_dv && $active_product !== 18}
  <div class="dv01-changer" on:keypress|stopPropagation>
    <span>Dv01</span>
    <input on:keydown={(e) => handleVolKeyPress(e, true)} bind:value={dv01} on:change={(e) => {handleVolOverride(volume_mmp); editCell(e, false);}} 
    style="margin-bottom: 2px;width:60px;background-color: rgba(0, 0, 0, 0);color: #f4f4f4;border: 1px solid gray" class="editable"/>
    {#if selected_currency !== 'USD'}
      <RadioButtonGroup>
        <RadioButton labelText={selected_currency} value={selected_currency} checked={order.currency_code == selected_currency} on:change={() => {order.currency_code = selected_currency, getDV01(order)}}/>
        <RadioButton labelText="USD" value={'USD'} on:change={() => {order.currency_code = 'USD', getDV01(order)}} checked={order.currency_code !== selected_currency}/>
      </RadioButtonGroup>
    {/if}
  </div>
{/if}

<style>
.editable {
  display: inline-block;
  padding: 2px;
  border: 1px solid gray;
}
.editable:empty {
  min-width: 1.25rem;
  min-height: 1.25rem;
  margin-bottom: -5px;
}

.leg {
  height: 32px;
  padding-top: 6px;
  padding-left: 6px;
  padding-right: 6px;
  white-space: nowrap;
  text-align: center;
}

.dv01-changer {
  display: flex;
  flex-direction: row;
  padding: 5px 10px;
  justify-content: center;
  align-items: center;
  gap:20px;
  height: 32px;
}

:global(.dv01-changer .bx--radio-button-group) {
  margin-top: 0px !important;
}

:global(.dv01-changer .bx--form-item) {
  flex: 0 1 auto !important;
}


</style>
