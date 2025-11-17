'use strict';

import { writable, get } from "svelte/store";

import active_product from "./active_product";
import { selected_custom_wb } from "./custom_whiteboards";
import prices from "./prices";
import products from "./products";
import user from "./user";
import preferences from "./preferences";

import { addDays, addMonths, convertDateToString, timestampToISODate, toEFPSPSTenor, toTenor } from "../common/formatting";
import websocket from "../common/websocket";

const filters = (
  function() {
    const { subscribe, set, update } = writable([]);

    const getFilters = function (product_id = get(active_product), sel = get(selected_custom_wb)) {
      if (product_id === -1 && sel.board_id !== -1) {
        return selected_custom_wb.getFilters();
      } else {
        const f = get(filters);
        return f[product_id < 0 ? 0 : product_id];
      }
    };

    const saveFilter = function (product_id = get(active_product), f_obj) {
      update (store => {
        store[product_id < 0 ? 0 : product_id] = f_obj;
        return store;
      });
      let new_prefs = preferences.getBrokerPrefs(user.get()).width_filters;
      new_prefs[product_id < 0 ? 0 : product_id] = {
        non_firm: f_obj.nonfirm,
        interests: f_obj.interests,
        filter: f_obj.wf,
        legs_only: !f_obj.wf_outrights,
        width: f_obj.width_filter.value,
      };
      let json = {
        key: "width_filters",
        broker_id: user.get(),
        value: new_prefs
      };
      websocket.updateBrokerPrefs(json);
    };

    /** Width filter needs to be modified/converted to percentage for certain products
     *  ie. IRS outright wf 0.25 ==> 0.0025
     *  Also increases by half of the least significant figure to allow for rounding errors
     *  @param {Number (float)} wf_val = the current width filter reading
     *  @returns {Number (float)} = the modified value of the width filter
     */ 
    const widthAllowance = function (wf_val = getFilters().width_filter.value, product_id = get(active_product), shape = 0) {
      switch(product_id) {
        case 1:
        case 3:
        case 20:
          return shape ? wf_val * 0.01 + 0.0000005 : wf_val * 0.01 + 0.00005;
        case 18:
        case 19:
          return wf_val * 0.01 + 0.00005;
        default:
          return wf_val + 0.00005;
      }
    };

    const isDefault = function (product_id = get(active_product), sel = get(selected_custom_wb)) {    
      const f = (product_id === -1 && sel.board_id !== -1) ? sel.filters : getFilters(product_id);
      if (!f && product_id < 90) { console.warn("Filters are undefined for this product. Will always display as being default. Prod ", product_id); return true; }
      return (product_id === -1 && sel.board_id === -1) 
        ? !f.nonfirm && !f.interests && !f.wf_outrights && f.width_filter.value == 0.5
        : f?.nonfirm && f?.interests && !f?.wf;
    };

    const shouldFilterOrder = function (order, is_legs = false) {
      const f = getFilters();
      let mid;
      if (order.product_id == 17 || order.product_id == 27) {
        let tenor = toEFPSPSTenor(order.start_date);
        mid = get(prices)[order.product_id][0].find(pg => pg.tenor === tenor).mid_point;
      } else if (order.product_id == 18) {
        let tenor;
        if (order.start_date) {
          tenor = timestampToISODate(order.start_date);
        } else {
          let now = new Date();
          let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let spot = addDays(today, 1);
          if (today.getMonth() != spot.getMonth()) spot = addMonths(spot, order.fwd*12 - 1);
          else spot = addMonths(spot, order.fwd*12);
          tenor = convertDateToString(spot);
        }
        mid = get(prices)[order.product_id].slice(order.years[0]*100-25, order.years[0]*100).flat().find(pg => pg.tenor === tenor).mid_point;
      } else if (products.isFwd(order.product_id)) {
        let tenor = "" + toTenor(order.fwd) + toTenor(order.years[0]);
        mid = get(prices)[order.product_id][0].find(pg => pg.tenor === tenor).mid_point;
      } else {
        mid = get(prices)[order.product_id][order.years.length-1]?.find(pg => pg.years.toString() === order.years.toString())?.mid_point;
      }
      if (mid === null) {
        console.log("Failed to retrieve mid for the selected order");
        return false;
      }
      const diff = order.bid ?
        mid >= order.price ? mid - order.price : order.price - mid :
        order.price >= mid ? order.price - mid : mid - order.price;

      let wf = f.wf ? widthAllowance(f.width_filter.value, order.product_id, order.years.length-1) : 1000;

      return (
        !f.interests && order.eoi ||
        !f.nonfirm && !order.firm && !order.eoi ||
        !f.wf_outrights && is_legs && diff > wf ||
        f.wf_outrights && diff > wf
      );
    };

    return {
      subscribe,
      set,
      get: getFilters,
      saveFilter,
      widthAllowance,
      isDefault,
      shouldFilterOrder,
    };
  }());

export default filters;
