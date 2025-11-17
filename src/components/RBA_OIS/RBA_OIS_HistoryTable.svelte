<script>
    import bank_divisions from "../../stores/bank_divisions";
    import traders from "../../stores/traders";
    import trades from "../../stores/trades";
    import { toTenor, addTenorToDate, toRBATenor } from '../../common/formatting.js';
    import { ComposedModal, ModalHeader, ModalBody, ModalFooter } from "carbon-components-svelte";
    import OisTicket from "./OISTicket.svelte";

    // Order to copy to order form
    export let copyData = null;

    let data = null;
    let modal_open = false;
    let selected = null;

    function handleStoreUpdate() {
      data = structuredClone(trades.getAll_OIS());
      if (data?.length > 1) {
        data.reverse();
      }
      // convert to ois specific format
      for (let idx in data) {
        const t = data[idx];
        const trade = {
          trade_id: t.trade_id,
          fixed_payer_id: t.bid_trader_id,
          floating_payer_id: t.offer_trader_id,
          notional: t.volume,
          rate: t.price,
          term: t.year > 1000 ? toRBATenor([1000], new Date(t.start_date)) : toTenor(t.year),
          start_date: new Date(t.start_date),
          expiry_date: new Date(addTenorToDate(toTenor(t.year), t.start_date)),
          sef: t.sef,
          fixed_bank_division: t.bid_bank_division_id,
          floating_bank_division: t.offer_bank_division_id,
          rba: trades.isRBA(t),
          offer_brokerage: t.offer_brokerage,
          bid_brokerage: t.bid_brokerage,
        }
        data[idx] = trade;
      }
      data = data;
    }
          
    $: $trades && handleStoreUpdate()

    // Copy Data to order form
    function handleConfirm () {
        modal_open = false;
        copyData = selected;
    };

    // View the trade ticket
    function openModal (row) {
      selected = JSON.parse(JSON.stringify(row));
      selected.start_date = new Date(selected.start_date);
      selected.expiry_date = new Date(selected.expiry_date);
      modal_open = true;
    }

    const convertDateToString = (date) => {
      if(!date || isNaN(date)) {
        return '';
      }

      // https://stackoverflow.com/a/29774197

      const offset = date.getTimezoneOffset();
      let d = new Date(date.getTime() - (offset * 60 * 1000));
      return d.toISOString().split('T')[0];
    };

</script>

<!-- Ticket View -->
<ComposedModal
  bind:open={modal_open}
  on:close={selected=null}
  on:submit={handleConfirm}>

  <ModalHeader label="Trade Ticket" title="View Ticket"/>

  <ModalBody>
    {#if selected}
      <OisTicket
        values={[selected]}
        fixed_bank_division={selected.fixed_bank_division}
        floating_bank_division={selected.floating_bank_division}
        submitted=true/>
    {/if}
  </ModalBody>
  <ModalFooter primaryButtonText="Copy To Order Form"/>

</ComposedModal>

<!-- History Table -->
<div style="padding-bottom: 1rem; height: 100%;">
  <h4 style="padding-top: 16px; padding-bottom: 11px;" class:bx--data-table-header__title="{true}"><strong>Recent OIS Trades</strong></h4>
  <div class="history">
    <table>
      <tr>
        <th>Payer</th>
        <th>Receiver</th>
        <th>Type</th>
        <th>Notional</th>
        <th>Rate</th>
        <th>Term</th>
        <th>Expiry Date</th>
        <th>Start Date</th>
        <th>SEF</th>
        <th>Fixed Bank Division</th>
        <th>Fixed Brokerage</th>
        <th>Floating Bank Division</th>
        <th>Floating Brokerage</th>
        <th></th>
      </tr>
      <tbody>
        {#if data == null}
          <tr>
            <td height="50px" colspan="16">No Available Data</td>
          </tr>
        {:else}
          {#each data as row (row.trade_id)}
            <tr>
              <td>{traders.fullName(traders.get(row.fixed_payer_id)) == null?"-":traders.fullName(traders.get(row.fixed_payer_id))}</td>
              <td>{traders.fullName(traders.get(row.floating_payer_id)) == null?"-":traders.fullName(traders.get(row.floating_payer_id))}</td>
              <td>{row.rba?"RBA OIS":"OIS"}</td>
              <td>{row.notional == null?"-":row.notional}</td>
              <td>{row.rate == null?"-":row.rate}</td>
              <td>{row.term == null?"-":row.term}</td>
              <td>{row.expiry_date == null?"-":convertDateToString(row.expiry_date)}</td>
              <td>{row.start_date == null?"-":convertDateToString(row.start_date)}</td>
              <td>{row.sef?"ON":"OFF"}</td>
              <td>{row.fixed_bank_division == null?"-":bank_divisions.get(row.fixed_bank_division).name}</td>
              <td>{row.bid_brokerage ?? "-"}</td>
              <td>{row.floating_bank_division == null?"-":bank_divisions.get(row.floating_bank_division).name}</td>
              <td>{row.offer_brokerage ?? "-"}</td>
              <td class="viewButton"><button height="10px" on:click={openModal(row)}>View Ticket</button></td>
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

.history {
    height: 80%;
    overflow-y: scroll;
    overflow-x: auto;
    border: 2px solid var(--cds-text-secondary);
}

table {
    /* table-layout: fixed; */
    width: 100%;
}

td, th {
    vertical-align: middle;
    text-align: center;
    white-space: nowrap;
    padding: 4px;
    padding-right: 6px;
    padding-left: 6px;
}
.history tr:nth-child(odd) {
  background-color: var(--cds-ui-03);
}
.viewButton {
    right: 0;
    position: sticky;
    z-index: 15;
    padding: 0px;
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
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
</style>
