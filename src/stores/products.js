'use strict';

// Products are largely unchanging structures.  The products to be
// traded.  Product_id is used to index the data within orders, prices
// and quotes.  Calling set on the products store also initialises
// orders and prices with empty structures.  Also set the active
// product to be the first product.

import { writable, get } from 'svelte/store';
import orders from './orders.js';
import prices from './prices.js';
import tradess from './tradess.js';
import filters from './filters.js';
import active_product from './active_product.js';
import preferences from './preferences.js';
import user from './user.js';

export var selection_by_product;

const products = (
  function () {
    const { subscribe, set } = writable([]);

    const mySet = function (db_data) {
      var i;

      // Initialise the products store.

      set.call(this, db_data);

      // Initialise empty structures for orders, prices and the
      // selection of orders.  There is one array of orders for each
      // product.

      const server_orders = {};
      const client_prices = {};
      const client_trades = {};
      selection_by_product = {};
      const client_filters = [];
      const n = db_data.length;

      let myPref = preferences.getBrokerPrefs(user.get()).width_filters;

      for (i = 0; i < n; i++) {
        server_orders[db_data[i].product_id] = [];
        client_prices[db_data[i].product_id] = [[], [], []];
        client_trades[db_data[i].product_id] = [];
        selection_by_product[db_data[i].product_id] = [];
        client_filters[db_data[i].product_id] = {
          nonfirm: myPref[db_data[i].product_id].non_firm,
          interests: myPref[db_data[i].product_id].interests,
          wf: myPref[db_data[i].product_id].filter,
          wf_outrights: !myPref[db_data[i].product_id].legs_only,
          width_filter: {
            value: myPref[db_data[i].product_id].width,
            min: 0,
            max: 0.5,
            step: 0.05,
            dps: 2,
          }
        };
      }
      // Live Orders Filters
      client_filters[0] = {
        nonfirm: myPref[0]?.non_firm,
        interests: myPref[0]?.interests,
        wf: myPref[0]?.filter,
        wf_outrights: !myPref[0]?.legs_only,
        width_filter: {
          value: myPref[0]?.width,
          min: 0,
          max: 0.5,
          step: 0.05,
          dps: 2
        }
      };

      orders.set(server_orders);
      prices.set(client_prices);
      tradess.set(client_trades);
      filters.set(client_filters);
      active_product.set(db_data[0].product_id);
    };

    const name = function (product_id) {
      const arr = get(products);
      const p = arr.find(p => p.product_id === product_id);

      return (typeof p === 'undefined') ? "" : p.product;
    };

    const currency = function (product_id) {
      const arr = get(products);
      const c = arr.find(p => p.product_id === product_id);
      return (typeof c === 'undefined') ? "" : c.currency_code;
    };

    // Function to get an array of the product_ids.

    const ids = function () {
      const arr = get(products);
      const ids = arr.map(p => p.product_id);
      return ids;
    };

    const isXccy = function (product_id) {
      if ((product_id || 0) <= 0) return false;
      return [7, 8, 9, 15, 16, 22, 26].includes(product_id);
    };
    const isBasisSwap = function (product_id) {
      if ((product_id || 0) <= 0) return false;
      return [4,5,6,11,12,13,23,24,25,31,32].includes(product_id);
    }

    const isUSD = function (product_id) {
      if ((product_id || 0) <= 0) return false;
      return [28,29,30,31,32].includes(product_id);
    }

    const isNZD = function (product_id) {
      if ((product_id || 0) <= 0) return false;
      return [10, 11, 12, 13,14].includes(product_id);
    };

    const fwdOf = function (product_id) {
      if ((product_id || 0) <= 0) return null;
      const arr = get(products);
      const r = arr.find(p => p.product_id === product_id);
      return r?.fwds_id;
    };

    const nonFwd = function (product_id) {
      if ((product_id || 0) <= 0) return null;
      const arr = get(products);
      const r = arr.find(p => p.fwds_id === product_id);
      return r ? r.product_id : product_id;
    };
    
    const isFwd = function (product_id) {
      if ((product_id || 0) <= 0) return false;
      return getFwdProducts().includes(product_id);
    };

    const isPercentageProd = function (pid, years = [0]) {
      return years?.length == 1 && [1,3,10,14,18,20].includes(pid);
    };

    const isStir = function (pid) {
      return [17,18,27].includes(pid);
    };

    const isRollingProd = function (pid) {
      return [17,18,20,27].includes(pid);
    };

    const isFuturesProd = function (pid) {
      return [2,17].includes(pid);
    };

    const next = function (current_id) {
      // Return the next product ID after the given one

      const product_ids = ids();
      let id = product_ids.indexOf(current_id);
      if (id < 0) {
        id = 0;
      } else {
        if (id < product_ids - 1) id++;
      }

      return id;
    };

    const prev = function (current_id) {
      // Return the previous product ID before the given one

      const product_ids = ids();
      let id = product_ids.indexOf(current_id);
      if (id < 0) {
        id = 0;
      } else {
        if (id > 0) id--;
      }

      return id;
    };

    const getFwdProducts = function () {
      return get(products).map(prod => {
        if (prod.fwds_id) { return prod.fwds_id; }
      });
    };

    return {
      subscribe,
      set: mySet,
      name,
      currency,
      ids,
      isXccy,
      isBasisSwap,
      isUSD,
      isNZD,
      fwdOf,
      nonFwd,
      isFwd,
      next,
      prev,
      getFwdProducts,
      isPercentageProd,
      isStir,
      isRollingProd,
      isFuturesProd,
    };
  }());

export default products;
