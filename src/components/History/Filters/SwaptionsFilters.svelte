<script>
  import {
    TextInput,
    DatePicker, 
    DatePickerInput,
    Checkbox,
  } from 'carbon-components-svelte';

  import CustomComboBox from '../../Utility/CustomComboBox.svelte';

  import swaption_orders from '../../../stores/swaption_orders';

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

    option_type: [
      {id: 0, text:"All"},
      {id: 1, text:"Straddle"},
      {id: 2, text:"Receivers"},
      {id: 3, text:"Payers"},
    ],

    swap_maturity_date: [
      {id: 0, text:"All"},
      {id: 1, text:"QQ"},
      {id: 2, text:"SS"},
    ],

    settlement: [
      {id: 0, text:"All"},
      {id: 1, text:"Cash"},
      {id: 2, text:"Physical"},
    ],

    spot_or_fwd: [
      {id: 0, text:"All"},
      {id: 1, text:"Spot"},
      {id: 2, text:"Fwd"},
    ],

    rba: [
      {id: 0, text:"All"},
      {id: 1, text:"Standard"},
      {id: 2, text:"RBA"},
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

  // ---------------------------------- FILTERING FUNCIONALITY ---------------------------------- //

  // if the store is refreshed, re-apply filters to show new or changed data.
  $: $swaption_orders && dispatch('handleAutoRefresh');

  let option_start = applySavedValues('date', 'DatePicker');
  let option_expiry = applySavedValues('expiry_date', 'DatePicker');
  let swap_start = applySavedValues('swap_start_date', 'DatePicker');
  let premium_date = applySavedValues('premium_date', 'DatePicker');

</script>

<!--------------------------------------------------- SWAPTION FILTERS --------------------------------------------------->

  <!-- option type -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'option_type'}); }}
    titleText = "Option Type"
    items={dropDowns['option_type']}
    initialSelectedId={applySavedValues('option_type', 'Dropdown', dropDowns['option_type'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- notional -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'notional', regex: /^\d+$/gi, value: event.detail})}}
    invalid={Invalid.Swaptions['notional']}
    invalidText="Notional must be a positive whole number."
    value={applySavedValues('notional', 'TextInput')}
    labelText="Notional"
    placeholder="Search by Notional..."
  />
  <br>

  <!-- strike rate -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'strike_rate', regex: /^\d+[.]?\d*$/gi, value: event.detail})}}
    invalid={Invalid.Swaptions['strike_rate']}
    invalidText="Strike Rate must be a positive number."
    value={applySavedValues('strike_rate', 'TextInput')}
    labelText="Strike Rate"
    placeholder="Search by Strike Rate..."
  />
  <br>

  <!-- trade date -->
  {#key dateRangeReload.Swaptions}
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

  <!-- option start -->
  <DatePicker
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'date'})}}
    bind:value={option_start}
  >
    <DatePickerInput labelText="Option Start" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'date'});
        option_start = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- option expiry -->
  <DatePicker 
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'expiry_date'})}}
    bind:value={option_expiry}
  >
    <DatePickerInput labelText="Option Expiry" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'expiry_date'});
        option_expiry = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- swap start -->
  <DatePicker 
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'swap_start_date'})}}
    bind:value={swap_start}
  >
    <DatePickerInput labelText="Swap Start" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'swap_start_date'});
        swap_start = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- premium date -->
  <DatePicker 
    datePickerType="single"
    dateFormat="Y-m-d"
    on:change={event => {dispatch('handle_dateSingle_Select', {event, filterName: 'premium_date'})}}
    bind:value={premium_date}
  >
    <DatePickerInput labelText="Premium Date" placeholder="yyyy-mm-dd" />
  </DatePicker>
  <div class="clear-btn-wrapper">
    <button class="clear-btn"
      on:click={() => {
        dispatch('clearDateSingle', {filterName: 'premium_date'});
        premium_date = '';
      }}>
      Clear
    </button>
  </div>
  <br>

  <!-- maturity date (QQ or SS) -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'swap_maturity_date'}); }}
    titleText = "Maturity Date"
    items={dropDowns['swap_maturity_date']}
    initialSelectedId={applySavedValues('swap_maturity_date', 'Dropdown', dropDowns['swap_maturity_date'])}
    defaultSelectedId={0}
  />
  <br>
  
  <!-- premium bp -->
  <TextInput 
    on:input={(event) => {
      dispatch('handle_textInput', {filterName: 'premium_bp', regex: /^\d+[.]?\d*$/gi, value: event.detail})}}
    invalid={Invalid.Swaptions['premium_bp']}
    invalidText="Premium BP must be a positive number."
    value={applySavedValues('premium_bp', 'TextInput')}
    labelText="Premium BP"
    placeholder="Search by Premium BP..."
  />
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

  <!-- settlement -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'settlement'}); }}
    titleText = "Settlement"
    items={dropDowns['settlement']}
    initialSelectedId={applySavedValues('settlement', 'Dropdown', dropDowns['settlement'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- spot or fwd -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'spot_or_fwd'}); }}
    titleText = "Spot or Fwd"
    items={dropDowns['spot_or_fwd']}
    initialSelectedId={applySavedValues('spot_or_fwd', 'Dropdown', dropDowns['spot_or_fwd'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- rba -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'rba'}); }}
    titleText = "Type"
    items={dropDowns['rba']}
    initialSelectedId={applySavedValues('rba', 'Dropdown', dropDowns['rba'])}
    defaultSelectedId={0}
  />
  <br>

  <!-- buyer name -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'buyer_name', regex: /^([^0-9]*)$/gi, value: event.detail})}}
    value={applySavedValues('buyer_name', 'TextInput')}
    labelText="Buyer Name"
    placeholder="Search by first or last name..."
  />
  <br>

  <!-- seller name -->
  <TextInput 
    on:input={event => {
      dispatch('handle_textInput', {filterName: 'seller_name', regex: /^([^0-9]*)$/gi, value: event.detail})}}
    value={applySavedValues('seller_name', 'TextInput')}
    labelText="Seller Name"
    placeholder="Search by first or last name..."
  />
  <br>

  <!-- buyer interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'buyer_interest_group_name', related_filterName: 'seller_interest_group_name'}); }}
    titleText = "Buyer Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('buyer_interest_group_name', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Swaptions['buyer_interest_group_name']}
    invalidText="Buyer Interest Group and Seller Interest Group cannot be the same."
  />
  <br>

  <!-- seller interest group -->
  <CustomComboBox 
    on:select={(event) => { dispatch('handle_DropdownSelect', {event, filterName: 'seller_interest_group_name', related_filterName: 'buyer_interest_group_name'}); }}
    titleText = "Seller Interest Group"
    items={interest_group_names}
    initialSelectedId={applySavedValues('seller_interest_group_name', 'Dropdown', interest_group_names)}
    defaultSelectedId={0}
    invalid={Invalid.Swaptions['seller_interest_group_name']}
    invalidText="Seller Interest Group and Buyer Interest Group cannot be the same."
  />
  <br>

  <!-- buyer brokerage -->
  <TextInput 
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'buyer_brokerage', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Swaptions['buyer_brokerage']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['buyer_brokerage']}
    labelText="Buyer Brokerage"
    placeholder="Search by Buyer Brokerage..."
  />
  <br>

  <!-- seller brokerage -->
  <TextInput 
    on:input={event => {
      let value = event.detail
      if (value.charAt(0) == '$') value = value.substring(1); // remove the default $ from the value.
      dispatch('handle_textInput', {filterName: 'seller_brokerage', regex: /^\d+[.]?\d*$/gi, value});
    }}
    invalid={Invalid.Swaptions['seller_brokerage']}
    invalidText="Brokerarge must be a positive number."
    bind:value={dollar_precursor['seller_brokerage']}
    labelText="Seller Brokerage"
    placeholder="Search by Seller Brokerage..."
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

  <!-- oneview trade ID -->
  <TextInput 
    on:input={event => {
      let value = event.detail;
      let validationValue = value.substring(6);
      dispatch('handle_textInput', {filterName: 'trade_id_ov', regex: /./gi, value, validationValue});
    }}
    invalid={Invalid.Swaptions['trade_id_ov']}
    invalidText="Invalid OneView ID."
    bind:value={ov_trade_id_precursor}
    labelText="OneView Trade ID"
    placeholder="Search by Trade ID..."
  />
  <br>

  <!-- markitwire ticket id -->
  <TextInput
    on:input={event => {dispatch('handle_textInput', {filterName: 'markit_id', regex: /./gi, value: event.detail})}}
    invalid={Invalid.Swaptions['markit_id']}
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
    /* right: 10px; */
    color: var(--cds-inverse-02);
    font-size: 12px;
  }
  .clear-btn-wrapper{
    width: 100%;
    display: flex;
    justify-content: right;
  }
</style>