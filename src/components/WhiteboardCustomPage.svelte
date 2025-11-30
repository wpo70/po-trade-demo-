<script>
  'use strict;'

  import WhiteboardCustomContent from "./WhiteboardContent.svelte";
  import WhiteboardCustomHeader from "./WhiteboardCustomHeader.svelte";
  import FuturesTickerBar from "./FuturesTickerBar.svelte";
  import Toasts from './Toasts.svelte';

  import { selected_custom_wb } from "../stores/custom_whiteboards.js";
  import active_product from "../stores/active_product";
  import filters from "../stores/filters";
  import { toasts } from '../stores/toast';
  
  let selected_filters;
  $: filter_src = $active_product > 0 ? $filters[$active_product] : ( $selected_custom_wb.board_id == -1 ? $filters[0] : $selected_custom_wb.filters );
  $: if (JSON.stringify(selected_filters) != JSON.stringify(filter_src)) { selected_filters = filter_src; }

  // TODO: define blueprint and indicators dynamically - see below
  $: blueprint = $selected_custom_wb.prices_blueprint;
  $: indicators = $selected_custom_wb.indicators;
  $: lives_only = $selected_custom_wb.lives_only;
  $: show_ticker = $selected_custom_wb.show_ticker;

</script>


<div id="custom-wb-page">
  <WhiteboardCustomHeader/>
  {#if $active_product !== -1 || $selected_custom_wb.show_ticker}
    <FuturesTickerBar/>
  {/if}
  <!-- //TODO: update passed in values to also consider main boards -->
  <WhiteboardCustomContent
    {blueprint}
    {indicators}
    {selected_filters}
    {lives_only}
    {show_ticker}
    />
  {#if $toasts}<div id="toasts" style="--ticker-offset:{show_ticker ? "98px" : "0px"};"><Toasts/></div>{/if}
</div>


<style>
  #toasts {
    position: absolute;
    right: 0;
    z-index: 100;
    top: calc(85px + var(--ticker-offset));
  }
</style>
