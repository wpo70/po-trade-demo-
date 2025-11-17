<script>
  import { onMount } from 'svelte';
  import OrderForm from './OrderForm/OrderForm.svelte';
  import DraggableModal from "./Utility/DraggableModal.svelte";
  
  import active_product, { view } from '../stores/active_product';
  
  export let selected = null; 
    
  let qoc_div;
  onMount(() => {
    qoc_div.addEventListener('mousewheel', (e) => {e.stopPropagation();}, false);
  });
  
  let show_form = false;

  export const qorder = {
    open() {
      show_form = true;
    },
  };

  $: close($active_product, $view);

  function close() {
    show_form = false;
  }

</script>

<div class="modals_qof">
  <DraggableModal
    bind:open={show_form}
    heading = {`Order Form`}
    >
    <svelte:fragment slot="body">
      <div id="quick-order-content" bind:this={qoc_div}>
        <OrderForm on:server_error on:order_updated={() => {show_form = false}} {selected}/>
      </div>
    </svelte:fragment>
  </DraggableModal> 
</div>

<style>
:global(.modals_qof .bx--modal-container) {
  width: fit-content;
  padding-bottom: 15px;
}
:global(.modals_qof .bx--modal-content) {
  max-height: fit-content;
  margin-bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>