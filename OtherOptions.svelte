<script>
  import { Checkbox, Column, Grid, RadioButton, RadioButtonGroup, Row } from "carbon-components-svelte";
  import { createEventDispatcher } from "svelte";

  export let fields;
  
  const dispatch = createEventDispatcher();

</script>

<div class="centered_container my_radio">
  <RadioButtonGroup bind:selected={fields.offer_selector} disabled={fields.opposingOrder}>
    <RadioButton labelText="Offer" value={'offer'} />
    <RadioButton labelText="Bid" value={'bid'} />
    <RadioButton labelText="Two way" value={'two'} />
  </RadioButtonGroup>
</div>

<div class="checkbox_container">
  <Checkbox 
    bind:checked={fields.interest} 
    labelText="Express Interest" 
    disabled={fields.opposingOrder} 
    on:check={() => dispatch('tenorSet')}/>
  <Checkbox 
    bind:checked={fields.firm} 
    labelText="Firm" 
    disabled={fields.opposingOrder || fields.interest}/>
</div>

<style>
.checkbox_container {
  align-items: center;
  justify-content: center;
  display: flex;
  gap: 16px;
}
</style>