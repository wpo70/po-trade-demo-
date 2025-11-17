<script>
  export let appliedRows;
  export let selectedTable;
  export let setSelectedTable;
  export let excludeTest;

  import { fade } from 'svelte/transition';
  import { spin } from '../../common/animations';
  import {
    DataTable,
    Button,
    Toolbar,
    ToolbarContent,
    Pagination,
    ProgressIndicator, 
    ProgressStep,
    DataTableSkeleton
  } from 'carbon-components-svelte';
  import trades from '../../stores/trades';
  import swaption_orders from '../../stores/swaption_orders';
  import liquidityTrades from '../../stores/liquidityTrades';

  import Renew from 'carbon-icons-svelte/lib/Renew.svelte';
  import DocumentExport from 'carbon-icons-svelte/lib/DocumentExport.svelte';
  import websocket from '../../common/websocket';
  import brokers from '../../stores/brokers';
  import user from '../../stores/user';
  import Reporting from './Reporting.svelte';
  
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();

  let pageSize = 16;
  let openReportingModal = false;
  let expansion = false;
  let permission;
  $: {let b = $brokers; permission = user.getPermission();
  if(permission['Not Anonymous']) expansion = true;
  }

  // PAGE NUMBER
  let appliedPage = null // this will get set by handle_tableChange() on initialisation.

  let tablePage = {
    Trades: 1, //default
    Swaptions: 1, //default
    Liquidity: 1, //default
  }

  // HEADERS

  const tableHeaders = {
    Trades: [
      {key: 'product_name', value: 'Product'},
      {key: 'year', value: 'Tenor'},
      {key: 'volume', value: 'Volume'},
      {key: 'lots', value: 'Lot'},
      {key: 'price', value: 'Price'},
      {key: 'currency', value: 'Currency'},
      {key: 'timestamp', value: 'Trade Date'},
      {key: 'start_date', value: 'Start Date'},
      {key: 'sef', value: 'SEF'},
      {key: 'markit_status', value: 'MarkitWire Status'},
    ],
    Swaptions: [
      {key: 'option_type', value: 'Option Type'},
      {key: 'notional', value: 'Notional'},
      {key: 'strike_rate', value: 'Strike Rate'},
      {key: 'timestamp', value: 'Trade Date'},
      {key: 'swap_term', value: 'Swap Term'},
      {key: 'premium_bp', value: 'Premium BP'},
      {key: 'sef', value: 'SEF'},
      {key: 'settlement', value: 'Settlement'},
      {key: 'spot_or_fwd', value: 'Spot or Fwd'},
      {key: 'rba', value: 'Type'},
      {key: 'markit_status', value: 'MarkitWire Status'},
    ],
    Liquidity: [
      {key: 'displayProdType', value: 'Product'},
      {key: 'notional', value: 'Notional'},
      {key: 'rate', value: 'Price'},
      {key: 'timestamp', value: 'Trade Date'},
      {key: 'fixingDate', value: 'Fixing Date'},
      {key: 'startDate', value: 'Start Date'},
      {key: 'endDate', value: 'End Date'},
      {key: 'markit_status', value: 'MarkitWire Status'},
    ]
  };

  let headers = tableHeaders[selectedTable]; // default

  // EXPANSIONS
  let expansions = [];
  let tableExpansions = {
    Trades: [],
    Swaptions: [],
    Liquidity: [],
  }

  // TABLE CHANGE
  $: selectedTable && handle_tableChange();

  function handle_tableChange() {
    headers = tableHeaders[selectedTable];
    expansions = tableExpansions[selectedTable];
    appliedPage = tablePage[selectedTable];
  }

  // EXPANSIONS
  $: tableExpansions[selectedTable] = expansions;

  // PAGE NUMBER
  $: tablePage[selectedTable] = appliedPage;

  // REFRESH

  function handle_RefreshTrades() {
    tableExpansions['Trades'].forEach((rowIdx, index) => {
      tableExpansions['Trades'][index] = rowIdx + $trades.last_added;
    });
    if(selectedTable == 'Trades') expansions = tableExpansions[selectedTable];
  }

  function handle_RefreshSwaptions() {
    tableExpansions['Swaptions'].forEach((rowIdx, index) => {
      tableExpansions['Swaptions'][index] = rowIdx + $swaption_orders.last_added;
    });
    if(selectedTable == 'Swaptions') expansions = tableExpansions[selectedTable];
  }

  function handle_RefreshLiquidity() {
    tableExpansions['Liquidity'].forEach((rowIdx, index) => {
      tableExpansions['Liquidity'][index] = rowIdx + $liquidityTrades.last_added;
    });
    if(selectedTable == 'Liquidity') expansions = tableExpansions[selectedTable];
  }

  // update id's in expansion arrays to account for new rows in any given table.
  $: $trades && handle_RefreshTrades();
  $: $swaption_orders && handle_RefreshSwaptions();
  $: $liquidityTrades && handle_RefreshLiquidity();
  

  let refresh_anim;
  function call_manualRefresh() {
    // refresh table trade data stores.
    switch (selectedTable) {
      case "Trades":
        websocket.refreshOrders();
      break;
      case "Swaptions":
        websocket.refreshSwaptionOrders();
      break;
      case "Liquidity":
        websocket.refreshLiquidityTrades();
      break;
    }
  }

  function handle_selectedTable (indx) {
    switch(indx) {
      case 0:
        selectedTable = "Trades";
        setSelectedTable("Trades");
        break;
      case 1:
        selectedTable ="Swaptions";
        setSelectedTable("Swaptions");
        break;
      case 2:
        selectedTable ="Liquidity";
        setSelectedTable("Liquidity");
        break;
    }
  }
</script>

<Reporting {selectedTable} {appliedRows} 
  bind:open={openReportingModal} 
  bind:excludeTest 
  on:selectedTableIndex={({detail}) => handle_selectedTable(detail)}
  on:excludeTest={({detail}) =>{ dispatch('excludeTest', detail)}}
/>

<div class="data-table">
  <div>
    <DataTable
      title = {selectedTable}
      sortable
      bind:batchExpansion={expansion}
      zebra
      bind:expandedRowIds={expansions}
      size="medium"
      {headers}
      {pageSize}
      page={appliedPage}
      rows={appliedRows}
    >
      <Toolbar>
        <div class='table_button'>
          <ToolbarContent>
            <div in:fade>
              <Button 
                name="Trades"
                on:click={event => {setSelectedTable(event.target.name)}}
                kind={selectedTable == 'Trades' ? "tertiary" : "primary"} 
                disabled={selectedTable == 'Trades'}
              >Trades</Button>
            </div>
            <div in:fade>
              <Button 
                name="Swaptions"
                on:click={event => {setSelectedTable(event.target.name)}}
                kind={selectedTable == 'Swaptions' ? "tertiary" : "primary"}
                disabled={selectedTable == 'Swaptions'}
              >Swaptions</Button>
            </div>
            <div in:fade>
              <Button 
                name="Liquidity"
                on:click={event => {setSelectedTable(event.target.name)}}
                kind={selectedTable == 'Liquidity' ? "tertiary" : "primary"}
                disabled={selectedTable == 'Liquidity'}
              >Liquidity</Button>
            </div>
          </ToolbarContent>
        </div>
        <Button
          icon={DocumentExport}
          on:click={() => openReportingModal = true}
          kind="secondary"
          disabled={permission["View Only"] || !permission["Not Anonymous"]}>
          Generate Report
        </Button>
        <Button 
          tooltipPosition="left"
          tooltipAlignment="center"
          iconDescription="Refresh Table Data"
          style="padding-right:15px;"
          on:click={() => {call_manualRefresh(); refresh_anim = {}}}
          >
          {#key refresh_anim}
            <div style="height:1rem;" in:spin={{ duration: 1000, direction: -1 }}><Renew size="1rem"/></div>
          {/key}
        </Button>
      </Toolbar>
      <svelte:fragment slot="cell" let:row let:cell>
        {#if cell.key == 'markit_status'}
          {#if cell.value == 'Not Available'}
            <span in:fade>{cell.value}</span>

          {:else if cell.value == 'Submitted'}
            <span style="color:#ff9933; font-weight: bold;" in:fade>{cell.value}</span>

          {:else if cell.value == 'Active'}
            <span style="color:#3d7ffc; font-weight: bold;" in:fade>{cell.value}</span>

          {:else if cell.value == 'Accepted/Affirmed/Released'}
            <span style="color:#42be65; font-weight: bold;" in:fade>{cell.value}</span>

          {:else if cell.value == 'Failed'}
            <span style="color:#fa4d56; font-weight: bold;" in:fade>{cell.value}</span>
          {/if}
        {:else}
        <span in:fade>{cell.value}</span>
        {/if}
      </svelte:fragment>
      <svelte:fragment slot="expanded-row" let:row>
        <!-- ------------------------------------- TRADE Details --------------------------------------->
        {#if selectedTable == "Trades"}
          <div class="details-bar">
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>Offer</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.offer_trader_name}<br>
                  Interest Group: {row.offer_interest_group_name}<br>
                  {#if row.offer_brokerage == 'Not Available'}
                    Brokerage: {row.offer_brokerage}
                  {:else}
                    Brokerage: ${row.offer_brokerage}
                  {/if}
                </p>
              </div>
              <br>
              <h5 style='font-weight: bold;'>Bid</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.bid_trader_name}<br>
                  Interest Group: {row.bid_interest_group_name}<br>
                  {#if row.bid_brokerage == 'Not Available'}
                    Brokerage: {row.bid_brokerage}
                  {:else}
                    Brokerage: ${row.bid_brokerage}
                  {/if}
                </p>
              </div>
            </div>
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>ID References</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Clearing House: {row.clearhouse}<br>
                  OneView Trade ID: {row.trade_id_ov}<br>
                  MarkitWire Ticket ID: {row.markit_id}<br>
                </p>
              </div>
              {#if row.has_break_clause == 'Yes'}
                <br>
                <h5 style='font-weight: bold;'>Break Clause</h5>
                <hr>
                <div class='indent'>
                  <p class="details-text">
                    Break: {row.breaks}<br>
                    Thereafter: {row.thereafter}<br>
                  </p>
                </div>
              {/if}
            </div>
          </div>
          <br>
          {#if row.markit_status != "Not Available"}
            <div class='details-bar__item'>
              <h5 style='font-weight: bold;'>MarkitWire Status</h5><br>
              {#key row}
                <ProgressIndicator spaceEqually preventChangeOnClick currentIndex={null}>
                  <ProgressStep
                    complete={['Submitted', 'Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Submitted"
                  />
                  <ProgressStep
                    complete={['Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Active"
                  />
                  {#if row.markit_status == "Failed"}
                    <ProgressStep
                      complete={row.markit_status == 'Failed'}
                      label="Failed"
                    />
                  {:else}
                    <ProgressStep
                      complete={row.markit_status == 'Accepted/Affirmed/Released'}
                      label="Accepted/Affirmed/Released"
                    />
                  {/if}
                </ProgressIndicator>
              {/key}
            </div>
            <br>
          {/if}
        <!--------------------------------------- SWAPTION Details --------------------------------------->
        {:else if selectedTable == "Swaptions"}
          <div class="details-bar">
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>Buy</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.buyer_name}<br>
                  Interest Group: {row.buyer_interest_group_name}<br>
                  Brokerage: ${row.buyer_brokerage}
                </p>
              </div>
              <br>
              <h5 style='font-weight: bold;'>Sell</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.seller_name}<br>
                  Interest Group: {row.seller_interest_group_name}<br>
                  Brokerage: ${row.seller_brokerage}
                </p>
              </div>
            </div>
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>Dates</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Option Start: {row.date}<br>
                  Option Expiry: {row.option_expiry} /  {row.expiry_date}<br>
                  Swap Start: {row.swap_start_date}<br>
                  Premium: {row.premium_date}<br>
                  Maturity Date: {row.swap_maturity_date}
                </p>
              </div>
            </div>
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>ID References</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Clearing House: {row.clearhouse}<br>
                  OneView Trade ID: {row.trade_id_ov}<br>
                  MarkitWire Ticket ID: {row.markit_id}<br>
                </p>
              </div>
              {#if row.has_break_clause == 'Yes'}
                <br>
                <h5 style='font-weight: bold;'>Break Clause</h5>
                <hr>
                <div class='indent'>
                  <p class="details-text">
                    Break: {row.breaks}<br>
                    Thereafter: {row.thereafter}<br>
                  </p>
                </div>
              {/if}
            </div>
          </div>
          <br>
          {#if row.markit_status != "Not Available"}
            <div class='details-bar__item'>
              <h5 style='font-weight: bold;'>MarkitWire Status</h5><br>
              {#key row}
                <ProgressIndicator spaceEqually preventChangeOnClick currentIndex={null}>
                  <ProgressStep
                    complete={['Submitted', 'Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Submitted"
                  />
                  <ProgressStep
                    complete={['Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Active"
                  />
                  {#if row.markit_status == "Failed"}
                    <ProgressStep
                      complete={row.markit_status == 'Failed'}
                      label="Failed"
                    />
                  {:else}
                    <ProgressStep
                      complete={row.markit_status == 'Accepted/Affirmed/Released'}
                      label="Accepted/Affirmed/Released"
                    />
                  {/if}
                </ProgressIndicator>
              {/key}
            </div>
            <br>
          {/if}
        <!--------------------------------------- LIQUIDITY Details --------------------------------------->
        {:else if selectedTable == "Liquidity"}
          <div class="details-bar">
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>Payer</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.CptyATrader}<br>
                  Bank: {row.cpty}<br>
                  Interest Group: {row['Interest Group']}<br>
                  Bic Code: {row.BicCptyA}<br>
                  Brokerage: ${row.Brokerage_A}
                </p>
              </div>
            </div>
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>Receiver</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Trader: {row.CptyBTrader}<br>
                  Bank: {row.cpty_2}<br>
                  Interest Group: {row['Interest Group B']}<br>
                  Bic Code: {row.BicCptyB}<br>
                  Brokerage: ${row.Brokerage_B}
                </p>
              </div>
            </div>
            <div class="details-bar__item">
              <h5 style='font-weight: bold;'>ID References</h5>
              <hr>
              <div class='indent'>
                <p class="details-text">
                  Clearing House: {row.clearhouse}<br>
                  OneView Trade ID: {row.trade_id_ov}<br>
                  MarkitWire Ticket ID: {row.markit_id}<br>
                </p>
              </div>
              {#if row.has_break_clause == 'Yes'}
                <br>
                <h5 style='font-weight: bold;'>Break Clause</h5>
                <hr>
                <div class='indent'>
                  <p class="details-text">
                    Break: {row.breaks}<br>
                    Thereafter: {row.thereafter}<br>
                  </p>
                </div>
              {/if}
            </div>
          </div>
          <br>
          {#if row.markit_status != "Not Available"}
            <div class='details-bar__item'>
              <h5 style='font-weight: bold;'>MarkitWire Status</h5><br>
              {#key row}
                <ProgressIndicator spaceEqually preventChangeOnClick currentIndex={null}>
                  <ProgressStep
                    complete={['Submitted', 'Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Submitted"
                  />
                  <ProgressStep
                    complete={['Active', 'Accepted/Affirmed/Released', 'Failed'].includes(row.markit_status)}
                    label="Active"
                  />
                  {#if row.markit_status == "Failed"}
                    <ProgressStep
                      complete={row.markit_status == 'Failed'}
                      label="Failed"
                    />
                  {:else}
                    <ProgressStep
                      complete={row.markit_status == 'Accepted/Affirmed/Released'}
                      label="Accepted/Affirmed/Released"
                    />
                  {/if}
                </ProgressIndicator>
              {/key}
            </div>
            <br>
          {/if}
        {/if}
      </svelte:fragment>
    </DataTable>
    <Pagination
      bind:pageSize
      bind:page={appliedPage}
      totalItems={appliedRows.length}
      pageSizeInputDisabled
    />
  </div>
</div>

<style>
  .data-table {
    width: 100%;
    height:100%;
    overflow-y: auto;
    overflow-x: auto;
    padding: 15px;
    /* height: fit-content; */
    /* margin: auto; */
    background-color: var(--cds-layer);
    position: relative;
  }
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .table_button{
    margin-left: 0; 
    margin-right: auto;
  }

  .indent {
      padding-left: 10px;
  }

  .details-text {
      line-height: 2;
  }

  .details-bar {
      display: flex;
      width: 100%;
      gap: 1rem;
  }

  .details-bar__item {
      /* display: flex; */
      /* flex: auto; */
      width: 100%;
      padding: 10px;
      background-color: var(--cds-layer);
  }

  :global(.bx--table-header-label){
    /* text-align: center; */
    margin: 0 auto;
  }
  :global(.tradehistory-datatable .bx--data-table-header__title) {
    margin-top: -20px;
    margin-left: -15px;
    font-weight: bold;
    color: #999;
  }
  :global(tr.bx--parent-row td){
    text-align: center;
    /* margin: 0 auto; */
  }
  :global(.report_modal .bx--modal-content) {
    max-height: fit-content;
    margin-bottom: 0;
    overflow-y: hidden;
    overflow-x: hidden;
    background-color: #121212;
    padding-right: 0;
    padding-left:0;
  }

  :global(.data-table .bx--data-table--md td){
    text-align: center; 
  }

  :global(.data-table .bx--child-row-inner-container){
    text-align: left;
  }
</style>