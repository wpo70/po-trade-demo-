<script>
  import {
      Modal, 
      RadioTile, 
      StructuredList,
      StructuredListBody,
      StructuredListCell,
      TextInput,
      StructuredListRow, 
      Theme, 
      TileGroup, 
      Button, 
      RadioButtonGroup, 
      RadioButton,
      Tooltip,
      Tile,
      Tag,
      StructuredListHead,
      DataTable
  } from "carbon-components-svelte";
  import user from "../../stores/user";
  import brokers from "../../stores/brokers";
  import banks from "../../stores/banks";
  import ocos from "../../stores/ocos";
  import PasswordChange from "./PasswordChange.svelte";
  import Validator from "../../common/validator";
  import websocket from "../../common/websocket";
  import data_collection_settings from "../../stores/data_collection_settings";
  import ConnectionSignalOff from "carbon-icons-svelte/lib/ConnectionSignalOff.svelte";
  import ConnectionSignal from "carbon-icons-svelte/lib/ConnectionSignal.svelte";
  import CloseOutline from "carbon-icons-svelte/lib/CloseOutline.svelte";

  export let broker = undefined;
  export let open;
  
  let theme;

  let openToolTip = false;
  let calcIRS = $data_collection_settings.calcIRS;
  let calcOIS = $data_collection_settings.calcOIS;
  let gwCount = $data_collection_settings.gateways.length;
  let frequencies = {main: 'N/A', fut: 'N/A', fx: 'N/A', nonaud: 'N/A', aud: 'N/A'}

  $: calcIRS = $data_collection_settings.calcIRS;  
  $: calcOIS = $data_collection_settings.calcOIS;  
  $: gateways = $data_collection_settings.gateways;
  $: gwCount = $data_collection_settings.gateways.length;
  $: {
    switch (gwCount){
      case 0: 
        frequencies = {main: 'N/A', fut: 'N/A', fx: 'N/A', nonaud: 'N/A', aud: 'N/A'}
        break;
      case 1:
        frequencies = {main: (20/gwCount), fut: 60, fx: 60, nonaud: 300, aud: (30/gwCount)}
        break;
      case 2:
        frequencies = {main: (20/gwCount), fut: 60, fx: 60, nonaud: 120, aud: (30/gwCount)}
        break;
      case 3:
        frequencies = {main: 6.67, fut: 60, fx: 60, nonaud: 120, aud: (30/gwCount)}
        break;
      case 4:
        frequencies = {main: 5, fut: 30, fx: 30, nonaud: 120, aud: (30/gwCount)}
        break;
      case 5:
        frequencies = {main: 4, fut: 30, fx: 30, nonaud: 120, aud: (30/gwCount)}
        break;
      default: // case 6 or greater
        frequencies = {main: 4, fut: 30, fx: 30, nonaud: 120, aud: 5}
        break;
    }
  }
  
  $: {
    const event = new CustomEvent('themeChange', { detail: theme });
    window.dispatchEvent(event);
  }
  
  // values refers to the categories on the sidebar,
  // selected is the currently selected category
  let values = ['#Personal Settings', 'Info', 'Password', 'Theme', '#Global Settings', 'Data Settings','OCO Colours'];
  let selected = values[1];
  
  let edit = false;
  
  let fields = {
    broker_id: 0,
    firstname: new Validator(),
    lastname: new Validator(),
    email: new Validator(),
  };
  let currentuser = brokers.get(user.get());
  $: {let b = $brokers; let u = $user; currentuser = brokers.get(user.get());}

  $: if (currentuser) copyBrokerToForm(currentuser);
  
  function copyBrokerToForm(currentuser) {
    if (!currentuser) {
      fields.broker_id = 0;
      fields.firstname.reset();
      fields.lastname.reset();
      fields.email.reset();
    } else {
      fields.broker_id = currentuser.broker_id;
      fields.firstname.set(currentuser.firstname, currentuser.firstname);
      fields.lastname.set(currentuser.lastname, currentuser.lastname);
      fields.email.set(currentuser.email, currentuser.email);
    }
    
    fields = fields;
  }

  $: fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
  $: fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
  $: fields.email.invalid = fields.email.isInvalid(isEmailValid);

  function isEmailValid(str) {
    // CONDITIONS: string must not be empty, must be a valid email, and must be unique
    if (str) Validator.scanEmail(str);
    let emails = $brokers.filter((b) => b.active).map((broker) => broker.email);
    if(str === currentuser.email){
      return;
    }else{
      if (broker) {
        emails = emails.filter((e) => e !== broker.email);
      }
    }
    return isUnique(str, emails);
  }
  function isUnique(str, set) {
    if (set.includes(str)) {
      throw new Error("Already Taken");
    }
    if (str === "") {
      return null;
    }
    return str;
  }

  function handleSubmit(){
    fields.firstname.dirty = true;
    fields.lastname.dirty = true;
    fields.email.dirty = true;

    fields.firstname.str = fields.firstname.str.trim().split(' ').filter((f) => f != "").join(" ");
    fields.lastname.str = fields.lastname.str.trim().split(' ').filter((f) => f != "").join(" ");
    
    fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
    fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
    fields.email.invalid = fields.email.isInvalid(isEmailValid);
    
    // do not submit if any of the fields are invalid
    if (fields.firstname.invalid || fields.lastname.invalid ||fields.email.invalid){
      return;
    }
    let broker = {
      broker_id: fields.broker_id,
      firstname: fields.firstname.value,
      lastname: fields.lastname.value,
      email: fields.email.value,
    };
    websocket.submitBroker(broker);
    edit = false;
  }
</script>

<Modal passiveModal bind:open modalHeading="Settings" class="settings__modal">
  <div class="settings">
    <div class="settings__sidebar">
      <TileGroup on:select={({ detail }) => (selected = detail)}>
        {#each values as value, i}
          {#if value.charAt(0) == '#'}
            <h5 style="border-bottom:1px solid var(--cds-border-strong); padding:3px 1px; {i != 0 ? "margin-top:5px;" : ""}">{value.slice(1)}</h5>
          {:else}
            <RadioTile {value} checked={selected === value}>{value}</RadioTile>
          {/if}
        {/each}
      </TileGroup>
    </div>
    
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="settings__content"  on:keypress|stopPropagation>
      {#if open}
        {#if selected === 'Info'}
          <StructuredList>
            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell style="width:30%" head>First Name</StructuredListCell>
                <TextInput 
                  style="height:43px" 
                  hideLabel        
                  readonly={!edit}   
                  bind:value={fields.firstname.str}
                  bind:dirty={fields.firstname.dirty}
                  bind:invalid={fields.firstname.invalid} 
                  invalidText={fields.firstname.error_message}
                />
                </StructuredListRow>
                <StructuredListRow>
                <StructuredListCell head>Last Name</StructuredListCell>
                <TextInput 
                  style="height:43px" 
                  hideLabel 
                  readonly={!edit}
                  bind:value={fields.lastname.str} 
                  bind:dirty={fields.lastname.dirty}
                  bind:invalid={fields.lastname.invalid} 
                  invalidText={fields.lastname.error_message}
                />
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell head>Email</StructuredListCell>
                <TextInput 
                  style="height:43px" 
                  hideLabel 
                  readonly = {!edit}
                  bind:value={fields.email.str}
                  bind:dirty={fields.email.dirty}
                  bind:invalid={fields.email.invalid} 
                  invalidText={fields.email.error_message}
                />
              </StructuredListRow>
            </StructuredListBody>
            {#if edit}
              <Button style="margin-top:10px" on:click={()=> {handleSubmit()}}>Save</Button>
            {:else}
              <Button style="margin-top:10px"  on:click={()=> {edit = !edit} }>Edit</Button>
            {/if}
          </StructuredList>
          
        {:else if selected === 'Password'}

          <PasswordChange />

        {:else if selected === 'Theme'}
          <Theme
            bind:theme
            persist
            persistKey="__carbon-theme"
            render="select"
            select={{
              themes: ["g10", "g90", "g100"],
              labelText: "Theme",
            }}
          />
        {:else if selected === 'Data Settings'}
          <div style="display: flex;">
            <p style="padding-right: 0; margin-bottom: 20px">Gateways Connected: &nbsp&nbsp{gwCount}&nbsp&nbsp</p>
            <!-- svelte-ignore a11y-mouse-events-have-key-events -->
            <div on:mouseenter={() => openToolTip = true} on:mouseleave={() => openToolTip = false}>
              <Tooltip class="freq_breakdown" bind:open={openToolTip}>
                <table>
                  <th colspan="2" style="text-align: center; font-weight: 700; padding-bottom: 0.5rem">Request Frequencies</th>
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
              {key: "sheet_connected", value: "Spreadsheet"},
            ]}
            rows={gateways.length > 0 ? gateways : [{user: "", blp_connected: "No Gateways Connected", sheet_connected: ""}]}
          >  
            <svelte:fragment slot="cell" let:row let:cell>
              {#if gateways.length > 0 && (cell.key == "blp_connected" || cell.key == "sheet_connected")}
                {#if cell.value === true}
                  <ConnectionSignal style="color: green; width: 25px; height: 25px; margin-right: 8px;"/>
                  <Button 
                    class="disconnect" 
                    kind="danger-tertiary" 
                    size="small" 
                    iconDescription="Disconnect" 
                    icon={CloseOutline}
                    on:click={() => {cell.key == "blp_connected" ? websocket.disconnectGateway(row.id) : websocket.disconnectGatewaySheet(row.id)}} />
                {:else}
                  <ConnectionSignalOff style="color: red; width: 25px; height: 25px;"/>
                {/if}
              {:else}
                {cell.value}
              {/if}
            </svelte:fragment>
          </DataTable>
          <div class="dataSourceOptions">
            <RadioButtonGroup selected={calcIRS} legendText="IRS Mid Source">
              <RadioButton value={true} labelText="Calculate from EFP" on:change={() => websocket.setCalcIRS(true)}/>
              <RadioButton value={false} labelText="Bloomberg" on:change={() => websocket.setCalcIRS(false)}/>
            </RadioButtonGroup>
  
            <RadioButtonGroup selected={calcOIS} legendText="Short-end OIS Mid Source">
              <RadioButton value={true} labelText="POCM Pricer" on:change={() => websocket.setCalcOIS(true)}/>
              <RadioButton value={false} labelText="Bloomberg" on:change={() => websocket.setCalcOIS(false)}/>
            </RadioButtonGroup>
          </div>
        {:else if selected === 'OCO Colours'}
          <StructuredList condensed flush style="margin-bottom:0px;">
            <StructuredListHead>
              <StructuredListRow head>
                <StructuredListCell head>Bank </StructuredListCell>
                <StructuredListCell head>Highlight Color </StructuredListCell>
              </StructuredListRow>
            </StructuredListHead>
            <StructuredListBody>
              {#each $ocos as o, bank_id (bank_id)}
                {@const bank = banks.get(bank_id)?.bank}
                {#if bank_id !== 0 && bank}
                  <StructuredListRow>
                    <StructuredListCell style="vertical-align:middle;">{bank}</StructuredListCell>
                    <StructuredListCell>
                      <input
                        type="color"
                        value={o.colour}
                        class="oco_colour_selector"
                        on:change={(e) => {websocket.setOCOColour({bank_id, oco_colour:e.target.value});}}
                        >
                    </StructuredListCell>
                  </StructuredListRow>
                {/if}
              {/each}
            </StructuredListBody>
          </StructuredList>
        {/if}
      {/if}
    </div>
  </div>
</Modal>

<style>
  .settings {
    display: flex;
  }

  .settings__sidebar {
    width: 30%;
  }

  .settings__content {
    width: 70%;
    margin-left: 20px;
    overflow: scroll;
    max-height: 390px;
  }

  :global(.settings__modal > .bx--modal-container) {
    height: 500px;
    width: 580px;
  }

  td {
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

  :global(.bx--radio-button-group) {
    margin-top: 20px;
  }

  :global(.dataSourceOptions .bx--radio-button__label) {
    width: 155px;
    justify-content: left;
  }

  .oco_colour_selector {
    cursor: pointer;
    width: 6rem;
    height: 2.2rem;
    background-color: #00000000;
  }
</style>
