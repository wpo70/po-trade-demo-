<script>
import quotes from '../../stores/quotes';
import { round, handleReset } from '../../common/formatting';
import ticker from '../../stores/ticker';

import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
import Reset from "carbon-icons-svelte/lib/Reset.svelte";
    import { CopyButton } from 'carbon-components-svelte';

let lots ={
    "ticker": null,
    "value": null,
    "lot": null,
    "term": null,
    "volume": null,
    "dv01": null 
}
function handleLotsCalculate (e) {
    if (e && lots.term) {
    lots.dv01 = quotes.get(1, lots.term).dv01;
    lots.ticker = lots.term > 5 ? "XMA" : "YMA";
    lots.value = (lots.term > 5 ? ticker.getXMA().fut_px_val_bp : ticker.getYMA().fut_px_val_bp) *1000;
}
}
function handleLots () {
    if (lots.ticker && lots.value && lots.volume && lots.term ) {
        lots.lot = (lots.volume * (100 *(lots.dv01/lots.value)));
    }
}


</script>
<!-- svelte-ignore a11y-label-has-associated-control -->
<div style="display : flex; flex-direction:column; gap:10px; width:400px;">
<!-- Lot Calculation -->
<div style="padding: 15px; background-color: #121212" >
    <div class="cal-title-body">Lots Calculation</div>
    <div class="title-border"></div>
    <div style="padding: var(--cds-spacing-05); border-radius:10px; background-color: #232323;">
        <div class="item-cal non-custombox">
            <label>Term</label>
            <div class="input-cal">
            <span class="icon-cal" >YR</span>
            <input type="number" bind:value={lots.term} on:blur={(e) =>{handleLotsCalculate(e); }}/>
            </div>
        </div> 
        <div class="item-cal non-custombox">
            <label>Duration</label>
            <div class="input-cal">
            <span class="icon-cal" >DUR</span>
            <input type="number" bind:value={lots.dv01}/>
            </div>
        </div> 
        <div class="item-cal non-custombox">
            <label>Volume (M)</label>
            <div class="input-cal">
            <span class="icon-cal" >$</span>
            <input type="number" bind:value={lots.volume}/>
            </div>
        </div> 
        <div class="item-cal non-custombox">
            <label style="max-width:165px">Future Value</label>
            <div class="input-cal">
            <span class="icon-cal" >%</span>
            <input type="number" bind:value={lots.value}/>
            </div>
        </div>
        <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
            <button class="item-cal-button"
                on:click={handleLots}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                <button class="item-cal-button"
                on:click={() => {lots = handleReset(lots)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
            </button>
        </div> 
        <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
            <label>Lots in EFP</label>
            <label>Formula: Lots=(Volume x (100 x ( dv01/ticker)))</label>
            <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
              color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
              font-size: xx-large;">
              {lots.lot ? round(lots.lot,4) : round(0,4)} Lots
              <CopyButton 
                style="margin-left: -40px;" 
                text={lots.lot ? round(lots.lot,4) : round(0,4)} 
                feedback="Copied" />
            </div>
            <label for=""> 
                <p class="note-cal">* Dv01 is the dv01 value for the given year. Ticker is the YMA/XMA value at year - year is less than or equal to 5 is YMA, otherwise XMA.</p>
                <p class="note-cal">* Ticker values change 4 times a year. X/Y M: H (Jan – Mar), M (Apr – Jun), U (Jul – Sep), Z (Oct – Nov). X/Y MA is obtained from Bloomberg and is the current season’s ticker value.</p>
            </label>
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
</style>