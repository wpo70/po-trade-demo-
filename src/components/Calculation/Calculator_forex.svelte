<script>
    import { CopyButton, Tag } from "carbon-components-svelte";

    // Components
    import fxrate from '../../stores/fxrate.js';
    import { round, handleReset } from '../../common/formatting';
    import CustomComboBox from "../Utility/CustomComboBox.svelte";
    
    // Icon
    import Calculator from "carbon-icons-svelte/lib/Calculator.svelte";
    import Reset from "carbon-icons-svelte/lib/Reset.svelte";
    import ArrowsHorizontal from "carbon-icons-svelte/lib/ArrowsHorizontal.svelte";

    let forex = {
        "from": null,
        "to": null,
        "from_vol": null,
        "to_vol": null
    };
    // Update currency array selection from any available currency in store/db
    let cur = [{"currency": "USD"}];
    $fxrate.forEach( c => { if (!cur.some((currency) => currency["currency"] == c.security.substring(0,3))) cur.push({"currency": c.security.substring(0,3)}) });
    
    // Note that the rate get from bloomberg usually taking USD as a based currency,
    // except reciprocal currency pairs AUD, NZD, GBP, EUR 
    function getRate(currency) {
        return currency == "USD" ? 1 : (
            ["AUD", "NZD", "GBP", "EUR"].includes(currency) ? (1/fxrate.getFX(currency).value): fxrate.getFX(currency).value
        );
    }
    function handleCurrencyConverter () {
        if (forex.from && forex.to && forex.from_vol) {
            forex.to_vol = forex.from_vol * getRate(forex.to)/getRate(forex.from);
        }
    }
    function assignCurrencies(from, to) {
        forex.from= from;
        forex.to = to;
    }
    </script>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <div style="display : flex; flex-direction:column; gap:10px; width:400px;">
    <!-- Lot Calculation -->
    <div style="padding: 15px; background-color: #121212" >
        <div class="cal-title-body">Forex Calculation</div>
        <div class="title-border"></div>
        <div style="padding: var(--cds-spacing-05); border-radius:10px; background-color: #232323;">
            <div class="item-cal">
                <div style="width:150px">
                    <CustomComboBox 
                        items={cur.map(row => ({ id: row.currency, text: row.currency }))} 
                        bind:selectedId={forex.from}
                    />
                </div>
                <ArrowsHorizontal size={25}/>
                <div style="width:150px">
                    <CustomComboBox 
                        items={cur.map(row => ({ id: row.currency, text: row.currency }))} 
                        bind:selectedId={forex.to}
                    />
                </div>
            </div> 
            <div class="item-cal non-custombox">
                <label>Amount</label>
                <div class="input-cal">
                <span class="icon-cal" >{forex.from? forex.from: ""}</span>
                <input type="number" bind:value={forex.from_vol}/>
                </div>
            </div> 
            
            <div class="item-cal non-custombox" style="display: flex; justify-content: flex-end; align-items: center; text-align: center; gap:5px;">
                <button class="item-cal-button"
                    on:click={handleCurrencyConverter}><div style="display: flex; flex-direction: row"><Calculator /> &nbsp; Calculate</div></button>
                    <button class="item-cal-button"
                    on:click={() => {forex = handleReset(forex)}}><div style="display: flex; flex-direction: row"><Reset /> &nbsp; Reset</div>
                </button>
            </div> 
            <div class="item-cal non-custombox" style="flex-direction: column; text-align: center;">
                <label>Currency Converted</label> 
                <div style="width: 100%; display: grid; grid-template-columns: auto 0px;
                  color: var(--cds-inverse-support-04, #4589ff); font-weight: 900;
                  font-size: xx-large;">
                  {forex.to ? forex.to: ""}&nbsp;{forex.to_vol ? round(forex.to_vol,2) : round(0,2)}
                  <CopyButton style="margin-left: -40px;" text={(forex.to ? forex.to: "") + " " + (forex.to_vol ? round(forex.to_vol,2) : round(0,2))} feedback="Copied" />
                </div>
            </div>
            <div>Shortcuts</div>
            <div style="display: flex; flex-direction: row; gap:5px;">
            <Tag interactive id="currency-pair_button" on:click={()=> assignCurrencies("USD", "AUD")}>USD - AUD</Tag>
            <Tag interactive id="currency-pair_button" on:click={()=> assignCurrencies("NZD", "AUD")}>NZD - AUD</Tag>
            <Tag interactive id="currency-pair_button" on:click={()=> assignCurrencies("JPY", "AUD")}>JPY - AUD</Tag>
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

    </style>