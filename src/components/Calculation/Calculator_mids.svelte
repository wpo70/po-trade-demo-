<script>
    import { 
        CopyButton, RadioButtonGroup, RadioButton, DatePicker, DatePickerInput, ContentSwitcher, Switch, ComboBox 
    } from "carbon-components-svelte";

    import quotes from '../../stores/quotes';
    import products from '../../stores/products';
    import { round, handleReset, toTenor, isBusinessDay, getEFPSPS_Dates, toRBATenor } from '../../common/formatting';
    import { calc3mSps, calc6mSps, getFwdMid  } from '../../common/pricing_models.js';

    import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
    import Reset from "carbon-icons-svelte/lib/Reset.svelte";
    
    let mids = {
        "year": null,
        "product_id": null,
        "fwd": null, // product SPS
        "start_date": null, // product SPS
        "mid": null
    }
    let p = {
      "type": 0,
      "fly": {
          "year_1": null,
          "year_2": null,
          "year_3": null,
          "price_1": null,
          "price_2": null,
          "price_3": null,
          "price_fly": null
      },
      "spread": {
          "year_1": null,
          "year_2": null,
          "price_1": null,
          "price_2": null,
          "price_spread": null,
      }
    }
    // Set group product default as regular products type =0
    let type= 0;
    let q = null;

    // Filter default product selection to regular product group
    let pr = $products.filter((i) => !products.isFwd(i.product_id) && !products.isStir(i.product_id));
    let invalidDate = false;

    // Filter the quotes based on product Id selected
    $: {
        if ( mids.product_id && !products.isFwd(mids.product_id) ) {
            // Filter rbaois year with code > 1000, then convert year to tenor
            if (mids.product_id == 20 ) q = $quotes[mids.product_id].filter((i) => i.year >1000)
            // Filter quote based on product id
            else  q = $quotes[mids.product_id];
        } else {
            q= null;
    }
}
    function OnChangeProduct (id) {
        p.spread=handleReset(p.spread); 
        p.fly=handleReset(p.fly);
    }
    function handleChangeProducts () {
        switch (type) {
        case (0):
            pr = $products.filter((i) => !products.isFwd(i.product_id) && !products.isStir(i.product_id));
            break;
        case (1):
            pr = $products.filter((i) => products.isStir(i.product_id));
            break;
        case (2):
            pr = $products.filter((i) => products.isFwd(i.product_id));
            break;
    }
    }
     // Calculate the mid
     // Mid rate sps id =18 only work when gateway connects.
    function handleMidsCal () {
        switch(type) {
            // Regular products
            case 0:
                switch (p.type) {
                    // Spread
                    case 1:
                        if (p.spread.price_1 && p.spread.price_2) mids.mid = p.spread.price_2 - p.spread.price_1;
                        break;
                    // Butterfly
                    case 2:
                        if (p.fly.price_1 && p.fly.price_2 && p.fly.price_3) mids.mid = p.fly.price_2 *2 - p.fly.price_1 - p.fly.price_3;
                        break;
                    // Outright
                    default:
                        if (mids.year) mids.mid = quotes.mid(mids.product_id, [mids.year]);
                        break;
                }
                break;
            // STIR
            case 1:
                if (mids.product_id == 18) {
                    let now = new Date();
                    let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    let key = mids.start_date.split("-");
                    let spot = new Date(parseInt(key[0]), parseInt(key[1])-1, parseInt(key[2]));
                    let days = Math.round(spot.getTime() - today.getTime()) / (1000*60*60*24);
                    if (mids.year == 0.25) mids.mid = calc3mSps(days);
                    else mids.mid = calc6mSps(days);
                } else {
                    if (mids.year) try {mids.mid = quotes.mid(mids.product_id, [mids.year]);} catch(e) {mids.mid = null}
                }
                break;
            // FWD
            case 2:
                if (mids.year) try {mids.mid = getFwdMid(mids.product_id, mids.year);} catch(e) {mids.mid = null}
                break;
        }
    }
    const handleConvertToSPSTenor=(yr)=> {
        if (yr || yr !== '' ) { return getEFPSPS_Dates()[yr-1000-1].tenor;}
    }
    const handleIndividualMid = (yr) => {
        if (yr) return quotes.mid(mids.product_id, [yr]);
    }
    
    </script>
    <div style="height: 100%; ">   
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <!-- svelte-ignore a11y-label-has-associated-control -->
          <div style="display : flex; flex-direction:column; gap:10px; margin-bottom: var(--cds-spacing-05);  width:400px; background-color:#121212;">
              <div style="padding: 15px;" >
                  <div class="cal-title-body">Mids Calculator</div>
                  <div class="title-border" style="margin-bottom: 10px;"></div>
                  <div style="padding: var(--cds-spacing-05);  border-radius:10px; background-color: #232323;">
                    
                    <!-- Group products -->
                    <RadioButtonGroup hideLegend 
                        bind:selected={type} 
                        on:change={() => {handleChangeProducts(); mids = handleReset(mids)}} >
                        <RadioButton labelText="IRS, XCCY, ..." value={0} />
                        <RadioButton labelText="STIR" value={1} />
                        <RadioButton labelText="FWD" value={2} />
                    </RadioButtonGroup>
                    <br/>

                    <!-- Product Selection -->
                    <div class="item-cal">
                        <label>Product </label>        
                        <div  style="width:150px"><ComboBox 
                        items={pr.map(row => ({ id: row.product_id, text: products.name(row.product_id) }))} 
                        on:select={OnChangeProduct}
                        bind:selectedId={mids.product_id} 
                       /></div>
                    </div> 
                    
                    {#if (type == 0 && q) }
                        <br/>
                        <div class="tabs-content_mids_calc">
                        <ContentSwitcher size="sm" bind:selectedIndex={p.type}>
                            <Switch text="Outright" />
                            <Switch text="Spread" />
                            {#if mids.product_id !== 2}
                            <Switch text="Butterfly" />
                            {/if}
                        </ContentSwitcher>
                        {#if p.type == 0}
                            <div class="item-cal ">
                                <label>Tenor</label>
                                <div style="width:150px"><ComboBox 
                                    items={q.map(row => ({ 
                                        id: row.year, 
                                        text: mids.product_id == 20? toRBATenor([row.year]): toTenor(row.year) 
                                        }))} 
                                    bind:selectedId={mids.year} /></div>
                            </div> 
                        {:else if p.type == 1}
                            <table style="width: 100%;">
                                <tr>
                                    <td>YR</td><td>Offer</td><td>Bid</td>
                                </tr>
                                
                                <!-- If its spread -->
                                <tr>
                                    <td><ComboBox 
                                        items={q.map(row => ({ 
                                            id: row.year, 
                                            text: mids.product_id == 20? toRBATenor([row.year]):toTenor(row.year) 
                                            }))} 
                                        on:select={({detail}) => {p.spread.price_1 = handleIndividualMid(detail.selectedId);}}
                                        bind:selectedId={p.spread.year_1} />
                                    </td> 
                                    <td class="non-custombox" >
                                        <input contenteditable
                                        bind:value={p.spread.price_1}/>
                                    </td><td></td>
                                </tr>
                                <tr>
                                    <td><ComboBox 
                                        items={q.map(row => ({ 
                                            id: row.year, 
                                            text: mids.product_id == 20? toRBATenor([row.year]):toTenor(row.year) }))} 
                                        on:select={({detail}) => { 
                                            p.spread.price_2 = handleIndividualMid(detail.selectedId);}}
                                        bind:selectedId={p.spread.year_2}  />
                                    </td><td></td><td class="non-custombox"> 
                                        <input contenteditable
                                        bind:value={p.spread.price_2}/></td>
                                </tr>
                            </table>
                        {:else if p.type == 2}
                            <table style="width: 100%;">
                                <tr>
                                    <td>YR</td><td>Offer</td><td>Bid</td>
                                </tr>
                                <!-- If its buterffly -->
                                <tr>
                                    <td><ComboBox 
                                        items={q.map(row => ({ id: 
                                            row.year, 
                                            text: mids.product_id == 20? toRBATenor([row.year]):toTenor(row.year)  }))} 
                                        on:select={({detail}) => {p.fly.price_1 = handleIndividualMid(detail.selectedId);}}
                                        bind:selectedId={p.fly.year_1}  />
                                    </td> <td class="non-custombox" >
                                        <input contenteditable
                                        bind:value={p.fly.price_1}/></td><td></td>
                                </tr>
                                <tr>
                                    <td><ComboBox 
                                        items={q.map(row => ({ 
                                            id: row.year, 
                                            text: mids.product_id == 20? toRBATenor([row.year]):toTenor(row.year)  }))} 
                                        on:select={({detail}) => {p.fly.price_2 = handleIndividualMid(detail.selectedId);}} 
                                        bind:selectedId={p.fly.year_2} />
                                    </td><td></td><td class="non-custombox">
                                        <input contenteditable
                                        bind:value={p.fly.price_2}/></td>
                                </tr>
                                <tr>
                                    <td><ComboBox 
                                        items={q.map(row => ({ 
                                            id: row.year, 
                                            text: mids.product_id == 20? toRBATenor([row.year]):toTenor(row.year)  }))} 
                                        on:select={({detail}) => { p.fly.price_3 = handleIndividualMid(detail.selectedId);}}
                                        bind:selectedId={p.fly.year_3}  />
                                    </td><td class="non-custombox" >
                                        <input contenteditable
                                        bind:value={p.fly.price_3}/></td><td></td>
                                </tr>
                            </table>
                        {/if}
                        </div>
                    <!-- Handle Fwd products -->
                    {:else if type ==2}

                    <div class="item-cal non-custombox">
                        <label>Tenor (Years i.e: 1y1y) </label>
                        <div class="input-cal">
                            <span class="icon-cal" >YR</span>
                            <input type="text" contenteditable bind:value={mids.year} />
                        </div>
                    </div> 
                    <!-- Handle EFP SPS -->
                    {:else if (type==1 && (mids.product_id == 17 || mids.product_id == 27))}
                    <div class="item-cal">
                        <label>Start Date</label>
                        <div style="width:150px">
                            <ComboBox 
                            items={q
                            .filter((i) => (i.year -1000)>0 && (i.year -1000)<13)
                            .map(row => ({ id: row.year, text: handleConvertToSPSTenor(row.year) }))} 
                            bind:selectedId={mids.year} /></div>
                    </div> 
                    <!-- Handle SPS 3M SPS 6M -->
                    {:else if (type==1 && mids.product_id == 18)}
                    <div class="item-cal" style="margin-left:0;margin-right:0; ">
                        <DatePicker 
                        light
                        datePickerType="single" 
                        dateFormat="Y-m-d"
                        flatpickrProps={{ static: true, position: "auto" }}
                        on:change={(e) => {
                            mids.start_date = e.detail.dateStr; 
                            invalidDate = mids.start_date ? !isBusinessDay(e.detail.selectedDates[0]) : false}}
                        >
                            <DatePickerInput hideLabel placeholder="yyyy/mm/dd" bind:invalid={invalidDate} invalidText="Invalid Date"/>
                        </DatePicker>
                    </div> 
                    <div class="item-cal ">
                        <label>Tenor</label>
                        <div style="width:150px"><ComboBox 
                            items={q.map(row => ({ id: row.year, text: toTenor(row.year) }))} 
                            bind:selectedId={mids.year} /></div>
                    </div> 
                    {/if}
                
                    <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
                        <button class="item-cal-button"
                            on:click={handleMidsCal}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                            <button class="item-cal-button"
                            on:click={() =>{mids = handleReset(mids)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
                        </button>
                    </div> 
                    <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
                      <label>Mid Rate (Bloomberg) </label>
                      <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
                        color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
                        font-size: xx-large;">
                        {mids.mid ? ((products.isPercentageProd(mids.product_id) && p.type !== 0) ? round(mids.mid*100,4) : round(mids.mid,4)) : round(0,4)} 
                        {(products.isPercentageProd(mids.product_id) && p.type === 0)? "%": "BP"}
                        <CopyButton 
                          style="margin-left: -40px;" 
                          text={mids.mid ? ((products.isPercentageProd(mids.product_id) && p.type !== 0 ) ? round(mids.mid*100,4) : round(mids.mid,4)) : round(0,4)} 
                          feedback="Copied" />
                      </div>
                      <p class="note-cal">* Mid Rates under IRS, EFP, OIS Spread and Butterfly on WhiteBoard represent in percentage format.</p>
                      <p class="note-cal">Spread price = long leg price - short leg price</p>
                      <p class="note-cal">Butterfly price = 2 * body price - wing1_price - wing2_price</p>
                    </div> 
                  </div>  
              </div>
          </div>
        </div>

<style>
.tabs-content_mids_calc{
    padding-bottom: 15px;
}
:global(.tabs-content_mids_calc .bx--content-switcher-btn) {
    border: none;
}
:global(.bx--content-switcher-btn .bx--content-switcher--selected) {
    background-color: inherit;
}
:global(.tabs-content_mids_calc ul){
    width: 100%;
}

input {
    height: 40px;
}
table {
    border-collapse:collapse;
    margin-top: 15px;
    margin-bottom: 15px;
}
table td {
    display:table-cell;
    vertical-align:top;
    border-bottom: 1px dashed grey;
}
tr input:hover {opacity: 0.5;}
:global(.dotted-calc){
  border-bottom: 1px dashed #999;
  text-decoration: none; 
}
</style>