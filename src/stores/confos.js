'use strict';

import { writable, get } from 'svelte/store';

const confos = (
  function () {

    const { subscribe, set, update } = writable([]);

    const add = function (confo) {
      update(store => {
        store.unshift(confo);
        return store;
      });
    };

    const update_confo = function (confo) {
      update(store => {
        let idx = store.findIndex((c) => c.confo_id == confo.confo_id);
        if (idx != -1) store[idx].confos = confo.confos;
        return store;
      });
    };

    const remove = function (ids) {
      update(store => {
        for (let id of ids){
          let idx;
          idx = store.findIndex(n => n.confo_id == id);
          if (idx != -1) {
            store.splice(idx, 1);
          }
        }
        return store;
      });
    };

    return {
      subscribe,
      get,
      set,
      add,
      remove,
      update_confo,
    };
  }());

export default confos;