<script>
  import { ToastNotification } from 'carbon-components-svelte';
  
  import Whiteboard from './Whiteboard.svelte';
  import Sidebar from './Indicators.svelte';
  import FuturesTickerBar from './FuturesTickerBar.svelte'; // Do not move this import to the top
  
  import Orders from './Orders.svelte';
  import Tradess from './Tradess.svelte';
  import FWDS from './FWDS/FWDS.svelte';
  import FxOption from './FX_Option/FxOption.svelte';

  import active_product, { view } from '../stores/active_product.js';
  import products from '../stores/products';
  import prices from '../stores/prices';
  
  export let showIndicators;

  let copyData = null;

  $: leftover_bool = false;
  $: leftover_err_message = "";
  function reset_leftover() {
    leftover_bool = false;
    leftover_err_message = "";
  }

  let _showIndicators;
  $: _showIndicators = showIndicators &&
      $view !== 'login' &&
      $view !== 'fwds' &&
      $view !== 'fx-options' &&
      !($active_product == 20 && $view == 'orders');

  let sidebar;
  let whiteboard_ref;

  $: genBoardVars($active_product);
  let indicators;
  let blueprint;
  function genBoardVars(product_id) {
    function genBP() {
      let ret = [];
      if (product_id == 18) {
        ret.push([{product_id:17, shape:0}, {product_id:27, shape:0}]);
        // stirsps (broad tenors) do not need a shape, but structure validation requires one -> easier/neater to add an unused key here than to modify all the rules/checks
        ret.push([{product_id:18, shape:-3, stirsps:3}]);
        ret.push([{product_id:18, shape:-6, stirsps:6}]);
      } else {
        const shapes = $prices[product_id].length;
        for (let i = 0; product_id == 20 ? i < 2 : i < shapes; i++) {
          ret.push([{product_id, shape:i}]);
        }
        if (product_id == 1) {
          ret.unshift([{product_id:2, shape:0, secondary:true}, {product_id:2, shape:1, secondary:true}, {product_id:19, shape:0}]);
        }
        if (product_id == 29) {
          ret.unshift([{product_id:28, shape:0, secondary:true}, {product_id:28, shape:1, secondary:true}, {product_id:28, shape:2, secondary:true}]);
        }
        if (product_id != 1 && products.fwdOf(product_id)) {
          ret.push([{product_id:products.fwdOf(product_id), shape:0}]);
        }
      }
      return ret ?? [];
    }

    function genIndic() {
      switch(product_id) {
        case 1:
          return [1, 2];
        case 18:
          return products.getStir();
        default:
          return [product_id];
      }
    }

    if (product_id <= 0 || product_id >= 100) { return; }
    indicators = genIndic();
    blueprint = genBP();
  }
</script>


<FuturesTickerBar/>
<div id="trading-content-container">
  {#if !['fwds', 'fx-options' ].includes($view)}
    <Sidebar bind:this={sidebar} product_list={indicators} bind:showIndicators {whiteboard_ref} on:copyIndicator={({detail}) => {copyData = detail.copyData;}}/>
  {/if}

  {#if $view === 'whiteboard'}
    <Whiteboard
      on:scroll={sidebar.updateEndDist}
      bind:whiteboard_ref
      {indicators}
      {blueprint}
      />
  {/if}

  {#if $view === 'orders'}
    <Orders bind:copyData/>
  {/if}

  {#if $view === 'trades'}
    <Tradess bind:leftover_bool={leftover_bool} bind:leftover_err_message={leftover_err_message}/>
  {/if}

  {#if $view === 'fwds' }
    <FWDS />
  {/if}

  {#if $view === 'fx-options' }
    <FxOption/>
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
  #trading-content-container {
    position: relative;
    display: flex;
    z-index: 0;
    height: calc(100vh - 48px - 98px);
  }
  .notification {
    position: absolute;
    bottom: 30px;
  }
</style>