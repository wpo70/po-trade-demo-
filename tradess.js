'use strict';

import { writable } from 'svelte/store';

// recently_removed is a hack to stop trades from jumping around on the trades view
// It is used to detect trades that have been updated, rather than just removed

const tradess = (
  function () {
    // Set the trades to null temporarily.  It will re-initialised
    // with an empty structure by the products store when the products
    // are defined.

    const { subscribe, set, update } = writable(null);

    let _trades_index;

    // Initialise the store with an empty structure.  This is done by the
    // products store when it is initialized

    const my_set = function (v) {
      set(v);
      _trades_index = [];
    };

    const add = function (new_tradess) {
      // Add new trades to the store. return a list of inserted trades

      update((store) => {
        // Loop over all new trades

        for (let trades of new_tradess) {
          store[trades.product_id].unshift(trades);
        }

        return store;
      });

      // Also maintain the index of prices.  The merge must be done in place -
      // _trade_index cannot be re-assigned.

      for (let trades of new_tradess) {
        _trades_index.push(trades);
      }
    };

    const remove = function (trades_list) {
      // Remove trades from the store

      update(store => {
        // Loop over the trades

        let a, x;
        for (let trades of trades_list) {
          // Get the array that the trades belongs to by product_id
          // Find position in the array and remove it

          a = store[trades.product_id];
          x = a.indexOf(trades);
          a.splice(x, 1);
        }

        return store;
      });

      // Remove the trades from the index

      for (let trades of trades_list) {
        let x = _trades_index.indexOf(trades);
        _trades_index.splice(x, 1);
      }
    };

    const updateOrder = function (order, key) {
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
        // Get all trades that contain the updated order

        let trades_with_order = containsOrder([order]);

        // Update the appropriate trades fields
        
        for (let trades of trades_with_order) {
          if (key === 'firm' || key === 'broker_id') continue;

          if (key === 'volume') {
            // Recalculate trade volumes

            trades.recalculateTradeVolumes();
          }
        }

        return store;
      });
    };

    const sort = function (product_id) {
      // Sort the trades by their time created, oldest first

      const compare = function (a, b) {
        if (a.getTimestamp() < b.getTimestamp()) return -1;
        if (a.getTimestamp() > b.getTimestamp()) return 1;
        return 0;
      };

      update(store => {
        // Get the array of trades that is to be sorted

        let a = store[product_id];
        a.sort(compare);

        return store;
      });
    };

    // Check if a trade contains the given orders
    const containsOrder = function (order_list) {
      let trades_list = [];

      for (let trades of _trades_index) {
        for (let trade of trades.trades) {
          let found = false;
          if (trade.offers.some(o => order_list.includes(o))) found = true;
          if (trade.bids.some(o => order_list.includes(o))) found = true;
          if (found) {
            trades_list.push(trades);
            break;
          }
        }
      }

      return trades_list;
    };

    return {
      subscribe,
      set: my_set,
      add,
      remove,
      updateOrder,
      sort,
      containsOrder
    };
  }());

export default tradess;
