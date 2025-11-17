'use strict';

import { writable } from "svelte/store";

const websocket = writable(true);

const markitwire = (function () {
  const { subscribe, set, update } = writable({
    connected: false,
    env : "prod",
    active: false
  });
  
  const updated_connection = function (connected) {
    update(store => {
      store.connected = connected;
      return store;
    });
  };
  const update_active = function (active) {
    update(store => {
      store.active = active;
      return store;
    });
  };
 
  return {
    subscribe,
    set,
    updated_connection,
    update_active,
  };
}());

export {
  websocket,
  markitwire,
};