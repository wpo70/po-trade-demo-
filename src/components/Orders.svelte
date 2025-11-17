<script>

import OrderTable from './OrderTable.svelte';
import RbaOis from './RBA_OIS/RBA_OIS.svelte';
import StaticOrderForm from './StaticOrderForm.svelte';

import { ToastNotification } from 'carbon-components-svelte';

import active_product from '../stores/active_product.js';
import orders from '../stores/orders.js';
import products, { selection_by_product } from '../stores/products.js';

export let copyData;

$: if(copyData != null) copyData.canExpressInterest = true;

let orders_ref;

let selection = [];
let selected;
let active_orders;
let resetForm = false;
// Get the orders.
$: {
  /* Group Product EFP | IRS: IRS and EFP
    Tab id uses IRS product id (1)
    Order Table will combine product id 1, 2 and 19
    White Board will combine both products and respective Fwd in primary and scondary cols
  */
  if ($active_product == 1) {
    active_orders = $orders[1].concat($orders[2]).concat($orders[19]);
  } 
  /**
   * Combined product SOFR SPREAD | IRS SWAPS 
  */
  else if ($active_product == 29) {
    active_orders = $orders[29].concat($orders[28]);
  }

  /* Group Product STIR: IRS SPS, EFP SPS
    Temporaily Set the Tab STIR as Product ID 18
    Order Table will combine product id 17, 18 and 27
    White Board will reflect EFP SPS, IRS SPS in separate Designated Areas
  */
  else if ($active_product == 18) {
    active_orders = $orders[17].concat($orders[18]).concat($orders[27]);
  }
  
  // FIXME: This line is used to remember selection per product,
  // but is not working since changing to CCS
  //selection = selection_by_product[$active_product]

  // Above comment from Adam (59ca257382229f1b98cfef4d154bba3ff9c15e85), but seems to be no longer relevant
  else {
    active_orders = $orders[$active_product];
    const fwd = products.fwdOf($active_product);
    if (fwd) { active_orders = active_orders.concat($orders[fwd]) }
  }
}

  // Make sure the orders table is shows orders at the top and interests at the bottom.
$: {
  const [orderss, interests] = active_orders.reduce(([orderss, interests], currentObj) => {
    if(!currentObj.eoi) return [[...orderss, currentObj], interests]; // if order
    else if(currentObj.eoi) return [orderss, [...interests, currentObj]]; // if interest
  }, [[], []]);
  
  active_orders = orderss.concat(interests);
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
  <div id="orders" bind:this={orders_ref}>
    {#if active_orders.length === 0}
      <h3 style="width:-webkit-fill-available;">There are no {products.name($active_product) == "IRS" && $active_product == 1 ? "IRS or EFP" : products.name($active_product)} orders</h3>
    {:else}
      <OrderTable {active_orders} bind:selection/>
    {/if}
    <div id="static_order_form">
      <StaticOrderForm
      {selected}
      on:order_updated={handleOrderUpdate}
      on:reset={resetSelection}
      selectionArray={selection}
      />
    </div>  
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


<style>
#orders {
  flex: 1;
  display: flex;
  min-height: 698px;
  margin-left: 10px;
  margin-top: 1px;
}

#static_order_form {
  margin-left:10px;
  &:has( .pulltab) {
    margin-top: auto;
    margin-bottom: auto;
  }
}
</style>
