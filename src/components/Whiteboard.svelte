<script>
import { onMount, tick } from 'svelte'
import { watchResize } from "svelte-watch-resize";

import PriceTablesContainer from './PriceTablesContainer.svelte';
import PriceHistoryModal from './PriceHistoryModal.svelte';
import active_product from '../stores/active_product.js';
import products from '../stores/products';

import Toasts from './Toasts.svelte';
import { toasts } from '../stores/toast';

export let showIndicators;
export let copyData = null;
let whiteboard_main;
let all_prices = []; // Initialize to empty array to prevent undefined errors

let price_history_modals;
let addHistoryModal = (e) => {price_history_modals?.addModal(e);}

$: resetAllPrices(true, $active_product);

const observer = new ResizeObserver(async () => {
  await new Promise(res => setTimeout(res, 10));
  if (whiteboard_main) {
    checkPositions(new CustomEvent("rescale", { detail:{type: "rescale"} }));
    checkScrollMask();
  }
});

let height;
function handleResize(e) {
  if (!height) height = e.clientHeight;
  else if (Math.abs(height - e.clientHeight) > 10) {
    height = e.clientHeight;
    resetAllPrices();
  }
}

// Scroll handling

/*
 * Offsets the scroll position when opening and closing the sidebar/indicator drawer 
*/
$: handleSidebarOverlap(showIndicators);
let shift = (($active_product == 1 || $active_product == 29) ? 288 : 203) - 36;
let end_dist;
function handleSidebarOverlap() {
  if (whiteboard_main && whiteboard_main.offsetHeight - whiteboard_main.clientHeight) {
    if (showIndicators && whiteboard_main.scrollLeft > 0) {
      whiteboard_main.scrollLeft += shift;
    } else if (!showIndicators) {
      whiteboard_main.scrollLeft -= whiteboard_main.scrollLeft + whiteboard_main.offsetWidth < whiteboard_main.scrollWidth ? shift : end_dist;
    }
  }
}

onMount(() => {
  whiteboard_main.addEventListener('mousewheel', (e) => {
    if (document.body.offsetHeight - document.body.scrollHeight == 0) {
      whiteboard_main.scrollLeft -= (Math.max(-1, Math.min(1, (e.wheelDelta))) * 70);
    }
  }, false);
  observer.observe(whiteboard_main);
});

let curr_prod = $active_product
$: if (whiteboard_main && $active_product != curr_prod) { whiteboard_main.scrollLeft = 0; curr_prod = $active_product; }

let mask = {left: false, right: false};
$: if (whiteboard_main && $active_product) { whiteboard_main.style.removeProperty("-webkit-mask"); mask.left = false; mask.right = false; checkScrollMask(); }

/**
 * Handles scroll mask (black blur at ends of the whiteboard) based on the current scroll position
 */
function checkScrollMask() {
  if (!whiteboard_main) return;
  let scrollBarHeight = whiteboard_main.offsetHeight - whiteboard_main.clientHeight;
  if (!scrollBarHeight) {
    mask.left = false;
    mask.right = false;
    whiteboard_main.style.removeProperty("-webkit-mask");
    return;
  }
  let l, r;
  l = whiteboard_main.scrollLeft != 0;
  r = whiteboard_main.scrollLeft + whiteboard_main.offsetWidth != whiteboard_main.scrollWidth;
  if (l != mask.left || r != mask.right) {
    mask.left = l;
    mask.right = r;
    whiteboard_main.style.setProperty("-webkit-mask",
    `linear-gradient(90deg,#0000,#000 ${l ? 2 : 0}% ${r ? 98 : 100}%,#0000), \
     linear-gradient(to top, #000 ${scrollBarHeight}px, #0000 ${scrollBarHeight}px)`);
  }
}

async function removeBlanks() {
  await new Promise(res => {setTimeout(res, 200)});
  let p = all_prices;
  while (p[p.length - 1] == null) { p.pop(); }
  all_prices = p;
}

// Get the prices for the active product.  Normally the active product is simply the active product.
// But if the active product is either IRS or EFP then the primary prices will be the IRSs and the
// secondary prices will be the EFPs.

/**
 * Resets the whiteboard - regenerates the container array  
 */
function resetAllPrices(scroll_reset) {
  async function reset() {
    let scroll = whiteboard_main?.scrollLeft;
    if (scroll) { await new Promise(res => setTimeout(res, 1)); whiteboard_main.scrollLeft = scroll; }
  }

  // Safety check: ensure active_product is defined
  if ($active_product === undefined || $active_product === null) {
    all_prices = [];
    return;
  }

  let arr;
  switch ($active_product) {
    case 1:
      arr = [{prod:2, start:null, overflow:{ has:false, source:null, block_idx:null, idx:null }}];
      break;
    case 29:
      arr = [{prod:28, start:null, overflow:{ has:false, source:null, block_idx:null, idx:null }}];
      break;
    default:
      arr = [];
      break
  };

  for (let i = 0; i < 3; i++) {
    if ($active_product == -1 || $active_product == 20 && i == 2) { break; }
    arr.push({prod:$active_product, shape:i, start:null, overflow:{ has:false, source:null, block_idx:null, idx:null }});
  }
  const fwdProduct = products.fwdOf($active_product);
  if (fwdProduct) { arr.push({prod:fwdProduct, start:null, overflow:{ has:false, source:null, block_idx:null, idx:null }}) }
  all_prices = arr;
  if (!scroll_reset) { reset(); }
}

/**
 * Handles dispatched overflow and reset events to organise and arrange the data in the container array so that it is displayed correctly
 * @param e event, or null
 */
async function formatContainers(e) {
  let p = all_prices;
  if (e?.detail?.type == "overflow") {
    let curr_pg = p[e.detail.index];
    let next_pg = p[e.detail.index+1];
    let spl = (e.detail.index+1 < p.length && next_pg != null &&
        (curr_pg.data_array ? curr_pg.data_array.at(-1).prod : curr_pg.prod) == (next_pg.data_array ? next_pg.data_array.at(-1).prod : next_pg.prod) &&
        (curr_pg.data_array ? curr_pg.data_array.at(-1).shape : curr_pg.shape) == (next_pg.data_array ? next_pg.data_array.at(-1).shape : next_pg.shape))
        ? 1 : 0;
    p.splice(e.detail.index+1, spl, e.detail.col);
    all_prices = p;
    removeBlanks();
  } else if (e?.detail?.type == "reset") {
    if (e.detail?.from == "ctx") {
      let cdiff = Math.round((Array.from(document.querySelectorAll(".col:not(.col_spacer)")).at(-1).getBoundingClientRect().right - e.detail.container.getBoundingClientRect().left) / 403) + 1;
      while (cdiff) { p.push(null); cdiff--; }
    }
    let cont = p[p[e.detail.index]?.overflow.has ? e.detail.index : p[e.detail.index]?.overflow.source]
    if (cont) { cont.overflow.has = false; }
    all_prices = p;
    if (e.detail?.from == "ctx") {
      await new Promise(res => setTimeout(res, 1));
      removeBlanks();
    }
  }
  checkPositions(e);
  checkScrollMask();
}

/**
 * Forces container widths to ensure blocks do not overlap
 */
async function checkPositions() {
  await tick();
  if (whiteboard_main) {
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
 * When a container recedes, it can be in a position where it effectively generates duplicate price tables. When the last column of a given shape loads
 * it will dispatch an event which passes the relevant data to this function, which will then remove the relevant containers from the array
 * @param bi block index from container that generated source event
 * @param pd price data from container that generated source event
 * @param t  table element that loaded to cause the event
 */
async function removeDupeContainers(bi, pd, t) {
  await new Promise(res => setTimeout(res, 100));
  if (!whiteboard_main?.contains(t)) { return; }
  let p = all_prices;
  let elements = Array.from(whiteboard_main.querySelectorAll(`table[pt_pg-ref*='${t.getAttribute('pt_pg-ref')}' i]`));
  if (elements.length > 1) {
    elements.forEach((el, idx) => {
      if (whiteboard_main.contains(el)) {
        let dupe_ci = +el.parentElement.id[10];
        if (idx >= 1 && whiteboard_main.contains(el) && p[dupe_ci] && (p[dupe_ci].prod ?? p[dupe_ci].data_array[bi]?.prod) == (pd.prod ?? pd.data_array[bi].prod)) {
          p.splice(dupe_ci, 1);
        }
      }
    });
  }
  all_prices = p;
}
</script>


<div id="whiteboard-main" class="whiteboard" use:watchResize={handleResize} bind:this={whiteboard_main} on:scroll={(e) => { checkScrollMask(e); end_dist = whiteboard_main.scrollWidth - (whiteboard_main.scrollLeft + whiteboard_main.offsetWidth); }}>
  {#each all_prices as data, i (i)}
    <PriceTablesContainer
      price_data={data}
      container_index={i}
      on:get_history={(e) => {addHistoryModal(e)}}
      on:formatContainers={(e) => {formatContainers(e);}}
      on:resetContainers={(e) => {resetAllPrices();}}
      on:lastColLoaded={(e) => {removeDupeContainers(e.detail.block_index, e.detail.price_data, e.detail.table)}}
      on:select={(e) => {copyData = e.detail;}}
      />
  {/each}
</div>

{#if $toasts}<div class="toast"><Toasts /></div>{/if}

<PriceHistoryModal bind:this={price_history_modals}/>

<style>
.whiteboard {
  display: inline-flex;
  width: 100%;
  height: calc(100vh - 56px - 92px);
  min-height: 698px;
  margin-left: 10px;
  margin-right: 10px;
  margin-top: 1px;
  padding-left: 3px;
  padding-bottom: 5px;
  position: relative;
  overflow-x: auto;
}

.toast {
  position: absolute;
  right: 0;
  z-index: 100;
}

</style>
