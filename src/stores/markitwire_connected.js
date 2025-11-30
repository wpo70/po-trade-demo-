'use strict';

import { writable } from "svelte/store";
import config from "../../config.json";

const markitwire_connected = (function () {
  const { subscribe, set, update } = writable({
    connected: false,
    env : "prod",
    active: false
  });
  
  const _set_connection = function (connected) {
    update(store => {
      store.connected = connected;
      return store;
    });
  };
  const _set_env = function (env) {
    update(store => {
      store.env = env;
      return store;
    });
  };
  const _set_active = function (active) {
    update(store => {
      store.active = active;
      return store;
    });
  };
 
  return {
    subscribe,
    set,
    _set_connection,
    _set_env,
    _set_active,
  };
}());

export default markitwire_connected;