'use strict';

import { writable, get } from 'svelte/store';

const swaption_orders = (function () {

  const { subscribe, update } = writable({
    rows: [],
    last_added: 0,
  });

  const set_Swaptions = function (newTrades) {
    update(store => {
      store.last_added = newTrades.length - store.rows.length;
      store.rows = newTrades;
      return store;
    });
  };


  // this could be used to update the store with only the trades it is missing on refresh rather than simply resetting the entire store.
  const addSwaption = function (newOrder) {
    update(store => {
      store.last_added = 1;
      store.rows.push(newOrder);
      return store;
    });
  };

  const updateSwaption = function (updatedOrder) {
    update(store => {
      store.rows.forEach((trade, index) => {
        if(updatedOrder.order_id === trade.order_id) {
          store.rows[index] = updatedOrder;
          store.last_added = 0;
        }
      });
      return store;
    });
  };

  const getAllRBA = function () {
    const store = get(swaption_orders);
    return store.filter(trade => trade.rba);
  };

  const getAllStandard = function () {
    const store = get(swaption_orders);
    return store.filter(trade => !trade.rba);
  };
  const getTradeIdMax = function() {
    const store = get(swaption_orders);
    return Math.max(...store.rows.map(i => i.order_id));
  };
  return {
    subscribe,
    set_Swaptions,
    addSwaption,
    updateSwaption,
    getAllRBA,
    getAllStandard,
    getTradeIdMax
  };
}());

export default swaption_orders;
