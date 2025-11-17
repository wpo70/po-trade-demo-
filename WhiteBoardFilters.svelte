<script>
  'use strict';
  import { onMount } from 'svelte';
  import { Popover, Tile, Checkbox, Slider, Toggle } from 'carbon-components-svelte';
  import FilterReset from 'carbon-icons-svelte/lib/FilterReset.svelte';

  import active_product from '../../stores/active_product.js';
  import { selected_custom_wb } from '../../stores/custom_whiteboards.js';
  import filters from '../../stores/filters.js';

  export let showFilters = false;
  
  let wf_temp_val, prod_filters;

  let not_first = false;
  onMount(skipFirstSave);
  
  $: init($active_product, $selected_custom_wb);
  function init () {
    prod_filters = filters.get(); 
    wf_temp_val = prod_filters ? prod_filters.width_filter.value : "";
    skipFirstSave();
  }

  let filterDefault;
  $: {
    saveFilters($filters, prod_filters);
    filterDefault = filters.isDefault($active_product, $selected_custom_wb);
  }
  // Ensures reactive saving is not called when first changed; to not send filter update to ws on init or board change - likely a more efficient way to do this
  async function skipFirstSave() {
    not_first = false;
    await new Promise(res => setTimeout(res, 10));
    not_first = true;
  }

  function saveFilters() {
    if (not_first && $filters.length && prod_filters) {
      if ($active_product > 0) {
        filters.saveFilter($active_product, prod_filters);
        $filters = $filters;
      } else if ($active_product === -1 && $selected_custom_wb.board_id === -1) {
        filters.saveFilter(0, prod_filters);
        $filters = $filters;
      } else if ($active_product === -1 && $selected_custom_wb.board_id !== -1) {
        selected_custom_wb.setFilter(prod_filters);
      }
    }
  }

  function resetFilters() {
    prod_filters = $active_product < 0 && $selected_custom_wb.board_id === -1 ? 
      {
        nonfirm: false,
        interests: false,
        wf: true,
        wf_outrights: false,
        width_filter: {
          value: 0.5,
          min: 0,
          max: 0.5,
          step: 0.05,
          dps: 2
        }
      }
      : {
        nonfirm: true,
        interests: true,
        wf: false,
        wf_outrights: $active_product == 18,
        width_filter: {
          value: 0.5,
          min: 0,
          max: 0.5,
          step: 0.05,
          dps: 2
        }
      };
    wf_temp_val = 0.5;
    showFilters = false;
  }
</script>

<Popover open={showFilters} align="bottom-right">
  <Tile style="padding:23px; width:288px;">
    {#if prod_filters}
      <h4>Filters</h4>
      {#if !filterDefault}
        <div id="filter_reset_btn" on:click={resetFilters}><FilterReset size={24}/></div>
      {/if}
      <div style="padding:6px 0px 3px; display:flex;">
        <Checkbox style="margin:.25rem 0px; padding-right:20px" labelText="Non-Firm" bind:checked={prod_filters.nonfirm} on:change={(e)=>{document.activeElement.blur();}}/>
        <Checkbox style="margin:.25rem 0px" labelText="Interests" bind:checked={prod_filters.interests} on:change={()=>{document.activeElement.blur();}}/>
      </div>
      {#if $active_product > 0 || $selected_custom_wb.board_id !== -1}
        <Checkbox labelText="Width Filter" bind:checked={prod_filters.wf} on:change={()=>{document.activeElement.blur();}}/>
      {:else}
        <h6>Width Filter</h6>
      {/if}
      {#if prod_filters.wf}
        {#if $active_product != 18}
          <Toggle style="padding:6px 0px; max-width: 150px" size="sm" labelText="Legs Only Toggle" hideLabel labelA="Filter Legs Only" labelB="Filter All Orders"  bind:toggled={prod_filters.wf_outrights} on:change={()=>{document.activeElement.blur();}}/>
        {/if}
        <Slider
          id="width_filter_slider"
          style={"width: 232px;"}
          hideTextInput
          min={prod_filters.width_filter.min}
          max={prod_filters.width_filter.max}
          step={prod_filters.width_filter.step}
          bind:value={wf_temp_val}
          on:click={()=>{prod_filters.width_filter.value = wf_temp_val}}
          on:mouseleave={(e)=>{
            e.target.dispatchEvent(new Event("mouseup", {bubbles:true}));
            if (prod_filters.width_filter.value != wf_temp_val) prod_filters.width_filter.value = wf_temp_val;
            if (document.getElementById("width_filter_slider").contains(document.activeElement)) {
              document.activeElement.blur();
            }
          }}
          labelText={!prod_filters.wf ? "Off" : wf_temp_val.toFixed(prod_filters.width_filter.dps)}
          minLabel=" "
          maxLabel=" "
          />
      {/if}
    {:else}
      <p>Filters are not yet available for this product.</p>
    {/if}
  </Tile>
</Popover>

<style>
  :global(#label-width_filter_slider) {
    margin-bottom: 0px;
    margin-top: 3px;
  }
  #filter_reset_btn {
    position: absolute;
    top: 20px;
    right: 20px;
    cursor: pointer;
    padding: 5px 5px 3px;
    transition: all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      background-color: var(--cds-hover-ui);
    }
  }
</style>