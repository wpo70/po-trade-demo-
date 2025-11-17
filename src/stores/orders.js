'use strict';

// Orders is constantly updated from the server.  It will be
// initialised with every order in one go.  Then it will be updated
// with single orders as the brokers enter them.

/* 
Navigate the orders like this:

order = orders[product_id][<integer>];
*/

import { writable, get } from 'svelte/store';
import websocket from '../common/websocket';
import traders from './traders';
import ocos from './ocos';

const orders = (
  function () {
    // Set the orders to null temporarily.  It will re-initialised
    // with an empty structure by the products store when the products
    // are defined.

    const { subscribe, set, update } = writable(null);

    const getOrdersOnly = function () {
      // Returns all orders, emitting interests

      const store = get(this);
      let orders = {};
      for(let prodId in store){
        const prod = store[prodId];
        orders[prodId] = [];
        for(let object of prod){
          if(!object.eoi)
            orders[prodId].push(object);
        }
      }
      return orders;
    };

    const getInterestsOfProduct = function (productId) {
      // Returns all interests, emitting orders

      const store = get(this);
      const interests = [];
      for(let object of store[productId]){
        if(object.eoi)
          interests.push(object);
      }
      return interests;
    }; 

    const getOrder = function (order_id, include_interests=false) {
      // Return a single order from the store with matching order_id
      let store;
      if(include_interests) { store = get(orders); }
      else { store = orders.getOrdersOnly(); }
      let arr, order;
      let prods = Object.keys(store);
      for (let p_id of prods) {
        arr = store[p_id];
        order = arr.find(o => o.order_id === order_id);
        if (order) return order;
      }
      return null;
    };

    const getOrdersByTrader = function (trader_id, include_interests=false) {
      let store;
      if(include_interests) 
        store = get(orders);
      else
        store = orders.getOrdersOnly();

      return Object.keys(store)
        .flatMap((product_id) =>
          store[product_id].filter((o) => o.trader_id === trader_id));
    };

    const getOrdersByProduct = function (productId, include_interests=false) {
      let arr;
      if(include_interests) 
        arr = get(orders);
      else
        arr = orders.getOrdersOnly();
      return arr[productId];
    };

    const add = function (order) {
      // Add a single order to the store.  The orders are stored, by
      // product, in a flat array, newest first, oldest
      // last.

      update(store => {
        store[order.product_id].unshift(order);
        return store;
      });
    };

    const remove = function (order_ids) {
      // Remove one or more orders identified by their IDs.  Return a list of the orders that were removed.

      let order_list = [];

      // Remove the orders from the store.

      update(store => {
        let x;
        // Get all of the product keys.

        let prods = Object.keys(store);

        // Loop over the orders.

        for (let order_id of order_ids) {
          // Loop over the products.

          for (let product_id of prods) {

            // Get the array that the order might belong to.  See if the
            // order is in the array and remove it.

            let a = store[product_id];
            x = a.findIndex((o) => o.order_id === order_id);
            if (x >= 0) {
              order_list.push(a[x]);
              a.splice(x, 1);
              break;
            }
          }

          // If the loop ends and x < 0 it means the order_id was not found.  Throw an exception.

          if (x < 0) {
            console.error('Tried to remove non-existent order', order_id);
          }
        }

        // Update the store with the returned value.

        return store;
      });

      // Return a list of the orders that were deleted.

      return order_list;
    };

    const updateOrder = function (order_id, key, value) {
      let updated_order;

      // NOTE: call this function with care
      // it should only be used to update keys that can be updated directly
      // Reject updates for keys that require deletion/reinsertion

      if (
        key === 'product_id' ||
        key === 'bid' ||
        key === 'years' ||
        key === 'price' ||
        key === 'trader_id' ||
        key === 'time_placed' ||
        key === 'time_closed'
      ) {
        throw new Error('Tried to update invalid order key: ', key);
      }

      update(store => {
        // Get the order that is to be updated
        let o = getOrder(order_id);
        o[key] = value;
        updated_order = o;
        return store;
      });

      return updated_order;
    };

    /**
     * Called when a trade is completed. Remove associated orders if the ticket/s are marked as oco
     * @params tickets
    */
    const removeOCOOrders = function (tickets) {
      let oco_orders_set = new Set();
      for (let t of tickets) {
        let offer_oco = ocos.isOCO(t.bic_offer.bank_id, t.product_id);
        if (offer_oco) { ocos.setOCO(t.bic_offer.bank_id, t.product_id, false); }
        let bid_oco = ocos.isOCO(t.bic_bid.bank_id, t.product_id);
        if (bid_oco) { ocos.setOCO(t.bic_bid.bank_id, t.product_id, false); }
        let oco_orders_ = getOrdersByProduct(t.product_id)
          .filter(i =>
            (traders.get(i.trader_id).bank_id === t.bic_bid.bank_id && bid_oco) || 
            (traders.get(i.trader_id).bank_id === t.bic_offer.bank_id && offer_oco))
          .map(({order_id}) => order_id);
        // Adding oco orders to the set
        oco_orders_.forEach(i => oco_orders_set.add(i));
        // Excluding the main orders
        oco_orders_set.delete(t.offer.order_id);
        oco_orders_set.delete(t.bid.order_id);
      }
      if (oco_orders_set.size !== 0 ) websocket.deleteOrders(Array.from(oco_orders_set));
    };

    return {
      subscribe,
      get: getOrder, 
      getOrdersByProduct,
      set,
      add,
      remove,
      updateOrder,
      getOrdersByTrader,
      getOrdersOnly,
      getInterestsOfProduct,
      removeOCOOrders
    };
  }());

export default orders;
