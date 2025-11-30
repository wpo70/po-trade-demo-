'use strict';

import { writable, get } from 'svelte/store';
import websocket from '../common/websocket';
import user from './user';

const confos = (
  function () {

    const { subscribe, set, update } = writable([]);

    const mySet = function (db_data) {

      var store = [];
      for (let data of db_data) {
        store.unshift(data);
      }

      // Set the store with the new data.
      set.call(this, store);
      purge();
    };

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

    const purge = function () {
      let confosArr = get(confos);
      let removeList = [];
      for (let c of confosArr) {
        if (new Date(c.time_submitted).getTime() < (new Date().getTime() - 30*60*1000)) {
          removeList.push(c.confo_id);
        }
      }
      if (removeList.length > 0) websocket.deleteConfos(removeList);
    }

    return {
      subscribe,
      get,
      set: mySet,
      add,
      remove,
      purge,
      update_confo,
    };
  }());

export default confos;