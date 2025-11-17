'use strict';

import { writable, get } from 'svelte/store';
import axios from 'axios';

const dailyfx = (function () {
  
  const { subscribe, set, update } = writable([]);

  const _set = function (val) {
    let store = get(dailyfx);
    store = val;
    set(store);
  };

  // Set specific fx rate 
  const setFX = function (val, currency) {
    let store = get(dailyfx);
    store.forEach( s => {if (s.security.substring(0,3) === currency ) s.value = val;});
    set(store);
  };

  // Override specific fx rate
  const overrideFX = function (fx_security,ovr) {
    let store = get(dailyfx);
    store.forEach( s => {if (s.security === fx_security) {
      s.override = ovr;
    }});
    set(store);
  };

  // Update value on specific fx rate
  // This function used when data feed from bloomberg is activated
  const updateFX = function(fx_data) {
    update(store => {
      for (let fx of fx_data){
        let q = store.find(q => q.security === fx.security);
        if (typeof q === 'undefined') throw new Error(`Database does not have a quote for rate ${fx.security}`);
        // Replace the fx's value with the values from the server.
        q.override = fx.override;
        q.is_stale = fx.is_stale;
        q.value = fx.value;
        q.latest_updated = fx.latest_updated;
      }
      return store;
    });
  };
  // Check if latest date with the current date time
  const FX_is_stale = function(fx_security) {
    update(store => {
      store.forEach( s => {if (s.security === fx_security) {
        if (moreThanOneHourAgo(s.latest_updated)) {
          s.is_stale = true;
        }
        else {
          s.latest_updated = new Date(); s.is_stale = false;
        }
      }});
      return store;
    });
  };

  const moreThanOneHourAgo = (date) => {
    const hour = 1000 *60 *60;
    const anHourAgo = Date.now() - hour;
    return date < anHourAgo;
  };
  // Get specific fx rate based on currency
  const getFX = function (currency) {
    let store = get(dailyfx);

    return store.find(s => s.security.substring(0,3) == currency);
  };
  // FIXME: REPLACE WITH BLOOMBERG DATA When Gateway connected
  const FX_API_KEY = '6CEV5Q0AAAAHUUGN';
  async function fx_rate() {
    let fxrate;
    let url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=AUD&to_currency=USD&apikey=${FX_API_KEY}`;
    return axios.get(url)
      .then(resp => {
        fxrate = resp.data['Realtime Currency Exchange Rate']['5. Exchange Rate']; }
      )
      .catch(err => {
        console.log(err);
      });
  }

  return {
    subscribe,
    set: _set,
    setFX,
    overrideFX,
    updateFX,
    FX_is_stale,
    getFX
  };
}());

export default dailyfx;
