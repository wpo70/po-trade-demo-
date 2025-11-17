<script>

import { Modal } from "carbon-components-svelte";
import SwaptionPriceOrderForm from "./SwaptionPriceOrderForm.svelte";

export let open = undefined;
export let copyOrderToForm = undefined;

let submit = () => '';

</script>

<Modal
  bind:open
  modalHeading="Swaption Order"
  primaryButtonText="Submit"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => open = false}
  on:close={() => copyOrderToForm(null)}
  on:submit={() => {
   if(submit()) {
     open = false;
   }
  }}>

  <SwaptionPriceOrderForm bind:submit bind:copyOrderToForm />

</Modal>

<style>

</style>
