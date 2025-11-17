<script>
  /**
    This Component is designed to be an exact substitute for a Carbon Svelte Modal; anything that 
    can be done to/with said Modal, can be applied to this component near identically
  */
  import { onMount } from "svelte";
  import { Modal } from "carbon-components-svelte";

  export let open = false;

  export let ref;

  onMount(() => {
    Array.from(ref.getElementsByClassName("ucm_nokey")).forEach(el => {
      el.addEventListener("keydown", (e) => {if (e.keyCode == 27) {e.stopPropagation();}}, true); // Used to stop escape key from exiting modal
      el.addEventListener("keypress", (e) => {e.stopPropagation();}); // Used to stop page change keys from functioning
    });
  });

</script>


<div bind:this={ref} class="unclosable_modal {$$restProps.class}">
  <Modal
      bind:open
      class="ucm_nokey"
      preventCloseOnClickOutside
      {...$$restProps}
      on:open
      on:close
      on:keydown
      on:click
      on:click:button--primary
      on:click:button--secondary
      on:mouseover
      on:mouseenter
      on:mouseleave
      on:transitioned
      on:submit
    >
    <slot />
  </Modal>
</div>


<style>
  :global(.unclosable_modal  .bx--modal-container) {
    width: 40rem;
  }
  :global(.unclosable_modal .bx--modal-header){
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 1rem;
    margin-bottom: 0;
  }
  :global(.unclosable_modal .bx--modal-header__heading){
    font-weight: bold;
    font-size: 35px;
  }
  :global(.unclosable_modal .bx--modal-content){
    display: flex;
    justify-content: center;
    margin: 2rem;
    padding-top: 0;
  }
  :global(.unclosable_modal .bx--modal-close){
    display: none;
  }
  :global(.unclosable_modal .bx--modal-footer .bx--btn){
    justify-content: center;
    padding: 0;
    font-weight: bold;
  }
</style>