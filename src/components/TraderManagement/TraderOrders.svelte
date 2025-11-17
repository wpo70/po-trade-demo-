<script>
import { DataTable, Modal } from "carbon-components-svelte";


import {
  toPrice,
  timestampToDateTime,
  toTenor,
  toVolumeString,
  bidToString,
} from './../../common/formatting.js';
import banks from "./../../stores/banks.js";
import brokers from "./../../stores/brokers.js";
import orders from "./../../stores/orders.js";
import products from "./../../stores/products.js";
import traders from "./../../stores/traders.js";

export let trader;
export let open;

let trader_orders = [];

$: trader_orders = trader ? orders.getOrdersByTrader(trader.trader_id) : [];

orders.subscribe(() => {
  trader_orders = trader ? orders.getOrdersByTrader(trader.trader_id) : [];
});

</script>

<div class="trader-orders-modal">
  <Modal
    passiveModal
    bind:open
    modalHeading={`${trader ? traders.name(trader.trader_id) : ''}'s Orders`}>
    {#if trader_orders.length > 0}
      <DataTable
        sortable
        zebra
        size="medium"
        headers={[
          {key: 'product', value: 'Product'},
          {key: 'time', value: 'Time'},
          {key: 'bid', value: 'Bid'},
          {key: 'tenor', value: 'Tenor'},
          {key: 'price', value: 'Price'},
          {key: 'volume', value: 'Volume'},
          {key: 'trader', value: 'Trader'},
          {key: 'bank', value: 'Bank'},
          {key: 'broker', value: 'Broker'},
          {key: 'currency_code', value: 'Currency'},
        ]}
        rows={
          trader_orders.map(order => {
            let order_is_old = new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0);
            return {
              id: order,
              product: products.name(order.product_id),
              time: timestampToDateTime(order.time_placed),
              bid: bidToString(order.bid).concat(order_is_old ? '❄️' : order.firm ? '' : ' ⛔'),
              tenor: toTenor(order.years),
              price: toPrice(order.price),
              volume: toVolumeString(order.volume).concat(order.isBelowMMP() ? ' ⚠️' : ''),
              trader: traders.name(order.trader_id),
              bank: banks.get(trader.bank_id).bank,
              broker: brokers.name(order.broker_id),
              currency_code: order.currency_code,
            }
          })
        }
      />
    {:else}
      <p>Trader has no orders</p>
    {/if}
  </Modal>
</div>

<style>

:global(.trader-orders-modal > .bx--modal > .bx--modal-container) {
  width: fit-content;
}

</style>
