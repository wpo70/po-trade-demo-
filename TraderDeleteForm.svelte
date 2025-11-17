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

import orders from "./../../stores/orders";
import products from "./../../stores/products";
import traders from "./../../stores/traders";
import banks from "./../../stores/banks";

import websocket from "./../../common/websocket";
import {
  bidToString,
  toTenor,
  toPrice,
  toVolumeString
} from "../../common/formatting";

import { createEventDispatcher } from "svelte";

export let open = false;
export let trader_list = [];

const dispatch = createEventDispatcher();
let trader_orders = {};
let has_orders;
let checked;

// update the trader orders list whenever the trader is updated
$: {
  trader_list.forEach((trader) => {
    trader_orders[trader.trader_id] = orders.getOrdersByTrader(trader.trader_id);
  });
}

// whenever there are new orders added to the order store update the trader
// orders list
orders.subscribe(() => {
  trader_list.forEach((trader) => {
    trader_orders[trader.trader_id] = orders.getOrdersByTrader(trader.trader_id);
  });
});

// update has_orders whenever the trader orders are updated
$: has_orders = anyTradersHaveOrders(trader_orders);

function handleSubmit() {

  // get all the trader ids selected
  let trader_ids = trader_list.map((trader) => trader.trader_id);

  // delete all selected traders
  websocket.deleteTrader(trader_ids);

  // close the modal & dispatch an event
  open = false;
  dispatch('delete', { trader_ids: trader_ids });
}

// checks if any of the selected traders have orders
function anyTradersHaveOrders(orders) {
  return Object.values(orders)
    .flat(1)
    .length > 0;
}

// resets the form to its initial state
function resetForm() {
  checked = false;
  has_orders = false;
  trader_orders = {};
  trader_list = [];
}

</script>

<ComposedModal
  bind:open
  on:submit={handleSubmit}
  on:close={resetForm}>

  {#if has_orders}
    <ModalHeader
      label="Confirm Delete"
      title="The following traders have current outstanding orders."/>
  {:else}
    <ModalHeader
      label="Confirm Delete"/>
  {/if}

  <ModalBody>
    {#if has_orders}
      <p style:padding={'10px 0'}>
        Deleting these traders will also remove all of their current outstanding orders.
      </p>
      <DataTable
        size="medium"
        expandable
        batchExpansion
        headers={[
          {key: 'name', value: 'Name'},
          {key: 'bank', value: 'Bank'}
        ]}
        rows={trader_list.flatMap((trader) => {
          if (trader_orders[trader.trader_id].length <= 0) {
            return [];
          }

          return {
            id: trader.trader_id,
            name: traders.name(trader.trader_id),
            bank: banks.get(trader.bank_id).bank
          };
        })}>

        <svelte:fragment slot="expanded-row" let:row>
          <DataTable
            zebra
            size="medium"
            headers={[
              {key: 'currency', value: 'Currency'},
              {key: 'product', value: 'Product'},
              {key: 'bid', value: 'Bid'},
              {key: 'tenor', value: 'Tenor'},
              {key: 'price', value: 'Price'},
              {key: 'volume', value: 'Volume'},
            ]}
            rows={trader_orders[row.id].map((order) => {
              let order_is_old = new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0);
              return {
                id: order,
                currency: order.currency_code,
                product: products.name(order.product_id),
                bid: bidToString(order.bid).concat(order_is_old ? '❄️' : order.firm ? '' : ' ⛔'),
                tenor: toTenor(order.years),
                price: toPrice(order.price),
                volume: toVolumeString(order.volume).concat(order.isBelowMMP() ? ' ⚠️' : ''),
              }
            })}>

          </DataTable>
        </svelte:fragment>
      </DataTable>
    {/if}

    <h4 style:padding={'10px 0px'}>This action will remove the following traders:</h4>

    <UnorderedList style="padding-left: 10px;">
      {#each trader_list as trader}
        <ListItem>{banks.get(trader.bank_id).bank} {traders.name(trader.trader_id)}</ListItem>
      {/each}
    </UnorderedList>

    <Checkbox style="padding: 10px 0;" labelText="Confirm" bind:checked/>

  </ModalBody>

  <ModalFooter primaryClass="bx--btn--danger" primaryButtonText="Confirm" primaryButtonDisabled={!checked}/>
</ComposedModal>

<style>

</style>

