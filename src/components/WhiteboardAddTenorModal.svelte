<script>
  import { createEventDispatcher, onMount } from 'svelte';

  import { Modal, TextInput } from 'carbon-components-svelte';
  import { ContentSwitcher, Switch } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import AddAlt from "carbon-icons-svelte/lib/AddAlt.svelte";

  import Validator from '../common/validator';
  import { addWhiteboardTenor, addWhiteboardGlobal } from '../common/pref_handler';
  import { shapeToStr, tenorToYear } from "../common/formatting.js";
  import { Button } from "carbon-components-svelte";
  import products from '../stores/products';
  import user from '../stores/user';
  import brokers from '../stores/brokers.js';
  import DraggableModal from './DraggableModal.svelte';
  import active_product from '../stores/active_product';
  

  const dispatch = createEventDispatcher();

  export let product_id;
  export let open = false;
  export let global_add = true;
  export let force_tenor_length = 0;

  $: isFWD = products.isFwd(product_id);
  
  $: permission = user.getPermission($brokers);
  $: global_tenor_change = global_add && permission?.["Edit Global Preferences"];
  $: selectedIndex = !global_tenor_change ? 1 : 0; 
  
  let tenor_to_add = new Validator(product_id);
  let fwd_to_add = new Validator(product_id);

  function handleAddTenor() {
    tenor_to_add.dirty = true;
    fwd_to_add.dirty = true;
    tenor_to_add.setProd(product_id);
    fwd_to_add.setProd(product_id);
    tenor_to_add.invalid = tenor_to_add.isInvalid(Validator.scanTenor);
    if (force_tenor_length && tenor_to_add.value && tenor_to_add.value.length != force_tenor_length) {
      tenor_to_add.invalid = true;
      tenor_to_add.error_message = "Wrong shape. Expected: " + shapeToStr(force_tenor_length-1);
    }
    fwd_to_add.invalid = fwd_to_add.isInvalid(Validator.scanFwd);
    if (fwd_to_add.value + tenor_to_add.value?.[0] > 30) {
      fwd_to_add.invalid = true;
      fwd_to_add.error_message = "Combined tenor cannot exceed 30yrs";
    }
    if (tenor_to_add.invalid || isFWD && fwd_to_add.invalid) {
      return;
    } 
    global_tenor_change ?
      addWhiteboardGlobal(product_id, tenor_to_add.value, fwd_to_add.value):
      addWhiteboardTenor(product_id, tenor_to_add.value, fwd_to_add.value);
    open = false;
    dispatch("added", {years: tenor_to_add.value, fwd: fwd_to_add.value});
    tenor_to_add.reset();
    fwd_to_add.reset();
  }

  $:closeform($active_product);

  function closeform(){
    open = false;
  }
</script>



<DraggableModal
  bind:open
  heading={`Add ${products.name(product_id)} Tenor to the Whiteboard`}
  style="width: 575px;"
  is_editable = true
  on:close={() => {tenor_to_add.dirty = true; tenor_to_add.reset(); fwd_to_add.dirty = true; fwd_to_add.reset();}}>
  <svelte:fragment slot="body">
    <div class="tenor_modal_body">
      <ContentSwitcher bind:selectedIndex style="margin: 10px 0px;">
        <Switch disabled={!global_add || !permission["Edit Global Preferences"]} on:click={() => {global_tenor_change = true;}}>
          <div style="display: flex; align-items: center;">
            <AddAlt style="margin-right: 0.5rem;" /> Global
          </div>
        </Switch>
        <Switch on:click={() => {global_tenor_change = false;}}>
          <div style="display: flex; align-items: center;">
            <Add style="margin-right: 0.5rem;" /> Personal
          </div>
        </Switch>
      </ContentSwitcher>
      <div role = "presentation" style="margin-top: 25px; display:grid; gap:25px; grid-template-columns:150px auto; align-items:center;" on:keypress|stopPropagation>
        <h5 style="text-align:right">Tenor to be added:</h5>
        <TextInput
          placeholder="Enter the tenor you would like to add to the defaults" 
          bind:value={tenor_to_add.str}
          bind:dirty={tenor_to_add.dirty}
          bind:invalid={tenor_to_add.invalid}
          invalidText={tenor_to_add.error_message}
          />
        {#if isFWD}
          <h5 style="text-align:right">Fwd:</h5>
          <TextInput
            placeholder="Enter the associated forward for the tenor"
            bind:value={fwd_to_add.str}
            bind:dirty={fwd_to_add.dirty}
            bind:invalid={fwd_to_add.invalid}
            invalidText={fwd_to_add.error_message}
            />
        {/if}
      </div>
    </div>
  </svelte:fragment>
  <svelte:fragment slot='footer'>
    <div class="tenor_modal_footer">
      <Button
      on:click={handleAddTenor}
      >
      {global_tenor_change ? "Add Tenor For Everyone" : "Add Tenor"}
      </Button>
    </div>
  </svelte:fragment>
</DraggableModal>


<style>
  :global(.tenor_modal_body .bx--content-switcher-btn:disabled) {
    border-color: var(--cds-disabled-02);
  }

  :global(.tenor_modal_footer .bx--btn){
    width: -webkit-fill-available;
    max-width: none !important;
  }
</style>

