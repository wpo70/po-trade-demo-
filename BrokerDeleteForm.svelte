<script>
import {
  DataTable,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  UnorderedList,
  ListItem
} from "carbon-components-svelte";

import brokers from "../stores/brokers";

import websocket from "../common/websocket";

import { createEventDispatcher } from "svelte";

export let open = false;
export let broker_list = [];

const dispatch = createEventDispatcher();

let checked;

function handleSubmit() {

  // get all the broker ids selected
  let broker_ids = broker_list.map((broker) => broker.broker_id);

  // delete all selected brokers
  websocket.deleteBroker(broker_ids);

  // close the modal & dispatch an event
  open = false;
  dispatch('delete', { broker_ids: broker_ids });
}

// checks if any of the selected brokers have orders

// resets the form to its initial state
function resetForm() {
  checked = false;
  broker_list = [];
}

</script>

<ComposedModal
  bind:open
  on:submit={handleSubmit}
  on:close={resetForm}>

    <ModalHeader
      label="Confirm Delete"/>
 

  <ModalBody>


    <h4 style:padding={'10px 0px'}>This action will remove the following brokers:</h4>

    <UnorderedList style="padding-left: 10px;">
      {#each broker_list as broker}
        <ListItem> {brokers.name(broker.broker_id)}</ListItem>
      {/each}
    </UnorderedList>

    <Checkbox style="padding: 10px 0;" labelText="Confirm" bind:checked/>

  </ModalBody>

  <ModalFooter primaryClass="bx--btn--danger" primaryButtonText="Confirm" primaryButtonDisabled={!checked}/>
</ComposedModal>

<style>

</style>

