<script>
  // icon
import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
import Reset from "carbon-icons-svelte/lib/Reset.svelte";

import { DatePicker, DatePickerInput } from 'carbon-components-svelte';
import { CopyButton } from "carbon-components-svelte";
import OptionCycler from "../Utility/OptionCycler.svelte";

import brokerages from '../../stores/brokerages.js';
import quotes from '../../stores/quotes.js';
import { round, handleReset } from '../../common/formatting';

// Brokerage variables consist of
let bro = {
  "notional": null,
  "fee": null,
  "term": null,
  "rate": null,
  "comp_intv_str": null,
  "n_days": null,
  "brokerage": null
}
// BroType can be SemiSemi quarterly etc
let brotype = 0;
// Trade Type can be outright, fly, spread
let trtype = 0;

let bankSelected;
let bankBroCount;
let start_date;
let end_date;
let warningtext ="";

// Handle bank brokerage monthly trade count
$: if (bankSelected) {
  try {
    bankBroCount = brokerages.get(bankSelected).monthly_trade_count;
    warningtext ="";
  } catch (e) {
    bankBroCount = 0;
    warningtext = "Please select the other bank."
  }
}

// Getting cash rate from OIS index mid rate
function handleCashRate (term) {
if (term) {
  try {
    bro.rate = quotes.mid(3, [bro.term]);
  } catch (e) {
    bro.rate = null;
  }
}
}

/**
 * Given:
 * notional (in millions), fee (percentage), term (in years), rate (percentage)
 * compound interval as: "d"|"daily", "w"|"weekly", "m"|"monthly", "q"|"quarterly", "a"|"annually"
 * Calculate present value
 * @param notional
 * @param fee
 * @param term
 * @param rate
 * @param comp_intv_str
 */
 const calculatePV = function (notional, fee, term, rate, comp_intv_str) {
    // Get the compound interval as an integer
    let comp_intv = determineCompoundIntervalInteger(comp_intv_str);

    // Calculate values used in function
    
    // True notional, times notional (in millions) by 1 million
    notional = notional * 1000000;
    // Divide rate by compound interval*100
    rate = rate / (comp_intv * 100);
    // Number of periods is tenor * compound interval
    let nper = term * comp_intv;
    // Calculate pmt
    let pmt = (fee / (comp_intv * 10000)) * notional;

    // Calculate numerator and denomonator of pv
    let num = -pmt * (Math.pow(1 + rate, nper) - 1);
    let den = rate * Math.pow(1 + rate, nper);

    // Calculate pv
    let pv = Math.abs(num / den);

    return pv;
};

function determineCompoundIntervalInteger(comp_intv_str) {
    switch (comp_intv_str) {
        case "d" || "daily":
            return 365;
        case "w" || "weekly":
            return 52;
        case "m" || "monthly":
            return 12;
        case "q" || "quarterly":
            return 4;
        case "b" || "bi-annually":
            return 2;
        case "a" || "annually":
            return 1;
        default:
            console.log("Unrecognised compound interval");
            return null;
    }
}

function calculateFraBro (notional, fee, n_days) {
    // Get notional value
    notional = notional * 1000000;

    return (((notional * fee)/10000)/365) * n_days;
};

function handleBroCal () {
  if (brotype !== 5) {
  bro.brokerage = calculatePV(bro.notional, bro.fee, bro.term, bro.rate, bro_type[brotype].id);
  } else {
  // For FRA BRO
  bro.brokerage = calculateFraBro (bro.notional, bro.fee, bro.n_days);
  }
}

let bro_type=[
    {"id":"d", "name": "aud daily"},
    {"id":"w", "name": "aud weekly"},
    {"id":"q", "name": "aud quaterly"},
    {"id": "b", "name": "aud semi-semi"},
    {"id": "a", "name": "aud annually"},
    {"id": "fra", "name": "fra bro calculator (aud)"}
]

function handleDaysRange (range) {
  if (range && range.selectedDates[0] && range.selectedDates[1]){
    start_date = new Date(range.selectedDates[0])
    end_date = new Date(range.selectedDates[1])
    bro.n_days =  Math.round(Math.abs(( start_date - end_date ) /(24*60*60*1000))); // hrs*ms*sec*milli
  }
}
</script>


<div style="height: 100%; ">
  <div style="display: flex; flex-direction: column; gap:10px; margin-bottom: var(--cds-spacing-05);  width:400px; background-color:#121212;">
    <div style="padding: 15px;" >
      <div class="cal-title-body">Brokerage Calculator</div>
      <div class="title-border" style="margin-bottom: 10px;"></div>
      <div style="padding: var(--cds-spacing-05);  border-radius:10px; background-color: #232323;">
        <OptionCycler 
          size="sm"
          style="background-color:#121212; border-radius:4px; height:2.5rem; padding:0 5px; margin-bottom:0.75rem;"
          bind:option_list={bro_type}
          bind:index={brotype}
          textFormatter={(val) => val.name.toUpperCase()}
        />
        <div class="item-cal non-custombox">
            <label>Notional (M)</label>
            <div class="input-cal">
              <span class="icon-cal" >$</span>
              <input type="number" bind:value={bro.notional}/>
            </div>
        </div> 
        <div class="item-cal non-custombox">
          <label>Fee (Rate)</label>
          <div class="input-cal">
            <span class="icon-cal" >BPS</span>
            <input type="number" bind:value={bro.fee} />
          </div>
        </div> 
        {#if ![5].includes(brotype)}
        <div class="item-cal non-custombox">
          <label>Term (Years) </label>
          <div class="input-cal">
            <span class="icon-cal" >YR</span>
            <input type="number" contenteditable bind:value={bro.term} on:blur={(e) =>{handleCashRate(e); }}/>
          </div>
        </div> 
        <div class="item-cal non-custombox">
          <label>Cash Rate (Fixed) </label>
          <div class="input-cal">
            <span class="icon-cal" >%</span>
            <input type="number" bind:value={bro.rate}/>
          </div>
        </div> 
        {:else}
        <div class="item-cal">
        
          <div class="input-cal" style="margin-left:0;margin-right:0; ">
            <DatePicker 
            light
            datePickerType="range" 
            flatpickrProps={{ static: true }}
            dateFormat="Y-m-d"
            on:change={(e) => handleDaysRange(e.detail)}
            >
              <DatePickerInput labelText="Start date" placeholder="yyyy/mm/dd" />
            <div style="width: 40px;"></div>
              <DatePickerInput labelText="End date" placeholder="yyyy/mm/dd" />
            </DatePicker>
          </div>
        </div> 
        <div class="item-cal non-custombox">
          <label>No. Days (Number) </label>
          <div class="input-cal">
            <span class="icon-cal" >N</span>
            <input type="number" bind:value={bro.n_days}/>
          </div>
        </div> 
        {/if}
        <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
          <button class="item-cal-button"
          on:click={handleBroCal}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
          <button class="item-cal-button"
          on:click={()=> bro =handleReset(bro)}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
          </button>  
        </div>
        <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
          <label>Brokerage</label>
          <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
            color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
            font-size: xx-large;">
            $ {bro.brokerage ? round(bro.brokerage,4) : round(0,4)}
            <CopyButton style="margin-left: -40px;" text={bro.brokerage ? round(bro.brokerage,4) : round(0,4)} feedback="Copied" />
          </div>
          <label for=""> 
            <p class="note-cal">
            * Brokerages calculations involve per-bank logic; each bank has agreed brokerage rules with PO Capital. The per-bank logic is outlined in the ‘Bank Brokerage’ file.
            </p>
            <p class="note-cal">Formula: PV=[(((fee/CompIntv)*100)* Notional)+ ((1+CompRate)^nper) -1]/(CompRate*(1+CompRate)^nper)</p>
          </label>
        </div> 
      </div>  
    </div>
  </div>
</div>

<style>
:global(.title-border) {
    margin-top: 3px;
    margin-bottom: 5px;
    width: 70px;
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(180deg,#1565c0,#003c8f);
    background: -ms-linear-gradient(to bottom,#1565c0,#003c8f);
    transform: scale(1);
}

:global(.non-custombox input) {
  border: 0;
  background-color: #121212;
  color:#999;
  vertical-align: middle;
  display: inline-block;
  transition: .2s ease-in-out;
  transition-property: color,background-color,border;
  cursor: text;
  margin: 0;
  font: inherit;
  overflow: visible;
  padding: 0 10px;
  padding-left: 10px!important;
  font-weight: 400;
  width: 100px;
}
:global(.item-cal input:focus) {
  outline: none;
}
:global(.item-cal) {
  display:flex;
  justify-content: space-between; 

  align-items: center;
  color: white;
  font-weight: 400;
  padding-top: 5px ;
  padding-bottom: 5px;
  width: 100%;
}
:global(.input-cal) {
  display: inline-block;
  align-items: center; 
  max-width: 100%; 
  vertical-align: middle;   
  background-color: #121212; 
  margin-left: 20px; 
  padding: 5px; 
  border-radius:4px;
}
:global(.icon-cal) {
  align-self:flex-end; 
  color:#999; 
  display:inline-flex;
  width: 35px; 
  padding-left:10px;
  left:0; 
  font-weight: 400;
}
button:hover {
  opacity:50%;
}
:global(p.note-cal) {
  text-align: center; 
  font-size: x-small; 
  font-weight:400;
}


</style>