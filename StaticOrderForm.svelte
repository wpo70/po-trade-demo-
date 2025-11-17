<script>
import { Tile } from 'carbon-components-svelte';
import { createEventDispatcher, onMount } from 'svelte';
import OrderForm from './OrderForm/OrderForm.svelte';
import Pulltab from './Utility/Pulltab.svelte';
import Close from "carbon-icons-svelte/lib/Close.svelte";

const dispatch = createEventDispatcher();

// The selected order, or null if none are selected

export let selected;
export let showOrderForm = true;
export let selectionArray = [];
</script>

{#if showOrderForm}
  <div style="height:100%; background-color:var(--cds-ui-01);">
    <h5 style="font-weight:bold; padding:16px;">Order Form</h5>
    <div id="close_btn_orderform" on:click={() => {showOrderForm = false;}}>
      <Close size={20}/> 
    </div>
    <Tile aria-labelledby="static-order-title" aria-describedby="static-order-content">
      <div style="position: relative">
        <div id="static-order-content">
          <div style="--error-show:{selectionArray.length>1}" class={selectionArray.length > 1 ? "greyed-fade-in" : "greyed-fade-out"}>
            <span style="--error-show:{selectionArray.length>1}" class={selectionArray.length > 1 ? "trader-error-fade-in" : "trader-error-fade-out"}>You cannot select multiple orders</span>
            <OrderForm on:order_updated on:server_error on:reset={() => dispatch('reset')} selected={selectionArray.length == 1 ? selected : null}/>
          </div>
        </div>
      </div>
    </Tile>
  </div>
{:else}
  <Pulltab direction="right" on:click={() => {showOrderForm = true;}}/>
{/if}


<style>
  #close_btn_orderform {
    position: absolute;
    top: 0px;
    right: 0px;
    padding: 10px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color:  var(--cds-hover-selected-ui);
    }
  }

.greyed-fade-in {
  position: relative;
  cursor: not-allowed !important;
}

.greyed-fade-in * {
  user-select: none;
  cursor: not-allowed !important; 
}
  
.greyed-fade-in::before, .greyed-fade-out::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 70%;
  background: radial-gradient(circle 200px at center, var(--cds-ui-background)  0%, var(--cds-ui-01) 100%);
  opacity: var(--error-show);
  transition: opacity 0.5s ease-in-out;
}
  
.greyed-fade-in::before {
  z-index: 1; 
}

.trader-error-fade-in,
.trader-error-fade-out {
  display: block !important;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: Arial, sans-serif;
  font-size: 24px;
  text-align: center;
  opacity: var(--error-show);
  transition: opacity 0.5s ease-in-out; 
}

.trader-error-fade-in {
  opacity: 1; 
  z-index: 2;
}

.trader-error-fade-out {
  opacity: 0;
}

.greyed-fade-in::before {
  opacity: 0.7;
}

.trader-error-fade-out, .greyed-fade-out::before {
  opacity: 0; 
}

</style>
