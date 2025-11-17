'use strict';
/* 
    Add new currency_state in store 
    When user choose the currency AUD/NZD, 
    the currency_state in store will be updated respectively
*/

import { writable, get } from 'svelte/store';
import websocket from '../common/websocket';
import active_product, { main_content, view } from './active_product';
import custom_whiteboards, { selected_custom_wb } from './custom_whiteboards';

const currency_state = (function () {
  const { subscribe, set, update } = writable( sessionStorage.getItem("currency") || "AUD" );  
  
  subscribe((c) => { if (c) sessionStorage.setItem("currency", c); });

  const _set = function (curr) {
    set(curr);
    sessionStorage.setItem("currency", curr);
    websocket.getCurrency(curr);
    if (get(main_content) !== "custom-whiteboards") { return setViewDefaults(); }
    else if (get(selected_custom_wb).board_id !== -1) { custom_whiteboards.setToLive(); }
  };

  const setViewDefaults = function (curr = get(currency_state)) {
    function setter (pid, mc = "trading", v = "whiteboard") {
      active_product.set(pid);
      main_content.set(mc);
      view.set(v);
      return pid;
    }
    switch (curr) {
      case "AUD":
        return setter(1);
      case "NZD":
        return setter(10);
      case "USD":
        return setter(29);
      case "JPY":
        return setter(21);
      // TODO: Add other curr defaults once those currs are in use and their products are in the db
      default:
        return setter(-1, "custom-whiteboards", "custom-whiteboards");
    }
  };

  const getAllCurrencies = function () {
    return ["AUD","NZD","USD","EUR","GBP","SGD","HKD","KRW","JPY"];
  };

  const symbol = function (curr = get(currency_state)) {
    switch (curr) {
      case "AUD":
      case "NZD":
      case "USD":
      case "SGD":
      case "HKD":
        return "\u0024";
      case "EUR":
        return "\u20AC";
      case "GBP":
        return "\u00A3";
      case "JPY":
        return "\u00A5";
      case "KRW":
        return "\u20A9";
      default:
        return "";
    }
  };

  const symbolString = function (curr = get(currency_state)) {
    return symbol(curr) + " " + curr;
  };

  return {
    subscribe,
    set: _set,
    setViewDefaults,
    getAllCurrencies,
    symbol,
    symbolString,
  };
} ());

export default currency_state;
