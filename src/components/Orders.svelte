<script>
import { slide, fade, draw, fly, scale } from 'svelte/transition';
import { quintOut, expoOut, cubicOut, linear } from 'svelte/easing';

import OrderTable from './OrderTable.svelte';
import RbaOis from './RBA_OIS/RBA_OIS.svelte';
import StaticOrderForm from './StaticOrderForm.svelte';
import Toasts from './Toasts.svelte';
import SingleOrder from './SingleOrder.svelte';

import { ToastNotification } from 'carbon-components-svelte';
import Launch from "carbon-icons-svelte/lib/Launch.svelte";
import OpenPanelTop from "carbon-icons-svelte/lib/OpenPanelTop.svelte";
import SubtractLarge from "carbon-icons-svelte/lib/SubtractLarge.svelte";

import active_product from '../stores/active_product.js';
import orders from '../stores/orders.js';
import products, { selection_by_product } from '../stores/products.js';
import { toasts } from '../stores/toast';

export let copyData;

$: if(copyData != null) copyData.canExpressInterest = true;

let selection = [];
let selected;
let active_orders = []; // Initialize to empty array to prevent undefined errors
let resetForm = false;
// Get the orders.
$: {
  // Safety check: ensure orders store is initialized
  if (!$orders) {
    active_orders = [];
  }
  /* Group Product EFP | IRS: IRS and EFP
    Tab id uses IRS product id (1)
    Order Table will combine product id 1, 2 and 19
    White Board will combine both products and respective Fwd in primary and scondary cols
  */
  else if ($active_product == 1) {
    active_orders = ($orders[1] || []).concat($orders[2] || []).concat($orders[19] || []);
  } 
  /**
   * Combined product SOFR SPREAD | IRS SWAPS 
  */
  else if ($active_product == 29) {
    active_orders = ($orders[29] || []).concat($orders[28] || []);
  }

  /* Group Product STIR: IRS SPS, EFP SPS
    Temporaily Set the Tab STIR as Product ID 18
    Order Table will combine product id 17, 18 and 27
    White Board will reflect EFP SPS, IRS SPS in separate Designated Areas
  */
  else if ($active_product == 18) {
    active_orders = ($orders[17] || []).concat($orders[18] || []).concat($orders[27] || []);
  }
  
  // FIXME: This line is used to remember selection per product,
  // but is not working since changing to CCS
  //selection = selection_by_product[$active_product]

  // Above comment from Adam (59ca257382229f1b98cfef4d154bba3ff9c15e85), but seems to be no longer relevant
  else {
    active_orders = $orders[$active_product] || [];
    const fwd = products.fwdOf($active_product);
    if (fwd && $orders[fwd]) { active_orders = active_orders.concat($orders[fwd]) }
  }
}

  // Make sure the orders table is shows orders at the top and interests at the bottom.
$: {
  // Safety check: ensure active_orders is an array before calling reduce
  if (!active_orders || !Array.isArray(active_orders) || active_orders.length === 0) {
    active_orders = [];
  } else {
    const [orderss, interests] = active_orders.reduce(([orderss, interests], currentObj) => {
      if(!currentObj.eoi) return [[...orderss, currentObj], interests]; // if order
      else if(currentObj.eoi) return [orderss, [...interests, currentObj]]; // if interest
    }, [[], []]);
    
    active_orders = orderss.concat(interests);
  }
}

// Reset selection on change in active product

$: resetSelection($active_product);
function resetSelection() {
  selection = [];
  copyData = null;
  selected = null;
}

function handleSelected() {
  if(selection.length === 0){
    selected = copyData ?? null;
  } else {
    if(copyData) {
      copyData = null;
    } else {
      selected = selection[selection.length - 1];
      if(selected.eoi) selected.canExpressInterest = true;
    }
  }
}

// Selection is an array of all selected orders.
// Selected is the most recently selected order.
$: handleSelected(selection, selected, copyData)

// This is the delete dialog and a snackbar to report server errors.

let delete_dialog = false;
let mySnackbar = false;
let server_error = '';

let showOrderForm = true;
let showCompleteOrderTable = true; //100% screen
let OffOrderTable = false; // 0% screen
let sizeOrderTable; 

$: {if (selection.length !== 0) showOrderForm = true}

function handleOrderUpdate() {
  // Orders have been modified so clear all selections and triggertable refresh.

  selection_by_product[$active_product] = [];

  resetSelection();
}
let leftover_bool;
let leftover_err_message;
$: leftover_bool = false;
$: leftover_err_message = "";
</script>
{#if $active_product == 20}
  <RbaOis {active_orders} />
{:else}
  <div class="orders">
    <div class="order_table-wrapper" style="width:100%; overflow-x:auto; position:relative; height: calc(100vh - 48px - 98px);">
      {#if active_orders.length === 0}
        <h3>There are no {products.name($active_product) == "IRS" && $active_product == 1 ? "IRS or EFP" : products.name($active_product)} orders</h3>
      {:else}
          
        <div style={`height:${ OffOrderTable ? "calc(100vh - 205px)" : (showCompleteOrderTable? `0px` :`510px`)}`}>
            <SingleOrder {active_orders} />
        </div>

        <div    id="order_table-div" style={` background-color: #292929;  position:relative; overflow-y: hidden;height:  
        ${OffOrderTable ? "50px" : (showCompleteOrderTable? `calc(100vh - 48px - 86px - 20px)` : `calc(100vh - 48px - 86px - 28px - 500px )`)}`} >
            <div style="display: flex; flex-direction: row; justify-content:right; padding:5px; ">
              <!-- 0% order table -->
              <div id="_btn_orders" on:click={() => { OffOrderTable = true}}>
                <SubtractLarge size={20} style="self-align:cennter;"/> 
              </div>
              <!-- 50% order table 50% visual single order -->
              <div id="_btn_orders" on:click={() => {showCompleteOrderTable = false; OffOrderTable = false;}}> 
                <OpenPanelTop size={20} style="self-align:cennter;"/> 
              </div>
              <!-- 100% order table -->
              <div id="_btn_orders" on:click={() => {showCompleteOrderTable = true; OffOrderTable =false;}}>
                <Launch size={20} style="self-align:cennter;"/> 
              </div>
            </div>
           
            {#if !OffOrderTable}
              <div  class="orders-table_wrapper_" style={`width: 100%; height: ${showCompleteOrderTable? `calc(100vh - 48px - 86px - 28px - 30px)` : `calc(100vh - 48px - 86px - 28px - 510px - 20px - 60px)`}`} >
                <OrderTable {active_orders} bind:selection {showCompleteOrderTable} />
              </div>
            {/if}
          </div>
       
      {/if}
    </div>

    {#if !showOrderForm}
    <!-- Button show order form -->
    <div style="margin-left: 10px;right:0; height:88vh; width:36px; display:inline-flex; justify-content:center; flex-direction:column; min-height:90px">
      <div on:click={() => {showOrderForm = true;}} 
          style="height:60px; width:36px; display:flex; align-items:center; padding-bottom:3px; cursor:pointer;
          background:var(--cds-ui-01); border-top-left-radius:9px; border-bottom-left-radius:9px;"
        >
        <p style="color:var(--cds-text-05); text-shadow:2px 2px 3px var(--cds-inverse-01);
          padding-left:2px; font-size:24px; letter-spacing:3px; line-height:0.88; white-space:nowrap;" 
          >
          {"\u007C"}{"\u007C"}{"\u007C"}<br>{"\u007C"}{"\u007C"}{"\u007C"} 
        </p>
      </div>
    </div>
    {/if}

    {#if showOrderForm}
    <div class="form"  >
      <div style="height:100%; width:fit-content; background-color: #262626;">
      <StaticOrderForm bind:showOrderForm {selected} on:order_updated={handleOrderUpdate} on:reset={resetSelection} />
      </div>
    </div>
    {/if}
  </div>
{/if}

<!-- This snackbar is used to report AJAX request errors. -->
{#if mySnackbar !== false}
  <ToastNotification
    kind="error"
    title="Error"
    subtitle={server_error}
  />
{/if}
<!-- This snackbar is used to report AJAX request errors. -->

<!-- Add toast on editable leg once Price or volume input isn't correct -->
{#if $toasts }<div class="toast"><Toasts /></div>{/if}

<style>
.orders {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - 48px - 58px);
  min-height: 698px;
  margin-left: 10px;
  margin-top: 1px;
  padding-bottom: 5px;
  position: relative;
  overflow-x: auto;
}

:global(.orders .bx--data-table-container) {
  padding-top: 0px;
  overflow-x: auto;
}

.form {
  padding: 0 10px;
  padding-right:0;
  right: 0;
  position:relative;
  height: 100%;
}
.toast {
  position: absolute;
  right: 0;
  z-index: 100;
}
#_btn_orders{
    background-color: #262626; 
    padding: 8px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color:  var(--cds-interactive-02, #6f6f6f);
    }
  }
#order_table-div:hover {
  overflow-y: auto;
}  
</style>
