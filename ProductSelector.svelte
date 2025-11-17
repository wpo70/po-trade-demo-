<script>
  import { RadioButton, RadioButtonGroup } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";
  import products from "../../../stores/products";
  import active_product from "../../../stores/active_product";
  import { convertDateToString, getEFPSPS_Dates, tenorToYear, toEFPSPSTenor } from "../../../common/formatting";

  export let fields;
  export let selected;
  export let product_options;

  const dispatch = createEventDispatcher();

  let prodChoice;
  $: changeProd(product_options);
  $: if (prodChoice != fields.product) changeProd(fields.product);

  function changeProd() {
    prodChoice = fields.product;
    fields.isFWD = products.isFwd(fields.product)
    if (fields.product == 18) { 
      fields.tenor.set(
        ['3m', '6m'].includes(fields.tenor.str) ? tenorToYear(fields.tenor.str) : tenorToYear('3m'), 
        ['3m', '6m'].includes(fields.tenor.str) ? fields.tenor.str :'3m'
      );
      fields.isFWD = !fields.specific;
    } else if ([17,27].includes(fields.product)) {
      fields.fwd.reset();
      fields.specific = true;
      if (!fields.start.str || toEFPSPSTenor(fields.start.str) == null) fields.start.str = convertDateToString(getEFPSPS_Dates()[0].date);
      fields.tenor.set(tenorToYear('3m'), toEFPSPSTenor(fields.start.str));
    };

    let p = fields.price.value;
    if (selected?.type == "indicator") {
      p = (fields.product == 2 || fields.product == 28)? selected.secondary_price : selected.price;
      p ? fields.price.set(p, (+p).toFixed(5)) : fields.price.reset();
    }
    if (selected == null) dispatch("setDefaultDv01");
    dispatch("tenorSet", true);
    fields.tenor.setProd(fields.product);
    fields.tenor.invalid = false;
  }
</script>

{#if $active_product != -1 && product_options?.length > 1 && !fields.opposingOrder}
  <div class="centered_container my_radio">
    <RadioButtonGroup bind:selected={fields.product}>
      {#each product_options as prod (prod)}
        <RadioButton 
            labelText={products.name(prod)} 
            value={prod}/>
      {/each}
    </RadioButtonGroup>
  </div>
{/if}

<style>

:global(.prod_container .bx--radio-button__label) {
  justify-content: left;
}
:global(.prod_container .bx--radio-button-group) {
  width: 100%;
}

</style>