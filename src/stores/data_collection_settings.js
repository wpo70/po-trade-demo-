'use strict';

import { writable } from "svelte/store";
import prices from "./prices";
import { refreshData } from "../common/pricing_models";

const data_collection_settings = (function () {
  const { subscribe, update } = writable({
    calcIRS: true,
    calcOIS: true,
    gateways: [],
  });

  const setCalcIRS = function (bool) {
    update(store => {
      store.calcIRS = bool;
      return store;
    });
    refreshData();
    prices.recalculateMids([1]);
  };

  const setCalcOIS = function (bool) {
    update(store => {
      store.calcOIS = bool;
      return store;
    });
    refreshData();
    prices.recalculateMids([3,20]);
  };

  const setGateways = function (list) {
    update(store => {
      store.gateways = list;
      return store;
    });
  };

  const addGateway = function (newGW) {
    update(store => {
      store.gateways.push(newGW);
      return store;
    });
  };

  const removeGateway = function (id) {
    update(store => {
      let index = 0;
      let found = false;
      for (let i = 0; i < store.gateways.length; i++) {
        if (store.gateways[i].id == id) {
          index = i;
          found = true;
          break;
        }
      }
      if (found) store.gateways.splice(index, 1);
      return store;
    });
  };

  const updateGateway = function (updates) {
    update(store => {
      for (let gw of store.gateways) {
        if (gw.id == updates.id) {
          delete updates.id;
          for (let key of Object.keys(updates)){
            gw[key] = updates[key];
          }
        }
      }
      return store;
    });
  };

  return {
    subscribe,
    setCalcIRS,
    setCalcOIS,
    setGateways,
    addGateway,
    removeGateway,
    updateGateway,
  };
} ());

export default data_collection_settings;