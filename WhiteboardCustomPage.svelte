<script>
  'use strict;'

  import Whiteboard from "./Whiteboard.svelte";
  import Sidebar from "./Indicators.svelte";
  import WhiteboardCustomHeader from "./WhiteboardCustomHeader.svelte";
  import FuturesTickerBar from "./FuturesTickerBar.svelte";
  import { selected_custom_wb } from "../stores/custom_whiteboards.js";

  export let showIndicators

  /**
   * @blueprint - Array of columns/containers, each of which is an array of objects which describe the blocks within the columns
   *    complete example: [[{product_id:2, shape:0, tenors:[], nonpersists:false}, {product_id:2, shape:1, tenors:['3 x 10', '4 x 10'], nonpersists:true}]]
   */
  let blueprint;
  let indicators;
  let lives_only;
  let show_ticker;

  $: refresh($selected_custom_wb);
  function refresh() {
    blueprint = $selected_custom_wb.prices_blueprint;
    indicators = $selected_custom_wb.indicators?.slice() ?? [];
    lives_only = $selected_custom_wb.lives_only;
    show_ticker = $selected_custom_wb.show_ticker;
  }

  let sidebar;
  let whiteboard_ref;
</script>


<div id="custom-wb-page">
  <WhiteboardCustomHeader/>
  {#if $selected_custom_wb.show_ticker}
    <FuturesTickerBar/>
  {/if}
  <div id="whiteboard-container">
    <Sidebar bind:this={sidebar} bind:showIndicators product_list={[...new Set(indicators)]} {whiteboard_ref}/>
    <Whiteboard
      on:scroll={sidebar.updateEndDist}
      bind:whiteboard_ref
      bind:indicators
      {blueprint}
      {lives_only}
      {show_ticker}
    />
  </div>
</div>


<style>
  #whiteboard-container {
    position: relative;
    display: flex;
    z-index: 0;
  }
</style>
