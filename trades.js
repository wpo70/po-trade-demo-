'use strict';

import { writable, get } from 'svelte/store';

// Store for Past Trades

const trades = (function () {

  const { subscribe, update } = writable({
    rows: [],
    last_added: 0, // The number of trades that were last added. This is used to efficiently shift row expansions in the trade history table.
  });

  const set_trades = function (newTrades) {
    update(store => {
      store.last_added = newTrades.length - store.rows.length;
      store.rows = newTrades;
      return store;
    });
  };


  // this could be used to update the store with only the trades it is missing on refresh rather than simply resetting the entire store.
  const addTrade = function (newTrade) {
    update(store => {
      store.last_added = 1;
      store.rows.push(newTrade);
      return store;
    });
  };

  const updateTrade = function (updatedTrade) {
    update(store => {
      store.rows.forEach((trade, index) => {
        if(updatedTrade.trade_id === trade.trade_id) {
          store.rows[index] = updatedTrade;
          store.last_added = 0;
        }
      });
      return store;
    });
  };

  const isRBA = function(trade) {
    return (trade.product_id == 20);
  };

  const getAll_OIS = function() {
    const store = get(trades);
    return store.rows.filter(trade => [3, 20].includes(trade.product_id));
  };

  const getTradeIdMax = function() {
    const store = get(trades);
    return Math.max(...store.rows.map(i => i.trade_id));
  };
  
  const getTrade = function (id) {
    const store = get(trades);
    return store.rows.find(trade => trade.trade_id == id);
  };

  return {
    subscribe,
    set_trades,
    addTrade,
    updateTrade,
    isRBA,
    getAll_OIS,
    getTradeIdMax,
    get: getTrade,
  };
}());

export default trades;
