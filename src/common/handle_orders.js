'use strict';

import orders from '../stores/orders.js';
import prices from '../stores/prices.js';
import trade_reviews from '../stores/trade_reviews.js';
import tradess from '../stores/tradess.js';
import Order from './order.js';
import Interest from './interest';
import Price from './price.js';
import derivePricesFromOrder from './price_matching.js';
import deriveTradesFromPrices from './trade_matching.js';
import websocket from './websocket.js';
import { getRbaRuns } from './rba_handler.js';

// This module handles incoming messages from the server that relate to orders.

// New orders have been received.  Process them to generate prices.
// Add the new orders and the prices to their respective stores.

export function insertOrders (received_orders) {
  // Keep track of which products have a new order.

  var got_products = [];
  var new_prices;

  // Loop over all of the received orders in the flat array.

  for (let rxo of received_orders) {
    // Construct an order from the new object.
    let order;
    if (rxo.product_id == 20 && rxo.years[0] > 1000) {
      rxo = updateRBATenor(rxo);
    }

    if(rxo.eoi) {
      order = new Interest(rxo);
      orders.add(order);
      if (!order.start_date || new Date(order.start_date).getTime() > new Date().getTime()) {
        prices.add([order]);
      }
    } else {
      order = new Order(rxo);

      let now = new Date();
      let today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      if (order.firm && new Date(order.time_placed).getTime() < today.getTime()) {
        websocket.submitOrder({
          order_id: order.order_id,
          product_id: order.product_id,
          firm: false,
        }, true);
        let tr = trade_reviews.containsOrder(order.order_id);
        if (tr) {
          websocket.updateTradeReview({
            review_id: tr.review_id,
            orders: tr.orders,
            status: "Finished"
          });
          websocket.deleteTradeReview([tr.review_id]);
        }
      }
    }

    // Take note of the product.
    if (!got_products.includes(order.product_id)) {
      got_products.push(order.product_id);
    }

    if(!order.eoi){
      if (order.fwd != null || order.start_date != null){

        orders.add(order);
        if (!order.start_date || new Date(order.start_date).getTime() > new Date().getTime()) {
          prices.add([new Price(order)]);
        }

      } else {

        // Derive prices from the new and existing orders.
        new_prices = derivePricesFromOrder(order);
        // Add the new prices to out list of prices.
        prices.add(new_prices);

        // Lastly, add the order to our list of current orders.
        orders.add(order);
      }
    }
  }

  // Loop through each product that had an order and sort the prices and tradess.
  for (let product_id of got_products) {
    prices.sort(product_id);
    tradess.sort(product_id);
  }

  // Get new trade objects using new and existing prices.

  let new_trades = deriveTradesFromPrices(got_products);

  // Add the new trades to the trades store

  tradess.add(new_trades);
}

// Rolls rba orders back when the year no longer corresponds with the start date
// I.e. at the end of RBA Day 1002y -> 1001y because the second rba is now the first
export function updateRBATenor (rxo) {
  let rbaTenors = getRbaRuns();
  let date = new Date(rbaTenors[rxo.years[0] - 1001][0]);
  let orderDate = new Date(rxo.start_date);
  if (date.getTime() > orderDate.getTime()) {
    for (let i in rxo.years) {
      rxo.years[i] = rxo.years[i] - 1;
    }
    let order = {
      order_id: rxo.order_id,
      years: rxo.years,
      firm: rxo.firm,
    };
    websocket.submitOrder(order, false);
  }
  return rxo;
}

export function deleteOrders (deleted_orders) {
  // Delete the orders in the given array of order IDs.  Also remove all prices
  // that are derived from the order.

  let order_list = orders.remove(deleted_orders);

  // If order_list does not contain anything, it means no orders were deleted, so the rest of this function can be aborted

  if (!order_list?.length) { return; }

  // Get the prices that are derived from the removed orders.
  
  let price_list = prices.derivedFrom(order_list, true);

  // Remove the prices from the store.

  prices.remove(price_list);
  // Get the trades that contain any of the removed orders

  let trades_list = tradess.containsOrder(order_list);

  // Remove the trades from the store

  tradess.remove(trades_list);
    
  // Get new trade objects using existing prices.

  let new_trades = deriveTradesFromPrices([order_list[0].product_id]);

  // Add the new trades to the trades store

  tradess.add(new_trades);
}

export function updateOrders (updated_orders) {
  // Handle each order update on a case by case basis
  for (let updated_order of updated_orders) {
    updateOrder(updated_order);
  }
}

function updateOrder(updated_order) {
  // Get current state of order and determine what key(s) were updated
  let current_order = orders.get(updated_order.order_id, true);
  current_order.time_placed = updated_order.time_placed;

  const myEquals = function (a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
  
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
  
      return true;
    } else {
      return a === b;
    }
  };
  
  let updated_keys = [];
  let all_keys = Object.keys(current_order);
  for (let key of all_keys) {
    if (!myEquals(updated_order[key], current_order[key])) {
      updated_keys.push(key);
    }
  }

  // Define the functions that handle different cases

  const deleteAndReinsert = function () {
    // Delete orders, prices, tradess and reinsert/re-derive
    deleteOrders([updated_order.order_id]);
    insertOrders([updated_order]);
  };

  const updateValue = function (key) {
    // Update a single key on the order. Also update prices and trades

    let value = updated_order[key];
    updated_order = orders.updateOrder(updated_order.order_id, key, value);

    // Delete and re-derive Prices, sort the Prices of updated order product id

    let price_list = prices.derivedFrom([updated_order]);
    prices.remove(price_list);

    if(updated_order.eoi){
      prices.add(updated_order);
    } else {
      if (updated_order.fwd != null || updated_order.start_date != null){
        prices.add([new Price(updated_order)]);
      } else {
        let new_prices = derivePricesFromOrder(updated_order);
        prices.add(new_prices);
      }
    }

    prices.sort(updated_order.product_id);

    // Handle Trades updates case-by-case

    tradess.updateOrder(updated_order, key);
  };

  // Handle all update cases in a pre-determined order
  // Handle error cases first

  if (updated_keys.includes('time_created')) {
    throw new Error('updated order time created');
  }

  if (updated_keys.includes('time_closed')) {
    throw new Error('updated order time closed. Should delete order instead');
  }

  // Handle cases that require order deletion and reinsertion

  const keys = [
    'product_id',
    'bid',
    'years',
    'fwd',
    'price',
    'trader_id',
    'start_date',
    'firm',
    'fwd',
    'eoi'
  ];

  if (updated_keys.some(key => keys.includes(key))) {
    deleteAndReinsert();
    return;
  }

  // Handle cases that can update values directly

  if (updated_keys.includes('volume')) {
    updateValue('volume');
  }

  if (updated_keys.includes('broker_id')) {
    updateValue('broker_id');
  }

}
