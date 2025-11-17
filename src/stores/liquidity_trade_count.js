'use strict';

import { writable } from 'svelte/store';

const trade_count = (function () {

  const { subscribe, update } = writable({
    total: 0,
    monthly: 0,
    daily: 0,
    pending: 0,
  });

  const setAll = async function (counts) {
    update(store => {
      store.total = counts.total;
      store.monthly = counts.monthly;
      store.daily = counts.daily;
      store.pending = counts.pending;
      return store;
    });
  };

  const setTotal = function (count) {
    update(store => {
      store.total = count;
      return store;
    });
  };

  const setMonthly = function (count) {
    update(store => {
      store.monthly = count;
      return store;
    });
  };

  const setDaily = function (count) {
    update(store => {
      store.daily = count;
      return store;
    });
  };

  const setPending = function (count) {
    update(store => {
      store.pending = count;
      return store;
    });
  }; 

  return {
    subscribe,
    setTotal,
    setMonthly,
    setDaily,
    setPending,
    setAll,
  };
}());

export default trade_count;
