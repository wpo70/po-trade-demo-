<script>
import { ContentSwitcher, Switch } from 'carbon-components-svelte';
import ArrowsHorizontal from "carbon-icons-svelte/lib/ArrowsHorizontal.svelte";
import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
import StayInside from "carbon-icons-svelte/lib/StayInside.svelte";

import Calculator_brokerage from './Calculator_brokerage.svelte';
import Calculator_dv01 from './Calculator_dv01.svelte';
import Calulator_fut from './Calculator_fut.svelte';
import Calculator_mids from './Calculator_mids.svelte';
import Calculator_menu from './Calculator_menu.svelte';
import Calculator_forex from './Calculator_forex.svelte';
import CalculatorEquitys from './Calculator_equitys.svelte';

// Button open Calculator Div
let openCalculator = false;
let selectedCal = 0;
let selectedCalText;
let isMenuOpen = true;

// Handle switching calculator tabs
$: switch(selectedCal) {
  case 0:
    selectedCalText = "Brokerages Calculator";
    break;
  case 1: 
    selectedCalText = "Volume Calculator";
    break;
  case 2:
    selectedCalText = "Foreign Exchange";
    break;
  case 3:
    selectedCalText = "Equities Calculator";
    break;
  case 4:
    selectedCalText = "Futures Calculator";
    break;
  case 5:
    selectedCalText = "Mids Calculator";
    break;
}

$: if (openCalculator) {
  let elements = document.querySelectorAll(".cal-content_wrapper");
  if (elements != null) {
    elements.forEach((el) => { el.classList.remove("hidden");})
  }
} else {
  let elements = document.querySelectorAll(".cal-content_wrapper");
  if (elements != null) {
    elements.forEach((el) => { el.classList.add("hidden"); })
  }
}
</script>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->

<div id="calculator" style="position: fixed; right: 15px;  bottom: 15px; display: flex; flex-direction: column; gap:3px;"> 
  <div style="display: flex; flex-direction: row-reverse;">
    <button class="calculator-btn_icon circle" id="close_btn_indicator" style="
      text-align: center; box-shadow: rgba(0, 0, 0, 0.8) 2px 2px 10px 4px; 
      cursor: pointer;" on:click={() => {openCalculator=!openCalculator; }}
    >
      <Calculator style="color: white; align-self: center; justify-self: center; width: 100%;" size={42}/>
    </button> 

    <!-- Start of Cal-content -->
    <div class="cal-content_wrapper hidden"  >
      <!-- Top Header -->
      <div style="background-color: rgb(0,0,0); position: sticky; top: 0px;  z-index:2; color: rgb(255,255,255); display: flex; flex-direction: row;align-items: center; gap: 5px; padding: 8px 30px;">
          <div class="cal-title-body cal_buttons" on:click={() =>{isMenuOpen=true}}>
            <StayInside size={25}/>
            <p style="padding-top: 5px; padding-left: 0px;">
              Menu
            </p>
          </div>
          <!-- Close Calculator button -->  
          <div style="position: absolute; right:30px; padding-top: 9px;" class="cal_buttons" on:click={() => {openCalculator=!openCalculator;}}><ArrowsHorizontal size={25}/></div>
      </div>

      <!-- Header -->
      <div class="header-calculator">
        
        {#if isMenuOpen}
          <h1 class="cal_headers">Find Calculators</h1>
        {:else}
          <!-- Title -->
          <h1 class="cal_headers" style="padding-bottom: 30px;">{selectedCalText}</h1>
          <!-- Switching tabs -->
          <div style=" text-wrap: wrap;">
            <ContentSwitcher size="sm" bind:selectedIndex={selectedCal}>
              {#each ["BroCal","Vol","FxEx", "E-Cal","Fut-Cal", "Mid-Cal"] as title}
              <Switch style="padding: 13px; width: fit-content; overflow: visible;">
                {title}
              </Switch> 
              {/each}
            </ContentSwitcher>
          </div>
        {/if}
      </div>

      <div class="wrapper-calculator"  on:keypress|stopPropagation>   
        {#if isMenuOpen}
          <Calculator_menu bind:isMenuOpen={isMenuOpen} bind:selectedCal={selectedCal}/>
        {:else}
          <!-- Content -->
          {#if selectedCal == 0}
            <Calculator_brokerage />
          {:else if selectedCal == 1}
            <Calculator_dv01 />
          {:else if selectedCal == 2}
            <Calculator_forex />
          {:else if selectedCal == 3}
            <CalculatorEquitys />
          {:else if selectedCal == 4}
            <Calulator_fut />
          {:else if selectedCal == 5}
            <Calculator_mids />
          {/if}
        {/if}
      </div>
    </div>
    <!-- End of Cal-content -->
  </div>
</div>


<style>

.cal_headers {
  transition: .2s ease-in-out; 
  color: white; 
  font-weight:500; 
  height:auto; 
  font-size: 39px;
}
.cal_buttons:hover{
  opacity: 30%;
  cursor: pointer; 
}

.hidden {
  display: none;
}

.cal-content_wrapper {
  overflow-y: auto;
  z-index:2;
  right:0;
  position: fixed;
  bottom: 10px;
  top: 48px;
  height: calc(100vh - 60px);
  width: 428px;
  align-self: flex-end;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.8;
  background-color: black;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19); 
  /* adds animation for all transitions */ 
  animation-duration: 0.7s;  
  animation-name: supportanimation; 
}

.wrapper-calculator {
  height: calc(100vh-240px-48px); 
  background-color: #000000; 
  z-index: 2; 
  transition: 0.3s;
  margin: auto; 
  padding: 8px 8px; 
}
@keyframes supportanimation {
  from {
    transform: translate(100%, 0);
  }
  to {
    transform: translate(0%, 0);
  }
}
:global(.input-cal .bx--date-picker-input__wrapper) {
  --cds-ui-background:  #ffffff;
}
.header-calculator{
  z-index: 2; 
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--cds-inverse-support-04, #4589ff);
  padding: 30px 16px;  
  margin-right:auto; 
  flex-direction: column;
  height: 170px;
}
.cal-title-body{
  font-weight: 900; 
  font-size: medium;
  display: flex; 
  gap: 8px; 
}
.circle {
  height: 65px;
  width: 65px;
  background-color: var(--cds-inverse-support-04, #4589ff);
  border-radius: 50%;
  border: none;
  display: flex;
}
.circle:hover {
  background-color: var(--cds-hover-primary, #0353e9);
}

:global(.bx--content-switcher-btn:focus) {
  box-shadow: none;
}

</style>