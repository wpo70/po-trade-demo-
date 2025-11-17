<script>
  import { onMount, tick } from 'svelte';
  import Ticker from './Ticker.svelte';
  import active_product from '../stores/active_product';
  import currency_state from '../stores/currency_state.js';

  let paused = true;
  let tic, first_tic;
  let possible_tics = 0;
  let tic_width = 0;
  let px_rate = 0;
  let last_click = 0;
  let left_scroll = 0;

  onMount(() => {
    tic.addEventListener('mousewheel', (e) => {
      if (document.body.offsetHeight - document.body.scrollHeight == 0) {
        scrollBar(Math.sign(e.wheelDelta)*-1, true);
      }
    }, false);
  });

  $: createTickers($currency_state);

  $: resetScroll($active_product, $currency_state);

  async function createTickers() {
    await tick();
    tic_width = first_tic.getBoundingClientRect().width;
    possible_tics = Math.ceil(tic.getBoundingClientRect().width / tic_width);
    px_rate = Math.round(tic_width / 60);
  }

  function handleClick(e) {
    if (e.type == "click" && !paused) {
      resetScroll();  
      paused = true;
      last_click = Date.now();
    } else if (e.type == "dblclick" && paused && Date.now() - last_click > 500) {
      resetScroll();
      paused = false;
    }
  }

  async function resetScroll () {
    await tick();
    return tic.scrollLeft = 0, left_scroll = 0;
  }

  function scrollBar(direction, smooth = true) {
    if (possible_tics > 1) { return; }
    const delta = 214*direction;
    left_scroll = Math.min(Math.max(0, left_scroll + delta), tic.scrollWidth - tic.offsetWidth);
    tic.scrollTo({
      left: left_scroll,
      behavior: smooth ? 'smooth' : 'instant' 
    });
  }
</script>


<div id="ticker_bar">
  <div class="buttons" on:click|stopPropagation>
    <span class:disabled={possible_tics>1} on:click={()=>{scrollBar(-1)}}>❮</span>
    <span class:disabled={possible_tics>1} on:click={()=>{scrollBar(1)}}>❯</span>
  </div>
  <div
    bind:this={tic}
    id="tickers"
    class:ticker_scroll={!paused} 
    style="--px_rate:{px_rate}s; --tic_width:{tic_width}px"
    on:dblclick={handleClick}
    on:click={handleClick}
    >
    <Ticker bind:ref={first_tic}/>
    {#if !paused}
      {#each Array(possible_tics) as _}
        <Ticker/>
      {/each}
    {/if}
  </div>
</div>


<style>
  #ticker_bar {
    margin: 5px 0px 7px;
    background-color: var(--cds-ui-01);
    display: inline-flex;
    align-items: center;
    user-select: none; 
    width: 100%;
  }

  .buttons{
    height: 70px;
    z-index: 1;
    background-color: var(--cds-button-separator);
    border-width: 1px 13px;
    border-color: var(--cds-ui-01);
    border-style: solid;
    padding: 7px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .buttons > span {
    color: var(--cds-button-tertiary);
    font-weight: bold;
    font-size: 20px;
    &.disabled {
      opacity: 0.7;
    }
    &:not(.disabled):hover  {
      cursor: pointer;
      color: var(--cds-link-01, #78a9ff);
    }
  }

  #tickers{
    display: flex;
    width: 100%;
    overflow-x: hidden;
  }

  .ticker_scroll {
    overflow-x: visible !important;
    animation: ticker_anim linear infinite;
    animation-duration: var(--px_rate);
  }

  @keyframes ticker_anim {
    0% { transform: translateX(0); } 
    100% { transform: translateX(calc(var(--tic_width)*-1 - 14px)); }
  }
</style>

