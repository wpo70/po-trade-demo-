<script>
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import { Tile, Button, Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
  import Renew from 'carbon-icons-svelte/lib/Renew.svelte';
  import Close from 'carbon-icons-svelte/lib/Close.svelte';

  import Indicator from './Indicator.svelte';
  import Fxrate from './Fxrate.svelte';
  import Pulltab from './Utility/Pulltab.svelte';

  import { spin } from '../common/animations.js';
  import websocket from '../common/websocket.js';
  import { addMonths, getSecondThursday, toPrice } from '../common/formatting.js';

  import products from '../stores/products.js';
  import currency_state from '../stores/currency_state.js';
  import quotes from '../stores/quotes.js';
  import ticker from '../stores/ticker.js';
  import dailyfx from '../stores/fxrate.js';
  import { view } from '../stores/active_product';

  const dispatch = createEventDispatcher();

  export let product_list = [];
  export let showIndicators = false;
  export let whiteboard_ref;

  let selectedProd;
  let selected_quotes = [];
  $: fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state);

  /* ---------- Indicators/Quotes Handling ---------- */

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
    websocket.getQuotes(selectedProd);
    indicators_refresh_inner.animate(spin(-1), {duration:1000});
  }

  $: updateIndicators($quotes);
  function updateIndicators(e) {
    selected_quotes = $quotes[selectedProd]?.filter(i => (selectedProd == 3 && i.year <= 2) || (selectedProd != 20 && selectedProd != 3) || i.year > 1000);
    blur();
    scrollToProd(e?.detail?.selectedId);
    async function blur() {
      await new Promise(res => setTimeout(res, 1));
      if (document.activeElement.localName == 'button' && document.querySelector(".sidebar")?.contains(document.activeElement)) { document.activeElement.blur(); }
    }
  }

  let quotes_bbsw, quotes_90dIR;
  let changes = new Array(12).fill(null);
  let headers_90dIR = [];
  $: handleSTIRIndicators($ticker);

  let today = new Date();
  let monthDiff = (today.getMonth() + 1) % 3;
  if (monthDiff == 0) {
    let date = getSecondThursday(today.getMonth() + 1, today.getFullYear());
    if (date.getTime() < today.getTime()) {
      today = addMonths(today, 3);
    }
  } else {
    today = addMonths(today, 3 - monthDiff);
  }
  for (let i = 1; i <= 12; i++){
    headers_90dIR.push(today.toString().split(" ")[1] + " " + (today.getFullYear() - 2000));
    today = addMonths(today, 3);
  }

  function handleSTIRIndicators() {
    function colourLogic(val, prev) {
      if (val > prev) {
        return true;
      } else if (val < prev) {
        return false;
      } else {
        return null;
      }
    }

    let new90d = ticker.get90dFutures();
    if (!quotes_90dIR) quotes_90dIR = new90d;
    else {
      let change = false;
      for (let i = 0; i < quotes_90dIR.length; i++){
        let color = colourLogic(new90d[i].ask, quotes_90dIR[i].ask);
        if (color != null && !change) {
          change = true;
          changes = new Array(12).fill(null);
          changes[i] = color;
        } else if (color != null && change) {
          changes[i] = color;
        }
      }
      quotes_90dIR = new90d;
    }
    quotes_bbsw = ticker.getBBSW();
  }

  /* ---------- Scrolling ---------- */

  /**
   * Scrolls to the first container containing the given product
   * @param id product id [to convert to name string] to find the respective column
   */
  async function scrollToProd(id) {
    if (!id) { return; }
    await tick();
    let q_str = id == 18 ? `th[pt_header*='SPS\u2003' i]` : `th[pt_header='${products.name(id)}' i]`;
    document.querySelector(q_str)?.scrollIntoView({behavior:"smooth", inline:"center"});
  }

  let end_dist;
  export function updateEndDist() {
    end_dist = whiteboard_ref.scrollWidth - (whiteboard_ref.scrollLeft + whiteboard_ref.offsetWidth);
  }

  let shift;
  setSidebarOffset();
  function setSidebarOffset() {
    shift ||= (whiteboard_ref?.previousElementSibling.getBoundingClientRect().width ?? 36) - 36; // Pull tab width = 36px
  }

  $: handleSidebarOverlap(showIndicators);
  /**
   * Offsets the scroll position when opening and closing the sidebar/indicator drawer 
   */
  async function handleSidebarOverlap() {
    if (whiteboard_ref && whiteboard_ref.offsetHeight - whiteboard_ref.clientHeight) {
      if (showIndicators && whiteboard_ref.scrollLeft > 0) {
        await tick();
        setSidebarOffset();
        whiteboard_ref.scrollLeft += shift;
      } else if (!showIndicators) {
        whiteboard_ref.scrollLeft -= whiteboard_ref.scrollLeft + whiteboard_ref.offsetWidth < whiteboard_ref.scrollWidth ? shift : end_dist;
      }
    }
  }

  /* ---------- Products Handling ---------- */

  let dropdown_items = [];
  $: {
    if (!product_list.length) { selected_quotes = null; break $; }
    dropdown_items = []; 
    product_list.forEach(id => { dropdown_items.push({ id, text: products.name(id) }); });
    if (!dropdown_items.some(i => i.id == selectedProd)) { selected_quotes = null; }
    if (product_list.length && !selected_quotes) { selectedProd = dropdown_items[0]?.id; updateIndicators(); }
  }

  onMount(() => { if (product_list.length) { selectedProd = dropdown_items[0]?.id; updateIndicators(); } });

  /* ---------- Order Form Filling ---------- */

  let selected;
  function copyToOrderForm (indicator) {
    if ($view != "orders") { return; }
    if (!indicator || selected == indicator.year) {
      selected = undefined;
      dispatch("copyIndicator", {copyData:null});
      return;
    }
    let price = indicator.override ?? indicator.mid;
    const copyData = {
      years: [indicator.year],
      price: price,
      type: "indicator",
    };
    selected = indicator.year;
    dispatch("copyIndicator", {copyData});
  }

</script>


<div id="sidebar">
  {#if showIndicators && product_list.length}
    <div style="position: relative">
      <div id="close_btn_indicator" on:click={() => {showIndicators = false;}}><Close size={20} style="vertical-align:-webkit-baseline-middle;"/></div>
    </div>
    <Tile >
      <h5 style="font-weight:bold;">Indicators</h5>
      <Button
        on:click={refreshIndicators}
        kind="ghost"
        size="small"
        style="margin-top: 5px; margin-bottom: 5px;"
        >
        Refresh
        <div bind:this={indicators_refresh_inner} style="margin-left:.5rem; height:1rem;"><Renew size="1rem"/></div>
      </Button>

      {#if unsentRefresh}
        <p style="color: red; font-size: smaller; width:171px;">Please Wait 5s Between Refreshes</p>
      {/if}

      <Dropdown
        style="width: 171px;"
        bind:selectedId={selectedProd}
        items={dropdown_items}
        on:select={updateIndicators}
        />
      {#if selected_quotes?.length}
        {#if selectedProd == 17 || selectedProd == 27}
          <table class="indicators">
            <thead>
              <tr><th>Tenor</th><th>Ask</th></tr>
            </thead>
            <tbody>
              {#each headers_90dIR as tenor, i}
                <tr>
                  <td>{tenor}</td>
                  <td 
                    class:green={changes[i] !== null ? changes[i] : false}
                    class:red={changes[i] !== null ? !changes[i] : false}
                    >
                    {toPrice(quotes_90dIR[i].ask ?? 0)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else if selectedProd == 18}
          <table class="indicators">
            <thead>
              <tr><th>Tenor</th><th>Mid</th></tr>
            </thead>
            <tbody>
              <tr><td>BBSW 1M</td><td>{@html toPrice(quotes_bbsw[0].mid)}</td></tr>
              <tr><td>BBSW 2M</td><td>{@html toPrice(quotes_bbsw[1].mid)}</td></tr>
              <tr><td>BBSW 3M</td><td>{@html toPrice(quotes_bbsw[2].mid)}</td></tr>
              <tr><td>BBSW 4M</td><td>{@html toPrice(quotes_bbsw[3].mid)}</td></tr>
              <tr><td>BBSW 5M</td><td>{@html toPrice(quotes_bbsw[4].mid)}</td></tr>
              <tr><td>BBSW 6M</td><td>{@html toPrice(quotes_bbsw[5].mid)}</td></tr>
            </tbody>
          </table>
        {:else}
          <table class="indicators">
            <thead>
              <tr>
                <th>Tenor</th>
                <th>Mid</th>      
              </tr>
            </thead>
            <tbody>
              {#each selected_quotes as primary_indicator}
                <Indicator product_id={selectedProd} {primary_indicator} on:copy={copyToOrderForm(primary_indicator)}/>
              {/each}
            </tbody>
          </table>
          {#if [7,8,9,26].includes(selectedProd) }
            <table class="indicators subtable">
              <thead>
                <tr>
                  <th>FX</th>
                  <th>Last</th>
                </tr>
              </thead>
              <tbody>
                <Fxrate fxrate={fx}/>
              </tbody>
            </table>
          {/if}
        {/if}
      {:else}
        <SkeletonPlaceholder style="width: 171px; height: 400px;" />
      {/if}
    </Tile>
  {:else if product_list.length}
    <Pulltab direction="left" on:click={() => {showIndicators = true;}}/>
  {/if}
</div>

<style>
  .green {
    color: #3bdb23;
  }
  .red {
    color: red;
  }
  #sidebar {
    transition: 0.3s;
    overflow-y: auto;
    min-width: fit-content;
    &:has( .indicators) {
      min-height: 718px;
    }
    &:has( .pulltab) {
      margin-top: auto;
      margin-bottom: auto;
    }
    & .bx--tile {
      height: 100%;
    }
  }
  .indicators {
    border-collapse: collapse;
    margin-left: auto;
    margin-right: auto;
    & :where(th, td) {
      border: 1px solid var(--cds-ui-04);
      padding: 5px;
      min-width: 85px;
      text-align: center;
    }
    & thead tr, tbody tr:nth-of-type(even) {
      background: var(--cds-ui-02);
    }
  }
  .subtable {
    margin-top: 20px;
  }
  #close_btn_indicator {
    position: absolute;
    top: 0px;
    right: 0px;
    padding: 10px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color: var(--cds-hover-selected-ui);
    }
  }

  #sidebar::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  :global(#sidebar .bx--list-box__menu::-webkit-scrollbar) {
    width: 7px;
    height: 7px;
  }
</style>
