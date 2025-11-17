'use strict';

import { writable, get } from 'svelte/store';
import prices from './prices';
import user from './user';
import currency_state from './currency_state';

/**
 * Main_content = 'trading' | 'swaption' | 'history' | 'trader-management' | 'custom-whiteboards' | 'broker-management'
 * view =  | 'orders' | 'trades' | 'whiteboard' | 'fx-options' | 'fwds' | 'swaption' | 'history" | 'custom-whiteboards'
 * 
 * active_product: product_id -> respective product page
 *                        -1  -> live orders/custom-whiteboards
 *                       101  -> FWDS
 *                       100  -> Swaptions
 *                       102  -> FXOptions
*/

const active_product = (function () {
  const { subscribe, set } = writable( +sessionStorage.getItem("active_product") || -1 );

  /**
   *  re-cache active_product whenever it is changed and sort the associated prices
   */ 
  subscribe((val) => {
    sessionStorage.setItem("active_product", val);
    if (get(prices) && [0, -1, 100, 101, 102].indexOf(val) < 0) { prices.sort(val); }
  });

  return { subscribe, set };
})();

const main_content = (function () {
  const { subscribe, set } = writable(sessionStorage.getItem("main_content") || "custom-whiteboards" );

  subscribe((val) => { sessionStorage.setItem("main_content", val); });

  /** 
   * Used upon logging in to validate whether the cached page is permitted to be returned to.
   * ie. If a high level account viewing Broker Management was logged out before a low level one was logged in,
   * the latter should not be directed to the default page as they do not have the Broker Management permission.
   */
  const canView = function (mc = get(main_content)) {
    const p = user.getPermission();
    if (p["Developer Override"]) { return true; }
    let resp;
    switch(mc) {
      case "trader-managment": resp = p["Trader Management"]; break;
      case "broker-management": resp = p["Broker Management"]; break;
      default: resp = true; break;
    }
    if (!resp) {
      active_product.set(-1);
      main_content.set("custom-whiteboards");
      view.set("custom-whiteboards");
    }
    return resp;
  };

  return { subscribe, set, canView };
})();

const view = (function () {
  const { subscribe, set } = writable(sessionStorage.getItem("view") || "custom-whiteboards" );

  subscribe((val) => { sessionStorage.setItem("view", val); });

  return { subscribe, set };
})();

export default active_product;
export {
  main_content,
  view
};