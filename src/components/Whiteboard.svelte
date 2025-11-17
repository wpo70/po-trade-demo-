<script>
  import { onMount, tick } from "svelte";

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
  export let lives_only = false; // Boolean to define whether price tables should be further refined to show only those with orders
  export let show_ticker = true; // Boolean to define whether this whiteboard has a futures ticker bar above it

  export let whiteboard_ref; // Reference to the whiteboard div element

  $: isLO = $selected_custom_wb.board_id == -1 && $active_product == -1;
  
  let selected_filters = {}; // Object defining filters - see filters store
  $: filter_src = $active_product > 0 ? $filters[$active_product] : ( $selected_custom_wb.board_id == -1 ? $filters[0] : $selected_custom_wb.filters );
  $: if (JSON.stringify(selected_filters) != JSON.stringify(filter_src)) { selected_filters = filter_src; }
  
  let price_history_modals;
  let addHistoryModal = (e) => {price_history_modals?.addModal(e);}
  
  /* ---------- Order Filtering and Board Structure ---------- */

  let blank_board = 0;
  let all_prices = [];

  $: resetAllPrices(blueprint, $currency_state);
  /**
   * Resets the whiteboard - regenerates the data array then checks the positions and mask
   */
  function resetAllPrices() {
    buildFromBlueprint();
    checkPositions();
    checkScrollMask();
  }

  /**
   * Builds the structure of the whiteboard from the provided blueprint (see <WhiteboardCustomPage> for blueprint definition)
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
        ap.push({prod:pid, shape:null, start:null, overflow:{has:false, source:null, block_idx:null, table_max:null}});
        if (!products.isFwd(pid)) {
          live_prods.push(pid);
        }
      }
      determineLiveProd(products.fwdOf(pid));
    }

    function addOtherKeys(source, target) {
      const ignores = ["product_id", "shape", "tenors", "nonpersists"];
      const other_vals = Object.fromEntries(
        Object.entries(source).filter(([key]) => !ignores.includes(key))
      );
      Object.assign(target, other_vals);
      return target;
    }

    let ap = [];
    let live_prods = [];
    if (!blueprint?.[0]?.length) { //if blueprint undefined or defined incorrectly, treat as LO and generate dynamic structure
      for (let pid in $prices) {
        if (products.currency(+pid) !== $currency_state || products.isFwd(+pid)) { continue; }
        determineLiveProd(+pid);
      }
      indicators = live_prods;
    } else if (blueprint.flat().some(block => block.product_id == undefined || block.shape == undefined)) {
      //if structure is correct, but not yet configured (or undefined from a block rolling too far and being cleared)
      /* This has been intentionally left blank */
    } else {
      for (let col of blueprint) {
        let col_obj = {};
        if (col.length == 1) {
          col_obj = {prod:col[0].product_id, shape:col[0].shape, start:null, overflow:{has:false, source:null, block_idx:null, table_max:null}};
          addOtherKeys(col[0], col_obj);
        } else {
          let extra_vals = {};
          const data_array = col.map(block => {
            addOtherKeys(block, extra_vals);
            return {prod:block.product_id, shape:block.shape, start:null};
          });
          col_obj = {data_array, overflow:{has:false, source:null, block_idx:null, table_max:null}};
          addOtherKeys(extra_vals, col_obj);
        }
        ap.push(col_obj);
      }
    }
    all_prices = ap;
  }

  /* ---------- Scrolling and Window Sizing ---------- */

  const observer = new ResizeObserver(async () => {
    await new Promise(res => setTimeout(res, 10));
    if (whiteboard_ref) {
      checkPositions(new CustomEvent("rescale", { detail:{type: "rescale"} }));
      checkScrollMask();
    }
  });

  const parentObserver = new ResizeObserver(handleResize);
  let height;
  function handleResize(e) {
    let el = e[0].target;
    if (!whiteboard_ref) { return; }
    if (!height) {
      height = el.clientHeight;
    } else if (Math.abs(height - el.clientHeight) > 10) {
      height = el.clientHeight;
      resetAllPrices();
    }
  }

  onMount(() => {
    whiteboard_ref.addEventListener('mousewheel', (e) => {
      if (document.body.offsetHeight - document.body.scrollHeight == 0) {
        whiteboard_ref.scrollLeft -= Math.ceil(Math.max(-1, Math.min(1, (e.wheelDelta))) * 70);
        if (whiteboard_ref.scrollLeft + whiteboard_ref.offsetWidth >= whiteboard_ref.scrollWidth - 7) {
          whiteboard_ref.scrollLeft = Math.ceil(whiteboard_ref.scrollWidth - whiteboard_ref.offsetWidth);
        } else if (whiteboard_ref.scrollLeft < 7) {
          whiteboard_ref.scrollLeft = 0;
        }
      }
    }, false);
    observer.observe(whiteboard_ref);
    parentObserver.observe(whiteboard_ref.parentElement);
  });

  let mask = {left: false, right: false};
  /**
   * Handles scroll mask (black blur at ends of the whiteboard) based on the current scroll position
   */
  function checkScrollMask() {
    if (!whiteboard_ref) return;
    const scrollBarHeight = whiteboard_ref.offsetHeight - whiteboard_ref.clientHeight;
    if (!scrollBarHeight) {
      mask.left = false;
      mask.right = false;
      whiteboard_ref.style.removeProperty("-webkit-mask");
      return;
    }
    const l = whiteboard_ref.scrollLeft != 0;
    const r = whiteboard_ref.scrollLeft + whiteboard_ref.offsetWidth + 0.8 <= whiteboard_ref.scrollWidth;
    if (l != mask.left || r != mask.right) {
      mask.left = l;
      mask.right = r;
      whiteboard_ref.style.setProperty("-webkit-mask",
      `linear-gradient(90deg,#0000,#000 ${l ? 2 : 0}% ${r ? 98 : 100}%,#0000), \
      linear-gradient(to top, #000 ${scrollBarHeight}px, #0000 ${scrollBarHeight}px)`);
    }
  }

  async function removeBlanks() {
    await tick(); await tick(); await tick();
    let p = all_prices;
    while (p[p.length - 1] == null) { p.pop(); }
    all_prices = p;
  }

  /* ---------- Whiteboard Handling ---------- */

  /**
   *  Helper class to get prod in price data, whether it is a data array or standard column container
   *  @param pd price data object
   *  @param idx optional index used for positioning if it is a data array
   */
  function dataProd(pd, idx = 0) {
    return (pd.hasOwnProperty("data_array") && pd.data_array) ? pd.data_array.at(idx).prod : pd.prod;
  }

  /**
   *  Helper class to get shape in price data, whether it is a data array or standard column container
   *  @param pd price data object
   *  @param idx optional index used for positioning if it is a data array - using Array.at(idx)
   */
  function dataShape(pd, idx = 0) {
    return (pd.hasOwnProperty("data_array") && pd.data_array) ? pd.data_array.at(idx)?.shape : pd.shape;
  }

  /**
   * Handles dispatched overflow and reset events to organise and arrange the data in the container array so that it is displayed correctly
   * @param e event, or null
   */
  async function formatContainers(e) {
    let p = all_prices;
    if (e?.detail?.type == "overflow") {
      let index = e.detail.index;
      const col = e.detail.col;
      let curr_pd = p[index];
      let next_pd = p[index+1];
      while ( // Handle simultaneous overflows (when container index no longer matches the source containers position)
          !(dataProd(col) == dataProd(curr_pd, -1) && dataShape(col) == dataShape(curr_pd, -1) && curr_pd.overflow.has && col.start == curr_pd.overflow.table_max + curr_pd.start)
          && index < p.length - 1
      ) {
        col.overflow.source = ++index;
        curr_pd = p[index];
        next_pd = p[index+1];
      }
      const spl = +!!(index+1 < p.length && next_pd != null && dataProd(curr_pd, -1) == dataProd(next_pd) && dataShape(curr_pd, -1) == dataShape(next_pd));
      p.splice(index+1, spl, col);
      all_prices = p;
      removeBlanks();
    } else if (e?.detail?.type == "reset") {
      if (e.detail?.from == "ctx") {
        let cdiff = Math.round((Array.from(document.querySelectorAll(".col:not(.col_spacer)")).at(-1).getBoundingClientRect().right - e.detail.container.getBoundingClientRect().left) / 403) + 1;
        while (cdiff > 0) { p.push(null); cdiff--; }
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

  let broad_tenors = Array(2);
  /**
   * Function to concatenate (or splice) the respective specific sps column to/from the blueprint (for the stir page)
   * @param event passed from clicking on the middle cells of the price table
   */
  async function openSpecificDates(event){
    const {price_group, broadTenor} = event.detail;
    const idx = price_group.years[0]*4-1;
    let p = all_prices;
    const last_broad_col = p.findLastIndex(f => f.prod == 18 && f.stirsps == (idx*3+3));
    if (last_broad_col == -1) { console.error("Failed to display specific SPS 3m or 6m"); return; }
    while (last_broad_col < p.length-1 && !p[last_broad_col+1].stirsps) {
      p.splice(last_broad_col+1, 1);
    }
    if (broad_tenors[idx] == broadTenor){
      all_prices = p;
      broad_tenors[idx] = null;
      return;
    }
    let scroll = whiteboard_ref.scrollLeft;
    let fwdTenor;
    if (price_group.fwd != null) {
      fwdTenor = price_group.fwd * 12;
    } else {
      let today = new Date();
      let date = new Date(price_group.start_date);
      fwdTenor = date.getMonth() - today.getMonth();
      fwdTenor += (date.getFullYear() - today.getFullYear())*12;
    }
    p.splice(last_broad_col+1, 0, {prod:18, shape:fwdTenor+(idx*25), broad_tenor:broadTenor, start:null, overflow:{has:false, source:null, block_idx:null, table_max:null}});
    p.push(null, null);
    all_prices = p;
    broad_tenors[idx] = broadTenor;
    await tick();
    await tick();
    whiteboard_ref.scrollLeft = scroll;
    await tick();
    Array.from(whiteboard_ref.getElementsByClassName("sps")).at(idx*-1)?.scrollIntoView({behavior:"smooth", inline:idx==0 ? "center" : "end"});
    removeBlanks();
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
    if (!whiteboard_ref?.contains(t)) { return; }
    let p = all_prices;
    let elements = Array.from(whiteboard_ref.querySelectorAll(`table[pt_pg-ref='${t.getAttribute('pt_pg-ref')}' i]`));
    if (elements.length > 1) {
      elements.forEach((el, idx) => {
        let dupe_ci = +el.parentElement.id[10];
        if (idx >= 1 && whiteboard_ref.contains(el) && dataProd(p[dupe_ci], bi) == dataProd(pd, bi)) {
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
    if (whiteboard_ref) {
      Array.from(whiteboard_ref.getElementsByClassName("col")).forEach((col, idx) => {
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
    let container = whiteboard_ref.querySelector(`#price-tables-container-${container_index}`);
    let n = container_index + 1;
    let next_cont;
    do {
      next_cont = whiteboard_ref.querySelector(`#price-tables-container-${n++}`);
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
      let containers = Array.from(whiteboard_ref?.getElementsByClassName("col") ?? []);
      if (!all_prices?.length || !containers.length) {
        return blank_board = -1;
      } else if (containers.every(c => window.getComputedStyle(c).getPropertyValue("display") === "none")) {
        return blank_board = 1;
      }
    }
  }

  /**
   * If the board is blank for whatever reason, this function will be called to generate the appropriate response/error message
   * Reasons: no orders on LO, no orders that match filters on LO, invalid custom board config, no matching (filters) orders with custom board config
   */
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

  /**
   * Gets all prices for current whiteboard page and returns 
   * prices that correlate to the product that was selected 
   * 
   */ 

  let ptc = [];
  let filteredPrices = [];
  let currentProducts = [];
  
  function getProductsPrices (e) {
    let productMap = new Map();
    let allPrices = [];
    currentProducts.length = 0;
    filteredPrices.length = 0;
    
    for (let arr of ptc) {
      if(arr == null) continue;
      allPrices = allPrices.concat(arr.sendPriceBlocks());
    }

    if(e.detail.selected == 18){ //Handle STIR setup
      allPrices.forEach(i => {
        i.forEach(p => {
          if(p[0] == undefined && p.product_id == e.detail.selected){
            filteredPrices.push(p);
          } else if(p?.[0]?.product_id == e.detail.selected){
            filteredPrices.push(p[0])
          }
        })
      })
    } else {
      filteredPrices = allPrices.flatMap(subArr => {
        return subArr.filter(p => p.product_id == e.detail.selected);
      });
    }

    for(let ap of allPrices){
      const product_id = ap[0].product_id ?? ap[0][0].product_id;
      let product_name = products.name(product_id);
      if(!productMap.has(product_id)){
        productMap.set(product_id, product_name);
        currentProducts.push({name: product_name, product_id: product_id});
      }
    }
  }

</script>


<div id="whiteboard"
  bind:this={whiteboard_ref}
  on:scroll={() => { checkScrollMask(); }}
  on:scroll
  style="--ticker-offset:{$active_product == -1 ? (show_ticker ? "98px" : "0px") : "98px + 45px"};"
  >
  {#each all_prices as data, i}
    <PriceTablesContainer
      bind:this={ptc[i]}
      allShapesPrices={filteredPrices}
      allNames={currentProducts}
      price_data={data}
      container_index={i}
      cols_blueprint={blueprint}
      broad_tenor={data?.broad_tenor}
      {lives_only}
      on:bubbledProdId={getProductsPrices}
      on:get_history={(e) => {addHistoryModal(e)}}
      on:formatContainers={(e) => {formatContainers(e);}}
      on:resetContainers={() => {resetAllPrices();}}
      on:lastColLoaded={({detail}) => {removeDupeContainers(detail.block_index, detail.price_data, detail.table)}}
      on:specificSPS={openSpecificDates}
      on:liveFiltered={({detail}) => {
        if (isLO) {
          let idx = indicators.indexOf(detail.prod);
          if (idx != -1) { indicators.splice(idx, 1); }
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

<PriceHistoryModal bind:this={price_history_modals}/>


<style>
  #whiteboard {
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