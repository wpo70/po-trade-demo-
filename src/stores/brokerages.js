'use strict';

import { writable, get } from 'svelte/store';

const brokerages = (function () {
  const { subscribe, set, update } = writable([]);

  const getBrokerage = function (bank_id) {
    // get the brokerage by bank ID

    const arr = get(brokerages);
    const brokerage = arr.find(b => b.bank_id === bank_id);

    return brokerage;
  };

  const updateBrokerages = function (brokerages) {
    // update trade and brokerage count of given brokerages

    update(store => {
      let bro;
      for (let brokerage of brokerages) {
        bro = store.find(b => b.bank_id === brokerage.bank_id);
        bro.trade_count = brokerage.trade_count;
        bro.monthly_brokerage_sum = brokerage.monthly_brokerage_sum;
        bro.monthly_trade_count = brokerage.monthly_trade_count;
        bro.swaption_monthly_brokerage_sum = brokerage.swaption_monthly_brokerage_sum;
        bro.swaption_monthly_trade_count = brokerage.swaption_monthly_trade_count;
      }

      return store;
    });
  };

  return {
    subscribe,
    set,
    get: getBrokerage,
    updateBrokerages
  };
}());

export default brokerages;
