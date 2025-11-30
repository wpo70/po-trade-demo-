<script>
import { Button, ToastNotification } from 'carbon-components-svelte';
import { createEventDispatcher } from 'svelte';
import { slide, fade, draw, fly, scale } from 'svelte/transition';
import { quintOut, expoOut, cubicOut, linear } from 'svelte/easing';

import Renew from 'carbon-icons-svelte/lib/Renew.svelte';
import CloseLarge from "carbon-icons-svelte/lib/CloseLarge.svelte";
import { spin } from '../common/animations';
// Import components
import Indicators from './Indicators.svelte';
import WhiteBoard from './WhiteBoard.svelte';
import StirWhiteBoard from './STIRWhiteBoard.svelte';
import Orders from './Orders.svelte';
import Tradess from './Tradess.svelte';
import FuturesTickerBar from './FuturesTickerBar.svelte';

import FWDS from './FWDS/FWDS.svelte'
import FxOption from './FX_Option/FxOption.svelte';
import RBA_OIS from './RBA_OIS/RBA_OIS.svelte';
import active_product from '../stores/active_product.js';
import websocket from '../common/websocket.js';
import StirIndicators from './STIRIndicators.svelte';
import orders from '../stores/orders.js';

export let showIndicators;
export let view;

const dispatch = createEventDispatcher();
let copyData=null;
// Default width filter set to off
let leftover_bool;
let leftover_err_message;
$: leftover_bool = false;
$: leftover_err_message = "";
function reset_leftover() {
  leftover_bool = false;
  leftover_err_message = "";
}
let _showIndicators;
$: _showIndicators = showIndicators &&
  view !== 'login' &&
  view !== 'fwds' &&
  view !== 'fxOption' &&
  view !== 'rba-ois' &&
  !($active_product == 20 && view == 'orders');

// Filter orders for RBA OIS (product 20)
$: rba_ois_orders = $orders[20] || [];

$: {
  let a = $active_product;
  unsentRefresh = false;
}

let lastRefresh = new Date(0);
let unsentRefresh = false;
let indicators_refresh_inner;
function refreshIndicators() {
  async function timeout(t) {
    if (!unsentRefresh) {
      unsentRefresh = true;
      await new Promise(res => setTimeout(res, 5000-t));
      unsentRefresh = false;
    }
  }

  let now = new Date();
  const diff = now.getTime() - lastRefresh.getTime();
  if (diff <= 5000) {
    timeout(diff);
    return;
  }
  lastRefresh = now;
  websocket.getQuotes($active_product);
  indicators_refresh_inner.animate(spin(-1), {duration:1000});
}
</script>

<FuturesTickerBar/>
       <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="drawer-container">
  <div class="indicators-drawer" >
    {#if _showIndicators}
    <div style="background-color: #262626;   height:100%; position: fixed: top:134px; left: 0;" 
    class={($active_product==1)? 'indicator-m' : ( $active_product==29 ?'indicator-l' : 'indicator-sm' )}>

      <div style="display: flex; flex-direction: row; background-color: #292929; justify-content:space-between; align-items: center;padding:5px; ">
        <div style="font-weight: bold;  padding-left: 10px; color: #999; font-size: 1.2em; ">Indicators</div>
        <div id="close_btn_indicator"  on:click={() => {showIndicators  = false}}>
          <CloseLarge size={20}/>
        </div>
      </div>
     
        <div style="height: calc(100vh - 110px - 100px); overflow-y: auto; padding: 5px; margin: 10px; background-color: #181818; box-shadow: rgba(0, 0, 0, 0.1) 0px 6px 0px 0px;">
        
        <!-- <h4>Indicators</h4> -->
          <Button on:click={refreshIndicators} kind="ghost" size="small" style={"margin-top: 5px; margin-bottom: 5px; font-weight: bold; color: var(--cds-link-01, #78a9ff)"}>
            Refresh
            <div bind:this={indicators_refresh_inner} style="margin-left:.5rem; height:1rem;"><Renew size="1rem"/></div>
          </Button>

            {#if 
            unsentRefresh}
              <p style="color: red; font-size: smaller; width:{$active_product == 1 || $active_product == 29? '256px' : '171px' }">Please Wait 5s Between Refreshes</p>
            {/if}

          {#if $active_product == 18}
            <StirIndicators />
          {:else}
          <div style=" padding: 5px; width">
            <Indicators bind:copyData/>
          </div>
          {/if}
        </div>
     
    </div>
    {:else if (view !== 'fwds' && view !== 'fxOption' && view !== 'rba-ois' && !($active_product == 20 && view == 'orders'))}
      <div style="height:88vh; width:36px; display:inline-flex; justify-content:center; flex-direction:column; min-height:90px">
        <div on:click={() => {showIndicators = true;}} 
            style="height:60px; width:36px; display:flex; align-items:center; padding-bottom:3px; cursor:pointer;
            background:var(--cds-ui-01); border-top-right-radius:9px; border-bottom-right-radius:9px;"
          >
          <p style="color:var(--cds-text-05); text-shadow:2px 2px 3px var(--cds-inverse-01);
            padding-left:2px; font-size:24px; letter-spacing:3px; line-height:0.88; white-space:nowrap;" 
            >
            {"\u007C"}{"\u007C"}{"\u007C"}<br>{"\u007C"}{"\u007C"}{"\u007C"} 
          </p>
        </div>
      </div>
    {/if}
  </div>

  {#if view === 'whiteboard'}
    {#if $active_product == 18}
      <StirWhiteBoard />
    {:else}
      <WhiteBoard {showIndicators} />
    {/if}
  {/if}

  {#if view === 'orders'}
    <Orders bind:copyData/>
  {/if}

  {#if view === 'trades'}
    <Tradess bind:leftover_bool={leftover_bool} bind:leftover_err_message={leftover_err_message}/>
  {/if}

  {#if view === 'fwds' }
    <FWDS />
  {/if}

  {#if view === 'fxOption' }
    <FxOption/>
  {/if}

  {#if view === 'rba-ois'}
    <RBA_OIS active_orders={rba_ois_orders}/>
  {/if}
</div>

<div class="notification">
  {#if leftover_bool !== false}
    <ToastNotification
      kind="error"
      title="Error"
      subtitle={
      `Leftovers will not apply to some orders. \n
      ${leftover_err_message}`
      }
      on:close={reset_leftover}
    />
  {/if}
</div>

<style>
.indicators-drawer {
  transition: 0.3s;
  height: 100%;
  box-sizing: border-box;
}
.indicators-drawer::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.drawer-container {
  position: relative;
  display: flex;
  z-index: 0;
  height: 100%;
  width: 100%;
  top: 0px;
  left:0;
  right:0;
}
.indicator-l {
  width: 310px;
}
.indicator-m {
  width: 300px;
}
.indicator-sm {
  width:215px;
}
.notification {
  position: absolute;
  bottom: 30px;
}
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
