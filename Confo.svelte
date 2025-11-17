<script>

  import { TextArea, Tile } from "carbon-components-svelte";
  import OptionCycler from './Utility/OptionCycler.svelte';
  import Renew from "carbon-icons-svelte/lib/Renew.svelte";
  import Copy from "carbon-icons-svelte/lib/Copy.svelte";
  import banks from "../stores/banks";
  import websocket from "../common/websocket";
  import { spin } from "../common/animations";

  export let confo;

  let text = "";
  let minsAgo = Math.round((new Date().getTime() - new Date(confo.time_submitted).getTime()) / (60*1000));
  let hours = Math.floor(minsAgo/60);
  let bankOptions = [];
  let idx = 0;

  let confoRefresh;
  const setText = (idx) => text = confo.confos[bankOptions[idx]]?.split('$--')[0];

  getBanks();
  $: getBanks(confo);
  $: setText(idx);

  function getBanks() {
    setText(idx);
    bankOptions = [];
    for (let [key, val] of Object.entries(confo.confos)) {
      bankOptions.push(key);
    }
  }

  function displayText(val) {
    return banks.get(val).bank;
  }

</script>

<Tile style="border-bottom: 1px solid var(--cds-border-subtle);">
  <div style="display: grid; width: 100%">
    <OptionCycler 
      style="grid-column: 2; grid-row: 1; justify-self: right;"
      display_width="60px"
      size="sm"
      bind:option_list={bankOptions}
      bind:index={idx}
      textFormatter={displayText}
      />
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="bx--label" style="grid-column: 3; grid-row: 1; justify-self: right;">{hours > 0 ? hours == 1 ? `${hours} hour ago` : `${hours} hours ago` : `${minsAgo} mins ago`}</label>
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