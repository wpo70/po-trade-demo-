'use strict';

import { writable, get } from 'svelte/store';
import user from './user';

const preferences = (function () {
  const { subscribe, set, update } = writable([]);
  
  const getGlobalPrefs = function() {
    return getBrokerPrefs(999);
  };

  const getBrokerPrefs = function (broker_id) {
    // Get the broker preferences by ID.
    broker_id ??= user.get();    
    const arr = get(preferences);
    const prefs = arr.find(b => b.broker_id === broker_id);
    return prefs;
  };

  const updateBrokerPrefs = function (data) {
    // Update a brokers preferences using the given key (col header in db) and value (likely a json)
    let updated_prefs;
    update(store => {
      let prefs = getBrokerPrefs(data.broker_id);
      prefs[data.key] = data.value;
      updated_prefs = prefs;
      return store;
    });
    return updated_prefs;
  };

  const isFavourite = function (product_id, years, fwd) {
    if (fwd != null) years = [fwd].concat(years);
    let t_str = years.toString();
    if (!getBrokerPrefs().whiteboard_favourites?.[product_id]) { return false; }
    for (let fav of getBrokerPrefs().whiteboard_favourites[product_id]) {
      if (t_str === fav.toString()) { return true; }
    }
    return false;
  };
  
  return {
    subscribe,
    set,
    getGlobalPrefs,
    getBrokerPrefs,
    updateBrokerPrefs,
    isFavourite,
  };
}());
  
export default preferences;