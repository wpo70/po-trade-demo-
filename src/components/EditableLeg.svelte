<script>
import { addDays, addMonths, bidToString, getEFPSPS_Dates, removeTrailZero, round, timestampToISODate, toEFPSPSTenor, toRBATenor, toTenor, toVolumeString } from '../common/formatting.js';
import { createEventDispatcher } from 'svelte';
import { flyPrice, spreadPrice } from '../common/calculations';
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

const dispatch = createEventDispatcher();

export let order;

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
      message: "Successfully update order.",
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
  dispatch("updatedVol", {vol:ovr});
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

function handleVolKeyPress(event) {
  // Enter, Up Arrow, and Down Arrow are keyCodes 13, 38, and 40
  if (event.keyCode === 13) {
    event.target.innerText = handleVolOverride(event.srcElement.innerText);
    editCell(event, false);
    event.preventDefault();
  } else if (event.keyCode === 38){
    event.target.innerText = handleVolOverride(order.volume + 25);
    event.preventDefault();
  } else if (event.keyCode === 40){
    if (order.volume > 25){
      event.target.innerText = handleVolOverride(order.volume - 25);
      event.preventDefault();
    }
  } else if (event.keyCode == 27){
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
  else { dispatch("editableUpdated"); }
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
      on:click={(e) => {if (e) { editCell(e, true); }}}
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
        on:click={(e) => {if (e) { editCell(e, true); }}}
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
</style>
