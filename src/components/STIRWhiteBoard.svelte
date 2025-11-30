<script>

import PriceTablesContainer from './PriceTablesContainer.svelte';
import Toasts from './Toasts.svelte';
import { toasts } from '../stores/toast';

import { refreshData } from '../common/pricing_models.js';
import quotes from '../stores/quotes.js';
import { onMount, tick } from 'svelte';
import PriceHistoryModal from './PriceHistoryModal.svelte';

let whiteboard_main;

let price_history_modals;
let addHistoryModal = (e) => {price_history_modals?.addModal(e);}

// Scroll handling

let outer_whiteboard;
let mask = {left: false, right: false};

/**
 * Handles scroll mask (black blur at ends of the whiteboard) based on the current scroll position
 */
function checkScrollMask() {
  if (!outer_whiteboard) return;
  let scrollBarHeight = outer_whiteboard.offsetHeight - outer_whiteboard.clientHeight;
  if (!scrollBarHeight) {
    mask.left = false;
    mask.right = false;
    outer_whiteboard.style.removeProperty("-webkit-mask");
    return;
  }
  let l, r;
  l = outer_whiteboard.scrollLeft != 0;
  r = outer_whiteboard.scrollLeft + outer_whiteboard.offsetWidth != outer_whiteboard.scrollWidth + scrollBarHeight;
  if (l != mask.left || r != mask.right) {
    mask.left = l;
    mask.right = r;
    outer_whiteboard.style.setProperty("-webkit-mask",
    `linear-gradient(90deg,#0000,#000 ${l ? 2 : 0}% ${r ? 96 : 100}%,#0000 ${r ? 99 : 100}%), \
     linear-gradient(to top, #000 ${scrollBarHeight}px, #0000 ${scrollBarHeight}px), \
     linear-gradient(to left, #000 ${scrollBarHeight}px, #0000 ${scrollBarHeight}px)`);
  }
}

// Layout formatting

const observer = new ResizeObserver(async () => { await new Promise(res => setTimeout(res, 10)); if (whiteboard_main) checkPositions(new CustomEvent("rescale", { detail:{type: "rescale"} })); });

onMount(() => {
  observer.observe(whiteboard_main);
});

/**
 * Handles dispatched overflow and reset events to organise and arrange the data in the container array so that it is displayed correctly
 * @param e event, or null
 */
function formatContainers(e) {
  if (e?.detail?.type == "overflow" && e?.detail?.index == 3) {
    specificDatesOverflow = e.detail.col;
    specificDates.overflow.has = true;
  } else if (e?.detail?.type == "reset" && e?.detail?.index == 3) {
    if (specificDates.overflow.has) {
      specificDatesOverflow = [];
      specificDates.overflow.has = false;
    }
  }
  if (!whiteboard_main) return;
  checkPositions(e);
  checkScrollMask();
}

/**
 * Forces container widths to ensure blocks do not overlap
 */
async function checkPositions(e) {
  await tick();
  if (whiteboard_main) {
    checkWhiteboardHeight();
    Array.from(whiteboard_main.getElementsByClassName("col")).forEach((col, idx) => {
      if (col.childElementCount) {
        checkMargins(idx);
        col.style.setProperty("min-width", (col.lastElementChild.getBoundingClientRect().right - col.getBoundingClientRect().left) + "px");
      } else {
        col.style.removeProperty("min-width");
      }
    });
  }
}

/**
 *  If the next sibling container after a given container is for a different product, the given container's blocks
 *  should have a margin added to it for visual clarity.
 */
function checkMargins(container_index) {
  let container = whiteboard_main.querySelector(`#price-tables-container-${container_index}`);
  let next_cont = whiteboard_main.querySelector(`#price-tables-container-${container_index+1}`);
  if (next_cont == null || next_cont?.firstElementChild?.getAttribute("block_prod-id") == container?.firstElementChild?.getAttribute("block_prod-id")) {
    container.style.setProperty("margin-right", "0px");
  } else {
    container.style.setProperty("margin-right", "17px");
  }
}

/**
 * Forces the outer whiteboard height to be at least large enough to container SPS containers so that they never overflow
 */
function checkWhiteboardHeight() {
  let containers = Array.from(whiteboard_main.getElementsByClassName("col"));
  if (containers.length) {
    let diffs = [];
    for (let i = 0; i < 2; i++) {
      diffs[i] = containers[i+1].lastElementChild?.getBoundingClientRect().bottom - containers[i+1].firstElementChild?.getBoundingClientRect().top;
    }
    let h = Math.max(diffs[0], diffs[1]) + 42;
    whiteboard_main.style.setProperty("height", h+"px");
  }
}

// Pricing and data

$: {
  let q = $quotes;
  refreshData();
}

// Loads specific dates for sps tenors
let broad_tenor;
let specificDates = [];
let specificDatesOverflow = [];
function openSpecificDates(event){
  let pg = event.detail.price_group;  
  let bt = event.detail.broadTenor;  

  if (broad_tenor == bt){
    broad_tenor = null;
    specificDates.overflow.has = false;
  } else {
    let fwdTenor;
    if (pg.fwd != null){
      fwdTenor = pg.fwd * 12;
    } else {
      let today = new Date();
      let date = new Date(pg.start_date);
      fwdTenor = date.getMonth() - today.getMonth();
      fwdTenor += (date.getFullYear() - today.getFullYear())*12;
    }
    specificDates = {prod:18, shape:fwdTenor+(pg.years[0]*100 - 25), start:null, overflow:{ has:false, source:null, block_idx:null, idx:null }};
    broad_tenor = bt;
  }
}
</script>

<div id="outer-whiteboard" class="stir-outer-whiteboard" bind:this={outer_whiteboard} on:scroll={checkScrollMask}>
  <div id="whiteboard-main" class="stir-whiteboard" bind:this={whiteboard_main} >
    <PriceTablesContainer
      price_data={{data_array:[{prod:17, shape:0, start:null}, {prod:27, shape:0, start:null}], overflow:{ has:false, source:null, block_idx:null, idx:null }}}
      container_index={0}
      on:get_history={(e) => {addHistoryModal(e)}}
      on:formatContainers={(e) => {formatContainers(e);}}
      on:resetContainers={(e) => {refreshData();}}
      />
    <PriceTablesContainer
      price_data={{prod:18, stirsps:3, start:null}}
      container_index={1}
      on:get_history={(e) => {addHistoryModal(e)}}
      on:details={(e) => openSpecificDates(e)}
      on:formatContainers={(e) => {formatContainers(e);}}
      on:resetContainers={(e) => {refreshData();}}
      />
    <PriceTablesContainer
      price_data={{prod:18, stirsps:6, start:null}}
      container_index={2}
      on:get_history={(e) => {addHistoryModal(e)}}
      on:details={(e) => openSpecificDates(e)}
      on:formatContainers={(e) => {formatContainers(e);}}
      on:resetContainers={(e) => {refreshData();}}
      />
    {#if broad_tenor}
      <PriceTablesContainer
        price_data={specificDates}
        container_index={3}
        {broad_tenor}
        on:get_history={(e) => {addHistoryModal(e)}}
        on:formatContainers={(e) => {formatContainers(e);}}
        on:resetContainers={(e) => {refreshData();}}
        />
      {#if specificDates.overflow.has}
        <PriceTablesContainer
          price_data={specificDatesOverflow}
          container_index={4}
          {broad_tenor}
          on:get_history={(e) => {addHistoryModal(e)}}
          on:formatContainers={(e) => {formatContainers(e);}}
          on:resetContainers={(e) => {refreshData();}}
          />
      {/if}
    {/if}
  </div>
</div>

{#if $toasts }<div class="toast"><Toasts /></div>{/if}

<PriceHistoryModal bind:this={price_history_modals}/>

<style>

.stir-whiteboard {
  display: inline-flex;
  height: 104vh;
  /* margin-right: 10px; */
  position: relative;
}

.stir-outer-whiteboard {
  overflow-x: auto;
  height: calc(100vh - 56px - 3rem);
  flex-grow: 1;
  margin-top: 1px;
  margin-left: 10px;
  padding-left: 3px;
}

.toast {
  position: absolute;
  right: 0;
  z-index: 100;
}

</style>
