<script>
// Import components

import {
  DataTable,
  Button,
  Toolbar,
  ToolbarBatchActions,
  ToolbarContent,
  ToolbarSearch,
  Pagination,
  ContextMenu,
  ContextMenuOption
} from 'carbon-components-svelte';
import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
import List from 'carbon-icons-svelte/lib/List.svelte';

import TraderForm from './TraderForm.svelte';
import TraderOrders from './TraderOrders.svelte';
import TraderDeleteForm from './TraderDeleteForm.svelte';
import TraderEOD from './TraderEOD.svelte';

// Import stores

import traders from '../../stores/traders.js';
import bank_divisions from '../../stores/bank_divisions';

import { createEventDispatcher } from 'svelte';
const dispatch = createEventDispatcher();
    

// filters provided from external components
// NOTE: the filters passed through this prop must conform to the following shape
//  * must be an object
//  * each key corresponds to a column to filter
//  * the corresponding value is an array of all possible values that the filter
//    should allow
export let filters;

// trader ids of selected traders on the table & the corresponding trader objects
let active;

let selection = [];
let selected_traders = [];

// if the modals are open currently
let is_update_open = false;
let is_orders_open = false;
let is_delete_open = false;

// all the possible rows & the currenty visible rows according to filters
let rows = [];
let filtered_rows = [];
let search_value;

// max page size & current page
let pageSize = 30;
let page = 1;

// variables corresponding with the context menu
let ctx_target;
let ctx_x, ctx_y, ctx_open;
let ctx_selected_trader;
let hovered_trader;
$: {
  rows = $traders.map(trader => {
    return {
      id: trader.trader_id,
      bank: traders.bankName(trader.trader_id),
      firstname: trader.firstname,
      lastname: trader.lastname,
      preferredname: trader.preferredname,
      email: trader.email ?? '-',
      ov_trader_id: trader.ov_trader_id ?? '-',
      bbg_id: trader.bbg_id ?? '-',
      bank_div_id: bank_divisions.get(trader.bank_div_id)? bank_divisions.get(trader.bank_div_id).name: '-',
      futures_account: trader.futures_account ?? '-',
    }
  });
}

// filters the rows according to all the currently selected filters
$: {
  filtered_rows = rows.filter((row) => {
    // filtering for the search bar

    // get all the values of the row excluding the id in lowercase
    const val_arr = Object.entries(row)
      .reduce((filtered, [key, value]) => {
        if(key !== 'id' && typeof value == 'string') {
          try{
            filtered.push(value.toLowerCase());
          } catch(e) {
            console.log(e, key, value);
          }
        }
        return filtered;
      }, []);

    // if the search value is not included in any of the values of the row,
    // return false
    if(search_value &&
      !val_arr.some((val) => search_value
                              .toLowerCase()
                              .split(" ")
                              .filter((v) => v !== '')
                              .some((v) => val.includes(v)))) {
      return false;
    }

    // filtering for the filter menu

    if(!filters) {
      return true;
    }

    // loop through all the filters and return false if any filter
    // does not match
    for(const [key, value] of Object.entries(filters)) {
      if(!value || value.length <= 0) {
        continue;
      }

      // if the types are the same, compare the values
      if(typeof value[0] === typeof row[key] &&
         !value.includes(row[key])) {
        return false;

      // if the types are not the same, and the filters type is a boolean,
      // check if the row exists and match that to the boolean passed in
      } else if (typeof value[0] === 'boolean' &&
                 !value.includes((row[key] !== '-'))) {
        return false;
      }
    }

    return true;
  });
}


// updates the currently selected traders with the traders selected in the table
function updateSelectedTraders() {
  selected_traders = selection.map((idx) => traders.get(idx));
}

// handler for opening the context menu
function handleCtxMenu(e) {
  // if a trader is hovered (meaning a row on the datatable is hovered,
  // open the context menu at the cursors location)
  if (hovered_trader) {
    ctx_x = e.clientX;
    ctx_y = e.clientY;
    ctx_selected_trader = traders.get(hovered_trader.id);

    ctx_open = true;
  }
}

// update the currently selected trader to the trader selected in the context
// menu and open the delete traders modal
function handleCtxDelete() {
  if(ctxUpdateSelectedTrader()) {
    is_delete_open = true;
  }
}

// update the currently selected trader to the trader selected in the context
// menu and open the update trader modal
function handleCtxUpdate() {
  if(ctxUpdateSelectedTrader()) {
    is_update_open = true;
  }
}

// update the currently selected trader to the trader selected in the context
// menu and open the view orders modal
function handleCtxViewOrders() {
  if(ctxUpdateSelectedTrader()) {
    is_orders_open = true;
  }
}

// helper function that updates the selected trader to the trader currently
// hovered by the context menu
function ctxUpdateSelectedTrader() {
  let t = traders.get(ctx_selected_trader.trader_id);
  if(!t) {
    return false;
  }
  selected_traders = [t];
  return true;
}
$: if (selection.length == 0) dispatch('traderSelected', null );
</script>

<!--
  ended up creating an invisible div to set as the target for the context menu
  component so the logic for the context menu could be handled manually
-->
<div bind:this={ctx_target} class="ctx_target" style:display={'none'}></div>

<!-- CONTEXT MENU -->
<ContextMenu
  target={ctx_target}
  bind:x={ctx_x}
  bind:y={ctx_y}
  bind:open={ctx_open}
  on:close={() => ctx_selected_trader = null}>

  <ContextMenuOption
    labelText="Delete"
    on:click={handleCtxDelete}/>

  <ContextMenuOption
    labelText="Update"
    on:click={handleCtxUpdate}/>

  <ContextMenuOption
    labelText="View Orders"
    on:click={handleCtxViewOrders}/>

</ContextMenu>

<!-- TRADER TABLE -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="traders_table" on:contextmenu={handleCtxMenu}>
  <div class="traders_table_trader"style="margin-bottom: 10px;max-height: 450px;">
    <DataTable
    title="Traders Table"
    description="List of all available traders on-boarding with POCap"
    useStaticWidth={false}
    stickyHeader
    sortable
    selectable
    batchSelection
    zebra
    bind:selectedRowIds={selection}
    size="short"
    headers={[
      {key: 'bank', value: 'Bank'},
      {key: 'firstname', value: 'First Name'},
      {key: 'lastname', value: 'Last Name'},
      {key: 'preferredname', value: 'Preferred Name'},
      {key: 'email', value: 'Email'},
      {key: 'ov_trader_id', value: 'OneView Trader Id'},
      {key: 'bbg_id', value:'Bloomberg Id'},
      {key: 'bank_div_id', value:'Bank Division'},
      {key: 'futures_account', value:'Futures Account'}
    ]}
    {pageSize}
    {page}
    rows={filtered_rows}

    on:click:row--select={(e) => dispatch('traderSelected', selection.length === 1 ? selection?.map((idx) => traders.get(idx)) : null )}
    on:mouseenter:row={(e) => hovered_trader = e.detail}
    on:mouseleave:row={() => hovered_trader = null}>

    <Toolbar>
      <ToolbarBatchActions bind:active on:cancel={(e) => { e.preventDefault(); active=undefined; selection = []; dispatch('traderSelected', null )}}>
        <!-- DELETE BUTTON -->
        <Button
          icon={TrashCan}
          on:click={() => {
            updateSelectedTraders();
            is_delete_open = !is_delete_open;
          }}
          kind="danger"
          disabled={''}>
          Remove {selection.length} {selection.length === 1 ? 'trader' : 'traders'}
        </Button>

        <!-- UPDATE BUTTON -->
        <Button
          icon={Edit}
          on:click={() => {
            updateSelectedTraders();
            is_update_open = !is_update_open;
          }}
          kind="secondary"
          disabled={selection.length > 1}>
          Update trader
        </Button>

        <!-- VIEW ORDERS BUTTON -->
        <Button
          icon={List}
          on:click={() => {
            updateSelectedTraders();
            is_orders_open = !is_orders_open;
          }}
          kind="primary"
          disabled={selection.length > 1}>
          View Orders
        </Button>

      </ToolbarBatchActions>

      <ToolbarContent>
        <ToolbarSearch bind:value={search_value} persistent/>
      </ToolbarContent>
    </Toolbar>
  </DataTable>
  <!-- PAGINATION BAR -->
  <Pagination
  bind:pageSize
  bind:page
  totalItems={filtered_rows.length}
  pageSizeInputDisabled
  />
</div>


<!-- EOD email address  -->
  <div style="margin-top: 20px; margin-bottom: 10px; max-height: 300px;">
    <TraderEOD />
  </div>
</div>



<!-- MODALS -->

<!-- Update Trader -->
<TraderForm
  bind:open={is_update_open}
  trader={selected_traders[0]}/>

<!-- Delete Traders -->
<TraderDeleteForm
  bind:open={is_delete_open}
  trader_list={selected_traders}
  on:delete={() => selection = []}
/>

<!-- View Orders -->
<TraderOrders
  bind:open={is_orders_open}
  trader={selected_traders[0]}/>

<style>

:global(.bx--pagination .bx--select-input) {
  line-height: 0;
}

.traders_table {
  width: 100%;
}
:global(.traders_table .bx--data-table-header) {
  padding-top:0 ;
  padding-left:0;
  padding-right:0;
  padding-bottom: 15px;
}

</style>
