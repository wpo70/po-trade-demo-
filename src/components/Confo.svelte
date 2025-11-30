<script>

  import { CopyButton, TextArea, Tile } from "carbon-components-svelte";
  import CaretRight from "carbon-icons-svelte/lib/CaretRight.svelte";
  import CaretLeft from "carbon-icons-svelte/lib/CaretLeft.svelte";
  import Renew from "carbon-icons-svelte/lib/Renew.svelte";
  import Copy from "carbon-icons-svelte/lib/Copy.svelte";
  import banks from "../stores/banks";
  import websocket from "../common/websocket";
  import { spin } from "../common/animations";

  export let confo;

  let text = "";
  let minsAgo = Math.round((new Date().getTime() - new Date(confo.time_submitted).getTime()) / (60*1000));
  
  let bankOptions = [];
  let idx = 0;

  let confoRefresh;

  getBanks();
  $: getBanks(confo);

  function getBanks () {
    text = confo.confos[bankOptions[idx]];
    bankOptions = [];
    for (let [key, val] of Object.entries(confo.confos)) {
      bankOptions.push(key);
    }
  }

  function changeTab (increment) {
    idx += increment;
    if (idx < 0) idx = bankOptions.length - 1;
    else if (idx > bankOptions.length - 1) idx = 0;
    text = confo.confos[bankOptions[idx]];
  }

</script>

<Tile style="border-bottom: 1px solid var(--cds-border-subtle);">
  <div style="display: grid; width: 100%">
    <div class="bankSwitcher">
      <button class="arrowBtn" on:click={() => changeTab(-1)}><CaretLeft size=24 style="vertical-align: sub;"/></button>
      <h6 class="bankName">{banks.get(bankOptions[idx]).bank}</h6>
      <button class="arrowBtn" on:click={() => changeTab(1)}><CaretRight size=24 style="vertical-align: sub;"/></button>
    </div>
    <label class="bx--label" style="grid-column: 3; grid-row: 1; justify-self: right;">{minsAgo + " Mins Ago"}</label>
  </div>
  <div style="display: flex;" on:keypress|stopPropagation>
    <TextArea
      bind:value={text}
      rows={text.split('\n').length}
      cols={42}
    />
    <div style="display: flex; flex-direction: column; justify-content: space-evenly;">
      <button class="confo_refresh_copy" on:click={()=> {confoRefresh.animate(spin(-1), {duration:1000}); websocket.refreshConfos(confo.confo_id);}}>
        <div bind:this={confoRefresh}>
          <Renew style="vertical-align: top"/>
        </div>
      </button>
      <button class="confo_refresh_copy" on:click={()=> navigator.clipboard.writeText(text)}>
        <Copy style="vertical-align: top"/>
      </button>
    </div>
  </div>
</Tile>

<style>
  .arrowBtn {
    background-color: var(--cds-ui-01, #262626);
    color: var(--cds-text-02, #525252);
    width: fit-content;
    height: fit-content;
    border-style: groove;
    padding: 0;
    cursor: pointer;
  }
  .arrowBtn:hover {
    background-color: var(--cds-hover-ui);
  }
  .arrowBtn:active {
    background-color: var(--cds-active-01);
  }
  .bankName {
    align-self: center;
    width: 60px;
    text-align: center;
  }
  .bankSwitcher {
    display: flex; 
    grid-column: 2; 
    grid-row: 1; 
    gap: 10px; 
    justify-self: right;
  }
  .confo_refresh_copy:hover{
    background-color: var(--cds-hover-ui);
  }
  .confo_refresh_copy:active {
    background-color: var(--cds-active-01);
  }
  .confo_refresh_copy{
    background: none;
    color: var(--cds-icon-01, #161616);
    border: none;
    width: 40px;
    height: 40px;
  }
</style>