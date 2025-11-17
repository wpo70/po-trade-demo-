'use strict';

import { get, writable } from 'svelte/store';

/**
 * @typedef {Object} SwaptionMarketStructure
 * @property {number} id
 * @property {string} option_expiry
 * @property {string} swap_term
 * @property {string} strike
 * @property {string} option_type
 * @property {string} bid_price
 * @property {string} offer_price
 * @property {string} bid_volume
 * @property {string} offer_volume
 */

const swapation_market_structures = (function() {
  const { subscribe, set, update } = writable([]);

  /**
   * Adds a new structure to the store.
   * @param {SwaptionMarketStructure} val
   */
  const add = (val) => {
    if (!get(swapation_market_structures)) set([]);
    update(store => {
      if (Array.isArray(val)) {
        store.push(...val);
      } else {
        store.push(val);
      }
      return store;
    });
  };

  /**
   * Removes a structure with the id.
   * @param {number} ids
   */
  const remove = (ids) => {
    update(store => {
      for (let id of ids) {
        const idx = store.findIndex(el => el.id === id);
        if (idx === -1) {
          return store;
        }
        store.splice(idx, 1);
        return store;
      }
    });
  };

  /**
   * Updates the structure with the same id with the passed in value.
   * @param {SwaptionMarketStructure[]} arr
   */
  const updateValue = (arr) => {
    update(store => {
      for (let val of arr) {
        const idx = store.findIndex(el => el.id === val.id);
        if (idx === -1) {
          return store;
        }

        store[idx] = val;
      }
      return store;
    });
  };

  return {
    subscribe,
    set,
    add,
    remove,
    update: updateValue
  };
}());

export default swapation_market_structures;
