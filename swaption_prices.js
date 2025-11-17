'use strict';

import { writable, get } from "svelte/store";
import SwaptionPrice from "../common/swaption_price";

/**
 * @typedef {Object} SwaptionOrder
 * @property {number} order_id
 * @property {number} trader_id
 * @property {number} broker_id
 * @property {boolean} bid
 * @property {number} volume
 * @property {number} premium
 * @property {string} swap_term
 * @property {string} option_expiry
 * @property {boolean} firm
 * @property {string} time_placed
 */

/**
 * @callback NewPriceGroupCallback
 * @param {string} swap_term
 * @param {string} option_expiry
 */

/**
 * @callback OrderCallback
 * @param {'add' | 'delete' | 'update'} operation
 * @param {SwaptionOrder} order
 * @param {SwaptionOrder} [order2]
 */

const swaption_prices = (function() {
  /** @type {SwaptionOrder[]} */
  const orders = [];

  /** @type {NewPriceGroupCallback[]} */
  const priceGroupCallbacks = [];

  /** @type {OrderCallback[]} */
  const orderCallbacks = [];

  const { subscribe, update } = writable(new Map());

  /**
   * Gets the swaption price at a specific swap_term and option expiry.
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {SwaptionPrice | undefined}
   */
  const find = (swap_term, option_expiry) => {
    const store = get(swaption_prices);

    let priceGroup = store.get(swap_term)?.get(option_expiry);

    if (priceGroup == undefined) {
      priceGroup = createPriceGroup(swap_term, option_expiry, store);
    }

    return priceGroup;
  };

  /**
   * Creates a new price group the the selected swap term and option expiry.
   * Assumes that there is no price group for this swap term and option expiry already.
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {SwaptionPrice} the newly created price group
   */
  const createPriceGroup = (swap_term, option_expiry) => {
    let priceGroup;
    update(store => {
      let map = store.get(swap_term);

      if (!map) {
        map = new Map();
        store.set(swap_term, map);
        map = store.get(swap_term);
      }


      priceGroup = new SwaptionPrice(swap_term, option_expiry);
      map.set(option_expiry, priceGroup);
      return store;
    });
    priceGroupCallbacks.forEach(cb => cb(swap_term, option_expiry));
    return priceGroup;
  };

  /**
   * Creates a callback function that is called every time a new price group is
   * created.
   * @param {NewPriceGroupCallback} callback
   */
  const createPriceGroupCallback = (callback) => {
    priceGroupCallbacks.push(callback);
  };

  /**
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {boolean}
   */
  const hasBid = (swap_term, option_expiry) => {
    const price = find(swap_term, option_expiry);
    if (price === undefined) {
      return false;
    }
    return price.getBestBid() !== undefined;
  };

  /**
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {boolean}
   */
  const hasOffer = (swap_term, option_expiry) => {
    const price = find(swap_term, option_expiry);
    if (price === undefined) {
      return false;
    }
    return price.getBestOffer() !== undefined;
  };

  /**
   * Returns true if the swap_term and option_expiry has a matching price,
   * (2 prices that are equal)
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {boolean}
   */
  const hasMatch = (swap_term, option_expiry) => {
    const price = find(swap_term, option_expiry);

    return price.hasMatchingPrice();
  };

  /**
   * Returns the order matching to the order corresponding with the order_id passed in.
   * @param {number} order_id
   * @returns {SwaptionOrder | undefined}
   */
  const getMatch = (order_id) => {
    const order = findOrder(order_id);
    const price = find(order.swap_term, order.option_expiry);

    if (price == undefined) {
      return undefined;
    }

    let otherSide = order.bid ? price.offers : price.bids;

    for (let o of otherSide) {
      if (o.price === order.price) {
        return o;
      }
    }

    return undefined;
  };

  /**
   * Adds an order to the correct price group.
   * @param {any} order
   */
  const add = (order) => {
    if (findOrder(order.order_id) !== undefined) {
      return;
    }
    const price = find(order.swap_term, order.option_expiry);
    if (price === undefined) {
      return;
    }

    update((store) => {
      orderCallbacks.forEach(cb => cb('add', order));
      price.add(order);
      orders.push(order);
      return store;
    });
  };

  /**
   * Adds a callback that is called every time an order is changed.
   * @param {OrderCallback} callback
   */
  const addOrderCallback = (callback) => {
    orderCallbacks.push(callback);
  };

  const deleteOrder = (order_id) => {
    let idx;

    const orderToDelete = orders.find((o, i) => {
      if (o.order_id === order_id) {
        idx = i;
        return true;
      }
    });

    if (!orderToDelete) {
      throw new Error("Tried to delete an order that does not exist");
    }

    update(store => {
      // delete the order from the list of all orders
      orders.splice(idx, 1);

      orderCallbacks.forEach(cb => cb('delete', orderToDelete));

      // remove the order from its price group
      const priceGroup = find(orderToDelete.swap_term, orderToDelete.option_expiry);
      priceGroup.delete(orderToDelete);

      return store;
    });
  };

  /**
   * @param {SwaptionOrder} order
   */
  const updateOrder = (order) => {
    let idx = orders.findIndex(o => o.order_id === order.order_id);
    const oldOrder = orders[idx];
    orders[idx] = order;

    update(store => {
      if (oldOrder.swap_term === order.swap_term && oldOrder.option_expiry === order.option_expiry) {
        const priceGroup = find(order.swap_term, order.option_expiry);
        const list = oldOrder.bid ? priceGroup.bids : priceGroup.offers;
        const pgIdx = list.findIndex((o) => o.order_id === order.order_id);
        list[pgIdx] = order;
      } else {
        const oldPriceGroup = find(oldOrder.swap_term, oldOrder.option_expiry);
        oldPriceGroup.delete(oldOrder);

        const newPriceGroup = find(order.swap_term, order.option_expiry);
        newPriceGroup.add(order);
      }

      orderCallbacks.forEach(cb => cb('update', order, oldOrder));
      return store;
    });
  };

  /**
   * Finds the order with the specified order id.
   * @param {number} order_id
   * @returns {SwaptionOrder | undefined}
   */
  const findOrder = (order_id) => {
    return orders.find((order) => order.order_id === order_id);
  };

  /**
   * Finds all orders at a specified swap term & option expiry.
   * @param {string} swap_term
   * @param {string} option_expiry
   * @returns {SwaptionOrder[]}
   */
  const findAllOrdersAtTenor = (swap_term, option_expiry) => {
    const priceGroup = find(swap_term, option_expiry);

    if (priceGroup == undefined) {
      return [];
    }

    return [...priceGroup.bids, ...priceGroup.offers];
  };

  /**
   * Returns all of the swaption orders.
   * @returns {SwaptionOrder[]}
   */
  const findAllOrders = () => {
    return orders;
  };

  /**
   * Returns all the swap terms and option expiries with current prices.
   * @returns [string[], string[]] swap_terms, option_expiries
   */
  const getTenorsWithPrices = () => {
    const swap_terms = new Set();
    const option_expiries = new Set();

    orders.forEach((order) => {
      swap_terms.add(order.swap_term);
      option_expiries.add(order.option_expiry);
    });

    return [Array.from(swap_terms), Array.from(option_expiries)];
  };

  return {
    subscribe,
    hasBid,
    hasOffer,
    hasMatch,
    getMatch,
    findOrder,
    findAllOrders,
    findAllOrdersAtTenor,
    getTenorsWithPrices,
    createPriceGroupCallback,
    add,
    addOrderCallback,
    update: updateOrder,
    delete: deleteOrder,
  };
})();
export default swaption_prices;
