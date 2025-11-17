'use strict';

import { writable, get } from 'svelte/store';

const calc_inputs = (
  function () {

    const { subscribe, set, update } = writable(null);

    let prev = {};

    const my_set = function (db_data) {
      // This function is called with an Array of calc_input objects on initialisation.  They have to
      // be grouped by product_id

      var store = {};

      for (let data of db_data) {
        // Get the array for this product_id

        prev[data.calculation_id] = {};

        const product_id = data.product_id;
        if (!store.hasOwnProperty(product_id)) {
          store[product_id] = [];
        }
        const the_calc_inputs = store[product_id];

        // Add the calc_input to the array.

        the_calc_inputs.push(data);
      }

      // Set the store with the new data.
      set.call(this, store);
    };

    const add = function (calc_input) {
      update(store => {
        if (!store.hasOwnProperty(calc_input[0].product_id)) {
          store[calc_input[0].product_id] = [];
        }
        store[calc_input[0].product_id].unshift(calc_input[0]);

        return store;
      });
    };

    const remove = function (id, pid) {
      update(store => {
        if (!store.hasOwnProperty(pid)) {
          store[pid] = [];
        }
        let list = store[pid];
        for (let i = 0; i < list.length; i++) {
          if (list[i].calculation_id == id) {
            store[pid].splice(i, 1);
            break;
          }
        }
        return store;
      });
    };

    const update_inputs = function (calc_input) {
      update(store => {
        if (!store.hasOwnProperty(calc_input[0].product_id)) {
          store[calc_input[0].product_id] = [];
        }
        let list = store[calc_input[0].product_id];
        for (let i = 0; i < list.length; i++) {
          if (list[i].calculation_id == calc_input[0].calculation_id) {
            store[calc_input[0].product_id][i].inputs = calc_input[0].inputs;
            break;
          }
        }
        return store;
      });
    };

    const getRecentId = function (pid) {
      let store = get(calc_inputs)[pid];
      let highestId = 0;
      for (let i of store) {
        if (i.calculation_id > highestId) {
          highestId = i.calculation_id;
        }
      }
      return highestId;
    };

    const getByProduct = function (pid) {
      let store = get(calc_inputs);
      return store[pid];
    };


    return {
      subscribe,
      get,
      add,
      set: my_set,
      remove,
      update_inputs,
      getByProduct,
      getRecentId,
    };

  }());

export default calc_inputs;
