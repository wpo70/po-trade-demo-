<script>
'use strict';

import Trades from './Trades.svelte';
import tradess from '../stores/tradess.js';
import products from '../stores/products.js';
import active_product from '../stores/active_product.js';

import { createEventDispatcher } from 'svelte';

let tradss;
export let leftover_bool;
export let leftover_err_message;

import Toasts from './Toasts.svelte';
import { toasts } from '../stores/toast';
import currency_state from '../stores/currency_state';

const dispatch = createEventDispatcher();

$: {
  if (!$tradess) {
    tradss = [];
  } else if ($active_product===1) {
    // TAB EFP | IRS: combine subproduct 1, 2, 19
    tradss = ($tradess[1] || []).concat($tradess[2] || []).concat($tradess[19] || []);
  } else if ($active_product===18) {
    // TAB STIR: combine subproduct 17,18 and 27
    tradss = ($tradess[18] || []).concat($tradess[17] || []).concat($tradess[27] || []);
  } else if ($active_product=== 29) {
    // TAB SOFR SPREAD | IRS SWAP: combine subproduct 28, 29
    tradss = ($tradess[29] || []).concat($tradess[28] || []);
  } else {
    tradss = $tradess[$active_product] || [];
    const fwd = products.fwdOf($active_product);
    if (fwd && $tradess[fwd]) { tradss = tradss.concat($tradess[fwd]) }
  }
}
</script>
<div class="trades_wrapper">
{#key $active_product}
  {#if tradss && tradss.length > 0}
    {#each (tradss || []).filter(t => t && t.timestamp) as trades (trades.timestamp)}
      <Trades {trades} bind:leftover_bool={leftover_bool} bind:leftover_err_message={leftover_err_message}/>
    {/each}
  {:else}
    <h3 style="padding-left: 10px">There are no {products.name($active_product) == "IRS" && $active_product == 1 ? "IRS or EFP" : products.name($active_product)} trades in negotiation</h3>
  {/if}
{/key}
</div>
<!-- Add toast on editable leg once Price or volume input isn't correct -->
   {#if $toasts }<div class="toast"><Toasts /></div>{/if}

<style>
.trades_wrapper {
  display: inline-flex;
  flex-wrap:wrap;
  flex-direction: row;
  gap: 10px 5px;
  width: 100%;
  height: calc(100vh - 56px - 3rem);
  min-height: 698px;
  margin: 0px 0px 0px 10px;
  align-content: flex-start;
  position: relative;
  overflow-x: auto;
}
.toast {
  margin-left: auto;
  z-index: 100;
  position: relative;
}
</style>
