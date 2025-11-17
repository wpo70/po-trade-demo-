<script>
  import { ContentSwitcher, Switch } from "carbon-components-svelte";
  import VolumeBlockStorage from "carbon-icons-svelte/lib/VolumeBlockStorage.svelte";
  import ChartLine from "carbon-icons-svelte/lib/ChartLine.svelte";
  import ChartLineSmooth from "carbon-icons-svelte/lib/ChartLineSmooth.svelte";

  import SwaptionsHistoryTable from "./SwaptionsHistoryTable.svelte";
  import BbswSwaptionOrderForm from "./BBSWSwaptionOrderForm.svelte";
  import SwaptionLiveOrderTable from "./SwaptionLiveOrderTable.svelte";
  import SwaptionIndicators from "./SwaptionIndicators.svelte";
  import SwaptionMarketStructures from "./SwaptionMarketStructures.svelte";
  import SwaptionNotification from "./SwaptionNotification.svelte";
  
  import RBAQuotesTable from "./RBAQuotesTable.svelte";
  import RbaSwaptionOrderForm from "./RBASwaptionOrderForm.svelte";
  import swaption_quotes from "../../stores/swaption_quotes";
    import { timestampToISODate } from "../../common/formatting";

  let selected_rba_swaption_idx;
  let rba = false;
  $: selected_rba_swaption = $swaption_quotes.rba[selected_rba_swaption_idx];
  $: selectedSwitch = rba ? 1 : 0;
  let copyDataRBA = null;
  
  let copyData = null;
  let selected;
  let selected_x=null;
  let selected_y=null;

  let selectedSwitch;
  /**
   * Updates selected x & y when option expiry or swap term fields are updated
   *
   * @param event
   */
  const handleFormInput = (event) => {
    if (event.detail.hasOwnProperty("option_expiry")) {
      selected_y = event.detail.option_expiry;
    } else if (event.detail.hasOwnProperty("swap_term")) {
      selected_x = event.detail.swap_term;
    }
  };

  function setFalseRBA() {
    rba = false;
    copyDataRBA = null;
  }

  function setTrueRBA() {
    rba = true;
    copyData = null;
  }
</script>

<SwaptionNotification />

<div class="swaption">
  <div class="body">
    <div class="column">
      <div style="height: 75%; display: flex; flex-flow: column;">
        <ContentSwitcher
          style="margin-top: 1rem; flex: 0 1 auto;"
          bind:selectedIndex={selectedSwitch}
          >
          <Switch on:click={setFalseRBA}>
            <div style="display: center; align-items: center;">
              <ChartLine style="margin-right: 0.5rem;" /> Swaption Indicators
            </div>
          </Switch>
          <Switch on:click={setTrueRBA}>
            <div style="display: center; align-items: center;">
              <ChartLineSmooth style="margin-right: 0.5rem;" /> RBA Swaptions
            </div>
          </Switch>
          <Switch on:click={setFalseRBA}>
            <div style="display: center; align-items: center;">
              <ChartLine style="margin-right: 0.5rem;" /> ATM Straddle Prices
            </div>
          </Switch>
          <Switch on:click={setFalseRBA}>
            <div style="display: center; align-items: center;">
              <VolumeBlockStorage style="margin-right: 0.5rem;" /> Other MKT Structures
            </div>
          </Switch>
        </ContentSwitcher>

        {#if selectedSwitch === 0}
          <SwaptionIndicators bind:selected_x bind:selected_y bind:selected />
        {:else if selectedSwitch === 2}
          <SwaptionLiveOrderTable {copyData} />
        {:else if selectedSwitch === 3}
          <div style="overflow-x: hidden; overflow-y: hidden;">
            <SwaptionMarketStructures bind:copyData />
          </div>
        {:else}
          <RBAQuotesTable bind:selected_swaption_idx={selected_rba_swaption_idx} />
        {/if}
      </div>

      <!-- History Table -->
      <div class="table-container history-swaption-table" style="height:25%;">
        <SwaptionsHistoryTable bind:copyData bind:copyDataRBA bind:rba/>
      </div>
    </div>
    <!-- SWAP FORM -->
    <div class="swap-form-container column column--sm swaption--upload-confirm-modal">
      {#if selectedSwitch === 1}
        <RbaSwaptionOrderForm
          swap_term={selected_rba_swaption?.swap_tenor}
          premium_bp={selected_rba_swaption?.premium}
          strike_rate={selected_rba_swaption?.strike_rate}
          expiry_date={selected_rba_swaption?.option_expiry != null ? timestampToISODate(selected_rba_swaption.option_expiry) : null}
          maturity_date={selected_rba_swaption?.swap_end_date != null ? timestampToISODate(selected_rba_swaption.swap_end_date) : null}
          start_date={selected_rba_swaption?.swap_start_date != null ? timestampToISODate(selected_rba_swaption.swap_start_date) : null}
          bind:copied={copyDataRBA}
          on:reset={() => selected_rba_swaption_idx = undefined}/>
      {:else}
        <BbswSwaptionOrderForm
          option_expiry={selected_y}
          swap_term={selected_x}
          bind:copied={copyData}
          on:input={handleFormInput}
          on:reset={() => {
            selected_y = null;
            selected_x = null;
          }}
          />
      {/if}  
    </div>
  </div>
</div>

<style>
  .swaption {
    width: 100%;
  }
  .history-swaption-table {
    position: relative;
    height: 37.5%;
    display: flex;
    flex-direction: column;
  }
  /* .table-container {
    height: 37.5%;
    overflow-x: auto;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  } */
  /* Container for flexboxes */
  .body {
    display: -webkit-flex;
    display: flex;
    gap: 5px;
  }

  .column {
    background-color: var(--cds-layer);
    flex: 2;
    padding: 0 1.5rem 1.5rem;
    height: calc(100vh - 50px);
    min-height: 600px;
    width: 50%;
  }

  .column--sm {
    flex-basis: calc(320px + 2rem);
    flex-grow: 0;
  }

  .swap-form-container {
    padding-top: 1.5rem;
    overflow-y: auto;
    /* size of each field, size of border, size of gaps between the elements */
    flex-basis: calc(288px * 2 + 4rem + 0.5rem);
  }

  /* Responsive layout - makes the tables stack ontop of the order form */
  @media (max-width: 845px) {
    .body {
      -webkit-flex-direction: column;
      flex-direction: column;
      align-items: center;
    }
    .column {
      width: 100% !important;
      height: fit-content;
      max-height: none;
      flex-basis: auto;
    }
  }

  :global(.bx--text-input--sm .bx--select-input) {
    height: 24px !important;
  }

  :global(.swaption--upload-confirm-modal .bx--modal-container) {
    max-height: 91% !important;
  }
</style>
