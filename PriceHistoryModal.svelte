<script>
  import { DataTable, DataTableSkeleton, ModalHeader } from "carbon-components-svelte";
  import { addDays, addMonths, addYears, getEFPSPS_Dates, round, toEFPSPSTenor, toTenor } from "../common/formatting";
  import { findRbaDates } from "../common/rba_handler";
  import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
  import CloseLarge from "carbon-icons-svelte/lib/CloseLarge.svelte";
  import products from "../stores/products";
  import websocket from "../common/websocket";
  import traders from "../stores/traders";
  import DraggableModal from "./Utility/DraggableModal.svelte";
  import active_product from "../stores/active_product";
  import { selected_custom_wb } from "../stores/custom_whiteboards";

  let openModals = [];
  let uid = 0;

  let sel_board_id = -1;
  $: if (sel_board_id != $selected_custom_wb.board_id) sel_board_id = $selected_custom_wb.board_id;
  $: clearModals($active_product, sel_board_id);

  // open new history modal
  export function addModal (e) {
    openModals = openModals.filter((modal) => modal.open);
    if (e?.detail?.price_group?.product_id) {
      openModals.unshift({open: true, price_group: e.detail.price_group, got_history: false, rows: [], id: uid++})
      getHistory(e.detail.price_group);
      openModals = openModals;
    }
  }

  function clearModals () {
    openModals = [];
  }

  function toDateString(d) {
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}-${('0' + d.getDate()).slice(-2)}`;
  }

  // send websocket request for the history of the given tenor
  function getHistory (history_group) {
    let pid = history_group.product_id;
    let params = [history_group.years, pid];
    let start, fwd;
    switch (pid) {
      case 17:
      case 27:
        params[0] = [0.25];
        start = toDateString(new Date(getEFPSPS_Dates()[history_group.years[0]-1001].date));
        break;
      case 18: // can have fwd, start_date, or both assuming the start_date lines up with the fwd date
        let spot = addDays(new Date(), 1);
        let tenorDate = toDateString(history_group.fwd ? addMonths(spot, history_group.fwd*12) : spot);
        start = toDateString(new Date(history_group.tenor));
        if (tenorDate == start) fwd = history_group.fwd;
        break;
      case 20:
        start = toDateString(new Date(findRbaDates()[history_group.years[0]-1000]));
        break;
      default:
        if (products.isFwd(pid)) fwd = history_group.fwd;
        break;
    }
    params.push(fwd);
    params.push(start);
    websocket.callFunctionWithCallback(websocket.requestPriceHistory, params, "got_price_history", parseHistoryData);
  }

  // Check wether the given order data should be apart of the given price group
  function checkResponceGroup (pg, order) {
    let pid = pg.product_id;
    let start;
    if (pid != order.product_id) return false;
    switch (pid) {
      case 17:
      case 27:
        start = toDateString(new Date(getEFPSPS_Dates()[pg.years[0]-1001].date));
        return start == toDateString(new Date(order.start_date));
      case 18:
        let spot = addDays(new Date(), 1);
        let tenorDate = toDateString(pg.fwd ? addMonths(spot, pg.fwd*12) : spot);
        start = toDateString(new Date(pg.tenor));
        if (tenorDate == start) return toTenor(pg.years) == toTenor(order.years) && (start == toDateString(new Date(order.start_date)) || order.fwd == pg.fwd);
        else return toTenor(pg.years) == toTenor(order.years) && start == toDateString(new Date(order.start_date));
      case 20:
        start = toDateString(new Date(findRbaDates()[pg.years[0]-1000]));
        return start == toDateString(new Date(order.start_date));
      default:
        if (products.isFwd(pid)) return pg.fwd == order.fwd && toTenor(pg.years) == toTenor(order.years);
        else return toTenor(pg.years) == toTenor(order.years);
    }
  }

  // Handle the incomming db request message, find correct modal it applies to and parse the data
  function parseHistoryData (responce) {
    let order = responce.rows.length > 0 ? responce.rows[0] : responce.input_data;
    for (let idx in openModals){
      if (!openModals[idx].got_history){
        let pg = openModals[idx].price_group;
        if (checkResponceGroup(pg, order)) {
          if (responce.rows.length > 0){
            let tenor = "";
            switch (order.product_id) {
              case 1:
              case 2:
                tenor = (order.years.length == 1 ? (order.years[0] > 5 ? '10Y' : '3Y') : '3x10') + ":  ";
                break;
              case 17:
              case 27:
                tenor = toEFPSPSTenor(order.start_date).split(" ")[0] + ":  ";
                break;
            }
            openModals[idx].rows = responce.rows.map((row) => {
              let date = new Date(row.time_placed);
              let price = products.isPercentageProd(order.product_id) && order.years.length > 1 ? row.price*100 : row.price;
              return {
                id: row.order_id,
                bank: row.bank,
                date: date.getDate() + "/" + (date.getMonth()+1) + 
                      (date.getFullYear() < new Date().getFullYear() ? "/" + date.getFullYear().toString().slice(2) : ""),
                direction: row.bid ? "Bid" : "Offer",
                price: round(price,7),
                traded: row.traded,
                ref: row.reference != null ? tenor + round(row.reference, 7) : "N/A",
              }
            });
          }
          openModals[idx].got_history = true;
        }
      }
    }
  }
</script>

{#each openModals as modal (modal.id)}
  <div class="history_modal">
    <DraggableModal
      bind:open={modal.open}
      heading={`${products.name(modal.price_group.product_id)} ${modal.price_group.tenor} History`}
      >
      <svelte:fragment slot="body">
        {#if modal.got_history}
          <DataTable
            headers={[
              {key: 'bank', value: 'Bank'},
              {key: 'date', value: 'Date'},
              {key: 'direction', value: 'Direction'},
              {key: 'price', value: 'Price'},
              {key: 'ref', value: 'Reference'},
              {key: 'traded', value: 'Traded'}
            ]}
            rows={modal.rows}
            size="compact">
            <svelte:fragment slot="cell" let:row let:cell>
              {#if cell.key == "traded"}
                {#if cell.value == true}
                  <Checkmark style="color: green;"/>
                {:else}
                  <CloseLarge style="color: red;"/>
                {/if}
              {:else}
                {cell.value}
              {/if}
            </svelte:fragment>
          </DataTable>
        {:else}
          <DataTableSkeleton showHeader={false} showToolbar={false} columns={6} size="compact" />
        {/if}
      </svelte:fragment>
    </DraggableModal>
  </div>
{/each}

<style>
  :global(.history_modal .bx--modal-container) {
    width: 450px !important;
  }
  :global(.history_modal h3) {
    font-size: var(--cds-productive-heading-02-font-size);
    font-weight: var(--cds-productive-heading-02-font-weight);
    line-height: var(--cds-productive-heading-02-line-height);
    letter-spacing: var(--cds-productive-heading-02-letter-spacing);
  }
  :global(.history_modal .bx--modal-content) {
    margin-bottom: 1rem;
  }
  :global(.history_modal .bx--data-table.bx--skeleton td span) {
    width: 3rem;
  }
  :global(.history_modal .bx--data-table th, .history_modal .bx--data-table td) {
    text-align: center;
    padding-left: 6px;
    padding-right: 6px;
  }
</style>