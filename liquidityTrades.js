'use strict';

import { writable } from 'svelte/store';

// Store for Past Trades

const liquidityTrades = (function () {

  const { subscribe, update } = writable({
    rows: [],
    last_added: 0,  // The number of trades that were last added. This is used to efficiently shift row expansions in the trade history table.
  });

  function format(Trades) {
    // convert data stored as JSON string to object fields
    for(const idx in Trades){
      Object.assign(Trades[idx], JSON.parse(Trades[idx].data));
      delete Trades[idx].data;
    }
    return Trades;
  }

  const set_trades = function (newTrades) {
    // convert data stored as JSON string to object fields
    newTrades = format(newTrades);

    // set the store
    update(store => {
      store.last_added = newTrades.length - store.rows.length;
      store.rows = newTrades;
      return store;
    });
  };

  return {
    subscribe,
    set_trades,
  };
}());

export default liquidityTrades;
