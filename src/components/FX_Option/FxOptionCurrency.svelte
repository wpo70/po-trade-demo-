<script>

  import { Button } from "carbon-components-svelte";
  import Close from "carbon-icons-svelte/lib/Close.svelte";
  import AddAlt from "carbon-icons-svelte/lib/AddAlt.svelte";

  import { createEventDispatcher } from 'svelte';
  import FxOptionOrderForm from "./FxOptionOrderForm.svelte";

  export let base_currency = '';
  export let term_currency = '';

  let length = 1;

  const dispatch = createEventDispatcher();

  const handleClose = () => dispatch('close');

  const handleAdd = () => length++;

</script>

<div class="fx-option__currency-container">
  <div style="display: flex">
    <h4 style = "padding-top: 10px; padding-left: 15px; padding-bottom: 5px;">{base_currency}/{term_currency}</h4>


    <Button class="fx-option__close-button"
      kind="ghost"
      icon={AddAlt}
      iconDescription="Add Row"
      on:click={handleAdd}/>

    <Button
      kind="ghost"
      icon={Close}
      iconDescription="Close"
      on:click={handleClose}/>
  </div>
  {#each Array(length) as _}
    <FxOptionOrderForm {base_currency} {term_currency}/>
  {/each}
</div>


<style>

.fx-option__currency-container {
  display: flex;
  position: relative;
  flex-direction: column;
  height: fit-content;
  background-color: var(--cds-layer);
}

:global(.fx-option__close-button) {
  margin-left: auto;
}

</style>

