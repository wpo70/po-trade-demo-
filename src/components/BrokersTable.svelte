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

import BrokerForm from './BrokerForm.svelte';
import BrokerDeleteForm from './BrokerDeleteForm.svelte';

// Import stores
import { addToast } from '../stores/toast';
import brokers from '../stores/brokers.js';
import user from '../stores/user';

// broker ids of selected brokers on the table & the corresponding broker objects
let active;

export let selection = [];
let selected_brokers = [];
let currentuser = brokers.get(user.get());
let broker;
$: {broker = brokers.get(selection[0]);};

// if the modals are open currently
let is_update_open = false;
let is_delete_open = false;

// all the possible rows & the currenty visible rows according to filters
let rows = [];
let filtered_rows = [];
let search_value;

// max page size & current page
let pageSize = 15;
let page = 1;

// variables corresponding with the context menu
let ctx_target;
let ctx_x, ctx_y, ctx_open;
let ctx_selected_broker;
let hovered_broker;
$: {
  rows = $brokers.filter((b) => b.active).map(broker => {
        return {
          id: broker.broker_id,
          firstname: broker.firstname,
          lastname: broker.lastname,
          accesslevel: broker.accesslevel,
          email: broker.email ?? '-',
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

    return true;
  });
}


// updates the currently selected brokers with the brokers selected in the table
function updateSelectedBrokers() {
  selected_brokers = selection.map((idx) => brokers.get(idx));
}

// handler for opening the context menu
function handleCtxMenu(e) {
  // if a broker is hovered (meaning a row on the datatable is hovered,
  // open the context menu at the cursors location)
  if (hovered_broker) {
    ctx_x = e.clientX;
    ctx_y = e.clientY;
    ctx_selected_broker = brokers.get(hovered_broker.id);

    ctx_open = true;
  }
}

// update the currently selected broker to the broker selected in the context
// menu and open the delete brokers modal
function handleCtxDelete() {
  if(ctxUpdateSelectedBroker()) {
    is_delete_open = true;
  }
}

// update the currently selected broker to the broker selected in the context
// menu and open the update broker modal
function handleCtxUpdate() {
  if(ctxUpdateSelectedBroker()) {
    is_update_open = true;
  }
}


// helper function that updates the selected broker to the broker currently
// hovered by the context menu
function ctxUpdateSelectedBroker() {
  let b = brokers.get(ctx_selected_broker.broker_id);
  if(!b) {
    return false;
  }
  selected_brokers = [b];
  return true;
}

function handleToast(message){
  addToast ({
      message: message,
      type: "error",
      dismissible: true,
      timeout: 4000,
  });
}

// Handles the conditions for toasts to appear 
function handleCtxOptions(type){
  if(type === 'Delete'){
    if(currentuser.email == ctx_selected_broker.email || currentuser.accesslevel != 999){
      handleToast(`Unable to delete your own account.`);
    }else if(currentuser.accesslevel <= ctx_selected_broker.accesslevel && currentuser.accesslevel != 999){
      handleToast(`Unable to delete ${ctx_selected_broker.firstname} ${ctx_selected_broker.lastname}'s account due to lower access level.`);
    }else{
      handleCtxDelete();
    }
  }else if(type === 'Update'){
    if(currentuser.email == ctx_selected_broker.email || currentuser.accesslevel != 999){
      handleToast(`Unable to update your own account.`);
    }else if(currentuser.accesslevel <= ctx_selected_broker.accesslevel && currentuser.accesslevel != 999){
      handleToast(`Unable to update ${ctx_selected_broker.firstname} ${ctx_selected_broker.lastname}'s account due to lower access level.`);
    }else{
      handleCtxUpdate();
    }
  }
}

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
  on:close={() => ctx_selected_broker = null}>
  <ContextMenuOption
    labelText="Delete"
    on:click={() => handleCtxOptions("Delete")}
  />

  <ContextMenuOption
    labelText="Update"
    on:click={() =>  handleCtxOptions("Update")}
  />

</ContextMenu>

<!-- broker TABLE -->
<div on:contextmenu={handleCtxMenu}>
  <DataTable
    sortable
    selectable
    batchSelection
    zebra
    bind:selectedRowIds={selection}
    size="short"
    headers={[
      {key: 'firstname', value: 'First Name'},
      {key: 'lastname', value: 'Last Name'},
      {key: 'accesslevel', value: 'Access Level'},
      {key: 'email', value: 'Email'}
    ]}
    {pageSize}
    {page}
    rows={filtered_rows}
    on:mouseenter:row={(e) => hovered_broker = e.detail}
    on:mouseleave:row={() => hovered_broker = null}>

    <Toolbar>
      <ToolbarBatchActions bind:active on:cancel={(e) => { e.preventDefault(); active=false; selection = [];}}>
        <!-- DELETE BUTTON -->
        <Button
          icon={TrashCan}
          on:click={() => {updateSelectedBrokers();
          if(currentuser.email == selected_brokers[0].email || currentuser.accesslevel != 999){
            handleToast(`Unable to delete your own account.`);
          }else if(currentuser.accesslevel > selected_brokers[0].accesslevel || currentuser.accesslevel === 999){
            is_delete_open = !is_delete_open;
          }else{
            handleToast(`Unable to delete ${broker.firstname} ${broker.lastname}'s account due to lower access level.`);
          }}}
          kind="danger"
          disabled={''}>
          Remove {selection.length} {selection.length === 1 ? 'broker' : 'brokers'}
        </Button>

        <!-- UPDATE BUTTON -->
        <Button
          icon={Edit}
          on:click={() => {updateSelectedBrokers();
          if(currentuser.email == selected_brokers[0].email || currentuser.accesslevel != 999){
            handleToast(`Unable to update your own account.`);
          }else if(currentuser.accesslevel > selected_brokers[0].accesslevel || currentuser.accesslevel === 999){
            is_update_open = !is_update_open;
          }else{
            handleToast(`Unable to update ${broker.firstname} ${broker.lastname}'s account due to lower access level.`);
          }}}
          kind="secondary"
          disabled={selection.length > 1}>
          Update broker
        </Button>
      </ToolbarBatchActions>

      <ToolbarContent>
        <ToolbarSearch bind:value={search_value} persistent/>
      </ToolbarContent>
    </Toolbar>
  </DataTable>
</div>

<!-- PAGINATION BAR -->
<Pagination
  bind:pageSize
  bind:page
  totalItems={filtered_rows.length}
  pageSizeInputDisabled
/>

<!-- MODALS -->

<!-- Update broker -->
<BrokerForm
  bind:open={is_update_open}
  broker={selected_brokers[0]}
  on:updated={() => selection = []}
  />

<!-- Delete brokers -->
<BrokerDeleteForm
  bind:open={is_delete_open}
  broker_list={selected_brokers}
  on:delete={() => selection = []}
/>

<style>

:global(.bx--pagination .bx--select-input) {
  line-height: 0;
}

</style>
