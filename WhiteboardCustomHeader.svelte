<script>
  'use strict;'

  import{ onMount, tick } from "svelte";
  import { slide } from "svelte/transition";
  import { cubicInOut } from "svelte/easing";

  import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte";
  import WhiteboardCustomSettings from "./WhiteboardCustomSettings.svelte";
  import Dashboard from "carbon-icons-svelte/lib/Dashboard.svelte";
  import AddLarge from "carbon-icons-svelte/lib/AddLarge.svelte";
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";
  import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";

  import custom_whiteboards, {selected_custom_wb} from "../stores/custom_whiteboards";
  import currency_state from "../stores/currency_state";
  
  let should_dropdown = true;
  let open_dropdown = false;
  let header_ref, switcher_ref;

  let open_settings;

  let boards_array;
  $: cswitcher_index = custom_whiteboards.get().findIndex(search => search.board_id == $selected_custom_wb.board_id);
  $: {
    let j = $custom_whiteboards || $currency_state;
    boards_array = custom_whiteboards.get();
    checkShouldDropdown();
  }

  function contentSwitch(idx) {
    selected_custom_wb.set(boards_array[idx]);
  }

  const observer = new ResizeObserver(async () => { await tick(); checkShouldDropdown(); });
  onMount(() => {observer.observe(header_ref);});

  function checkShouldDropdown() {
    if (!header_ref || !switcher_ref) { return; }
    const max_width = header_ref.clientWidth - 67 - 163;
    if (switcher_ref.clientWidth > max_width) {
      return should_dropdown = true;
    }
    const ratio = max_width / (165 + 220*(boards_array.length-1) + 100);
    return should_dropdown = ratio <= 1;
  }

  function handleAdd() {
    open_settings = null;
  }

  function handleEdit() {
    open_settings = structuredClone($selected_custom_wb);
  }

  function shiftBoards(idx_offset) {
    if (!idx_offset) { return false; }
    const swapper_id = boards_array[cswitcher_index + idx_offset]?.board_id;
    custom_whiteboards.swapWBs($selected_custom_wb.board_id, swapper_id);
    cswitcher_index += idx_offset;
    handleEdit();
  }
</script>

<svelte:window on:click={({target}) => {if (!switcher_ref?.querySelector("#dd_button")?.contains(target)) { open_dropdown = false; }}}/>

<div id="custom-wb-header" bind:this={header_ref}>
  <div id="slope"/>
  <div id="cs_container" bind:this={switcher_ref}>
    <div role="tablist" id="content_switcher">
      {#each boards_array as board, idx (board.board_id)}
        {#if board.board_id == -1}
          <button
            role="tab"
            style="min-width:166px;"
            class="cs_button"
            class:cs_button_selected={cswitcher_index == idx}
            on:click={() => {contentSwitch(idx)}}
            >
            <Dashboard size={17} style="margin-right: 0.5rem; vertical-align: sub;"/> Live Orders
          </button>
        {:else if !should_dropdown}
          <button
            role="tab"
            class="cs_button"
            class:cs_button_selected={cswitcher_index == idx}
            title={board.name.length > 20 ? board.name : undefined}
            on:click={() => {contentSwitch(idx)}}
            >
            {board.name}
          </button>
        {:else if should_dropdown && idx == 1}
          <button
            id="dd_button"
            role="tab"
            class="cs_button"
            class:cs_button_selected={cswitcher_index != 0 && !open_dropdown}
            on:click={() => {open_dropdown = !open_dropdown;}}
            >
            Custom&nbsp;Whiteboards<ChevronDown style="vertical-align: sub; margin-left: 1rem; transform: rotate({open_dropdown ? '180deg' : '0deg'}); transition: transform 250ms ease-in-out;"/>
          </button>
          {#if open_dropdown}
            <div id="cs_dropdown" transition:slide={{duration:400, easing:cubicInOut}}>
              {#each boards_array.filter(f=>f.board_id != -1) as dd_board, dd_idx (dd_board.board_id)}
                <span class:dd_selected={cswitcher_index == dd_idx+1} on:click={() => {contentSwitch(dd_idx+1)}}>
                  {dd_board.name}
                </span>
              {/each}
            </div>
          {/if}
        {/if}
      {/each}
      <button
        role="tab"
        class="cs_button"
        style="padding:0.5rem 1rem; text-overflow:clip;"
        title="Add Custom Whiteboard"
        on:click={handleAdd}
        >
        <AddLarge size={19} style="margin:0 0.5rem;"/>
      </button>
    </div>
  </div>
  <div id="ofm_container">
    <OverflowMenu flipped style="height:auto; width:3rem; margin-left:auto; color:var(--cds-text-01);" on:click={() => document.activeElement.blur()}>
      <div slot="menu" style="align-self:center; margin-top:3px;"><Settings size={19}/></div>
      <OverflowMenuItem text="Add New Board" on:click={handleAdd}/>
      {#if $selected_custom_wb.board_id != -1}
        <OverflowMenuItem text="Edit Current Board" on:click={handleEdit}/>
      {/if}
    </OverflowMenu>
  </div>
</div>

<WhiteboardCustomSettings
  open={open_settings !== undefined}
  selected={open_settings}
  leftmost={cswitcher_index == 1}
  rightmost={cswitcher_index == boards_array.length-1}
  on:close={()=>{open_settings = undefined}}
  on:shift_tab={({detail:{dir}}) => { shiftBoards(dir); }}
  />


<style>
  #custom-wb-header {
    margin: -1px 0 8px 0.8rem;
    display: flex;
  }
  @media (max-width: 1610px) {
    #custom-wb-header {
      margin-left: 53px;
    }
  }
  #slope {
    height: 38px;
    margin-left: 29px;
    margin-right: 8px;
    border-left: 7px solid var(--cds-inverse-support-04);
    transform: skew(60deg);
  }
  #cs_container {
    margin-left: 20px;
    min-width: 235px;
    border-image: linear-gradient(to left, #ffffff00, var(--cds-inverse-support-04));
    border-bottom: 3px solid;
    border-image-slice: 1;
  }
  #ofm_container {
    padding-left: 115px;
    display: flex;
    margin-left: auto;
    border-image: linear-gradient(to right, #ffffff00, var(--cds-inverse-support-04));
    border-bottom: 3px solid;
    border-image-slice: 1;
  }
  :global(#ofm_container *) { outline: none; }
  :global(#ofm_container *):focus { outline: none; }
  /* the following values have mostly been copied from the carbon svelte <ContentSwitcher> and <Switch> */
  #content_switcher {
    display: flex;
    width: 100%;
    height: 2.2rem;
    justify-content: flex-start;
    position: relative;
  }
  .cs_button {
    font-size: var(--cds-body-short-01-font-size);
    letter-spacing: var(--cds-body-short-01-letter-spacing);
    position: relative;
    display: inline-block;
    margin: 0 -1px;
    background-color: rgba(0,0,0,0);
    color: var(--cds-text-secondary);
    padding: 0.5rem 2rem;
    border: none;
    border-radius: 0;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
    &:hover {
      z-index: 4;
      cursor: pointer;
      background-color: var(--cds-layer-hover);
      color: var(--cds-text-primary);
    }
    &:focus-visible {
      outline: none;
    }
  }
  .cs_button:not(:first-child):not(.cs_button_selected)::before {
    position: absolute;
    z-index: 2;
    left: 1px;
    display: block;
    width: .0625rem;
    height: 1rem;
    background-color: var(--cds-border-subtle);
    content: "";
  }
  .cs_button_selected {
    z-index: 3;
    background-color: var(--cds-ui-01);
    color: var(--cds-link-01, #4589ff);
  }
  #cs_dropdown {
    display: block;
    position: absolute;
    top: 35px;
    left: 163px;
    width: max-content;
    min-width: 215px;
    background-color: var(--cds-ui-background);
    border: 1px solid var(--cds-border-subtle);
    box-shadow: 0px 8px 16px 4px rgba(0,0,0,0.4);
    z-index: 1;
  }
  #cs_dropdown span {
    /* float: none; */
    display: block;
    padding: 12px 16px;
    text-align: left;
    font-size: var(--cds-body-short-01-font-size);
    letter-spacing: var(--cds-body-short-01-letter-spacing);
    background-color: rgba(0,0,0,0);
    color: var(--cds-text-secondary);
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      cursor: pointer;
      background-color: var(--cds-layer-hover);
      color: var(--cds-text-primary);
    }
  }
  #dd_button {
    min-width: max-content;
  }
  .dd_selected {
    background-color: var(--cds-ui-01) !important;
    color: var(--cds-link-01, #4589ff) !important;
  }
</style>
