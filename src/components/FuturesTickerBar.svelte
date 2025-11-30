<script>
  import { onMount } from 'svelte';
  import Ticker from './Ticker.svelte';
  import active_product from '../stores/active_product';

  let isTickerPaused = true;
  let tic;
  let expandDiv;

  onMount(() => {
    window.addEventListener('scroll', () => {
      if (window.scrollX > 0) {
        requestAnimationFrame(expanding); // call parallaxing()
      }
    }, false);
    tickerBarHandle();
  });

  function tickerBarHandle() {
    // Move position scroll to left 0
    refreshScrollBar($active_product);

    if (!tic.classList.contains("hmove")) {
      tic.classList.add("hmove");
      isTickerPaused = false;
    } else {
      tic.classList.remove("hmove");
      if (expandDiv) { expandDiv.style.width = "100%"; }
      isTickerPaused = true;
    }
  }
  
  // FIXME: Scroll does not parallax correctly. Width is only ever set to 200%. Overflow is not hidden so forces the entire page to be scrollable and blank space to be unnecessarily visible
  function expanding() {
    const speed = 5;
    const scrolltop = window.pageXOffset; // get number of pixels document has scrolled horizontally
    const scrollAndSpeed = (scrolltop / speed);
    if (expandDiv && !isTickerPaused) {expandDiv.style.width = Math.min(Math.max(scrollAndSpeed, (innerWidth/scrolltop)*100), 200) + "%";}
  }

// Button prev/next for ticker bar 
function scrollHandle(action) {
  if (action == "prev") {
    document.getElementsByClassName('tickerBar_w')[0].scrollBy({
      top: 0,
      left: -200,
      behavior: 'smooth'
    });
  } else if (action == "next") {
    document.getElementsByClassName('tickerBar_w')[0].scrollBy({
      top: 0,
      left: +200,
      behavior: 'smooth'
    });
  }
}

// Mouse Scroll when hover on the ticker bar
onMount(() => {
  let tickerBar_w = document.getElementsByClassName('tickerBar_w')[0];
  tickerBar_w.addEventListener('mousewheel', (e) => {
      if (document.body.offsetHeight - document.body.scrollHeight == 0) {
        tickerBar_w.scrollLeft -= (Math.max(-1, Math.min(1, (e.wheelDelta))) * 70);
      }
    }, false);
});

function refreshScrollBar (p) {
  let FuturesTickerBar_width =  document.getElementsByClassName('tickerBar_w');
  if (FuturesTickerBar_width.length !== 0) FuturesTickerBar_width[0].scrollLeft = 0;
}
$: refreshScrollBar($active_product);
</script>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-missing-attribute -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div id="hwrap_" class="hwrap" on:click={tickerBarHandle} style="width: 100%" bind:this={expandDiv}>
  <div class="button_hwrap" on:click|stopPropagation>
    <a class="prev" on:click={()=>{scrollHandle("prev")}}>❮</a>
    <p class="refresh" on:click={refreshScrollBar}></p>
    <a class="next"on:click={()=>{scrollHandle("next")}}>❯</a>
  </div>

  <div id="tickerBar" class="tickerBar_w hmove" bind:this={tic}>
    {#if isTickerPaused }
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
    {:else}
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
      <div class="hitem"> <Ticker /></div>
    {/if}
  </div>

</div>

<style>
  #tickerBar{
    display: flex;
    flex-direction: row;
    gap:10px;
    width: 100%;
    overflow-x: hidden;
  }
  .hwrap {
    top: 48;
    left:0;
    right:0;
    margin-top: 5px;
    margin-bottom: 7px;
    background-color: var(--cds-ui-01);
    white-space: nowrap;
    width: 100%;
    display:inline-flex;
    flex-direction: row;
  }
  .hmove {   
    display: flex;
    }
  .hitem {
    flex-shrink: 0;
    box-sizing: border-box;
    padding-top: 10px;
    padding-bottom: 10px;
    text-align: center;
  }
  @keyframes tickerh {
    0% { transform: translate3d(100%, 0, 0); }
    100% { transform: translate3d(-100%, 0, 0); }
  }
  .hmove { animation: tickerh linear 60s infinite;}
  .hmove:hover { animation-play-state: paused;}
  /* Next & previous buttons */
.prev,
.next {
  cursor: pointer;
  width: auto;
  color: white;
  opacity: 0.8;
  font-weight: bold;
  font-size: 20px;
  border-radius: 0 3px 3px 0;
  user-select: none;
  -webkit-user-select: none;
  background-color: rgba(0, 0, 0, 0.8);
}
.button_hwrap{
  background-color: rgba(0, 0, 0, 0.8);
  position: relative;
  right:0;
  display: flex;
  flex-direction: column;
  top: 0px;
  padding: 5px 10px;
  gap:5px;
  margin: 9px 10px 9px 10px;
  justify-content: space-between;
}

/* On hover, add a black background color with an effect of see-through */
.prev:hover,
.next:hover,
.refresh:hover {
  background-color: #393939;
  opacity: 1;
  color: var(--cds-link-01, #78a9ff);
}
.refresh{
  background-color:white; 
  opacity: 0.8; 
  height: 5px;
}
</style>

