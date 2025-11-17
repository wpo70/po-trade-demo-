<script>
  import {
    TextInput,
    DatePicker, 
    DatePickerInput,
    Checkbox,
  } from 'carbon-components-svelte';

  import CustomComboBox from '../../Utility/CustomComboBox.svelte';

  import liquidityTrades from '../../../stores/liquidityTrades';

  export let applySavedValues;
  export let dollar_precursor = {};
  export let ov_trade_id_precursor = '';
  export let dateRangeReload;
  export let interest_group_names = [];
  export let Invalid;
  export let excludeTest;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // ---------------------------------- DROPDOWN OPTIONS ---------------------------------- //

  // Any dorpdown options added to exisiting cateories here will be included in the filter functionality. No other changes needed.
    // When adding a new category (new dropdown) ensure the name of the array matches the name of the key in the table row object (appliedRows).
  const dropDowns = {
    
    displayProdType: [
      {id: 0, text:"All"},
      {id: 1, text:"OIS30"}, // OIS30 SPS30D
      {id: 2, text:"SPS90D"},
      {id: 3, text:"RBAOIS"},
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
  }

  // ---------------------------------- FILTERING FUNCIONALITY ---------------------------------- //

  // if the store is refreshed, re-apply filters to show new or changed data.
  $: $liquidityTrades && dispatch('handleAutoRefresh');

  let fixing_date = applySavedValues('fixing_date', 'DatePicker');
  let start_date = applySavedValues('start_date', 'DatePicker');
  let end_date = applySavedValues('end_date', 'DatePicker');

</script>

  <!--------------------------------------------------- LIQUIDITY FILTERS --------------------------------------------------->
  
  <!-- A => bid/buyer/payer | B => offer/seller/receiver -->
  
  <!-- product -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'displayProdType'}); }}
    titleText = "Product"
    items={dropDowns['displayProdType']}
    initialSelectedId={applySavedValues('displayProdType', 'Dropdown', dropDowns['displayProdType'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- notional -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'notional', regex: /^\d+$/gi, value: event.detail}); }}
    invalid={Invalid.Liquidity['notional']}
    invalidText="Notional must be a positive whole number."
    value={applySavedValues('notional', 'TextInput')}
    labelText="Notional"
    placeholder="Search by Notional..."
  />
  <br>

  <!-- price / rate -->
  <TextInput 
    on:input={event => {dispatch('handle_textInput', {filterName: 'rate', regex: /^-?\d+[.]?\d*$/gi, value: event.detail});}}
    invalid={Invalid.Liquidity['rate']}
    invalidText="Price must be a number."
    value={applySavedValues('rate', 'TextInput')}
    labelText="Price"
    placeholder="Search by Price..."
  />
  <br>

  <!-- trade date -->
  {#key dateRangeReload.Liquidity}
    <DatePicker
      id="liquidityDateFilter"
      datePickerType="range"
      dateFormat="Y-m-d"
      on:change={event => { dispatch('handle_dateRange_Select', {event}) }}
      valueFrom={applySavedValues('dateFrom', 'DatePicker')}
      valueTo={applySavedValues('dateTo', 'DatePicker')}
    >
      <DatePickerInput id="startDateFilters" labelText="Trade Date - From" placeholder="yyyy-mm-dd" />
      <DatePickerInput id="endDateFilters" labelText="Trade Date - To" placeholder="yyyy-mm-dd" />
    </DatePicker>
  {/key}
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => { dispatch('clearDateRange')}}>
      Clear
    </button>
  </div>
  <br>

  <!-- fixing date -->
  <DatePicker 
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'fixingDate'})}}
    bind:value={fixing_date}
  >
    <DatePickerInput labelText="Fixing Date" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'fixingDate'});
        fixing_date = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- start date -->
  <DatePicker
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'startDate'})}}
    bind:value={start_date}
  >
    <DatePickerInput labelText="Start Date" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'startDate'});
        start_date = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- end date -->
  <DatePicker
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'endDate'})}}
    bind:value={end_date}
  >
    <DatePickerInput labelText="End Date" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'endDate'});
        end_date = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- payer trader -->
  <TextInput
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'CptyATrader', regex: /^([^0-9]*)$/gi, value: event.detail})}}
    value={applySavedValues('CptyATrader', 'TextInput')}
    labelText="Payer Trader"
    placeholder="Search by first or last name..."
  />
  <br>

  <!-- receiver trader -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'CptyBTrader', regex: /^([^0-9]*)$/gi, value: event.detail})}}
    value={applySavedValues('CptyBTrader', 'TextInput')}
    labelText="Receiver Trader"
    placeholder="Search by first or last name..."
  />
  <br>

  <!-- payer interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'Interest Group', related_filterName: 'Interest Group B'}); }}
    titleText = "Payer Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('Interest Group', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Liquidity['Interest Group']}
    invalidText="Payer Interest Group and Receiver Interest Group cannot be the same."
  />
  <br>

  <!-- receiver interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'Interest Group B', related_filterName: 'Interest Group'}); }}
    titleText = "Receiver Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('Interest Group B', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Liquidity['Interest Group B']}
    invalidText="Receiver Interest Group and Payer Interest Group cannot be the same."
  />
  <br>

  <!-- payer bic code -->
  <TextInput
    on:input={event => {dispatch('handle_textInput', {filterName: 'BicCptyA', regex: /./gi, value: event.detail})}}
    invalid={Invalid.Liquidity['BicCptyA']}
    invalidText="Invalid Bic Code"
    value={applySavedValues('BicCptyA', 'TextInput')}
    labelText="Payer Bic Code"
    placeholder="Search by Bic Code..."
  />
  <br>

  <!-- receiver bic code -->
  <TextInput
    on:input={event => {dispatch('handle_textInput', {filterName: 'BicCptyB', regex: /./gi, value: event.detail})}}
    invalid={Invalid.Liquidity['BicCptyB']}
    invalidText="Invalid Bic Code"
    value={applySavedValues('BicCptyB', 'TextInput')}
    labelText="Receiver Bic Code"
    placeholder="Search by Bic Code..."
  />
  <br>

  <!-- payer brokerage -->
  <TextInput
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'Brokerage_A', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Liquidity['Brokerage_A']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['Brokerage_A']}
    labelText="Payer Brokerage"
    placeholder="Search by Payer Brokerage..."
  />
  <br>

  <!-- receiver brokerage -->
  <TextInput
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'Brokerage_B', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Liquidity['Brokerage_B']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['Brokerage_B']}
    labelText="Receiver Brokerage"
    placeholder="Search by Receiver Brokerage..."
  />
  <br>

  <!-- oneview trade ID -->
  <TextInput
    on:input={event => {
      let value = event.detail;
      let validationValue = value.substring(6);
      dispatch('handle_textInput', {filterName: 'trade_id_ov', regex: /./gi, value, validationValue});
    }}
    invalid={Invalid.Liquidity['trade_id_ov']}
    invalidText="Invalid OneView ID."
    bind:value={ov_trade_id_precursor}
    labelText="OneView Trade ID"
    placeholder="Search by Trade ID..."
  />
  <br>

  <!-- markitwire ticket id -->
  <TextInput
    on:input={event => {dispatch('handle_textInput', {filterName: 'markit_id', regex: /./gi, value: event.detail})}}
    invalid={Invalid.Liquidity['markit_id']}
    invalidText="Invalid MarkitWire ID"
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
  />
  <br>

<style>
  .clear-btn {
    background-color: transparent;
    background-repeat: no-repeat;
    border: none;
    cursor: pointer;
    overflow: hidden;
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