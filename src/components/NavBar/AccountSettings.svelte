<script>
  import {
      Modal, 
      RadioTile, 
      StructuredList,
      StructuredListBody,
      StructuredListCell,
      TextInput,
      Search,
      StructuredListRow, 
      Theme, 
      TileGroup, 
      Button,
      StructuredListHead,
  } from "carbon-components-svelte";
  import user from "../../stores/user";
  import brokers from "../../stores/brokers";
  import banks from "../../stores/banks";
  import ocos from "../../stores/ocos";
  import PasswordChange from "./PasswordChange.svelte";
  import Validator from "../../common/validator";
  import websocket from "../../common/websocket";
  import traders from "../../stores/traders";
  import preferences from "../../stores/preferences";
  import CaretUp from "carbon-icons-svelte/lib/CaretUp.svelte";
  import CaretDown from "carbon-icons-svelte/lib/CaretDown.svelte";
  import StarFilled from "carbon-icons-svelte/lib/StarFilled.svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
  import DataConnections from "./DataConnections.svelte";

  export let broker = undefined;
  export let open;
  
  let theme;
  let trader_list = $traders.slice();
  let sortedTraders = [];
  let trader_search = "";
  let original, hovered_over, original_index, insert_index, remove_element, c;
  let td_element_arr = [];
  let ft_arr = [];


  $: {
    const event = new CustomEvent('themeChange', { detail: theme });
    window.dispatchEvent(event);
  }
  
  // values refers to the categories on the sidebar,
  // selected is the currently selected category
  let values = ['#Personal Settings', 'Info', 'Password', 'Theme', 'Favourite Traders' , '#Global Settings', 'Data Connections','OCO Colours'];
  let selected = values[1];
  let edit = false;
  
  let fields = {
    broker_id: 0,
    firstname: new Validator(),
    lastname: new Validator(),
    email: new Validator(),
  };

  let currentuser = brokers.get(user.get());
  let current_b = preferences.getBrokerPrefs(currentuser.broker_id);
  let favourite_traders = current_b.trader_favourites;
  if(favourite_traders !== null) ft_arr = ft_arr.concat(favourite_traders);  

  function mapTraders() {
    trader_list = $traders.map(trader => {
      return {
        name_with_bank: traders.fullName(trader),
        ...trader
      }
    });
  }
  
  /* 
  These reactive functions will be called to ensure that 
  When the traders list is changed through trader management
  It will reflect as such
   */
  $: mapTraders($traders);
  $: sortTraders($traders);

  $: filterTraders(trader_search);

  function filterTraders(input) {
    if(!input) return sortTraders();
    if(sortedTraders.length == 0) sortTraders();
    sortedTraders = sortedTraders.filter(trader => trader.name_with_bank.toUpperCase().includes(input.toUpperCase()));
  }

  function updateTraderPrefs(t_id) {
    if (!ft_arr.includes(t_id) && t_id) {
      ft_arr.unshift(t_id);
    } else {
      ft_arr = ft_arr.filter((id) => id !== t_id);
    }
    websocket.favouriteCurrentTrader(ft_arr, currentuser.broker_id);
    sortTraders();
    sortedTraders = sortedTraders;
    ft_arr = ft_arr;
  }

  function sortTraders() { 
    trader_search = "";
    sortedTraders = trader_list.slice().map(trader => ({
        ...trader,
        favourited: ft_arr.includes(trader.trader_id)
    }));

    //Sort traders iteratively, with priority given to favourited traders
    sortedTraders.sort((a, b) => {
      if (a.favourited && !b.favourited) return -1;
      if (!a.favourited && b.favourited) return 1;
      if (a.favourited && b.favourited) {
          return ft_arr.indexOf(a.trader_id) - ft_arr.indexOf(b.trader_id);
      }
      return trader_list.findIndex(f => f.trader_id === a.trader_id) - trader_list.findIndex(f => f.trader_id === b.trader_id);
    });
    //Send to traders store to be updated on TraderSelector component
    traders.setSortedTraders(sortedTraders);
  }

  function moveTrader(direction, t_id) {
    const selected_row = (element) => element === t_id;
    const trader_index = ft_arr.findIndex(selected_row);
    //Ensure that there is another element before it in the array, i.e it can move up
    if(direction == 'up' && trader_index > 0){
      const [ el ] = ft_arr.splice(trader_index, 1);
      ft_arr.splice(trader_index - 1, 0, el);
      websocket.favouriteCurrentTrader(ft_arr, currentuser.broker_id);
      //Ensure that element below it exists, and is a favourite
    } else if (direction == 'down' && trader_index < sortedTraders.length - 1 && sortedTraders[trader_index + 1]?.favourited == true){
      const [ el ] = ft_arr.splice(trader_index, 1);
      ft_arr.splice(trader_index + 1, 0, el);
      websocket.favouriteCurrentTrader(ft_arr, currentuser.broker_id);
    }
    sortTraders();
    sortedTraders = sortedTraders; 
  }

  function dragStart(event) {
    //Get the name of the trader at the start of the drag
    let row = event.target.children[0].children[1].innerText;
    original = sortedTraders.slice().filter(traders => traders.name_with_bank == row);
  }
  
  function dragEnter(event) {
    c = Array.from(event.target.parentNode.children);
    
    //Stops errors when draggable element is over the joining border between table rows
    if(!c[1]?.innerText) return; 

    hovered_over = sortedTraders.slice().filter(traders => traders.name_with_bank == c[1].innerText);
    if (td_element_arr.length > 0) td_element_arr[0].style.border = "none";
    td_element_arr.length = 0;  
    //Add the tablerow to have border assigned, after all borders have been removed
    td_element_arr.unshift(c[1].parentNode.parentNode);
    //Restrict ability to reorder to favourited traders
    if(ft_arr.includes(hovered_over[0].trader_id) && original[0].trader_id != hovered_over[0].trader_id && td_element_arr[0].tagName == 'TR') {
      original_index = ft_arr.indexOf(original[0].trader_id);
      insert_index = ft_arr.indexOf(hovered_over[0].trader_id);
      if(insert_index > original_index) {
        td_element_arr[0].style.borderBottom = "1px solid white";
      } else {
        td_element_arr[0].style.borderTop = "1px solid white";
      }
    }
    //Remove flickering default "no drop icon"
    event.preventDefault();
  }
  
  function dragEnd() {
    if(original[0].trader_id == hovered_over[0].trader_id || original_index == insert_index || !ft_arr.includes(hovered_over[0].trader_id)) return;
    remove_element = ft_arr.splice(original_index, 1);
    ft_arr.splice(insert_index, 0, remove_element[0]);
    //Reset indexes to fix logic when dragging another trader after just dropping another
    original_index = 0;
    insert_index = 0;
    //Sort traders and send to backend
    return updateTraderPrefs();
  }

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
            {#if value == 'Favourite Traders' && currentuser.permission['View Only'] == true}
              <RadioTile {value} disabled checked={selected === value}>Favourite Traders</RadioTile>
            {:else}
              <RadioTile {value} checked={selected === value}>{value}</RadioTile> 
            {/if}
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
        {:else if selected === 'Favourite Traders'}
          <div class="favourite-traders" aria-label="selectable tiles" role="group">
              <div class="favourites-header" 
              style="background-color: #393939;font-weight:600;display: flex;flex-direction: row;">
                <Search placeholder="Search traders" bind:value={trader_search} class="trader-search"/>
                {#key ft_arr}
                  <Button kind="danger-tertiary" tooltipPosition="left" iconDescription="Delete all favourites" 
                  icon={TrashCan} on:click={() => {ft_arr.length = 0, updateTraderPrefs()}}
                  disabled={ft_arr.length == 0}
                  class={ft_arr.length == 0 ? "greyed" : "normal"} 
                  style="border:none; border-bottom: 1px solid var(--cds-ui-04, #8d8d8d);"/>
                {/key}
              </div>
              <div class="favourite-container">
                {#key sortedTraders}
                  {#each sortedTraders as t}
                    <tr class="favourite-row draggable" draggable={t.favourited && !trader_search}
                    on:dragstart={(event) => dragStart(event)}
                    on:dragenter={(event) => dragEnter(event)} 
                    on:dragend={() => dragEnd()}
                    on:dragover={(event) => {if(ft_arr.includes(hovered_over[0].trader_id)) event.preventDefault()}}
                    >
                      <div class="name-favourites">
                        <button on:click={() => updateTraderPrefs(t.trader_id)}
                        class:favourited={t?.favourited}
                        class:not_favourited={!t?.favourited}
                        style="padding: 10px;">
                        <StarFilled/>
                        </button>
                        <td>{t.name_with_bank}</td>
                      </div>
                      <div class="button-wrapper">
                        {#if t?.favourited == true && trader_search == ""}
                        <div class="single-move-button">
                          <button on:click={() => {moveTrader("up", t.trader_id)}}>
                            <CaretUp class="move_trader "/>
                          </button>
                          <button on:click={() => {moveTrader("down", t.trader_id)}}>
                            <CaretDown class="move_trader"/>
                          </button>
                        </div>
                        {/if}
                      </div>
                    </tr>
                  {:else}
                    <tr style="display: flex; justify-content:center;">
                      <td>No traders found</td>
                    </tr>
                  {/each}
                {/key}
              </div>
          </div>
        {:else if selected === 'Data Connections'}
          <DataConnections/>
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
    max-height: 620px;
  }

  :global(.settings__modal > .bx--modal-container) {
    height: 750px;
    width: 870px;
  }

  .oco_colour_selector {
    cursor: pointer;
    width: 6rem;
    height: 2.2rem;
    background-color: #00000000;
  }
  
  .favourite-row:hover {
    background: var(--cds-layer-hover, #e5e5e5);
    color: var(--cds-text-primary, #161616);
  }
  
  .favourite-container > tr > .name-favourites > td {
    width: 400px;
    height:100%;
    display:flex;
    justify-content: flex-start;
    align-items:center;
    user-select: none;
  }

  :global(.button-wrapper > button){
    font-size: 10px;
  }

  .favourited, .not_favourited:hover {
    color: yellow !important
  }
  
  .favourited:hover {
    opacity: 30%;
  }
  
  .favourited, .not_favourited {
    transition: all .3s ease-in-out;
  }

  .favourite-container > tr, .name-favourites, 
  .favourited, .not_favourited, :global(.button-wrapper > button, .move_trader, .button-wrapper),
  .single-move-button {
    display:flex;
    align-items: center;
    padding-right: 3px;
  }

  .name-favourites, .favourite-container > tr {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .favourite-container > tr{
    height:50px;
    padding: 0 15px 0 10px;
  }

  .name-favourites { 
    gap:20px;
    height:100%;
  }

  .favourited, .not_favourited, :global(.button-wrapper > button, .move_trader), .single-move-button{
    justify-content: center;
  }

  .single-move-button {
    flex-direction: column;
    height: 50px;
    padding: 0;
  }

  .single-move-button > button:hover {
    transition: background-color .15s ease-in;
    cursor: pointer;
    background-color:grey;
  }

  :global(.not_favourited:hover, .favourited:hover) {
    cursor: pointer;
  }

  .name-favourites > button, .button-wrapper > div > button {
    background-color:transparent;
    border:none;
    color: white;
  }

  .single-move-button > button {
    height:25px;
    width: 25px;
  }

  :global(.favourites-header > div > .bx--search-close::before) {
    background-color: transparent !important;
  }

  tr[draggable="true"] {
    cursor: grab !important;
  }

  tr[draggable="true"]:active {
    cursor: grabbing !important;
  }

  :global(.greyed) {
    color: var(--cds-disabled-02);
  }

  :global(.normal) {
    color: var(--cds-danger-02);
  }

</style>
