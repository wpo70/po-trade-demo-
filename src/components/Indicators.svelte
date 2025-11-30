<script>
import Indicator from './Indicator.svelte';
import active_product from '../stores/active_product.js';
import quotes from '../stores/quotes.js';
import dailyfx from '../stores/fxrate';
import currency_state from '../stores/currency_state';
import Fxrate from './Fxrate.svelte';
import data_collection_settings from '../stores/data_collection_settings';
import { getOISMid } from '../common/pricing_models';
export let copyData;
let selected = -1;

$: if (copyData == null) selected = -1;

// Benign declaration and initialisation.

// Get the quotes for the active product.  Normally the active product is simply the active product.
// But if the active product is either IRS or EFP then the primary quotes will be the IRSs and the
// secondary quotes will be the EFPs.

// NOTE: THESE REACTIVE ASSIGNMENTS ARE HARD CODED TO EXPECT THE PRODUCT_ID OF IRS TO BE 1 AND EFP TO BE 2,
// AS DEFINED IN THE DATABASE.
let primary_quotes, secondary_quotes, secondary_index;
// Add FX Rate from dailyfx store
let fx;
$: {
  fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state.currency);
} 

$: {
  if ($active_product === 20) {
    primary_quotes = $quotes[20].filter((i) => i.year > 1000);
    if ($data_collection_settings.calcOIS) primary_quotes.forEach(quote => quote.mid = getOISMid(quote.year));
  } else if ($active_product === 3) {
    primary_quotes = $quotes[3].filter((i) => i.year <= 2);
    if ($data_collection_settings.calcOIS) primary_quotes.forEach(quote => {if (quote.year < 2) quote.mid = getOISMid(quote.year)});
  } else {
    primary_quotes = $quotes[$active_product];
  }
}
$: secondary_quotes = ($active_product === 1) ? $quotes[2] : ($active_product === 29 ? $quotes[28] : null);
$: secondary_index = secondary_quotes === null ? 0 : 0;

function equivalentSecondary(primary_indicator, secondary_quotes) {
  // Return the secondary indicator indexed by secondary_index, if its year matches the
  // primary_indicator's year.  Returning null means there are no secondaries at all
  // Returning 0 means there is no secondary with the same year.

  // When selection drop down shows NZD, 
  // indicator table will show primary quotes only, secondary_quotes will equal null, in thcase of IRS tab
  if (!secondary_quotes ) return null;

  let i = 0;
  while (i < secondary_quotes.length){
    let secondary_indicator = secondary_quotes[i];

    if (primary_indicator.year === secondary_indicator.year) {
      return secondary_indicator;
    }
    
    i++;
  }

  return 0;
}

function copyToOrderForm (indicator) {
  if (!indicator || selected == indicator.year) {
    selected = -1;
    copyData = null;
    return;
  }
  let price = indicator.override ?? indicator.mid;
  let s_price = equivalentSecondary({year: indicator.year}, secondary_quotes)
  copyData = {
    years: [indicator.year],
    price: price,
    secondary_price: s_price ? s_price.override ?? s_price.mid : null,
    type: "indicator",
  };
  selected = indicator.year;
}

</script>
<table  class="indicators">
  <thead>
    <tr>
      <th>Tenor</th>
            {#if ( secondary_quotes === null )}
              <th>Mid</th>
              {:else}
                {#if $active_product === 1}
                  <th>IRS</th>
                  <th>EFP</th>
                {:else if $active_product === 29}
                  <th>IRS SWAPS</th>
                  <th>SOFR SPRD</th>
                {/if}
            {/if}
    </tr>
  </thead>
</table>
<div class="full-indicators-wrapper">
<table  class="indicators">
  <tbody class='indicator_body'>
    {#each primary_quotes as primary_indicator}
      <Indicator
        primary_indicator={primary_indicator} 
        secondary_indicator={equivalentSecondary(primary_indicator, secondary_quotes)}
        on:copy={() => copyToOrderForm(primary_indicator)}
        bind:highlight={selected}
        product_id={$active_product}
      />
    {/each}
  </tbody>
</table>

<div style="height: 20px;position: relative"></div>
    <!--FX RATE-->
  {#if [7,8,9,26].includes($active_product) }
    <table class="indicators fx" style="position: relative">
      <thead>
        <tr>
          <th>FX</th>
          <th>Last</th>
        </tr>
      </thead>
      <tbody>
        <Fxrate fxrate={fx}/>
      </tbody>
    </table>
  {/if}
</div>
<style>
  .full-indicators-wrapper{
  max-height: calc(100vh - 86px - 48px - 100px - 40px); 
  position: fixed; 
  top: 280px; 
  bottom: 20px;
  overflow-y: hidden; 
  }
  .full-indicators-wrapper:hover {
    overflow-y: auto;
  }
:global(table.indicators thead tr, table.indicators tbody tr:nth-child(even)) {
  background: var(--cds-ui-02);
}

:global(table.indicators) {
  border-collapse: collapse;
  margin-left: 0;
  margin-right: auto;
  
  /* height: 100%; */
}
  .indicator_body::-webkit-scrollbar-thumb{
  background-color: #393939;
  border: 2px solid var(--cds-ui-01);
  border-radius: 6px;
  cursor: pointer;
}

:global(table.indicators th, table.indicators td) {
  border: 1px solid var(--cds-ui-04);
  padding: 5px;
  min-width: 85px;
  text-align: center;
}
</style>
