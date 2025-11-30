<script>
  import { onMount, tick } from "svelte";
  import { watchResize } from "svelte-watch-resize";

  import WhiteboardSidebar from "./WhiteboardSidebar.svelte";
  import PriceTablesContainer from "./PriceTablesContainer.svelte";
  import PriceHistoryModal from "./PriceHistoryModal.svelte";
  import Filter from 'carbon-icons-svelte/lib/Filter.svelte';
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";

  import prices from '../stores/prices.js';
  import products from "../stores/products";
  import currency_state from "../stores/currency_state";
  import filters from '../stores/filters';
  import active_product from "../stores/active_product";
  import { selected_custom_wb } from "../stores/custom_whiteboards";

  export let blueprint = [[]]; // Expected structure array of array of objects, where the inner arrays define columns, and the objects define the blocks within - see custom_whiteboards store
  export let indicators = []; // Array of product ids to be included in the indicators panel/sidebar
  export let selected_filters = {}; // Object defining filters - see filters store
  export let lives_only = false; // Boolean to define whether price tables should be further refined to show only those with orders
  export let show_ticker = true; // Boolean to define whether this whiteboard has a futures ticker bar above it

  $: isLO = $selected_custom_wb.board_id == -1 && $active_product == -1;
  
  let whiteboard_main;

  $: if (JSON.stringify(selected_filters) != JSON.stringify(isLO ? $filters[0] : $selected_custom_wb.filters)) { selected_filters = isLO ? $filters[0] : $selected_custom_wb.filters; }
  $: resetAllPrices(selected_filters, blueprint, $currency_state);
  
  let price_history_modals;
  let addHistoryModal = (e) => {price_history_modals?.addModal(e);}
  
  /* Order Filtering */

  let blank_board = 0;
  let all_prices = [];

  function resetAllPrices() {
    buildFromBlueprint();
    checkPositions();
  }

  /**
   * Resets the whiteboard - regenerates the data array
   */
  function buildFromBlueprint() {
    function determineLiveProd(pid) {
      if (!pid) return;
      let arr = [];
      $prices[pid].forEach((shape, sidx) => {
        arr[sidx] = [];
        shape.forEach(group => {
          if (group.bids.length || group.offers.length) { 
            arr[sidx].push(group);
          }
        });
      });
      if (arr.some(y => y.length)) {
        ap.push({prod:pid, shape:null, start:null, overflow:{has:false, source:null, block_idx:null, idx:null}});
        if (!products.isFwd(pid)) {
          live_prods.push(pid);
        }
      }
      determineLiveProd(products.fwdOf(pid));
    }

    let ap = [];
    let live_prods = [];
    if (!blueprint?.[0]?.length) { //if blueprint undefined or defined incorrectly, treat as LO and generate dynamic structure
      for (let pid in $prices) {
        if (products.currency(+pid) !== $currency_state.currency || products.isFwd(+pid)) { continue; }
        determineLiveProd(+pid);
      }
      indicators = live_prods;
    } else if (blueprint.flat().some(block => block.product_id == undefined || block.shape == undefined)) {
      //if structure is correct, but not yet configured (or undefined from a block rolling too far and being cleared)
      /* This has been intentionally left blank */
    } else {
      for (let col of blueprint) {
        if (col.length == 1) {
          ap.push({prod:col[0].product_id, shape:col[0].shape, start:null, overflow:{has:false, source:null, block_idx:null, idx:null}});
        } else {
          ap.push({data_array:col.map(block => {return {prod:block.product_id, shape:block.shape, start:null}}), overflow:{has:false, source:null, block_idx:null, idx:null}});
        }
      }
    }
    all_prices = ap;
  }

  /* Scrolling */

  /*
   * Offsets the scroll position when opening and closing the sidebar/indicator drawer 
  */
  $: shift = shift || whiteboard_main?.previousElementSibling.getBoundingClientRect().width - 36;
  let end_dist;
  async function handleSidebarOverlap(e) {
    let showIndicators = e.detail.showIndicators; 
    if (whiteboard_main && whiteboard_main.offsetHeight - whiteboard_main.clientHeight) {
      if (showIndicators && whiteboard_main.scrollLeft > 0) {
        await tick();
        whiteboard_main.scrollLeft += shift;
      } else if (!showIndicators) {
        whiteboard_main.scrollLeft -= whiteboard_main.scrollLeft + whiteboard_main.offsetWidth < whiteboard_main.scrollWidth ? shift : end_dist;
      }
    }
  }

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

  onMount(() => {
    whiteboard_main.addEventListener('mousewheel', (e) => {
      if (document.body.offsetHeight - document.body.scrollHeight == 0) {
        whiteboard_main.scrollLeft -= (Math.max(-1, Math.min(1, (e.wheelDelta))) * 70);
      }
    }, false);
    observer.observe(whiteboard_main);
  });

  let mask = {left: false, right: false};
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

  /* Whiteboard Handling */

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
    checkPositions();
    checkScrollMask();
  }

  /**
   * When a container recedes, it can be in a position where it effectively generates duplicate price tables. When the last column of a given shape loads
   * it will dispatch an event which passes the relevant data to this function, which will then remove the relevant containers from the array
   * @param bi block index from container that generated source event
   * @param pd price data from container that generated source event
   * @param t  table element that loaded to cause the event
   */
  async function removeDupeContainers(bi, pd, t) {
    await tick();
    if (!whiteboard_main?.contains(t)) { return; }
    let p = all_prices;
    let elements = Array.from(whiteboard_main.querySelectorAll(`table[pt_pg-ref='${t.getAttribute('pt_pg-ref')}' i]`));
    if (elements.length > 1) {
      elements.forEach((el, idx) => {
        let dupe_ci = +el.parentElement.id[10];
        if (idx >= 1 && whiteboard_main.contains(el) && (p[dupe_ci].prod ?? p[dupe_ci].data_array[bi]?.prod) == (pd.prod ?? pd.data_array[bi].prod)) {
          p.splice(dupe_ci, 1);
        }
      });
    }
    all_prices = p;
  }

  $: if (indicators.length && (selected_filters?.nonfirm || selected_filters?.interests)) { checkPositions(); }

  /**
   * Forces container widths to ensure blocks do not overlap
   */
  async function checkPositions() {
    await tick();
    if (whiteboard_main) {
      Array.from(whiteboard_main.getElementsByClassName("col")).forEach((col, idx) => {
        let c_count = col.childElementCount;
        if (c_count && idx < all_prices.length) {
          checkMargins(idx);
          let last;
          do {
            last = col.children[--c_count];
          } while (c_count > 0 && window.getComputedStyle(last).getPropertyValue("display") == "none");
          col.style.setProperty("min-width", (last.getBoundingClientRect().right - col.getBoundingClientRect().left) + "px");
        } else {
          col.style.removeProperty("min-width");
        }
      });
      checkNotBlank();
    }
  }

  /**
   *  If the next sibling container after a given container is for a different product, the given container's blocks
   *  should have a margin added to it for visual clarity.
   */
  function checkMargins(container_index) {
    let container = whiteboard_main.querySelector(`#price-tables-container-${container_index}`);
    let n = container_index + 1;
    let next_cont;
    do {
      next_cont = whiteboard_main.querySelector(`#price-tables-container-${n++}`);
    } 
    while (next_cont?.style.display === "none" && n < all_prices.length);
    if (next_cont == null || next_cont?.firstElementChild?.getAttribute("block_prod-id") == container?.lastElementChild?.getAttribute("block_prod-id")) {
      container.style.setProperty("margin-right", "0px");
    } else {
      container.style.setProperty("margin-right", "17px");
    }
  }

  /**
   *  If all the containers have been hidden due to not having anything inside them, text should be displayed accordingly
   */
  function checkNotBlank() {
    blank_board = 0;
    if ($active_product == -1) {
      let containers = Array.from(whiteboard_main?.getElementsByClassName("col") ?? []);
      if (!all_prices?.length || !containers.length) {
        return blank_board = -1;
      } else if (containers.every(c => window.getComputedStyle(c).getPropertyValue("display") === "none")) {
        return blank_board = 1;
      }
    }
  }

  function getBlankBoardText() {
    const htmlStr = (lh, str) => `<h3 style="line-height:${lh}rem">${str}</h3>`;
    if (isLO) {
      return htmlStr(6, filters.isDefault() ? "There are currently no live orders" : "There are no orders that match the current filter selection");
    } else if (blank_board == -1) {
      return htmlStr(6, "This custom whiteboard is configured incorrectly") + 
        htmlStr(3, "This may be due to a product with specific dates being selected with dates that are no longer available");
    } else {
      let str;
      if (!filters.isDefault()) { str = "There are no orders that match the current filter selection and the selected board layout"; }
      else if (filters.isDefault() && lives_only) { str = "There are currently no live orders for the selected board layout"; }
      else { str = "There are no tenors to display for the selected board layout"; }
      return htmlStr(6, str);
    }
  }
</script>


<div id="whiteboard-container" use:watchResize={handleResize}>
  <WhiteboardSidebar product_list={[...new Set(indicators)]} on:indicatorsChange={handleSidebarOverlap} />
  <div id="custom-whiteboard"
    bind:this={whiteboard_main}
    on:scroll={(e) => { checkScrollMask(e); end_dist = whiteboard_main.scrollWidth - (whiteboard_main.scrollLeft + whiteboard_main.offsetWidth); }}
    style="--ticker-offset:{show_ticker ? "98px" : "0px"};"
    >
    {#each all_prices as data, i}
      <PriceTablesContainer
        price_data={data}
        container_index={i}
        cols_blueprint={blueprint}
        {lives_only}
        on:get_history={(e) => {addHistoryModal(e)}}
        on:formatContainers={(e) => {formatContainers(e);}}
        on:resetContainers={() => {resetAllPrices();}}
        on:lastColLoaded={({detail}) => {removeDupeContainers(detail.block_index, detail.price_data, detail.table)}}
        on:liveFiltered={({detail}) => {
          if (isLO) {
            let idx = indicators.indexOf(detail.prod);
            if (idx != -1) indicators.splice(idx, 1);
            indicators = indicators;
          }
        }}
        />
    {/each}
    {#if blank_board}
      <div style="min-width:max-content; display:inline-flex; flex-direction:column;">
        {#key blank_board}{@html getBlankBoardText(blank_board)}{/key}
        {#if isLO || blank_board == 1 && !filters.isDefault()}
          <div style="display:flex;">
            <h3>Use the filters&nbsp;</h3>
            <Filter size=2.25em/>
            <h3>&nbsp;in the top-right of the navigation bar to see other orders</h3>
          </div>
        {:else}
          <div style="display:flex;">
            <h3>Adjust the board layout in the whiteboard settings menu&nbsp;</h3>
            <Settings size=2.25em/>
            <h3>&nbsp;in the upper-right corner</h3>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<PriceHistoryModal bind:this={price_history_modals}/>


<style>
  #whiteboard-container {
    position: relative;
    display: flex;
    z-index: 0;
  }

  #custom-whiteboard {
    display: inline-flex;
    height: calc(100vh - 56px - var(--ticker-offset) - 39px);
    min-height: 718px;
    margin-left: 10px;
    margin-right: 10px;
    margin-top: 1px;
    padding-left: 3px;
    padding-bottom: 5px;
    position: relative;
    overflow-x: auto;
  }
</style>