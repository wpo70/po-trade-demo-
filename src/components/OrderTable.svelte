<script>
import { onMount, tick } from 'svelte';
import {
  DataTable,
  Toolbar,
  ToolbarBatchActions,
  Button,
  Modal,
  ToolbarContent,
  ToolbarMenu,
  ToolbarMenuItem,
  ToolbarSearch,
  Pagination
} from 'carbon-components-svelte';
import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
import DocumentExport from "carbon-icons-svelte/lib/DocumentExport.svelte";
import CertificateCheck from 'carbon-icons-svelte/lib/CertificateCheck.svelte';

import {
  toPrice,
  toBPPrice,
  timestampToDateTime,
  toTenor,
  toVolumeString,
  bidToString,
  timestampToDate,
  toRBATenor,
  toEFPSPSTenor,
} from '../common/formatting.js';
import websocket from '../common/websocket.js';

import user from '../stores/user.js';
import traders from '../stores/traders.js';
import brokers from '../stores/brokers.js';
import active_product from '../stores/active_product.js';
import products from '../stores/products.js';

export let active_orders;
export let selection = [];

let rowIds = [];
let active = false;
let delete_dialog = false;
$: permission = user.getPermission($brokers);

// Pagination controller
let pageSize = 25;
let page = 1;

/**
 * RowIds is an array of order Id - list of array of number - has been selected
 * Selection is an array of selected active_orders where by order_id has been included in rowIds
 * Selected is a recent selected order in an array of selection
*/
$: resetRowIds(selection);
$: selection = (rowIds ? active_orders.filter((r) => rowIds.includes(r.order_id)) : []);
$: active = rowIds.length > 0;
$: ordersSelected = selection.filter(selected => !selected?.eoi);
$: totalItems = active_orders.length;

function resetRowIds () {
  if (selection.length == 0) {
    rowIds = [];
  }
}

// Export active_orders to csv
// Ref: https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
// https://medium.com/@idorenyinudoh10/how-to-export-data-from-javascript-to-a-csv-file-955bdfc394a9

function exportLedgerToCSV() {
  let csvContent='';
  // Formating data [{},{},..] to [[],[],..]
  const title = Object.keys(active_orders[0]);
  const data = []
  data.push(title);
  active_orders.forEach(e => {data.push(Object.values(e))});
  // Parse content
  csvContent = data.map(e => e.join(";")).join("\n");
  var encodeUri = encodeURI(csvContent);
  //window.open(encodeUri, "_self");

  download(csvContent);
}

const download = function (data) {
 
 // Creating a Blob for having a csv file format
 // and passing the data with type
 const blob = new Blob([data], { type: 'text/csv' });

 // Creating an object for downloading url
 const url = window.URL.createObjectURL(blob)

 // Creating an anchor(a) tag of HTML
 const a = document.createElement('a')

 // Passing the blob downloading url
 a.setAttribute('href', url)

 // Setting the anchor tag attribute for downloading
 // and passing the download file name
 a.setAttribute('download', 'order.csv');

 // Performing a download with click
 a.click()
}
function handleDelete() {
  // Close the delete orders Modal

  delete_dialog = false;

  // Delete all of the selected orders.  Prepare an array of order IDs to be deleted.

  let dels = selection.map((o) => o.order_id);
  websocket.deleteOrders(dels);

  // Reset selection

  selection = []
}

/**
 * @param {number} product_id
 * @param {number[]} years
 * @returns {string}
 */
const getSTIRProduct = (product_id, years) => {
  switch (product_id) {
    case 17:
        return 'SPS EFP';
    case 18:
        return 'SPS';
    case 27:
        return 'SPS 90';
    default:
        return '-';
      }
};

function makeSelectionFirm () {
  for (let o of selection) {
    if(o.eoi) continue;
    websocket.submitOrder({
      order_id: o.order_id,
      product_id: o.product_id,
      firm: true,
      time_placed: new Date(),
      bid: o.bid
    }, true);
  }
  rowIds = [];
}

function accentCell(node, cell) {
  function style_parent(str) {
    node.parentElement.style = str;
    node.parentElement.classList.add("highlighted_cell");
  }

  switch (cell.key) {
    case "bid":
      node.parentElement.classList.add("highlighted_cell");
      node.parentElement.setAttribute("bid", cell.value);
      return;
    case "tenor":
    case "bank":
      return style_parent("background-color: var(--cds-button-separator);");
    case "price":
      return style_parent("background-color: var(--cds-decorative-01);");
    case "volume":
      return style_parent("background-color: var(--cds-tag-background-blue);");
    default:
      return;
  }
}

$: checkAccents(active_orders);
async function checkAccents() {
  await tick();
  let cells = Array.from(document.querySelectorAll("td.highlighted_cell[bid]"));
  cells.forEach(cell => {
    cell.setAttribute("bid", cell.innerText);
  });
}

const observer = new ResizeObserver(setPageSize);
function setPageSize() {
  let table = document.getElementsByClassName("orders-table")?.[0]?.firstElementChild;
  if (!table) { return; }
  if (table.scrollHeight > table.clientHeight || pageSize < totalItems) {
    const t_height = table.getBoundingClientRect().height - 72;
    const r_height = table.querySelector("tr[data-row]").getBoundingClientRect().height;
    const r_count = Math.floor(t_height/r_height);
    pageSize = r_count;
  }
}

onMount(() => {
  observer.observe(document.getElementsByClassName("orders-table")[0]);
  // setPageSize();
});

</script>

<div class="orders-table">
<DataTable
  bind:page
  {pageSize}
  useStaticWidth={false}
  selectable
  sortable
  batchSelection ={active}
  zebra
  size="medium"
  bind:selectedRowIds={rowIds}
  headers={[
    {key: 'time', value: 'Time'},
    ... $active_product == 1 || $active_product == 29? [{key: 'product', value: 'Product'}] : [],
    {key: 'bid', value: 'Bid'},
    ... products.fwdOf($active_product) ? [{key: 'fwd', value: 'Fwd'}] : [],
    {key: 'tenor', value: 'Tenor'},
    {key: 'price', value: 'Price'},
    {key: 'volume', value: 'Volume'},
    {key: 'trader', value: 'Trader'},
    {key: 'bank', value: 'Bank'},
    {key: 'broker', value: 'Broker'},
    ... $active_product == 18 ? [
      {key: 'start_date', value: 'Start Date'},
      {key: 'stir_product', value: 'Product'}
    ] : [],
    ... $active_product == 20 ? [{key: 'start_date', value: 'Start Date'}] : []
  ]}
  rows={
    active_orders.map(order => {
      let tenor;
      switch (order.product_id){
        case 17:
        case 27:
          tenor = toEFPSPSTenor(order.start_date);
          break;
        case 20:
          tenor = toRBATenor(order.years, order.start_date);
          break;
        default:
          tenor = toTenor(order.years);
          break;
      }
      let order_is_old = new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0);
      
      let order_display = {
        id: order.order_id,
        time: timestampToDateTime(order.time_placed),
        product: products.name(order.product_id),
        bid: order.bid ? 'Interest To Pay' : 'Interest To Rec',
        tenor: tenor,
        price: (order.eoi && order.price != null) || !order.eoi ? order.price : '-',
        volume: '-',
        trader: traders.name(order.trader_id),
        bank: traders.bankName(order.trader_id),
        broker: brokers.name(order.broker_id),
        currency_code: order.currency_code,
        fwd: order.fwd != null ? toTenor(order.fwd) : '-',
        start_date: order.start_date ? timestampToDate(order.start_date).concat(order.isExpired() ? ' 🚩' : '') : '-',
        stir_product: getSTIRProduct(order.product_id, order.years)
      };
      if(!order.eoi) {
        order_display.bid = bidToString(order.bid).concat(order_is_old ? ' ❄️' : order.firm ? '' : ' ⛔');
        order_display.price = ([1, 3, 20].includes(products.nonFwd(order.product_id))) && order.years.length != 1 ? toBPPrice(order.price) : toPrice(order.price);
        order_display.volume = toVolumeString(order.volume).concat(order.isBelowMMP() ? ' ⚠️' : '');
      }
      return order_display;
    })
  }
>
  <svelte:fragment slot="cell" let:rowIndex let:cell>
    <div use:accentCell={cell}>{cell.value}</div>
  </svelte:fragment>

  <Toolbar size="sm">
    {#if active}
      <ToolbarBatchActions bind:active on:cancel={(e) => { e.preventDefault(); active=false; rowIds = [];} }>
        <Button
          icon={CertificateCheck}
          on:click={makeSelectionFirm}
          kind="secondary"
          disabled={permission["View Only"]}>
          Make {ordersSelected.length} {ordersSelected.length === 1 ? 'order' : 'orders'} firm
        </Button>
        <Button
          icon={TrashCan}
          on:click={() => {delete_dialog = true}}
          kind="danger"
          disabled={permission["View Only"]}>
          Remove {selection.length} {selection.length === 1 ? 'order' : 'orders'}
        </Button>
      </ToolbarBatchActions>
    {/if}

    <ToolbarContent>
      <ToolbarSearch />
      <ToolbarMenu>
      <!-- FIXME: not sure what functionality of this button:  -->
      </ToolbarMenu>
      <Button icon={DocumentExport} disabled={permission["View Only"]} on:click={() => exportLedgerToCSV() }>Export</Button>
    </ToolbarContent>
  </Toolbar>

</DataTable>

<!------- Pagination ----------------->
<Pagination
  {pageSize}
  bind:page
  {totalItems}
  pageSizeInputDisabled
  />
</div>

<!--
  This is a dialog to ask whether the broker is sure about deleting orders.
-->

<Modal
  bind:open={delete_dialog}
  modalHeading="Delete orders"
  modalAriaLabel="delete-content"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  on:submit={handleDelete}
  on:click:button--secondary={() => {delete_dialog = false}}
  danger
  size="xs"
>
  <p>Do you want to delete {selection.length} {selection.length === 1 ? 'order' : 'orders'}?</p>
</Modal>

<style>
  .orders-table {
    width: 100%;
    background-color: var(--cds-ui-01);
  }
  :global(.orders-table .bx--data-table-container) {
    padding-top: 0px;
    height: calc(100% - 45px);
  }
  :global(.orders-table td.highlighted_cell) {
    font-weight: bold;
    &[bid^=Offer] {
      background-color: var(--cds-tag-background-red) !important;
    }
    &[bid^=Bid] {
      background-color: var(--cds-tag-background-cyan) !important;
    }
    &[bid*=Rec] {
      background-color: var(--cds-tag-color-red) !important;
      color: var(--cds-text-inverse);
    }
    &[bid*=Pay] {
      background-color: var(--cds-tag-color-cyan) !important;
      color: var(--cds-text-inverse);
    }
    /* 1.145.36.110, 101.169.64.2 */
  }
  :global(.rba_ois .orders-table) {
    min-height: 0px;
  }
  .orders-table::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
</style>