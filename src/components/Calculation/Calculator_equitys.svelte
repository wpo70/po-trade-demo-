<script>
  import { Button } from "carbon-components-svelte";

  let contractSize = 500; // Default contract size
  let delta = 35; // Default delta value
  let hedgeResult = 0;
  let selectedOption = 'call';

  $: calculateHedge(delta, contractSize, selectedOption, hedgeResult);

  function handleButtonClick(option) {
    selectedOption = option;
  }

  function calculateHedge() {
    // Calculate SPI hedge
    hedgeResult = (delta * contractSize) / 250;
    
    // Adjust hedge result based on option type (CALL/PUT)
    hedgeResult *= selectedOption == "put" ? -1 : 1;
  }

</script>

<!-- svelte-ignore a11y-label-has-associated-control -->
<div style="display : flex; flex-direction:column; gap:10px; width:400px;">
  <!-- Lot Calculation -->
  <div style="padding: 15px; background-color: #121212" >
    <div class="cal-title-body">SPI Hedge Calculation</div>
    <div class="title-border"></div>
    <div style="padding: var(--cds-spacing-05); border-radius:10px; background-color: #232323;">
      <div class="item-cal non-custombox">
        <label>Contract Size (Lots):</label>
        <div class="input-cal">
          <input type="number" bind:value={contractSize}/>
        </div>
      </div>
      <div class="item-cal non-custombox">
        <label>Delta Value:</label>
        <div class="input-cal">
          <input type="number" bind:value={delta}/>
        </div>
      </div>
      <div class="item-cal non-custombox" style="gap: 20px;">
        <button
          on:click={() => handleButtonClick('call')}
          class:selected-toggle-button={selectedOption === 'call'}
          class="toggle-button"
        >CALL</button>
        <button
          on:click={() => handleButtonClick('put')}
          class:selected-toggle-button={selectedOption === 'put'}
          class="toggle-button"
        >PUT</button>
      </div>
      <div class="item-cal non-custombox" style="margin-top: 25px;">
        <label>SPI Hedge:</label>
        <div class="input-cal">
          <input bind:value={hedgeResult}/>
        </div>
      </div>
      <div style="text-align: center;">
        (Buyer of the option {selectedOption == "put" ? "buys" : "sells"} futures)
      </div>
    </div>
  </div>
</div>

<style>
:global(.ui-font-result) {
  color: var(--cds-inverse-support-04, #4589ff);   
  font-weight: 900;
  font-size: xx-large;
}
button:hover {
  opacity:50%;
}
:global(#currency-pair_button) {
  padding: 8px 16px;
  font-weight: 400;
}
.toggle-button {
  background-color: var(--cds-inverse-support-04, #4589ff);
  opacity: 1;
  color: white;
  cursor: pointer;
  flex-grow: 1;
  border: none;
  border-radius: 10px;
  margin-top: 10px;
}
.selected-toggle-button {
  opacity: 0.4;
}
</style>