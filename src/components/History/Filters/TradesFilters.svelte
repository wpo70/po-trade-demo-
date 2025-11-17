<script>
  import {
    TextInput,
    DatePicker, 
    DatePickerInput,
    Checkbox,
  } from 'carbon-components-svelte';

  import CustomComboBox from '../../Utility/CustomComboBox.svelte';

  import trades from '../../../stores/trades';

  export let applySavedValues;
  export let dollar_precursor = {};
  export let ov_trade_id_precursor = '';
  export let dateRangeReload;
  export let interest_group_names = [];
  export let Invalid;
  export let excludeTest;

  import { createEventDispatcher } from 'svelte';
  import products from '../../../stores/products';
  const dispatch = createEventDispatcher();

  // ---------------------------------- DROPDOWN OPTIONS ---------------------------------- //

  // Any dorpdown options added to exisiting cateories here will be included in the filter functionality. No other changes needed.
    // When adding a new category (new dropdown) ensure the name of the array matches the name of the key in the table row object (appliedRows).
    let prods = [{id: 0, text:"All"}];
    $products.forEach(p => {
      prods.push({id: p.product_id, text: p.product})
    });

    const genesis_dropDowns = {  
      product_name: prods,
  
      currency: [
        {id: 0, text:"All"},
        {id: 1, text:"AUD"},
        {id: 2, text:"NZD"},
        {id: 3, text:"USD"},
      ],

      sef: [
      {id: 0, text:"All"},
      {id: 1, text:"on"},
      {id: 2, text:"off"},
    ],
  
      markit_status: [
        {id: 0, text:"All"},
        {id: 1, text:"Not Available"},
        {id: 2, text:"Submitted"},
        {id: 3, text:"Active"},
        {id: 4, text:"Failed"},
        {id: 5, text:"Accepted/Affirmed/Released"},
      ],
  
      clearhouse: [
        {id: 0, text:"All"},
        {id: 1, text:"ASX"},
        {id: 2, text:"LCH"},
      ],
  
      has_break_clause: [
        {id: 0, text:"All"},
        {id: 1, text:"Yes"},
        {id: 2, text:"No"},
      ],
    }

    let dropDowns = structuredClone(genesis_dropDowns);

    // ---------------------------------- FILTERING FUNCIONALITY ---------------------------------- //

    // if the store is refreshed, re-apply filters to show new or changed data.
    $: $trades && dispatch('handleAutoRefresh');

    let start_date = applySavedValues('start_date', 'DatePicker');

</script>

<!--------------------------------------------------- TRADES FILTERS --------------------------------------------------->

  <!-- product -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'product_name'}); }}
    titleText = "Product"
    items={dropDowns['product_name']}
    initialSelectedId={applySavedValues('product_name', 'Dropdown', dropDowns['product_name'])}
  />
  <br>

  <!-- tenor -->
  <TextInput 
    on:input={event => {
      let value = event.detail.trim().split(' ').join('');
      if(/^[0-9]+$/gi.test(value)) { // accepts digit only values as years (eg: 8 will be accepted as 8y).
        value += 'y';
      }
      // regex accepts standard Tenors (eg: 6m) or RBA Tenors (eg: Jul24).
      dispatch('handle_textInput', {filterName: 'year', regex: [/^\d+[ymwdYMWD]$/gi, /^[a-zA-Z]{3}\d{2}/gi], value})
    }}
    invalid={Invalid.Trades['year']}
    invalidText="Tenor must be a number followed by nothing, or one of the following: 'd', 'w', 'm', 'y'."
    value={applySavedValues('year', 'TextInput')}
    labelText="Tenor"
    placeholder="Search by Tenor..."
  />
  <br>
  
  <!-- volume -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'volume', regex: /^\d+[.]?\d*$/gi, value: event.detail})
    }}
    invalid={Invalid.Trades['volume']}
    invalidText="Volume must be a positive number."
    value={applySavedValues('volume', 'TextInput')}
    labelText="Volume"
    placeholder="Search by Volume..."
  />
  <br>

  <!-- lot -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'lot', regex: /^\d*$/gi, value: event.detail})
    }}
    invalid={Invalid.Trades['lot']}
    invalidText="Lot must be a positive number."
    value={applySavedValues('lot', 'TextInput')}
    labelText="Lot"
    placeholder="Search by Lot..."
  />
  <br>
  
  <!-- price -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'price', regex: /^-?\d+[.]?\d*$/gi, value: event.detail})
    }}
    invalid={Invalid.Trades['price']}
    invalidText="Price must be a number."
    value={applySavedValues('price', 'TextInput')}
    labelText="Price"
    placeholder="Search by Price..."
  />
  <br>

  <!-- currency -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'currency'}); }}
    titleText = "Currency"
    items={dropDowns['currency']}
    initialSelectedId={applySavedValues('currency', 'Dropdown', dropDowns['currency'])}
    defaultSelectedId={0}
  />
  <br>
  
  <!-- trade date -->
  {#key dateRangeReload.Trades}
  <DatePicker 
    datePickerType="range" 
    dateFormat="Y-m-d"
    on:change={(event) => {dispatch('handle_dateRange_Select', {event});}} 
    valueFrom={applySavedValues('dateFrom', 'DatePicker')} 
    valueTo={applySavedValues('dateTo', 'DatePicker')}
  >
    <DatePickerInput id="startDateFilters" labelText="Trade Date - From" placeholder="yyyy-mm-dd" />
    <DatePickerInput id="endDateFilters" labelText="Trade Date - To" placeholder="yyyy-mm-dd" />
  </DatePicker>
  {/key}
  <div class="clear-btn-wrapper">
  <button class="clear-btn"
    on:click={() => {dispatch('clearDateRange')}}>
    Clear
  </button>
  </div>
  <br>

  <!-- start_date -->
  <DatePicker 
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'start_date'})}}
    bind:value={start_date}
  >
    <DatePickerInput labelText="Start Date" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'start_date'});
        start_date = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- sef -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'sef'}); }}
    titleText = "Sef"
    items={dropDowns['sef']}
    initialSelectedId={applySavedValues('sef', 'Dropdown', dropDowns['sef'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- offer trader -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'offer_trader_name', regex: /./gi, value: event.detail})
    }}
    value={applySavedValues('offer_trader_name', 'TextInput')}
    labelText="Offer Trader"
    placeholder="Search by first or last name..."
  />

  <!-- bid trader -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'bid_trader_name', regex: /./gi, value: event.detail})
    }}
    value={applySavedValues('bid_trader_name', 'TextInput')}
    labelText="Bid Trader"
    placeholder="Search by first or last name..."
  />
  <br>
  
  <!-- offer interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'offer_interest_group_name', related_filterName: 'bid_interest_group_name'}); }}
    titleText = "Offer Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('offer_interest_group_name', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Trades['offer_interest_group_name']}
    invalidText="Offer Interest Group and Bid Interest Group cannot be the same."
  />
  <br>
  
  <!-- bid interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'bid_interest_group_name', related_filterName: 'offer_interest_group_name'}); }}
    titleText = "Bid Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('bid_interest_group_name', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Trades['bid_interest_group_name']}
    invalidText="Bid Interest Group and Offer Interest Group cannot be the same."
  />
  <br>
  
  <!-- offer brokerage -->
  <TextInput 
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'offer_brokerage', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Trades['offer_brokerage']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['offer_brokerage']}
    labelText="Offer Brokerage"
    placeholder="Search by Offer Brokerage..."
  />
  <br>

  <!-- bid brokerage -->
  <TextInput 
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'bid_brokerage', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Trades['bid_brokerage']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['bid_brokerage']}
    labelText="Bid Brokerage"
    placeholder="Search by Bid Brokerage..."
  />
  <br>

  <!-- clearing house -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'clearhouse'}); }}
    titleText = "Clearing House"
    items={dropDowns['clearhouse']}
    initialSelectedId={applySavedValues('clearhouse', 'Dropdown', dropDowns['clearhouse'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- has break clause -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'has_break_clause'}); }}
    titleText = "Break Clause"
    items={dropDowns['has_break_clause']}
    initialSelectedId={applySavedValues('has_break_clause', 'Dropdown', dropDowns['has_break_clause'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- OneView Trade ID -->
  <TextInput 
    on:input={event => {
      let value = event.detail;
      let validationValue = value.substring(6);
      dispatch('handle_textInput', {filterName: 'trade_id_ov', regex: /./gi, value, validationValue});
    }}
    invalid={Invalid.Trades['trade_id_ov']}
    invalidText="Invalid OneView ID."
    bind:value={ov_trade_id_precursor}
    labelText="OneView Trade ID"
    placeholder="Search by Trade ID..."
  />
  <br>

  <!-- MarkitWire Ticket ID -->
  <TextInput
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'markit_id', regex: /./gi, value: event.detail})
    }}
    invalid={Invalid.Trades['markit_id']}
    invalidText="Invalid OneView ID."
    value={applySavedValues('markit_id', 'TextInput')}
    labelText="MarkitWire Ticket ID"
    placeholder="Search by Ticket ID..."
  />
  <br>

  <!-- markitwire status -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'markit_status'}); }}
    titleText = "MarkitWire Status"
    items={dropDowns['markit_status']}
    initialSelectedId={applySavedValues('markit_status', 'Dropdown', dropDowns['markit_status'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- exclude test trades -->
  <Checkbox 
    labelText="Exclude Test Trades" 
    bind:checked={excludeTest}
    on:change={(event) => { dispatch('excludeTest', event.target.checked)}}
  />
  <br>

<style>
  .clear-btn {
    background-color: transparent;
    background-repeat: no-repeat;
    border: none;
    cursor: pointer;
    /* overflow: hidden; */
    outline: none;
    /* position: absolute; */
    align-self: right;
    color: var(--cds-inverse-02);
    font-size: 12px;
  }
  .clear-btn-wrapper{
    width: 100%;
    display: flex;
    justify-content: right;
  }
</style>