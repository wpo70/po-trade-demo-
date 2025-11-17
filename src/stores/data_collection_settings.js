'use strict';

import { get, writable } from "svelte/store";
import prices from "./prices";
import { refreshData } from "../common/pricing_models";

const data_collection_settings = (function () {
  const { subscribe, update } = writable({
    calcIRS: true,
    calcOIS: true,
    interpChoice: true,
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

  const setStraightInterp = function (bool) {
    update(store => {
      store.interpChoice = bool;
      return store;
    })
    refreshData();
  }
  
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

  const activeGatewayCount = function () {
    return get(data_collection_settings).gateways.filter(gw => gw.blp_connected).length;
  };

  return {
    subscribe,
    setCalcIRS,
    setCalcOIS,
    setStraightInterp,
    setGateways,
    addGateway,
    removeGateway,
    updateGateway,
    activeGatewayCount,
  };
} ());

export default data_collection_settings;