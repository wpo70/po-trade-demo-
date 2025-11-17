<script>
  import { afterUpdate, createEventDispatcher, onMount, tick } from 'svelte'

  import { Tooltip } from 'carbon-components-svelte';
  import WhiteboardContextMenu from './WhiteboardContextMenu.svelte';
  import PriceTable from './PriceTable.svelte';
  import Legs from './Legs.svelte';
  import { addDays, addMonths, getTimelessDate, timestampToISODate } from '../common/formatting.js';
  
  import active_product from '../stores/active_product';
  import products from '../stores/products';
  import prices from '../stores/prices';
  import filters from '../stores/filters';
  import { selected_custom_wb } from '../stores/custom_whiteboards';
  
  export let container_index = null;
  /**
   *  @price_data Structure of price {
   *    prod: {integer} product_id to display
   *    shape: {integer || null} shape of product to display, if null will display all shapes of product each as their own block within the container
   *    start: {integer} index position to start from (ie. after an overflow only show price groups after index 12 [so start:12])
   *    data_array: {array of objects} array version of above variables if container has multiple blocks
   *    overflow: { object defining the data for tracking overflows across containers
   *      has: {bool} tracks whether the container has overflowed
   *      source: {integer || null} container index that overflowed and passed its data to this container
   *      block_idx: {integer || null} the block index where the overflow point occurred
   *      table_max: {integer || null} the row (price table) index (specific price group row/index) where the overflow point occurred
   *    }
   *  }
   */
  export let price_data = {};
  export let broad_tenor = null;
  export let cols_blueprint = [];
  export let lives_only = false;
  export let allShapesPrices = [];
  export let allNames = [];

  const dispatch = createEventDispatcher();

  /**
   * @price_blocks an Array of price data get from store prices, based on active_product
  */
  let price_blocks = [];
 
 onMount(formatPriceBlocks);
 
 $: wb_filters = filterSet($selected_custom_wb, $filters);
  function filterSet() {
    return wb_filters = $active_product < 0 ? ($selected_custom_wb.board_id !== -1 ? $selected_custom_wb.filters : $filters[0]) : $filters[$active_product];
  }

  $: reoverflowPriceBlocks(wb_filters);
  $: formatPriceBlocks(null, $prices, price_data);

  function reoverflowPriceBlocks() {
    if (price_data && !price_data.data_array && price_data.start == null && price_data.overflow?.has != null) { price_data.overflow.has = false; }
    formatPriceBlocks();
  }

  // For context menu

  let hovered_pt = {};
  let ctx_target_cells = [];
  let container = null;

  async function refreshCentreCells(recur) {
    recur ??= 0;
    if (container) {
      let cellCount = ctx_target_cells.length;
      let htmlcollection = container.getElementsByClassName("centralCells");
      ctx_target_cells = ctx_target_cells.concat(Array.from(htmlcollection).filter((i) => ctx_target_cells.indexOf(i) < 0 && container.contains(i)));
      if (cellCount == ctx_target_cells.length && recur < 10) { await new Promise(res => setTimeout(res, 20)); refreshCentreCells(recur+1); }
    }
  }

  /* ======================================== Formatting and Filtering ======================================== */

  /** 
   * Formatting blocks and price tables
   */
  function formatPriceBlocks(e) {
    if (!container) { return; } // handle reactive call - container not yet mounted
    if (price_data == null) { return; } // handle placeholder cols for resets
    if (e?.detail?.collapsed) { resetContainers(); return; }
    
    filterPriceBlocks();
    
    formatBlockOverflows(e);
  }

  let today;
  /**
   * Create the price group data array for the price tables based on this containers price data
   */
  function filterPriceBlocks() {
    let new_blocks = [];
    if (price_data?.stirsps) {
      let half = $prices[18].slice(25*(price_data.stirsps/3 - 1), 25*(price_data.stirsps/3));
      if (!half[0] || half[0].length == 0) half.splice(0, 1);
      let filtered = applyFilters(half);
      new_blocks = [filtered.map((price_groups) => {
          today ??= getTimelessDate();
          let todayMonth = today.getMonth();
          let spot = addDays(today, 1);
          let tommorrowMonth = spot.getMonth();
          if (todayMonth != tommorrowMonth) spot = addMonths(spot, price_groups[0].fwd*12 - 1);
          else spot = addMonths(spot, price_groups[0].fwd*12);

          let key = timestampToISODate(spot);
          let result;
          let otherOrders = false;
          for(const pg of price_groups) {
            if (pg.tenor == key) {
              result = pg;
              continue;
            }
            if (pg.bids.length > 0 || pg.offers.length > 0) otherOrders = true;
            if (otherOrders && result) break;
          }

          // If the broad price group is hidden, the spot date will not be persistent and will not be found by the last loop so result will be undefined,
          // but if there is a specific-date order, other orders is true and so the spot date should be used for displaying the broads. This is found in the unfiltered list.
          let location = price_groups[0].fwd*12;
          if (!result && location >= 0 && location < 50) {
            for(const pg of half[location]) {
              if (pg.tenor == key) {
                result = pg;
                break;
              }
            }
          }
          
          return [result, otherOrders];
        })];
    } else if (price_data.data_array) {
      price_data.data_array.forEach(p => {
        new_blocks.push.apply(new_blocks, p.shape || p.shape === 0 ? [$prices[p.prod][p.shape]?.slice()] : $prices[p.prod].slice());
      });
    } else if (price_data.prod > 0) {
      new_blocks = (price_data.shape || price_data.shape === 0 ? [$prices[price_data.prod]?.[price_data.shape]?.slice()] : $prices[price_data.prod]?.slice());
    }

    if (!price_data?.stirsps) { new_blocks = applyFilters(new_blocks); }
    new_blocks ??= [];
    if (JSON.stringify(new_blocks) != JSON.stringify(price_blocks))  {
      let moved = shuffleSaveLegs();
      price_blocks = new_blocks;
      if (moved) { unshuffleSaveLegs(); }
    }
  }

  /** 
   * Check the container exists within the bounding box. Shift and format as needed
   */
  function formatBlockOverflows(e) {
    let reformat = null;
    formatBlock: {
      // if (price_data.data_array?.some(m => m.prod == 17 || m.prod == 27)) { break formatBlock; } // TODO: this line is for a temporary exception - will be removed in a later version
      let h_max = container.getBoundingClientRect().bottom;
      for (let [idx, price_block] of Array.from(container.getElementsByClassName("col_block")).entries()) {
        if (price_block.getBoundingClientRect().bottom > h_max) {
          for (let [i, pt] of Array.from(price_block.getElementsByTagName("table")).entries()) {
            if (pt.getBoundingClientRect().bottom > h_max) {
              reformat = {block: price_block, pt: pt, block_idx: idx, pos: i-1};
              price_data.overflow.has = true;
              break formatBlock;
            }
          }
        }
      }
    }
    if (reformat) { shiftPriceBlocks(reformat); }
    else { dispatch("formatContainers", {block: e?.detail?.table.parentElement, container}); }
    refreshCentreCells();
  }
  
  function resetContainers() {
    if (container) {
      dispatch("formatContainers", { type: "reset", index: container_index, container});
    }
  }

  /*
  * If a container extends beyond the WB bounding box, the overflowed contents should be moved to a new container
   * Relevant data formatted as needed is dispatched to be spliced into the WB's array
  */
  function shiftPriceBlocks(reformObj) {
    let new_col = structuredClone(price_data);
    if (price_data.data_array) {
      new_col.prod = price_data.data_array[reformObj.block_idx].prod;
      new_col.shape = price_data.data_array[reformObj.block_idx].shape;
    } else {
      new_col.prod = price_data.prod;
      new_col.shape = price_data.shape ?? reformObj.block_idx;
    }
    new_col.start = reformObj.pos + (price_data.start || 0);
    new_col.overflow = {has:false, source:container_index}
    if (new_col.start > $prices[new_col.prod][new_col.shape]?.length && !price_data.stirsps || price_data.stirsps && new_col.start > 24) {
      price_data.overflow.block_idx = reformObj.block_idx;
      price_data.overflow.table_max = reformObj.pos;
      return;
    }
    if (reformObj.block_idx < price_blocks.length-1) {
      let data_array = [new_col];
      if (price_data.data_array) {
        for (let i = reformObj.block_idx; i < price_data.data_array.length; i++) {
          data_array.push({prod:price_data.data_array[i].prod, shape:price_data.data_array[i].shape, start:null});
        }
      } else {
        data_array[0].shape = reformObj.block_idx;
        for (let i = reformObj.block_idx+1; i < price_blocks.length; i++) {
          data_array.push({prod:price_data.prod, shape:i, start:null});
        }
      }
      data_array = data_array.filter((val, idx, self) => 
        idx === self.findIndex((d) => (
          d.prod == val.prod && d.shape == val.shape
        ))
      );
      new_col = {...price_data, data_array, overflow:{ has:false, source:null, block_idx:null, table_max:null }}
    }
    price_data.overflow.block_idx = reformObj.block_idx;
    price_data.overflow.table_max = reformObj.pos;
    dispatch("formatContainers", { type:"overflow", index:container_index, col:new_col });
  }

  afterUpdate(() => {
    if (price_data != null && container)  {
      let blocks = Array.from(container.getElementsByClassName("col_block"));
      if (!blocks.length || blocks.every(b => window.getComputedStyle(b).getPropertyValue("display") === "none")) {
        container.style.display = "none";
      } else {
        container.style.removeProperty("display");
      }
    }
  });

  // Prices and data handling

  function applyFilters(block_arr) {
    if (block_arr === null || price_data == null) return null;

    // If the width filter is off, return one leg and apply other filters.
    let _wf = wb_filters.wf ? wb_filters.width_filter.value : 1000;

    // Map the prices into a deep copy.  Loop over each block (outrights, spreads, butterflys, or single block depending on context)
    let active_prices = Array(block_arr.length);
    for (let i = 0; i < block_arr.length; i++) {
      // Copy the array of price groups
      active_prices[i] = block_arr[i]?.map(function (price_group) {
        // sort prices and move interests to the bottom
        price_group.bids.sort(prices.sort_prices);
        price_group.offers.sort(prices.sort_prices);

        // Clone the price group
        let cp = Object.assign({}, price_group);

        // Filter the bids and offers
        let bid_diff;
        let offer_diff;

        let foundCompoundBid = false;
        let foundCompoundOffer = false;

        let best_bid = price_group?.bids?.[0]?.price;
        let best_offer = price_group?.offers?.[0]?.price;

        // Apply width filter
        let wf = wb_filters.wf ? filters.widthAllowance(_wf, products.nonFwd(price_group.product_id), price_group.years.length-1) : _wf;

        cp.bids = price_group.bids.filter((p) => {
          bid_diff = price_group.mid_point >= p.price ? price_group.mid_point - p.price : p.price - price_group.mid_point;
          if (isNaN(bid_diff) && !wb_filters.wf) bid_diff = 0;
          if (p.eoi) { return wb_filters.interests && (!wb_filters.wf || wb_filters.wf && !wb_filters.wf_outrights || wb_filters.wf && wb_filters.wf_outrights && p.price != null && bid_diff <= wf); }
          if (p.links.length > 1) {
            if (foundCompoundBid || bid_diff > wf || p.price < best_bid || (!p.firm && !wb_filters.nonfirm)) return false;
            else foundCompoundBid = true;
            return bid_diff <= wf;
          }
          return ((p.firm || wb_filters.nonfirm) && (!wb_filters.wf_outrights || bid_diff <= wf));
        });
        cp.offers = price_group.offers.filter((p) => {
          offer_diff = p.price >= price_group.mid_point ? p.price - price_group.mid_point : price_group.mid_point - p.price;
          if (isNaN(offer_diff) && !wb_filters.wf) offer_diff = 0;
          if (p.eoi) { return wb_filters.interests && (!wb_filters.wf || wb_filters.wf && !wb_filters.wf_outrights || wb_filters.wf && wb_filters.wf_outrights && p.price != null && offer_diff <= wf); }
          if (p.links.length > 1) {
            if (foundCompoundOffer || offer_diff > wf || p.price > best_offer || (!p.firm && !wb_filters.nonfirm)) return false;
            else foundCompoundOffer = true;
            return offer_diff <= wf;
          }
          return ((p.firm || wb_filters.nonfirm) && (!wb_filters.wf_outrights || offer_diff <= wf));
        });
        if (cp.bids.length == 0 && cp.offers.length == 0 && !cp.persist) return null;
        return cp;
      });
      active_prices[i] = active_prices[i]?.filter((pg) => pg != null);
    }
    active_prices = active_prices.filter(p => p?.length > 0);
    if (lives_only) { active_prices = liveOrdersFilter(active_prices); }
    return active_prices;
  }

  /*
   * LO are unique in that they can entirely remove a product's pgs for the WB. This function has additional handling to update the LO sidebar (indicators) accordingly
   */
  function liveOrdersFilter(block_arr) {
    let ret = [];
    block_arr.forEach((shape, sidx) => {
      let arr = [];
      shape.forEach(pg => {
        if (pg.offers.length > 0 || pg.bids.length > 0) { arr.push(pg); }
      });
      if (arr.length) ret[sidx] = arr;
    });
    for (let i = 0; i < ret.length; i++) {
      if (ret[i] == undefined) {
        ret[i] = [];
      }
    }
    if (ret.every(r => !r.length)) dispatch("liveFiltered", { prod:price_data.prod });
    return ret.filter(r => r.length);
  }

  /* ======================================== Live Prices ======================================== */

  /**
   *  Dispatching to whiteboard to get prices for all shapes respective to product_id.
   * 
   *  Returns an empty array if the price block overflows into a new price table
   *  as the original price table still stores all the values, even the ones that overflow.
   */
  export const sendPriceBlocks = () => (price_data.start == null && price_data?.broad_tenor == undefined) ? price_blocks : [];
  
  function bubbleProdId (e) {
    dispatch('bubbledProdId', {selected: e.detail.selected, product_name: e.detail.product_name})
  }

  /* ======================================== Legs ======================================== */

  let the_legs = null;
  let the_legs_pg_ref = "";

  // Handle the request to display the legs of a price
  function showLegs(event) {
    if (price_data == null) return;
    // If a legs display is already being shown, destroy it first.
    if (the_legs !== null) { the_legs.$destroy(); } 
    // Dynamically show the list of legs.
    the_legs = new Legs({
      target: event.detail.table.parentNode, // table's enclosing div
      anchor: event.detail.table,
      props: {
        price: event.detail.price,
      },
    });
    the_legs_pg_ref = event.detail.table.getAttribute('pt_pg-ref');
    // Format price arrays
    formatPriceBlocks(event);
    moveLegs();
    // Clicking anywhere off the legs will close it.
    the_legs.$on('close', closeLegs);
  }

  /**
   * If the legs push the table to the next container, or they do not fit in the current container, move them to the next container as well
   */
  async function moveLegs() {
    await new Promise(res => setTimeout(res, 1));
    const legs = container.getElementsByClassName("legs")[0];
    if (legs.getBoundingClientRect().bottom > container.getBoundingClientRect().bottom || !legs.nextElementSibling) {
      const next_container = document.getElementById(`price-tables-container-${container_index+1}`);
      next_container.getElementsByClassName("pricetable")[0].insertAdjacentElement("beforebegin", legs);
    }
    const l = container.parentElement.scrollLeft;
    const r = l + container.parentElement.offsetWidth;
    if (legs.getBoundingClientRect().left < l) {
      legs.scrollIntoView({behavior:"smooth", inline:"start"});
    } else if (legs.getBoundingClientRect().right > r) {
      legs.scrollIntoView({behavior:"smooth", inline:"end"});
    }
  }

  let selected_legs_pos = [];
  /**
   * When a block's data is updated, the block is refreshed. This function temporarily move the legs to before the parent element so their
   * target and anchor are not destroyed, in turn destroying them. Should be followed by an unshuffle call post-block update.
   */
  function shuffleSaveLegs() {
    if (the_legs) {
      selected_legs_pos = [];
      if (container.parentElement.contains(document.activeElement) && document.activeElement.classList.value.includes("editable")) {
        for (let el = document.activeElement, i = 0; i < 3; i++, el = el.parentElement) {
          selected_legs_pos.push(Array.from(el.parentElement.children).indexOf(el));
        }
      }
      const legs = container.parentElement.getElementsByClassName("legs")[0];
      if (legs) { container.parentElement.insertAdjacentElement("beforebegin", legs); }
      else { the_legs.$destroy(); the_legs = null; }
      return true;
    }
  }

  /**
   * Companion function to follow shuffleSaveLegs - see that function for details
   */
  async function unshuffleSaveLegs() {
    await tick();
    const legs = document.getElementsByClassName("legs")[0];
    const table = container?.parentElement.querySelector(`table[pt_pg-ref='${the_legs_pg_ref}' i]`);
    if (!table || !legs) { closeLegs(); return; }
    table.insertAdjacentElement("beforebegin", legs);
    if (selected_legs_pos.length) {
      await tick();
      const field = legs.children[selected_legs_pos[2]].children[selected_legs_pos[1]].children[selected_legs_pos[0]];
      field.click();
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(field.lastChild, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  // When changing products, close the legs
  $: closeLegs($active_product);

  async function closeLegs() {
    await tick();
    if (the_legs != null) the_legs.$destroy();
    the_legs = null;
    resetContainers();
  }

  /* ======================================== HTML Handling Functions ======================================== */

  function ptEFPSPSClasses(t) {
    let tenors = $prices[17][0].map(pg => pg.tenor);
    let idx = tenors.indexOf(t);
    switch (idx) {
      case 0: case 1: case 2: case 3:
        return "white";
      case 4: case 5: case 6: case 7:
        return "red";
      case 8: case 9: case 10: case 11:
        return "green";
      default:
        return "gold";
    }
  }

  function blueprintRefineEval(block, pg) {
    let p = price_data.prod ?? price_data.data_array[block].prod;
    let s = price_data.shape ?? price_data.data_array?.[block].shape;
    if (s == null) { // if shape is null, this is not a custom wb, so tenors cannot be refined anyway (return true to show pg on wb)
      return true;
    }
    let bp = cols_blueprint.flat().find(f => f.product_id == p && f.shape == s);
    let refined_tenors = bp?.tenors;
    let np = bp?.nonpersists ?? true;
    return (!refined_tenors?.length || refined_tenors.includes(pg.tenor) || !pg.persist && np);
  }

  let showFutRef = false;
  let futPos = {left: 0, top: 0};
  let fut = {tenor: '3Y', rate: 0};
  function openFutRef (e) {
    showFutRef = e.detail.open && !isNaN(e.detail.rate);
    if (showFutRef){
      futPos = {left: e.detail.left, top: e.detail.top};
      fut = {tenor: e.detail.tenor, rate: e.detail.rate};
    }
  }

</script>


<div
  id={`price-tables-container-${container_index}`}
  class="col"
  class:col_spacer={price_data == null}
  style:column-gap={price_data?.product_id || price_data?.data_array?.every(b => b.prod === price_data.data_array[0].prod) ? "0px" : "17px"}
  bind:this={container}
  >
  {#if price_data == null}
    <div style="height: 30px; width: 403px"/>
  {:else if price_blocks != undefined}
    {#each price_blocks as pgs_arr, i (pgs_arr)}
      {#if pgs_arr.length > 0 && (!price_data.start || price_data.start < pgs_arr.length)}
        <div
          id={`container-${container_index}_block-${i}`}
          class="col_block"
          class:secondary-prices={([1, 29].includes($active_product) && price_data.secondary)}
          class:efpsps={[17, 27].includes(pgs_arr[0].product_id)}
          class:fwd={products.isFwd(pgs_arr[0].product_id)}
          block_prod-id={price_data.prod ?? price_data.data_array?.[i].prod}
          >
          <!-- STIR -->
          {#if price_data?.stirsps}
            <PriceTable prod_name={`SPS ${price_data.stirsps}M`} 
            allNames={allNames} 
            allShapesPrices={allShapesPrices} 
            price_list={pgs_arr} 
            on:selectedProdId={bubbleProdId}/>
            {#each pgs_arr as price_group, j}
              {@const isAfterStart = price_data.data_array ? j >= price_data.data_array[i].start : j >= price_data.start}
              {@const isBeforeOverflow = !price_data.overflow.has || (i < price_data.overflow.block_idx || i == price_data.overflow.block_idx && j < price_data.overflow.table_max + ((price_data.data_array ? price_data.data_array[i].start : price_data.start) || 0))}
              {#if isAfterStart && isBeforeOverflow}
                <PriceTable price_group={price_group[0]} 
                other_classes="broadsps" 
                on:show_legs={showLegs} 
                on:showFutRef={openFutRef} 
                lib={j == pgs_arr.length-1} 
                on:specificSPS highlight={price_group[1]}
                  on:mouseenter={e => { hovered_pt = { cells: Array.from(e.target.getElementsByClassName("centralCells")), price_group: price_group[0] }; }} on:lastPrice={() => {formatPriceBlocks();}}
                />
              {/if}
            {/each}
          {:else if $active_product == 18 || products.isStir(price_data.prod ?? price_data.data_array?.[i].prod)}
            <PriceTable prod_name={(price_data.prod ?? price_data.data_array?.[i].prod) == 18 ? null : products.name(pgs_arr[0].product_id)} 
            allShapesPrices={allShapesPrices} 
            price_list={pgs_arr} 
            allNames={allNames} 
            on:selectedProdId={bubbleProdId} 
            broad_tenor={$active_product == 18 ? broad_tenor : `SPS\u2003${pgs_arr[0].fwd*12}x${pgs_arr[0].fwd*12+pgs_arr[0].years[0]*12}` }/>
            {#each pgs_arr as price_group, j (price_group.tenor)}
              {@const oc = [17,27].includes(pgs_arr[0].product_id) ? ptEFPSPSClasses(price_group.tenor) : (pgs_arr[0].product_id == 18 ? "sps" : "")}
              {@const isAfterStart = price_data.data_array ? j >= price_data.data_array[i].start : j >= price_data.start}
              {@const isBeforeOverflow = !price_data.overflow.has || (i < price_data.overflow.block_idx || i == price_data.overflow.block_idx && j < price_data.overflow.table_max + ((price_data.data_array ? price_data.data_array[i].start : price_data.start) || 0))}
              {#if blueprintRefineEval(i, price_group) && isAfterStart && isBeforeOverflow}
                <PriceTable 
                {price_group} 
                on:show_legs={showLegs} 
                on:showFutRef={openFutRef} 
                on:expand={formatPriceBlocks} 
                lib={j == pgs_arr.length-1}
                  specific={price_data.prod == 18} other_classes={oc} broad_tenor={$active_product == 18 ? broad_tenor : `SPS\u2003${pgs_arr[0].fwd*12}x${pgs_arr[0].fwd*12+pgs_arr[0].years[0]*12}`}
                  on:mouseenter={e => { hovered_pt = { cells: Array.from(e.target.getElementsByClassName("centralCells")), price_group: price_group }; }}
                />
              {/if}
            {/each}
          <!-- ELSE -->
          {:else}
            {#if !price_data.overflow.has || i <= price_data.overflow.block_idx}
              <PriceTable prod_name={products.name(pgs_arr[0].product_id)} 
              allShapesPrices={allShapesPrices} 
              price_list={pgs_arr} 
              allNames={allNames} 
              on:selectedProdId={bubbleProdId} />
              {#each pgs_arr as price_group, j (price_group.product_id + price_group.sortCode)}
                {@const isAfterStart = price_data.data_array ? j >= price_data.data_array[i].start : j >= price_data.start}
                {@const isBeforeOverflow = !price_data.overflow.has || (i < price_data.overflow.block_idx || i == price_data.overflow.block_idx && j < price_data.overflow.table_max + ((price_data.data_array ? price_data.data_array[i].start : price_data.start) || 0))}
                {#if blueprintRefineEval(i, price_group) && isAfterStart && isBeforeOverflow}
                  <PriceTable 
                  {price_group} 
                  on:show_legs={showLegs} 
                  on:showFutRef={openFutRef} 
                  on:expand={formatPriceBlocks} 
                  lib={j == pgs_arr.length-1}
                    on:mouseenter={e => { hovered_pt = { cells: Array.from(e.target.getElementsByClassName("centralCells")), price_group: price_group }; }} on:lastPrice={(e) => {dispatch("lastColLoaded", {container_index, block_index:i, price_data, table:e.detail.table})}}
                  />
                {/if}
              {/each}
            {/if}
          {/if}
        </div>
      {/if}
    {/each}
  {/if}
</div>

<WhiteboardContextMenu 
  pg={hovered_pt.price_group} 
  cc={hovered_pt.cells} 
  target_cells={ctx_target_cells} 
  ctx_id={`ctx-${container_index}`}
  on:get_history
  on:changed={() => { dispatch("formatContainers", { type: "reset", index: container_index, container, from:"ctx"}); }}
/>

<Tooltip class='futRef' style="left: {futPos.left}px; top: {futPos.top}px;" hideIcon={true} bind:open={showFutRef}>
  {fut.tenor} @ {fut.rate ?? '0.00'}
</Tooltip>


<style>
  .col {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    overflow-y: clip;
    min-width: fit-content;
  }
  .col_block {
    display: flex;
    flex-direction: column;
    min-height: fit-content;
    background-color: var(--cds-ui-01);
    margin-bottom: 20px;
    &:not(:has(> .pricetable)) {
      display: none;
    }
  }

  :global(.futRef) {
    position: fixed !important;
  }

  :global(.futRef .bx--tooltip) {
    width: fit-content; 
    min-width: fit-content;
    white-space: nowrap;
    padding: 4px;
    background-color: var(--cds-ui-03);
    color: var(--cds-text-primary);
  }
  :global(.futRef .bx--tooltip .bx--tooltip__caret) {
    border-bottom: 0.4296875rem solid var(--cds-ui-03);
  }
</style>
