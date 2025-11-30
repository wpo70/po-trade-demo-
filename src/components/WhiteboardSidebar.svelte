<script>
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import { Tile, Button, Dropdown, SkeletonPlaceholder } from 'carbon-components-svelte';
  import Renew from 'carbon-icons-svelte/lib/Renew.svelte';
  import Close from 'carbon-icons-svelte/lib/Close.svelte';

  import Indicator from './Indicator.svelte';
  import Fxrate from './Fxrate.svelte';

  import { spin } from '../common/animations.js';
  import websocket from '../common/websocket.js';
  import { addMonths, getSecondThursday, toPrice } from '../common/formatting.js';

  import products from '../stores/products.js';
  import currency_state from '../stores/currency_state.js';
  import quotes from '../stores/quotes.js';
  import ticker from '../stores/ticker.js';
  import dailyfx from '../stores/fxrate.js';

  const dispatch = createEventDispatcher();

  export let product_list = [];
  
  let showIndicators = false;
  $: dispatch("indicatorsChange", {showIndicators});

  let selectedProd;
  let selected_quotes = [];
  $: fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state.currency);

  /* Indicators */

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

  async function scrollToProd(id) {
    if (!id) { return; }
    await tick();
    let q_str = id == 18 ? `th[pt_header*='SPS\u2003' i]` : `th[pt_header='${products.name(id)}' i]`;
    document.querySelector(q_str)?.scrollIntoView({behavior:"smooth", inline:"center"});
  }

  /* Products Handling */

  let quotes_bbsw, quotes_90dIR;
  let changes = [null, null, null, null, null, null, null, null, null, null, null, null];
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
          changes = [null, null, null, null, null, null, null, null, null, null, null, null]
          changes[i] = color;
        } else if (color != null && change) {
          changes[i] = color;
        }
      }
      quotes_90dIR = new90d;
    }
    quotes_bbsw = ticker.getBBSW();
  }

  let dropdown_items = [];
  $: {
    if (!product_list.length) { selected_quotes = null; break $; }
    dropdown_items = []; 
    product_list.forEach(id => { dropdown_items.push({ id, text: products.name(id) }); });
    /* product_list.forEach(id => { id = products.nonFwd(id); dropdown_items.push({ id, text: products.name(id) }); });
    dropdown_items = dropdown_items.filter((value, index, self) =>
      index === self.findIndex((f) => (
        f.id === value.id && f.name === value.name
      ))
    ); */
    if (!dropdown_items.some(i => i.id == selectedProd)) { selected_quotes = null; }
    if (product_list.length && !selected_quotes) { selectedProd = dropdown_items[0]?.id; updateIndicators(); }
  }

  onMount(() => { if (product_list.length) { selectedProd = dropdown_items[0]?.id; updateIndicators(); } });

</script>

<svelte:window 
  on:keypress={(e) => {
    if (e.key.toLowerCase() == 'i') { showIndicators = !showIndicators; }
  }
}/>

<div class="sidebar">
  {#if showIndicators && product_list.length}
    <div style="position: relative">
      <div id="close_btn_indicator" on:click={() => {showIndicators = false;}}><Close size={20} style="vertical-align:-webkit-baseline-middle;"/></div>
    </div>
      <div style="background-color: #262626;   height:100%; position: fixed: top:134px; left: 0;" 
      class={'indicator-sm'}>
    <Tile >
      <h4>Indicators</h4>
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
      <div class="full-indicators-wrapper">
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
            <tbody class='indicator_body'>
              {#each selected_quotes as primary_indicator}
                <Indicator product_id={selectedProd} {primary_indicator} />
              {/each}
            </tbody>
          </table>
          {#if [7,8,9,26].includes(selectedProd) }
          <div style="height: 20px;position: relative"></div>
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
    </div>
    </Tile>
  </div>
  {:else if product_list.length}
    <div id="indicators_pulltab">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div on:click={() => {showIndicators = true;}} 
          style="height:60px; width:36px; display:flex; align-items:center; padding-bottom:3px; cursor:pointer;
          background:var(--cds-ui-01); border-top-right-radius:9px; border-bottom-right-radius:9px;"
        >
        <p style="color:var(--cds-text-05); text-shadow:2px 2px 3px var(--cds-inverse-01);
          padding-left:2px; font-size:24px; letter-spacing:3px; line-height:0.88; white-space:nowrap;" 
          >
          {"\u007C"}{"\u007C"}{"\u007C"}<br>{"\u007C"}{"\u007C"}{"\u007C"} 
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .green {
    color: #3bdb23;
  }
  .red {
    color: red;
  }
  .sidebar {
    transition: 0.3s;
    max-height: 89vh;
    /* overflow-y: auto; */
    min-width: fit-content;
    min-height: 718px;
   
  }
  
.indicator-sm {
  width:200px;
}
.indicator_body::-webkit-scrollbar-thumb{
  background-color: #393939;
  border: 2px solid var(--cds-ui-01);
  border-radius: 6px;
  cursor: pointer;
}

.full-indicators-wrapper{
  max-height: calc(100vh-86px-48px-100px-20px); 
  position: fixed; 
  top: 320px; 
  bottom: 20px;
  overflow-y:hidden; 
}
.full-indicators-wrapper:hover{
  overflow-y: auto;
}
  .subtable {
    /* margin-top: 20px; */
    position: relative;
  }
  #close_btn_indicator {
    position: absolute;
    top: 0px;
    right: 0px;
    padding: 10px;
    cursor: pointer;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color: var(--cds-interactive-02, #6f6f6f);
    }
  }

  .sidebar::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  :global(.sidebar .bx--list-box__menu::-webkit-scrollbar) {
    width: 7px;
    height: 7px;
  }

  #indicators_pulltab {
    height: 100%;
    width: 36px;
    display: inline-flex;
    justify-content: center;
    flex-direction: column;
    min-height: 90px;
  }
</style>