<script>
  import {
      Button,
      RadioButtonGroup, 
      RadioButton,
      Tooltip,
      DataTable,
  } from "carbon-components-svelte";
  import ConnectionSignalOff from "carbon-icons-svelte/lib/ConnectionSignalOff.svelte";
  import ConnectionSignal from "carbon-icons-svelte/lib/ConnectionSignal.svelte";
  import SkillLevel from "carbon-icons-svelte/lib/SkillLevel.svelte";
  import SkillLevelBasic from "carbon-icons-svelte/lib/SkillLevelBasic.svelte";
  import SkillLevelAdvanced from "carbon-icons-svelte/lib/SkillLevelAdvanced.svelte";
  import CloseOutline from "carbon-icons-svelte/lib/CloseOutline.svelte";

  import data_collection_settings from "../../stores/data_collection_settings";
  import { markitwire } from "../../stores/connections";

  import websocket from "../../common/websocket";

  export let summary = false;

  let openToolTip = false;

  $: calcIRS = $data_collection_settings.calcIRS;  
  $: calcOIS = $data_collection_settings.calcOIS; 
  $: interpChoice = $data_collection_settings.interpChoice; 
  $: gateways = $data_collection_settings.gateways;
  $: gwCount = $data_collection_settings.gateways.length;
  $: gwActive = data_collection_settings.activeGatewayCount($data_collection_settings)
  $: frequencies = freqs(gwCount, gwActive);
  
  function freqs() {
    switch (gwActive) {
      case 0: 
        return {main: 'N/A', fut: 'N/A', fx: 'N/A', nonaud: 'N/A', aud: 'N/A'};
      case 1:
        return {main: (20/gwActive), fut: 60, fx: 60, nonaud: 300, aud: (30/gwActive)};
      case 2:
        return {main: (20/gwActive), fut: 60, fx: 60, nonaud: 120, aud: (30/gwActive)};
      case 3:
        return {main: 6.67, fut: 60, fx: 60, nonaud: 120, aud: (30/gwActive)};
      case 4:
        return {main: 5, fut: 30, fx: 30, nonaud: 120, aud: (30/gwActive)};
      case 5:
        return {main: 4, fut: 30, fx: 30, nonaud: 120, aud: (30/gwActive)};
      default: // case 6 or greater
        return {main: 4, fut: 30, fx: 30, nonaud: 120, aud: 5};
    }
  }

</script>

{#if summary}
  <div id="data_connections_summary" {...$$restProps}>
    <h6>Gateways</h6>
    <p style="padding:0;">Connected:&nbsp;&nbsp;{gwCount}</p>
    <p style="padding:0;">Active:&nbsp;&nbsp;{gwActive}</p>
    <h6>MarkitWire</h6>
    <p>{`The MarkitWire interface is ${!$markitwire.connected ? "not connected" : "connected " + ($markitwire.active ? "and" : "but not") + " logged in"}`}</p>
  </div>
{:else}
  <div id="data_connections" {...$$restProps}>
    <h4>MarkitWire</h4>
    <div>
      {#if !$markitwire.connected}
        <SkillLevel
          size={24}
          style="vertical-align:bottom; color:var(--cds-support-01);"
        />
      {:else}
        {#if $markitwire.active}
          <SkillLevelAdvanced
            size={24}
            style="vertical-align:bottom; color:var(--cds-support-02);"
          />
        {:else}
          <SkillLevelBasic
            size={24}
            style="vertical-align:bottom; color:var(--cds-support-03);"
          />
        {/if}
      {/if}
      <span style="margin-left:1rem;">
        {`The ${$markitwire.env?.toUpperCase()} MarkitWire interface is ${!$markitwire.connected ? "not connected" : "connected " + ($markitwire.active ? "and" : "but not") + " logged in"}`}
      </span>
    </div>
    <h4>Gateways</h4>
    <div style="display:flex; gap:1rem; margin-bottom:15px;">
      <p style="padding:0;">Connected:&nbsp;&nbsp;{gwCount}</p>
      <p style="padding:0;">Active:&nbsp;&nbsp;{gwActive}</p>
      <div on:mouseenter={() => openToolTip = true} on:mouseleave={() => openToolTip = false}>
        <Tooltip class="freq_breakdown" direction="right" bind:open={openToolTip}>
          <table style="width:200px;">
            <th colspan="2" style="text-align:center; font-weight:700; padding-bottom:0.5rem">Request Frequencies</th>
            <tr>
              <td>Futures (3Y, 10Y) &nbsp</td>
              <td>{frequencies.main} Sec</td>
            </tr>
            <tr>
              <td>90 Day IR Futures &nbsp</td>
              <td>{frequencies.fut} Sec</td>
            </tr>
            <tr>
              <td>FX Rates </td>
              <td>{frequencies.fx} Sec</td>
            </tr>
            <tr>
              <td>All AUD Products</td>
              <td>{frequencies.aud} Sec</td>
            </tr>
            <tr>
              <td>Non-AUD Products &nbsp</td>
              <td>{frequencies.nonaud} Sec</td>
            </tr>
          </table>
        </Tooltip>
      </div>
    </div>
    <DataTable
      headers={[
        {key: "user", value: "User"},
        {key: "blp_connected", value: "Bloomberg"},
      ]}
      rows={gateways.length > 0 ? gateways : [{user: "", blp_connected: "No Gateways Connected"}]}
      >  
      <svelte:fragment slot="cell" let:row let:cell>
        {#if gateways.length > 0 && (cell.key == "blp_connected")}
          {#if cell.value === true}
            <ConnectionSignal style="color: var(--cds-support-02); width: 25px; height: 25px; margin-right: 8px;"/>
            <Button
              class="disconnect"
              kind="danger-tertiary"
              size="small"
              iconDescription="Disconnect"
              icon={CloseOutline}
              on:click={() => {websocket.disconnectGateway(row.id)}} />
          {:else}
            <ConnectionSignalOff style="color: var(--cds-support-01); width: 25px; height: 25px;"/>
          {/if}
        {:else}
          {cell.value}
        {/if}
      </svelte:fragment>
    </DataTable>
    <h4>Calculations</h4>
    <div class="dataSourceOptions">
      <RadioButtonGroup selected={calcIRS} legendText="IRS Mid Source">
        <RadioButton value={true} labelText="Calculate from EFP" on:change={websocket.setCalcIRS(true)}/>
        <RadioButton value={false} labelText="Bloomberg" on:change={() => websocket.setCalcIRS(false)}/>
      </RadioButtonGroup>

      <RadioButtonGroup selected={calcOIS} legendText="Short-end OIS Mid Source">
        <RadioButton value={true} labelText="POCM Pricer" on:change={() => websocket.setCalcOIS(true)}/>
        <RadioButton value={false} labelText="Bloomberg" on:change={() => websocket.setCalcOIS(false)}/>
      </RadioButtonGroup>

      <RadioButtonGroup selected={interpChoice} legendText="Interpolation Method">
        <RadioButton value={true} labelText="Linear" on:change={() => websocket.setStraightInterp(true)}/>
        <RadioButton value={false} labelText="Cubic Spline"on:change={() => websocket.setStraightInterp(false)}/>
      </RadioButtonGroup>
    </div>
  </div>
{/if}


<style>
  #data_connections_summary {
    &>:not(h6) {
      margin-left: 1rem;
      font-size: 0.875rem;
    }
    & h6 {
      margin-bottom: 5px;
    }
    & h6:not(:first-of-type) {
      margin-top: 10px;
    }
  }

  #data_connections {
    &>:not(h4) {
      margin-left: 1rem;
    }
    & h4 {
      margin-bottom: 1rem;
    }
    & h4:not(:first-of-type) {
      margin-top: 2rem;
    }
  }

  .freq_breakdown td {
    white-space: nowrap;
  }
  :global(.freq_breakdown .bx--tooltip) {
    background-color: var(--cds-ui-02);
    color: var(--cds-text-primary);
  }
  :global(.freq_breakdown .bx--tooltip .bx--tooltip__caret) {
    border-bottom: 0.4296875rem solid var(--cds-ui-02);
  }

  :global(.disconnect .bx--assistive-text) {
    background-color: var(--cds-ui-02) !important;
    color: var(--cds-text-primary) !important;
  }
  :global(.disconnect)::before {
    border-bottom: 0.4296875rem solid var(--cds-ui-02) !important;
  }

  .dataSourceOptions {
    display: grid;
    gap: 20px;
  }
</style>