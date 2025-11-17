<script>
  import bank_divisions from "../../stores/bank_divisions";
  import swaption_orders from "../../stores/swaption_orders";
  import traders from "../../stores/traders";
  import SwaptionTicket from "./SwaptionTicket.svelte";
  import { ComposedModal, ModalHeader, ModalBody, ModalFooter, } from "carbon-components-svelte";
  import { convertDateToString, timestampToISODate } from "../../common/formatting";

  export let rba = false;

  // Order to copy to order form
  export let copyData = null;
  export let copyDataRBA = null;

  let data = null;
  let modal_open = false;
  let selected = null;

  $: {
    data = structuredClone($swaption_orders.rows);
    if (data && data.length > 1 && data[0].order_id < data[1].order_id) {
      data.reverse();
    }
    for (let o of data) {
      o.date = new Date(o.date);
      o.expiry_date = new Date(o.expiry_date);
      o.swap_start_date = new Date(o.swap_start_date);
      o.premium_date = new Date(o.premium_date);
      o.timestamp = new Date(o.timestamp);
    }
  }

  // Copy Data to order form
  function handleConfirm() {
    modal_open = false;
    if (selected.rba) {
      copyDataRBA = selected;
    } else {
      copyData = selected;
    }
    selected = null;
  }

  // View the trade ticket
  function openModal(row) {
    modal_open = true;
    if (row.rba) {
      rba = true;
      if (row.swap_maturity_date) { row.swap_maturity_date = new Date(row.swap_maturity_date); }
      copyData = null;
    } else {
      rba = false;
      copyDataRBA = null;
    }
    selected = row;
  }
</script>

<!-- Ticket View -->
<div class="swaption--upload-confirm-modal">
  <ComposedModal bind:open={modal_open} on:submit={handleConfirm}>
    <ModalHeader label="Swaption Ticket" title="View Ticket" />
  
    <ModalBody>
      {#if selected}
        <SwaptionTicket
          values={selected}
          buyer_bank_division={selected.buyer_bank_division}
          seller_bank_division={selected.seller_bank_division}
          submitted="true"
        />
      {/if}
    </ModalBody>
  
    <ModalFooter primaryButtonText="Copy To Order Form" />
  </ComposedModal>
</div>

<div class="history">
  <!-- History Table -->
  <h4 class="bx--data-table-header__title history-header">
    <strong>Recent Trades</strong>
  </h4>
  <div class="history-table">
    <table>
      <tr>
        <th>Buyer</th>
        <th>Seller</th>
        <th>Type</th>
        <th>Option Type</th>
        <th>Option Expiry</th>
        <th>Notional</th>
        <th>Strike Rate</th>
        <th>Swap Term</th>
        <th>Premium BP</th>
        <th>Spot Or Fwd</th>
        <th>Date</th>
        <th>Expiry Date</th>
        <th>Swap Start Date</th>
        <th>Premium Date</th>
        <th>Swap Maturity Date</th>
        <th>SEF</th>
        <th>Settlement</th>
        <th>Buyer Bank Division</th>
        <th>Buyer Brokerage</th>
        <th>Seller Bank Division</th>
        <th>Seller Brokerage</th>
        <th>Closed</th>
        <th />
      </tr>
      <tbody>
        {#if data == null}
          <tr>
            <td height="50px" colspan="16">No Available Data</td>
          </tr>
        {:else}
          {#each data as row}
            <tr>
              <td>
                {traders.fullName(traders.get(row.buyer_id)) ?? "-"}
              </td>
              <td>
                {traders.fullName(traders.get(row.seller_id)) ?? "-"}
              </td>
              <td>{row.rba == null ? "-" : row.rba ? "RBA" : "Standard"}</td>
              <td>{row.option_type ?? "-"}</td>
              <td>{row.option_expiry ?? "-"}</td>
              <td>{row.notional ?? "-"}</td>
              <td>{row.strike_rate ?? "-"}</td>
              <td>{row.swap_term ?? "-"}</td>
              <td>{row.premium_bp ?? "-"}</td>
              <td>{row.spot_or_fwd ?? "-"}</td>

              <td>{row.date == null ? "-" : convertDateToString(row.date)}</td>
              <td>{row.expiry_date == null ? "-" : convertDateToString(row.expiry_date)}</td>
              <td>{row.swap_start_date == null ? "-" : convertDateToString(row.swap_start_date)}</td>
              <td>{row.premium_date == null ? "-" : convertDateToString(row.premium_date)}</td>
              <td>{row.swap_maturity_date == null ? "-" : row.rba ? timestampToISODate(row.swap_maturity_date) : row.swap_maturity_date}</td>

              <td>{row.sef ? "ON" : "OFF"}</td>
              <td>{row.settlement ?? "-"}</td>
              <td>{row.buyer_bank_division == null ? "-" : bank_divisions.get(row.buyer_bank_division).name}</td>
              <td>{row.buyer_brokerage ?? "-"}</td>
              <td>{row.seller_bank_division == null?"-":bank_divisions.get(row.seller_bank_division).name}</td>
              <td>{row.seller_brokerage ?? "-"}</td>
              <td>{row.timestamp == null ? "-" : convertDateToString(row.timestamp)}</td>
              <td class="viewButton">
                <button height="10px" on:click={openModal(row)}>
                  View Ticket
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>

<style>
  th {
    font-weight: bold;
    background-color: var(--cds-ui-03);
    padding-left: 6px;
    position: sticky;
    top: 0;
    z-index: 30;
  }

  .history  {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .history-table {
    overflow-y: auto;
    overflow-x: auto;
    flex: 1 1 auto;
    height: 100%;
    border: 2px solid var(--cds-text-secondary);
  }

  .history-header {
    flex: 0 1 auto;
    padding-top: 16px;
    padding-bottom: 11px;
  }

  table {
    /* table-layout: fixed; */
    width: 100%;
  }

  td,
  th {
    vertical-align: middle;
    text-align: center;
    white-space: nowrap;
    padding: 4px;
    padding-right: 6px;
    padding-left: 6px;
  }
  tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: var(--cds-link-01, #78a9ff); 
}
.viewButton button {
    cursor: pointer;
}
.viewButton button:hover {
    color: var(--cds-link-01, #78a9ff); 
    font-weight: bold;
}
  .viewButton {
    right: 0;
    position: sticky;
    z-index: 15;
    padding: 0px;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
</style>
