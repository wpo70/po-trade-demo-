<script>
  export let getGenesisRows;
  export let selectedTable;
  export let setAppliedRows;
  export let excludeTest;

  import TradesFilters from './TradesFilters.svelte';
  import SwaptionsFilters from './SwaptionsFilters.svelte';
  import LiquidityFilters from './LiquidityFilters.svelte';

  import interest_groups from '../../../stores/interest_groups';

  import {
    Button, ButtonSet
  } from 'carbon-components-svelte';

  import FilterReset from 'carbon-icons-svelte/lib/FilterReset.svelte';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // ---------------------------------- SHARED DROPDOWN OPTIONS ---------------------------------- //
 
  let testGroups = ["GIEUT", "MEGAT", "Sydney_POTL_Screen", "MEGA"];
  let interest_group_names = [
    { id: 0, text: "All" },
  ];

  interest_groups.getAllInterestGroups().forEach(group => {
    interest_group_names.push({id: group.interestgroup_id, text: group.name})
  });    

  // ---------------------------------- SHARED FILTERING FUNCIONALITY ---------------------------------- //
  // TODO Add new filter columns here!
  let filters = { // uses format {column_name_used_in_rows: value, ...} when adding a filter
    Trades: {},
    Swaptions: {},
    Liquidity: {},
  };

  let resetFilters = 0;

  function reset_filters() {
    filters[selectedTable] = {}
    resetFilters += 1;

    let {dateTo, dateFrom} = getDateRange_default();
    filters[selectedTable].dateFrom = dateFrom;
    filters[selectedTable].dateTo = dateTo;

    applyFilters();
  }

  // set date range filter to show trades from past month as DEFAULT. This avoids buffering if number of total trades is excessively large
  function getDateRange_default() {

    let dateFrom = new Date();
    dateFrom = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), 1); // set dateFrom to first of the current month.
    dateFrom.setHours(0, 0, 0, 0);
    dateFrom.toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    });

    let dateTo = new Date();
    dateTo = new Date(dateFrom.getFullYear(), dateFrom.getMonth() + 1, 0); // set dateTo to last day of current month
    dateTo.setHours(23, 59, 59, 59);
    dateTo.toLocaleString('en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    });

    return {dateTo, dateFrom};
  }

  function setAllDateRange_default() {
    let {dateTo, dateFrom} = getDateRange_default();
    for(let tableName in filters) {
      filters[tableName].dateFrom = dateFrom;
      filters[tableName].dateTo = dateTo;
    }
  }

  setAllDateRange_default();

  function handleAutoRefresh() {
    applyFilters();
  }

  // if any of the stores are refreshed, re-apply filters to show new or changed data.

  $: applyFilters(selectedTable, excludeTest);

  function applyFilters() {

    let removeRow;

    const checkTestTrade = function (row) {
      if (excludeTest) { // Filter out and test trades
        if (   (selectedTable == "Liquidity" && (testGroups.includes(row["Interest Group"]) || testGroups.includes(row["Interest Group B"])))
            || (selectedTable == "Swaptions" && (testGroups.includes(row["buyer_interest_group_name"]) || testGroups.includes(row["seller_interest_group_name"])))
            || (selectedTable == "Trades"    && (testGroups.includes(row["bid_interest_group_name"]) || testGroups.includes(row["offer_interest_group_name"])))) {
          removeRow = true;
        }
      }
    }

    const checkNotAvailable = function (row, filterName) {
      if(row[filterName] == 'Not Available' && filterName != 'markit_status') { removeRow = true; }
    }

    const checkDateRange = function (row) {
      // This function will find rows that are between the two date fields (date range filter).
      if(filters[selectedTable].hasOwnProperty('dateFrom') && filters[selectedTable].hasOwnProperty('dateTo')) {
        // convert back to date and filter out all rows that are not between the two dates
        const rowDate = new Date(row['timestamp']);
        const dateFrom = new Date(filters[selectedTable]['dateFrom']);
        const dateTo = new Date(filters[selectedTable]['dateTo']);

        if(!(dateFrom <= rowDate && rowDate <= dateTo)) { removeRow = true; }
      }
    }

    const checkNameFields = function (row, filterName){
      // This function will find rows which have a first or last name that starts with the filter input.
      // Any filterNames you add here must also be added to exclusions in checkAllOtherFields()
      if(['buyer_name', 'seller_name', 'offer_trader_name', 'bid_trader_name', 'CptyATrader', 'CptyBTrader'].includes(filterName)) {
        
        const filterNames = filters[selectedTable][filterName].trim().split(' ');

        // format filterNames to remove possible empty spaces
        for(let index = 0; index < filterNames.length; index++) {
          const name = filterNames[index];
          if(name == '' || name == ' ') {
            filterNames.splice(index, 1);
            index--;
          } else {
            filterNames[index] = name.toLowerCase();
          }
        }

        // Here it is assumed that the names stored in the DB have correct space formatting (no double spacing).
        const rowName = row[filterName].toLowerCase();

        let matchFound = false;
        for(let fName of filterNames) {
          if(rowName.includes(fName)) {
            matchFound = true;
          } else {
            matchFound = false;
            break;
          }
        }

        removeRow = !matchFound;
      }
    }

    // This rule allows the user to search anywhere between '5' and '500.0' to find values of '500.00'
    const checkBrokerageFields = function(row, filterName){
      if((filterName.toLocaleLowerCase().includes('brokerage')) && !row[filterName].startsWith(filters[selectedTable][filterName])){
        removeRow = true;
      }
    }

    const checkAllOtherFields = function (row, filterName) {
      // This function will find rows with fields that match the exact filter inputs (excluding the special case fields listed).
      let exclusions = ['buyer_name', 'seller_name', 'offer_trader_name', 'bid_trader_name', 'CptyATrader', 'CptyBTrader', 'dateTo', 'dateFrom'];
      if(filterName.toLocaleLowerCase().includes('brokerage')) { exclusions.push(filterName) };

      if(!exclusions.includes(filterName) && row[filterName] != filters[selectedTable][filterName]) { removeRow = true; }
    }

    // In priority Order
    const ruleBase = {
      1: checkTestTrade,
      2: checkNotAvailable,
      3: checkDateRange,
      4: checkNameFields,
      5: checkBrokerageFields,
      // Add new filter special condition here
      6: checkAllOtherFields,
    };

    // Iterate through all trade rows and the filter ruleBase, and filter out any rows that do not meet the filter conditions.
    let genesisRows = getGenesisRows();
    for(let index = 0; index < genesisRows.length; index++) {
      removeRow = false;
      const row = genesisRows[index];

      for(let filterName in filters[selectedTable]) {
        if(removeRow) break;

        // move through rules until both bics are set. (the set bic functions ensure bics are only set once)
        for(let filterRule of Object.values(ruleBase)){
          if(removeRow) break;  // stop the loop if the row has been flagged for removal
          filterRule(row, filterName);  // check the next filter rule in the ruleBase
        }
      }

      // The splice() method is used to remove an element.
      // However, the array is being re-indexed when you run splice(), 
      // which means that the for loop will skip over an index when one is spliced.
      // To fix this issue, the index is decremented after a splice is called.
      
      if(removeRow){
        genesisRows.splice(index, 1);
        index--;
      }
    }
    genesisRows.reverse();
    setAppliedRows(genesisRows);
  }

  // --------------- APPLY SAVED FILTERS ON TABLE CHANGE --------------- //
  // This must be called from the input field
  const applySavedValues = function (filterName, inputType, dropDownOptions=[]) {
    if(['TextInput', 'DatePicker'].includes(inputType)) {
      if(filters[selectedTable].hasOwnProperty(filterName)) {
        return filters[selectedTable][filterName];
      }
      return;
    }

    if(inputType == 'Dropdown') {
      if(filters[selectedTable].hasOwnProperty(filterName)) {
        // find id for the text stored in filters and return the id
        for (let option of dropDownOptions) {
          // const selectionOption = dropDowns[filterName][index];
          if(filters[selectedTable][filterName] == option.text) {
            return option.id;
          }
        } 
      }
      return 0;
    }
  }

  // --------------- VALIDATION AND PRECURSORS --------------- //

  let Invalid = {};

  function resetInvalid() {
    Invalid = {
      Trades: {
        year: false,
        volume: false,
        lot: false,
        price: false,
        bid_bank_division_name: false,
        offer_bank_division_name: false,
        bid_brokerage: false,
        offer_brokerage: false,
        markit_id: false,
      },
      Swaptions: {
        buyer_brokerage: false,
        seller_brokerage: false,
        markit_id: false,
        notional: false,
        strike_rate: false,
        premium_bp: false,
      },
      Liquidity: {
        notional: false,
        "Interest Group": false,
        "Interest Group B": false,
        BicCptyA: false,
        BicCptyB: false,
        Brokerage_A: false,
        Brokerage_B: false,
        trade_id_ov: false,
        markit_id: false,
      },
    };
  }
  
  $: resetInvalid(selectedTable);

  let dollar_precursor = {}; // fields are added to the object when they are first assigned a value.
  $: for(let fieldName in dollar_precursor){
    if(filters[selectedTable].hasOwnProperty(fieldName) && dollar_precursor[fieldName] == '') {
      dollar_precursor[fieldName] = filters[selectedTable][fieldName];
    }
    if(!dollar_precursor[fieldName].startsWith('$')) {
      const value = dollar_precursor[fieldName].substring(1);
      dollar_precursor[fieldName] = '$' + value;
    }
  }

  let ov_trade_id_precursor = ''; //value with precursor

  $: {
    if(!ov_trade_id_precursor.startsWith('TRADE')) {
      const ov_trade_id_value = ov_trade_id_precursor.substring(5);
      ov_trade_id_precursor = 'TRADE' + ov_trade_id_value;
    }

    // use saved filter value if one has previously been entered before changing tables.
    if(filters[selectedTable].hasOwnProperty('ov_trade_id') && ov_trade_id_precursor == 'TRADE') {
      ov_trade_id_precursor = filters[selectedTable]['ov_trade_id'];
    }
  }

  // -------------------------------------------- RELATED FILTER HANDLING ------------------------------------------ //

  function handle_relatedFields(filterName, filterValue, related_filterName){
    Invalid[selectedTable][filterName] = false;
    Invalid[selectedTable][related_filterName] = false;
    if(filters[selectedTable][related_filterName]?.length > 0 && filters[selectedTable][related_filterName] != 'All'){
      if(filterValue == filters[selectedTable][related_filterName]) {
        Invalid[selectedTable][filterName] = true;
        return true;
      } else {
        return false;
      }
    }
  }

  // -------------------------------------------- DROPDOWN FILTERS -------------------------------------------- //

  function handle_DropdownSelect(e) {
    let {event, filterName, related_filterName} = e.detail;
    const filterValue = event.detail?.selectedItem?.text;
    if(filterValue != 'All') {
      filters[selectedTable][filterName] = filterValue;
    } else {
      if(filters[selectedTable].hasOwnProperty(filterName)) {
        delete filters[selectedTable][filterName];
      }
    }
    if(handle_relatedFields(filterName, filterValue, related_filterName)) {return;}
    applyFilters();
  }

  // -------------------------------------------- TEXTFIELD FILTERS -------------------------------------------- //

  // this function handles validation for the following fields...
  // --------------- TENOR FILTER --------------- //
  // --------------- VOLUME FILTER --------------- //
  // --------------- LOT FILTER --------------- //
  // --------------- PRICE FILTER --------------- //
  // --------------- OFFER BROKERAGE FILTER --------------- //
  // --------------- BID BROKERAGE FILTER --------------- //
  // --------------- ONEVIEW TRADE ID FILTER --------------- //
  // --------------- MARKITWIRE TICKET ID FILTER --------------- //

  function handle_textInput(e) {  // use validationValue when you only need to validate a part of the value string but add the entire value to filters.
    let {filterName, regex, value, validationValue=value, related_filterName} = e.detail;

    if(handle_relatedFields(filterName, validationValue, related_filterName)) {return;}
    
    if(validationValue.length == 0) {
      Invalid[selectedTable][filterName] = false;
      delete filters[selectedTable][filterName];
    } else {
      if(!Array.isArray(regex)) { regex = [regex]; } // regex can be passed in as a single regex element or an array.
      let regexPassed = false;
      for(let r of regex){
        if(r.test(validationValue)) {
          Invalid[selectedTable][filterName] = false;
          filters[selectedTable][filterName] = value;
          regexPassed = true;
          break;
        }
      }
      if(!regexPassed){ // if the validationValue did not pass any of the regex tests.
        Invalid[selectedTable][filterName] = true;
        delete filters[selectedTable][filterName];
      }
    }
    if(!Invalid[selectedTable][filterName]) {
      applyFilters();
    }
  }

  // -------------------------------------------- DATE FILTERS -------------------------------------------- //
  let dateRangeReload = {
    "Trades": 0,
    "Swaptions": 0,
    "Liquidity": 0,
  }
  
  function handle_dateRange_Select(e) {
    let event = e.detail.event;
    let dateFrom = event.detail.dateStr.from;
    let dateTo = event.detail.dateStr.to;

    if(dateFrom.length == 0 || dateTo.length == 0) {
      delete filters[selectedTable]['dateFrom'];
      delete filters[selectedTable]['dateTo'];
      applyFilters();
    } else {
      dateFrom = new Date(dateFrom);
      dateFrom.setHours(0, 0, 0, 0);

      dateTo = new Date(dateTo);
      dateTo.setHours(23, 59, 59, 59);

      filters[selectedTable]['dateFrom'] = dateFrom;
      filters[selectedTable]['dateTo'] = dateTo;
      applyFilters();
    }
  }

  function clearDateRange () {
    delete filters[selectedTable]['dateFrom'];
    delete filters[selectedTable]['dateTo'];
    applyFilters();
    
    // trigger date range component reload by changing keyed value
    dateRangeReload[selectedTable]++;
  }

  function handle_dateSingle_Select(e) {
    let {event, filterName} = e.detail;
    let date = event.detail.dateStr;
    // if empty delete from filters
    if(date.length == 0){
      delete filters[selectedTable][filterName];
      applyFilters();
    } else {
      // convert to same format as in rows
      date = new Date(date).toLocaleString('en-AU', {
        dateStyle: 'medium'
      });

      // add to filters and apply
      filters[selectedTable][filterName] = date;
      applyFilters();
    }
  }

  function clearDateSingle(e) {
    let {filterName}  = e.detail;
    delete filters[selectedTable][filterName];
    applyFilters();
  }
  </script>
<div class="filter-column">
  <!-- Filter header -->
    <div class="filter-header">
      <h4 style="font-weight: bold;   color: #999;  ">Filters</h4>
    </div>
   
      <br>
    <!-- Filter content -->
    <div class="filter-content">
      <!--------------------------------------------------- TRADES FILTERS --------------------------------------------------->
      {#if selectedTable == "Trades"}
        {#key resetFilters}
          <TradesFilters 
            bind:Invalid bind:dollar_precursor bind:ov_trade_id_precursor bind:dateRangeReload bind:interest_group_names bind:excludeTest
            on:handle_DropdownSelect={handle_DropdownSelect} on:handle_textInput={handle_textInput}
            on:handle_dateRange_Select={handle_dateRange_Select} on:clearDateRange={clearDateRange} on:clearDateSingle={clearDateSingle}
            on:handle_dateSingle_Select={handle_dateSingle_Select} on:handleAutoRefresh={handleAutoRefresh}
            {applySavedValues}
            on:excludeTest={(detail) =>{ dispatch('excludeTest', detail.detail)}}
          />
        {/key}
      <!--------------------------------------------------- SWAPTION FILTERS --------------------------------------------------->
      {:else if selectedTable == "Swaptions"}
        {#key resetFilters}
          <SwaptionsFilters 
            bind:Invalid bind:dollar_precursor bind:ov_trade_id_precursor bind:dateRangeReload bind:interest_group_names bind:excludeTest
            on:handle_DropdownSelect={handle_DropdownSelect} on:handle_textInput={handle_textInput}
            on:handle_dateRange_Select={handle_dateRange_Select} on:clearDateRange={clearDateRange} on:clearDateSingle={clearDateSingle}
            on:handle_dateSingle_Select={handle_dateSingle_Select} on:handleAutoRefresh={handleAutoRefresh} 
            {applySavedValues}
          />
        {/key}
      <!--------------------------------------------------- LIQUIDITY FILTERS --------------------------------------------------->
      {:else if selectedTable == "Liquidity"}
        {#key resetFilters}
          <LiquidityFilters 
            bind:Invalid bind:dollar_precursor bind:ov_trade_id_precursor bind:dateRangeReload bind:interest_group_names bind:excludeTest
            on:handle_DropdownSelect={handle_DropdownSelect} on:handle_textInput={handle_textInput}
            on:handle_dateRange_Select={handle_dateRange_Select} on:clearDateRange={clearDateRange} on:clearDateSingle={clearDateSingle}
            on:handle_dateSingle_Select={handle_dateSingle_Select} on:handleAutoRefresh={handleAutoRefresh}
            {applySavedValues}
          />
        {/key}
      {/if}
      </div>

      <!-- Button -->
      <div class="clear-btn-wrapper">
        <div class="clear-btn">
          <ButtonSet stacked>
          <Button
            on:click={reset_filters}
            kind='primary'
            icon={FilterReset}
          >Reset Filters</Button>
          </ButtonSet>
        </div>
      </div>

  </div>
<style>
  .filter-column {
  display: flex;
   flex-direction: column;
   justify-content: space-between;
   height: 100%;
   background-color:  var(--cds-layer);
   width: 325px;
  }

  /* width */
  ::-webkit-scrollbar {
    width: 10px;
  }

  .clear-btn {
    /* background-color: transparent;
    background-repeat: no-repeat;
    border: none;
    cursor: pointer; */
    /* overflow: hidden; */
    /* outline: none; */
    /* position: absolute; */
  
   padding: 10px;
   width: 100%;
 
    /* right: 10px; */
    /* padding: 10px; */
    /* color: #e7e7e7;
    font-size: 16px; */
  }
  :global(.clear-btn .bx--btn) {
    max-width: 305px;
  }
  .clear-btn-wrapper{
    width: 325px;
    left: 15px;
    background-color:  var(--cds-layer);
  }
  .filter-header{
  padding: 10px;
  background-color:  var(--cds-layer);
  }
  .filter-content{
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 56px);
    overflow-y: hidden;
    overflow-x: hidden;
    padding: 15px;
    padding-top: 0;
    /* height: fit-content; */
    /* margin: auto; */
    background-color: var(--cds-layer);
    position: relative;
  }
  .filter-content:hover {
    overflow-y: auto;
  }
</style>