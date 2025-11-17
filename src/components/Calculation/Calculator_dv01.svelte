<script>
import { CopyButton, RadioButtonGroup, RadioButton } from "carbon-components-svelte";
import CustomComboBox from "../Utility/CustomComboBox.svelte";

import quotes from '../../stores/quotes';
import products from '../../stores/products';
import { round, handleReset } from '../../common/formatting';

import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
import Reset from "carbon-icons-svelte/lib/Reset.svelte";

let outright ={
    "product": null,
    "year": null,
    "dv01": null,
    "mmp": null
};

let spread = {
    "product": null,
    "year1": null,
    "year2": null,
    "dv01_yr1": null,
    "dv01_yr2": null,
    "volume1": null,
    "volume2": null
};

let fly = {
    "product": null,
    "year1": null,
    "year2": null,
    "year3": null,
    "dv01_yr1": null,
    "dv01_yr2": null,
    "dv01_yr3": null,
    "volume1": null,
    "volume2": null,
    "volume3": null
};

function vol (product_id, year, isfly, dv01 ) {
    let s = isfly ? 2: 1;
    switch (product_id) {
        case 5:
            return (s * 40 * 10 / dv01);
        case 18:
            // 3M
            if (year == 0.25) return 500;
            // 6M
            if (year == 0.5) return 200;
        case 17:
            return 500;
        case 27:
            return 500;
        default:
            return (s * 25 * 10 / dv01);
    }
}
function getDv01(product,year) {
    return [18, 17, 27].includes(product) ? null : quotes.get(product, year).dv01;
}
function handleOutrightMMP () {
    if (outright.product && outright.year) {
        try {
            outright.dv01 = getDv01(outright.product, outright.year);
            outright.mmp = vol(outright.product, outright.year, false, outright.dv01);
        } catch (e) {
            outright.year, outright.dv01 = null;
        }
    }
}
function handleDv01 (product, year, dv01) {
    if (product && year) {
        try {
            dv01 = getDv01(product,year);
        } catch (e) {
            dv01 = null;
        }
    }
    return dv01;
}
function handleVolume (product,year, dv01, volume, isfly) {
    if (product && year && dv01) {
        try {
            volume= vol(product, year, isfly, dv01);
        } catch (e) {
            volume = null;
        }
    }
    return volume;
}

function handleSpreadVolume () {
    if (spread.dv01_yr1 && spread.dv01_yr2 && spread.volume1)  spread.volume2 =( spread.dv01_yr1 / spread.dv01_yr2) *spread.volume1;
}
</script>
<!-- svelte-ignore a11y-label-has-associated-control -->

<div style="display : flex; flex-direction:column; gap:10px; margin-bottom: var(--cds-spacing-05);  width:400px; ;">
    <!-- Calculate outright volume -->
    <div style="padding: 15px; background-color: #121212" >
        <div class="cal-title-body">Outright Volume</div>
        <div class="title-border" style="margin-bottom: 10px;"></div>
        <div style="padding: var(--cds-spacing-05); border-radius:10px; background-color: #232323;">
            <div class="item-cal">
                <label>Product </label>        
                <div style="width:150px"><CustomComboBox 
                items={$products.map(row => ({ id: row.product_id, text: products.name(row.product_id) }))} 
                bind:selectedId={outright.product} /></div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Term </label>
                <div class="input-cal">
                <span class="icon-cal" >YR</span>
                <input type="number" bind:value={outright.year} on:blur={handleOutrightMMP}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Duration</label>
                <div class="input-cal">
                <span class="icon-cal" >DUR</span>
                <input type="number" bind:value={outright.dv01}/>
                </div>
            </div>
            <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
                <button class="item-cal-button"
                    on:click={handleOutrightMMP}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                    <button class="item-cal-button"
                    on:click={() =>{outright = handleReset(outright)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
                </button>
            </div> 
            <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
                <label>Minimum Market Parcel</label>
                <label>Formula: MMP = {outright.product !== 5 ? 250: 400} / Durr</label>
                <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
                  color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
                  font-size: xx-large;">
                  $ {outright.mmp ? round(outright.mmp,4) : round(0,4)}
                  <CopyButton style="margin-left: -40px;" text={outright.mmp ? round(outright.mmp,4) : round(0,4)} feedback="Copied" />
                </div>
            </div>
        </div> 
    </div> 
   
    
    <!-- Spread Volume -->
    <div style="padding: 15px; background-color: #121212;" >
        <div class="cal-title-body">Spread Volume</div>
        <div class="title-border" style="margin-bottom: 10px;"></div>
        <div style="padding: var(--cds-spacing-05);  border-radius:10px; background-color: #232323;">
            <div class="item-cal ">
                <label>Product </label>        
                <div style="width:150px">
                    <CustomComboBox 
                        items={$products.map(row => ({ id: row.product_id, text: products.name(row.product_id) }))} 
                        bind:selectedId={spread.product} />
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Term</label>   
                    <div class="input-cal" style="margin-left: 0px;">
                        <span class="icon-cal" >YR1</span>
                        <input style="width:55px" type="number" bind:value={spread.year1} on:blur={() => {spread.dv01_yr1 = handleDv01 (spread.product, spread.year1, spread.dv01_yr1)}}/>
                    </div>
                    <div style="width:2px;height:20px; border: solid grey 1px; "></div>
                    <div class="input-cal" style="margin-left: 0px;">
                        <span class="icon-cal" >YR2</span>
                        <input style="width:55px"  type="number" bind:value={spread.year2} on:blur={() => {spread.dv01_yr2 = handleDv01 (spread.product, spread.year2, spread.dv01_yr2)}}/>
                    </div>
                  
            </div> 
            <div class="item-cal non-custombox">
                <label>Year1 Duration</label>        
                <div class="input-cal">
                    <span class="icon-cal" >DUR</span>
                    <input type="number" bind:value={spread.dv01_yr1}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Year2 Duration</label>        
                <div class="input-cal">
                    <span class="icon-cal" >DUR</span>
                    <input type="number" bind:value={spread.dv01_yr2}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Volume Year1</label>        
                <div class="input-cal">
                    <span class="icon-cal" >$</span>
                    <input type="number" bind:value={spread.volume1}/>
                </div>
            </div> 
            <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
                <button class="item-cal-button"
                    on:click={handleSpreadVolume}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                <button class="item-cal-button"
                    on:click={() => {spread=handleReset(spread)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
                </button>
            </div> 
            <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
                <label>Spread Volume Year 2</label>
                <label>Formula: Volume_yr2 = (Dv01_yr1/dv01_yr2) x Volume_yr1</label>
                <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
                  color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
                  font-size: xx-large;">
                  $ {spread.volume2 ? round(spread.volume2,4) : round(0,4)}
                  <CopyButton style="margin-left: -40px;" text={spread.volume2 ? round(spread.volume2,4) : round(0,4)} feedback="Copied" />
                </div>
                <p  class="note-cal">* The spread volume formula works for calculating short and long leg volumes i.e. where long leg volume is known and short leg is calculated, and where short leg volume is known and long leg is calculated.</p>
                
            </div>
        </div>
    </div>

    <!-- Butterfly volume -->
    <div style="padding: 15px; background-color: #121212;" >
        <div class="cal-title-body">Butterfly volume</div>
        <div class="title-border" style="margin-bottom: 10px;"></div>
        <div style="padding: var(--cds-spacing-05);  border-radius:10px; background-color: #232323;">
            <div class="item-cal">
                <label>Product </label>        
                <div style="width:150px">
                    <CustomComboBox 
                        items={$products.map(row => ({ id: row.product_id, text: products.name(row.product_id) }))} 
                        bind:selectedId={fly.product} />
                </div>
            </div>   
            <div class="item-cal non-custombox" style="margin-left:0; margin-right: 0;width: 100%;">
                <div class="input-cal" style="margin-left: 0px;">
                    <span class="icon-cal" >YR1</span>
                    <input style="width: 55px" type="number" bind:value={fly.year1} on:blur={() => {fly.dv01_yr1 = handleDv01(fly.product, fly.year1, fly.dv01_yr1)}}/>
                </div>
                <div style="width:2px;height:20px; border: solid grey 1px; "></div>
                <div class="input-cal" style="margin-left: 0px;">
                    <span class="icon-cal" >YR2</span>
                    <input style="width: 55px"  type="number" bind:value={fly.year2} on:blur={() => {fly.dv01_yr2 = handleDv01(fly.product, fly.year2, fly.dv01_yr2)}}/>
                </div>
                <div style="width:2px;height:20px; border: solid grey 1px; "></div>
                <div class="input-cal" style="margin-left: 0px;">
                    <span class="icon-cal" >YR3</span>
                    <input style="width:55px"  type="number" bind:value={fly.year3} on:blur={() => {fly.dv01_yr3 = handleDv01(fly.product, fly.year3, fly.dv01_yr3)}}/>
                </div>   
            </div> 
            <div class="item-cal non-custombox">
                <label>Wing 1 Duration</label>        
                <div class="input-cal">
                    <span class="icon-cal" >DUR</span>
                    <input type="number" bind:value={fly.dv01_yr1} on:blur={()=> {fly.volume1= handleVolume(fly.product,fly.year1, fly.dv01_yr1, fly.volume1, false)}}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Body Duration</label>        
                <div class="input-cal">
                    <span class="icon-cal" >DUR</span>
                    <input type="number" bind:value={fly.dv01_yr2} on:blur={()=> {fly.volume2= handleVolume(fly.product,fly.year2, fly.dv01_yr2, fly.volume2, true)}}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Wing 2 Duration</label>        
                <div class="input-cal">
                    <span class="icon-cal" >DUR</span>
                    <input type="number" bind:value={fly.dv01_yr3} on:blur={()=> {fly.volume3= handleVolume(fly.product,fly.year3, fly.dv01_yr3, fly.volume3, false)}}/>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Volume Wing 1</label> 
                <div>
                    <button class="item-cal-button" on:click={()=> {fly.volume1= handleVolume(fly.product,fly.year1, fly.dv01_yr1, fly.volume1, false)}}>
                        <Calculator />
                    </button>      
                    <div class="input-cal">
                        <span class="icon-cal" >$</span>
                        <input type="number" bind:value={fly.volume1}/>
                    </div>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Volume Body</label>
                <div>
                    <button class="item-cal-button" on:click={()=> {fly.volume2= handleVolume(fly.product,fly.year2, fly.dv01_yr2, fly.volume2, true)}}>
                        <Calculator />
                    </button>        
                    <div class="input-cal">
                        <span class="icon-cal" >$</span>
                        <input type="number" bind:value={fly.volume2}/>
                    </div>
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Volume Wing 2</label>
                <div>
                    <button class="item-cal-button" on:click={()=> {fly.volume3= handleVolume(fly.product,fly.year3, fly.dv01_yr3, fly.volume3, false)}}>
                    <Calculator />
                    </button>        
                    <div class="input-cal">
                        <span class="icon-cal" >$</span>
                        <input type="number" bind:value={fly.volume3}/>
                    </div>
                </div>
            </div> 
            

            <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
                <button class="item-cal-button"
                    on:click={handleVolume}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                <button class="item-cal-button"
                    on:click={() => {fly=handleReset(fly)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
                </button>
            </div>
            <!-- Visual butterfly  -->
            <table style="width: 100%;">
                <tr>
                    <td></td><td>YR</td><td>Offer</td><td>Bid</td>
                </tr>
                <tr>
                    <td>Wing 1</td> <td >{fly.year1? fly.year1:"" }</td> <td style=" background-color: #f4f4f4; color: grey;" >{fly.volume1? round(fly.volume1,4) : ""}</td><td></td>
                </tr>
                <tr>
                    <td>Body</td> <td >{fly.year2? fly.year2: ""}</td> <td></td><td style=" background-color: #f4f4f4; color: grey;">{fly.volume2? round(fly.volume2,4) :""}</td>
                </tr>
                <tr>
                    <td>Wing 2</td> <td >{fly.year3? fly.year3 :""}</td> <td style=" background-color: #f4f4f4;color: grey;">{fly.volume3? round(fly.volume3,4): ""}</td><td></td>
                </tr>
            </table>
            <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
                <label>Butterfly Volume Body</label>
                <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
                  color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
                  font-size: xx-large;">
                  $ {fly.volume2 ? round(fly.volume2,4) : round(0,4)}
                  <CopyButton style="margin-left: -40px;" text={fly.volume2 ? round(fly.volume2,4) : round(0,4)} feedback="Copied" />
                </div>
                <p  class="note-cal">* The spread volume formula works for calculating short and long leg volumes i.e. where long leg volume is known and short leg is calculated, and where short leg volume is known and long leg is calculated.</p>
                <p  class="note-cal">Formula: Volume_body = (Dv01_wing/Dv01_body) x 2 x Volume_wing</p>
                <p  class="note-cal">Formula: Volume_wing2 = (Dv01_wing1/Dv01_wing2) x Volume_wing1</p>
                <p  class="note-cal">Formula: Volume_wing = (Dv01_body/(2 x Dv01_wing)) x Volume_body</p>
                
            </div>
        </div>
    </div>
</div>

<style>
button:hover {
  opacity:50%;
}
:global(.item-cal-button) {
    background: var(--cds-inverse-support-04, #4589ff);
    transform: scale(1); 
    border:none; 
    border-radius: 5px;
    color: #f4f4f4;
    padding: 7px;
    text-align: center;
}
table, td {
  border-bottom: 1px dashed grey;
  padding: 2px 5px;
  text-align: left;
}
tr:hover {opacity: 0.5;}
td{
    vertical-align:bottom;
    width:25%
}
</style>