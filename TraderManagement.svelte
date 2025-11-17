<script>
import { Button, Theme, Tile, DataTable } from 'carbon-components-svelte';

import Add from "carbon-icons-svelte/lib/Add.svelte";
import FilterRemove from "carbon-icons-svelte/lib/FilterRemove.svelte";
import UserAvatar from "carbon-icons-svelte/lib/UserAvatar.svelte";

import { createEventDispatcher } from "svelte";

import TradersTable from './TradersTable.svelte';
import BanksTable from './BanksTable.svelte';
import TraderManagementFilters from './TraderManagementFilters.svelte';
import TraderForm from './TraderForm.svelte';
import TraderEOD from './TraderEOD.svelte';

import brokerages from './../../stores/brokerages';
import banks from './../../stores/banks';
import orders from './../../stores/orders';
import trade_count from './../../stores/trade_count';

const dispatch = createEventDispatcher();

let filters;
let clear_filters_fn;
let trader_info = null;

let theme;

let is_form_open = false;

let info_bar_items = [];

$: {
  info_bar_items = [
    {
      title: 'Active Orders',
      value: Object.values($orders).flatMap((pid) => pid).length ?? 0,
    },
    {
      title: 'Active Banks',
      value: $banks?.length ?? 0,
    },
    {
      title: 'Total Trades',
      value: $trade_count.total ?? 0,
    },
    {
      title: 'Monthly Trades',
      value: $trade_count.monthly ?? 0,
    },
  ];
};

function close() { dispatch('close'); }

function handleThemeChange(event) { theme = event.detail; }

</script>


<svelte:window on:themeChange={handleThemeChange} />

<Theme bind:theme persist persistKey='__carbon-theme'/>
<div style="width:100%; height: 100%">
<!-- HEADER -->

<div class="header">
  <h1 class="title">Trader Management</h1>
  <div class="info-bar">
    {#each info_bar_items as item}
      <div class="info-bar__item">
        <div>
          <p style='font-weight: bold;'>{item.title}</p>
          <p style='font-size: 1.1rem;'>{item.value}</p>
        </div>
      </div>
    {/each}
  </div>

</div>

<!-- MAIN CONTENT -->

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="main-content" on:keypress|stopPropagation>

  <!-- TRADER TABLE -->
  <div class="g-item trader-container">

    <div style="position:relative;">
      <!-- <h5>Traders Management</h5> -->
      <div style="position: absolute; top:10px; right:10px; cursor: pointer; z-index:10">
      <Button
        kind="tertiary"
        icon={Add}
        on:click={() => is_form_open = !is_form_open}
        style={''}>
        New Trader
      </Button>
      </div>
    </div>
    <div style="width:100%; height: 100%; overflow-x: hidden">
      <TradersTable 
      filters={filters?.trader} 
      on:traderSelected={(e) => {trader_info =  e?.detail? e?.detail[0] : null;}} /></div>
  </div>

  <!-- FILTER & BROKERAGE PIE CHART-->
  <div class="filter-container">
    <!------------ Trader info ------------------------>
    <div class="g-item ">
      <div 
        style:display={'flex'}
        style='justify-content: center; align-items: center; flex-direction: column;max-height: 400px;'>
        
        <UserAvatar size={100}/>
       
            {#if trader_info}
            <div class="trader_info-container" style=" width: 100%">
                <h3 style="text-align: center; padding-bottom: 3px;">{trader_info.firstname}&nbsp;{trader_info.lastname}</h3>
                <DataTable
                size="short"
                stickyHeader
                headers={[
                  { key: "name", value: "Info" },
                  { key: "desc", value: "Description"}
                ]}
                rows={Object.entries(trader_info).map((key) => {
                  return {
                      id: key,
                      name: key[0].toLocaleUpperCase(),
                      desc: key[1]? key[1] : "-"
                }})}
                />
            </div>
            {:else}
              <h3>Trader Info</h3>
            {/if}

      </div>
    </div>
    <!-- FILTER -->
    <div class="g-item ">
        <div 
          style:display={'flex'}
          style='justify-content: center;'>
          <h5>Filters</h5>
          <Button
            kind='ghost'
            on:click={clear_filters_fn}
            iconDescription='Clear All Filters'
            style='margin-left: auto; margin-top: -16px;'
            icon={FilterRemove} />
        </div>

        <TraderManagementFilters
          bind:clear_filters={clear_filters_fn}
          bind:selected_filters={filters}/>
    
    </div>
    <div class="g-item " style="flex:auto">
        <h5>Banks</h5>
        <BanksTable />
    </div>
  </div>

  <!-- BANK TABLE -->

</div>
</div>
<TraderForm
  bind:open={is_form_open}/>

<style>

.main-content {
  display: flex;
  flex-direction: row; 
  gap: 1rem;
 
  padding: 0 1rem;
  width: 100%;
  height: 100%;
  justify-content: stretch;
  
}

.g-item {
  box-sizing: border-box;
  padding: 30px;
  background-color: var(--cds-layer);
}

.trader-container {
  flex-shrink: 1;
  width: 70%;
}


.filter-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background-color: inherit;
  width: 28.7%;
 
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem;
}

.info-bar {
  display: flex;
  width: 70%;
  gap: 1rem;
  align-content: flex-end;
}

.info-bar__item {
  display: flex;
  padding: 10px;
  flex: 1 1 0px;
  background-color: var(--cds-layer);
}

:global(.trader_info-container .bx--data-table--sticky-header) {
  max-height: 200px;
}
:global(.filter-container .bx--accordion__item) {
  max-height: 100px;
  overflow-y: auto;
}
</style>
