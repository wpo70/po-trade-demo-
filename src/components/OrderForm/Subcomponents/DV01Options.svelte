<svelte:options accessors={true} />
<script>
  import { RadioButton, RadioButtonGroup, TextInput, Tooltip } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";
  import products from "../../../stores/products";

  export let fields;

  const dispatch = createEventDispatcher();

  export function setDefaultDv01 () {
    let s = 1;
    let dv01;
    if (fields.tenor.value && fields.tenor.value.length == 3) s = 2; 
    if ([5, 13].includes(products.nonFwd(fields.product))) { // AUD 6v3, NZD 6v3
      dv01 = 40 * s;
      /**
       * a Fed Funds OIS in which the floating leg will reference the Floating Rate Option
“USD-Federal Funds-H.15-OIS-COMPOUND”, payable annually on an ACT/360 basis, versus
an annual fixed rate leg payable on the same basis.
        a SOFR OIS in which the floating leg will reference the Floating Rate Option
“USD-SOFR-COMPOUND”, payable annually on an ACT/360 basis, versus an annual fixed
rate on the same basis. 
      */
    } else if ([17, 18, 27].includes(fields.product)) { // STIR GROUP: EFPSPS | SPS | SPS90
      dv01 = 1;
    } else if ([28, 29,30].includes(products.nonFwd(fields.product))){ // USD: SOFR SPREAD | IRS SWAPS | FF SWAPS
      dv01 = 1;
    } else {
      dv01 = 25 * s;
    }
    fields.dv01.set(dv01, dv01.toString());
  }

  function handleDv01Change (e) {
    if (parseFloat(e.detail) != parseFloat(fields.dv01.str)) fields.dv01.set(parseFloat(e.detail), e.detail);
    else fields.dv01.str = e.detail;
    dispatch("tenorSet", true);
  }

</script>

{#if !fields.interest && !products.isStir(fields.product) && !products.isUSD(fields.product)}
  <div class="container my_radio">
    <div style="width: calc(50% - 8px);">
      <TextInput
        value={fields.dv01.str}
        on:input={handleDv01Change}
        on:blur={(e) => {if (fields.dv01.str == '') {setDefaultDv01(); dispatch("tenorSet");}}}
        invalidText="Multiplier must be greater than 0 and less than 10000"
        style={"padding-right: 32px;"}
      >
        <svelte:fragment slot="labelText">
          <Tooltip class="vols_breakdown vols_breakdown_caret" triggerText="Dv01" direction="right">Dv01 Multiplier, please modify when needed.</Tooltip>
        </svelte:fragment>
      </TextInput>
    </div>
    <RadioButtonGroup bind:selected={fields.dv01_Currency} legendText="DV01 Currency">
      <RadioButton labelText={products.currency(fields.product)} value={products.currency(fields.product)} 
                    on:change={() => {fields.dv01_Currency = products.currency(fields.product); dispatch("tenorSet", true);}}/>
      <RadioButton labelText="USD" value={'USD'} on:change={() => {fields.dv01_Currency = "USD"; dispatch("tenorSet", true);}}/>
    </RadioButtonGroup>
  </div>
{/if}

<style>
.container {
  display: flex;
  gap: 16px;
}
</style>