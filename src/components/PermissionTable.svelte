<script>
  import {
    Form,
    RadioButtonGroup,
    RadioButton,
    Button,
    Tooltip,
    ComposedModal,
    ModalHeader,
    ModalBody,
    ModalFooter,
  } from "carbon-components-svelte";
  import Reset from "carbon-icons-svelte/lib/Reset.svelte";
  import brokers from "../stores/brokers";
  import user from "../stores/user";
  import { addToast } from "../stores/toast";
  import websocket from "../common/websocket";
    
  export let selection = [];
  export let defaults;
  
  let defaultPermission = false;
  let open = false;
  let edit = false;
  let permissionObj;
  let broker = {};
  let currentuser;
  $: {
    selectionRefresh($brokers);
    currentuser = brokers.get(user.get()); 
  }
  $: selectionRefresh(selection);
  
  function selectionRefresh() {
    if (selection.length === 1){
      broker = structuredClone(brokers.get(selection[0]));
      permissionObj = structuredClone(broker.permission);
    }
  }

  // Display text and tooltip in the table.
  let permissionDisplay = {
    "Trader Management":{text:"Trader Management Access", tooltip:"Have access to Trader Management page", open: false},
    "Broker Management":{text:"Broker Management Access", tooltip:"Have access to Broker Management page", open: false},
    "Not Anonymous":{text:"Can see Confidental Details", tooltip:"All Bank & Trader's names are displayed", open: false},
    "Approve Trades":{text:"Can Approve Trades", tooltip:"Able to submit and accept trade reviews", open: false},
    "View Only":{text:"View Only", tooltip:"Unable to submit orders or change anything on PO Trade", open: false},
    "Edit Global Preferences":{text:"Can Edit Global Preferences", tooltip:"Editting global tenors for everyone for the whiteboard", open: false},
    "Developer Override":{text:"Developer Override", tooltip:"Submitting trades without trade review", open: false},
  }

  function checkDefault(){
    let idx = (broker.accesslevel === 999 ? defaults.length - 1 : (broker.accesslevel > defaults.length - 2 ? defaults.length - 2 : broker.accesslevel - 1));
    defaultPermission = !Object.keys(defaults[idx]).some((k) => permissionObj[k] !== defaults[idx][k]);
  }

  // Create toast for respective messages
  function handleToast(message, type){
    addToast ({
        message: message,
        type: type,
        dismissible: true,
        timeout: 4000,
      });
    }
    // Display toast for different errors
  function handleEdit(){
    if(currentuser.email == broker.email && currentuser.accesslevel != 999){
      handleToast("You cannot edit your own permissions.", "error");
    }else if(currentuser.accesslevel <= broker.accesslevel && currentuser.accesslevel != 999){
      handleToast(`You need a higher access level to edit ${broker.firstname} ${broker.lastname}'s account.`, "error");
    }else{
      edit = true;
      checkDefault();
    }
  }
  // Send new permission to DB and creates a toasts
  function updatePermission(){
    broker.permission = structuredClone(permissionObj);
    websocket.submitBroker(broker);
    edit = false;
    handleToast(`Permissions have been updated for ${broker.firstname} ${broker.lastname}'s account.`, "success");
  }

  function handleCancel(){
    edit = false;
    permissionObj = structuredClone(broker.permission);
  }

  function handleReset(){
    let accesslevel = broker.accesslevel;
    if(accesslevel === 999){
      permissionObj = structuredClone(defaults[defaults.length - 1]);
    }else if(accesslevel > defaults.length - 2){
      permissionObj = structuredClone(defaults[defaults.length - 2]);
    }else {
      permissionObj = structuredClone(defaults[accesslevel - 1]);
    }
    open = false;
    updatePermission();
  }

  function handleUnselect(){
    if(selection.length > 1 || selection.length == 0){
      edit = false;
    }
  }


  // Changes the radio button according to user input
  function changeRadio(key, state){
    // FIXME:  The change of radio buttons not automatically update other buttons.
    /***Rules: 
     * If certain permissions are switched on or off, other permissions will automatically switch accordingly. 
     * 
     * Trader management – If true, have access to the trader management page hence can view/create/update/delete traders on PO Trade.  
     * If View only or anonymous is on, trader management permission is switched off automatically. 
     * Broker management – If true, have access to the broker management page hence can view/create/update/delete brokers on PO Trade & modify permissions for specific brokers. 
     * Edit Global preferences – If true, able to create or delete tenors from the whiteboard globally hence for every broker using PO Trade. 
     * If View only switched true, global preference permission will switch to false.   
    ***/
    switch(key){
      case "View Only":
        if(state){
          permissionObj["View Only"] = true;
          permissionObj["Approve Trades"] = false;
          permissionObj["Trader Management"] = false;
          permissionObj["Broker Management"] = false;
          permissionObj["Developer Override"] = false;
          permissionObj["Edit Global Preferences"] = false;
        }else{
          permissionObj["View Only"] = false;
        }
        break;
      case "Approve Trades":
        if(state){
          permissionObj["Approve Trades"] = true;
          permissionObj["Not Anonymous"] = true;
          permissionObj["View Only"] = false;
        }else{
          permissionObj["Approve Trades"] = false;
          permissionObj["Developer Override"] = false;
        }
        break;
      case "Not Anonymous":
        if(state){
          permissionObj["Not Anonymous"] = false;
        }else{
          permissionObj["Trader Management"] = false;
          permissionObj["Approve Trades"] = false;
          permissionObj["Not Anonymous"] = true;
          permissionObj["Broker Management"] = false;
        }
        break;
      case "Trader Management":
        if(state){
          permissionObj["Trader Management"] = true;
          permissionObj["Not Anonymous"] = true;
          permissionObj["View Only"] = false;
        }
        break;
      case "Broker Management":
        if(state){
          permissionObj["Broker Management"] = true;
          permissionObj["Not Anonymous"] = true;
          permissionObj["View Only"] = false;
        }
        break;
      case "Edit Global Preferences":
        if(state){
          permissionObj["View Only"] = false;
        }
        break;
      case "Developer Override":
        if(state){
          permissionObj["Approve Trades"] = true;
          permissionObj["View Only"] = false;
          permissionObj["Not Anonymous"] = true;
        }
        break;
      default:
        break;
    }
  }
</script>

<div id="permissions">
  <h3 style="padding-bottom: 10px">Permissions</h3>
  {#if (selection.length === 1 || handleUnselect())}
    <div id="permission-table">
      {#each Object.keys(permissionObj) as key}
        {#if broker.accesslevel === 999 || key != "Developer Override"}
          <p class="permission-text">{permissionDisplay[key].text}</p>
          <div class="tooltip" on:mouseenter={()=>{permissionDisplay[key].open = true;}} on:mouseleave={()=>{permissionDisplay[key].open = false;}}>
            <Tooltip class="vols_breakdown vols_breakdown_caret" align="end" bind:open={permissionDisplay[key].open} >
              {permissionDisplay[key].tooltip}
            </Tooltip>
          </div>
          <div class="radio-buttons">
            <RadioButtonGroup disabled={!edit} bind:selected={permissionObj[key]}>
              <RadioButton
                style="color:#de1818"
                labelText="No"
                value={false} 
                on:change={()=>{changeRadio(key, false)}}
                /> 
                <RadioButton
                style="color:#18de1f"
                labelText="Yes"
                value={true}
                on:change={()=>{changeRadio(key, true)}}
                />
              </RadioButtonGroup>
          </div>
        {/if}
      {/each}
      {#if (edit && !defaultPermission)}
        <Button 
          style="grid-column:1; align-self:end; width:max-content; justify-self:flex-end; margin-right:-16px;"
          tooltipPosition="right"
          tooltipAlignment="end"
          iconDescription="Reset the permissions to its default according to the user's access level."
          icon={Reset}
          kind="danger-ghost"
          on:click={() => open = !open}
          >
          Reset
        </Button>
      {/if}
      <div id="main-buttons">
        {#if (!edit)}
          <Button style="width:80px; margin-right:3px;" on:click={handleEdit}>Edit</Button>
        {:else}
          <Button style="width:80px; margin-right:3px;" on:click={updatePermission}>Save</Button>
        {/if}
        <Button style="width:80px; margin-left:3px;" kind="danger" disabled={!edit} on:click={handleCancel}>Cancel</Button>
      </div>
    </div>
  {:else}
    <div>
      {#if selection.length == 0}
        <p>Please select a user in the broker's table</p>
      {:else}
        <p>Please select only one user in the broker's table</p>
      {/if}
    </div> 
  {/if}
</div>

<!-- Modal for Reset default permission -->
<ComposedModal
  bind:open
  size="sm"
  on:submit={handleReset}
>
  <ModalHeader
    label="Confirm Reset"/>
  <ModalBody>
    <h4 style:padding={'10px 0px'}>This action will reset the selected user's permissions to their default value for their access level.
    Are you sure you want to continue?</h4>
  </ModalBody>
  <ModalFooter primaryClass="bx--btn--danger" primaryButtonText="Confirm"/>
</ComposedModal>

<style>
  #permissions {
    flex-grow: 1;
    padding: 30px;
    background-color: var(--cds-layer);
    width: 20%;
    min-width: 470px;
  }
  #permission-table {
    width: 100%;
    display: grid;
    grid-template-columns: 5fr 1fr 3fr;
    align-items: center;
  }
  .permission-text {
    grid-column: 1;
    text-align: end;
    line-height: 1.3;
    padding: 5px 0;
  }
  .tooltip {
    grid-column: 2;
    justify-self: center;
    padding: 0 2rem 0 1rem;
  }
  :global(.tooltip .bx--tooltip__trigger) {
    margin-left: 0;
  }
  .radio-buttons {
    grid-column: 3;
    height: 96%;
    padding: 0.75rem 1rem 0.75rem 2rem;
    border-left: 1px dashed var(--cds-border-strong);
  }
  :global(.radio-buttons fieldset) {
    margin-top: 0;
  }
  #main-buttons {
    grid-column: 3;
    padding-top: 30px;
    display: flex;
    justify-content: space-between;
  }
</style>
