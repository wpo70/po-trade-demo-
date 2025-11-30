'use strict';
/* 
    Add new currency_state in store 
    When user choose the currency AUD/NZD, 
    the currency_state in store will be updated respectively
*/

import { writable, get } from 'svelte/store';

const currency_state = (function () {
  const { subscribe, set, update } = writable({
    currency: 'AUD',
    button_isDisabled : false
  });      

  const get_cur =function () {
    let store = get(currency_state);
    return store.currency;
  };

  const _set = function (cur, val) {
    update(store => {
      store.currency = cur;
      store.button_isDisabled = val;
      return store;
    });
  };

  const get_button_disabled = function () {
    let store = get(currency_state);
    return store.button_isDisabled; 
  };

  const set_button_disabled = function (val) {
    let store = get(currency_state);
    store.button_isDisabled = val;
  };

  const getAllCurrencies = function () {
    return ["AUD","NZD","JPY","USD","CAD","EUR"];
  };

  const symbolString = function (curr = get_cur()) {
    switch (curr) {
      case "AUD":
        return "\u0024 " + curr + " (Australian Dollar)";
      case "NZD":
        return "\u0024 " + curr + " (New Zealand Dollar)";
      case "USD":
        return "\u0024 " + curr + " (US Dollar)";
      case "CAD":
        return "\u0024 " + curr + " (Canadian Dollar)";
      case "JPY":
        return "\u00A5 " + curr + " (Japanese Yen)";
      case "EUR":
        return "\u20AC " + curr+ " (Euro)";
      default:
        return "" + curr;
    }
  };

  return {
    subscribe,
    set,
    _set,
    get_cur,
    get_button_disabled,
    set_button_disabled,
    getAllCurrencies,
    symbolString,
  };
} ());

export default currency_state;
