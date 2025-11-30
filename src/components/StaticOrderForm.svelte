<script>
import { Tile } from 'carbon-components-svelte';
import { createEventDispatcher } from 'svelte';
import OrderForm from './OrderForm/OrderForm.svelte';
import CloseLarge from "carbon-icons-svelte/lib/CloseLarge.svelte";

const dispatch = createEventDispatcher();

// The selected order, or null if none are selected

export let selected;
export let showOrderForm;

</script>

<div>
  <div style="display: flex; flex-direction: row; background-color: #292929;  justify-content:space-between; align-items: center;padding:5px; ">
    <div style="font-weight: bold;  padding-left: 10px; color: #999; font-size: 1.2em; ">Order Form</div>
    <div id="close_btn_indicator"  on:click={() => {showOrderForm = false}}>
      <CloseLarge size={20} style="self-align:cennter; "/> 
    </div>
  </div>
  <Tile aria-labelledby="static-order-title" aria-describedby="static-order-content">
      <div style="position: relative">
        <div id="static-order-content">
          <OrderForm on:order_updated on:server_error on:reset={() => {dispatch('reset');}} {selected}/>
        </div>
  </div>
  </Tile>
</div>
<style>
  #close_btn_indicator {
    background-color: #262626;
    padding: 5px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color:  var(--cds-interactive-02, #6f6f6f);
    }
  }
</style>
