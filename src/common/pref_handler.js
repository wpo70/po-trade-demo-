'use strict';

import { addToast } from "../stores/toast";
import preferences from "../stores/preferences";
import prices from "../stores/prices";
import user from "../stores/user";
import websocket from "./websocket";

function errToast(msg, type) {
  addToast ({
    message: msg,
    type: type,
    dismissible: true,
    timeout: 5000,
  });
}

export async function addWhiteboardTenor(product_id, years, fwd) {
  if (fwd != null) { years = [fwd].concat(years); }
  else if (!Array.isArray(years)) { years = [years]; }
  let t_str = years.toString();
  let prefs = preferences.getBrokerPrefs().whiteboard_tenors;
  let changed = false;
  try {
    // determine if adding of tenor is valid
    // check not in broker remove list
    for (let [idx, b_r] of prefs[product_id].remove.entries()) {
      if (t_str != b_r.toString()) { continue; }
      prefs[product_id].remove.splice(idx, 1);
      changed = true;
    }
    // check brokers adds, splice if found in removes and update array
    for (let b_a of prefs[product_id].add) {
      if (t_str != b_a.toString()) { continue; }
      if (changed) {
        throw { name: "info", message: "This tenor has been removed from your own remove list" };
      } else {
        throw new Error("You have already added this tenor to the whiteboard");
      }
    }
    // if we've made it this far, its not in brokers adds, so check it's not in the global adds like above
    for (let g_a of preferences.getGlobalPrefs().whiteboard_tenors[product_id].add) {
      if (t_str != g_a.toString()) { continue; }
      if (changed) {
        throw { name: "info", message: "This tenor has been removed from your own remove list" };
      } else {
        throw new Error("This tenor is already part of the globally available list, so should be listed already");
      }
    }
    // if we've made it this far, there's no matches causing the adding to be invalid, so add the tenor to the array
    changed = true;
    prefs[product_id].add = [...prefs[product_id].add, years];  
  } catch (err) {
    if (err.name == "info") {
      errToast(err.message, "info");
    } else {
      errToast(err.message, "error");
    }
  } finally {
    // then update the store and db
    if (changed) {
      websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_tenors', value: prefs});
      if (product_id == 18) { prices.modifyStructure18(years, true); }
      prices.defaultPrices(product_id);
      prices.sort(product_id);
    }
  } 
}

export async function addWhiteboardGlobal(product_id, years, fwd) {
  if (fwd != null) { years = [fwd].concat(years); }
  else if (!Array.isArray(years)) { years = [years]; }
  let t_str = years.toString();
  let prefs =  preferences.getBrokerPrefs().whiteboard_tenors;
  let g_prefs = structuredClone(preferences.getGlobalPrefs().whiteboard_tenors);
  let index = null;
  try{
    for (let [idx, b_r] of prefs[product_id].remove.entries()) {
      if (t_str != b_r.toString()) { continue; }
      index = idx;
      prefs[product_id].remove.splice(index, 1);
      websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_tenors', value: prefs});
    }
    for (let g_a of g_prefs[product_id].add) {
      if (t_str != g_a.toString()) { continue; }
      if (index === null) {
        throw new Error("This tenor is already part of the globally available list");
      } else {
        throw { name: "info", message: "This tenor has only been removed from your own remove list as it is already globally listed." };
      }
    } 
    g_prefs[product_id].add = [...g_prefs[product_id].add, years];
    websocket.updateBrokerPrefs({broker_id: 999, key: 'whiteboard_tenors', value: g_prefs});
    websocket.updateWhiteboardGlobal({product_id: product_id, years: years, change: "add"});
  } catch (err) {
    if (err.name == "info") {
      errToast(err.message, "info");
    } else {
      errToast(err.message, "error");
    }
  } finally {
    if (product_id == 18) { prices.modifyStructure18(years, true); }
    prices.defaultPrices(product_id);
    prices.sort(product_id);
  }
}

/** This function should only be called after it has been determined there is no price currently 
 *  attached to the given tenor, as this function presumes this has been done.
 */
export async function removeWhiteboardTenor(product_id, years, fwd) {
  if (fwd != null) { years = [fwd].concat(years); }
  let t_str = years.toString();
  let prefs = preferences.getBrokerPrefs().whiteboard_tenors;
  let g_prefs = preferences.getGlobalPrefs().whiteboard_tenors;
  try{
    for (let [idx, b_a] of prefs[product_id].add.entries()) {
      if (t_str != b_a.toString()) { continue; }
      prefs[product_id].add.splice(idx, 1);
    }
    for (let g_a of g_prefs[product_id].add) {
      if (t_str != g_a.toString()) { continue; }
      prefs[product_id].remove = [...prefs[product_id].remove, years];
    }
    websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_tenors', value: prefs});
    prices.removeFromPrefs(product_id, years);
  } catch (err) {
    errToast(err.message, "error");
  } finally {
    prices.defaultPrices(product_id);
    prices.sort(product_id);
  }
}

export async function removeWhiteboardGlobal(product_id, years, fwd) {
  if (fwd != null) { years = [fwd].concat(years); }
  let t_str = years.toString();
  let prefs = preferences.getBrokerPrefs().whiteboard_tenors;
  let g_prefs = structuredClone(preferences.getGlobalPrefs().whiteboard_tenors);
  let index = null;
  try {
    for (let [idx, g_a] of g_prefs[product_id].add.entries()) {
      if (t_str != g_a.toString()) { continue; }
      index = idx;
    }
    if (index !== null) {
      g_prefs[product_id].add.splice(index, 1);
      websocket.updateBrokerPrefs({broker_id: 999, key: 'whiteboard_tenors', value: g_prefs});
      websocket.updateWhiteboardGlobal({product_id: product_id, years: years, change: "remove"});
    } else {
      for (let [idx, b_a] of prefs[product_id].add.entries()) {
        if (t_str != b_a.toString()) { continue; }
        index = idx;
      }
      prefs[product_id].add.splice(index, 1);
      websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_tenors', value: prefs});
      prices.removeFromPrefs(product_id, years);
      throw { name: "info", message: "This tenor was not on the globally available list. It has been removed from your own list." };
    }
  } catch (err) {
    if (err.name == "info") {
      errToast(err.message, "info");
    } else {
      errToast(err.message, "error");
    }
  } 
}

export function addFavourite(product_id, years, fwd) {
  if (fwd != null) years = [fwd].concat(years);
  let t_str = years.toString();
  let prefs = preferences.getBrokerPrefs().whiteboard_favourites;
  let index = null;
  for (let [idx, b_f] of prefs[product_id].entries()) {
    if (t_str != b_f.toString()) { continue; }
    index = idx;
  }
  if (index !== null) {
    errToast("An error occurred while changing favourites", "error");
  } else {
    prefs[product_id] = [...prefs[product_id], years];
    websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_favourites', value: prefs});
    prices.sort(product_id);
  }
}

export function removeFavourite(product_id, years, fwd) {
  if (fwd != null) years = [fwd].concat(years);
  let t_str = years.toString();
  let prefs = preferences.getBrokerPrefs().whiteboard_favourites;
  let index = null;
  for (let [idx, b_f] of prefs[product_id].entries()) {
    if (t_str != b_f.toString()) { continue; }
    index = idx;
  }
  if (index === null) {
    errToast("An error occurred while changing favourites", "error");
  } else {
    prefs[product_id].splice(index, 1);
    websocket.updateBrokerPrefs({broker_id: user.get(), key: 'whiteboard_favourites', value: prefs});
    prices.sort(product_id);
  }
}