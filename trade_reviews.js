'use strict';

import { writable, get } from 'svelte/store';
import user from './user';
import orders from './orders';
import websocket from '../common/websocket';

const trade_reviews = (
  function () {

    const { subscribe, set, update } = writable([]);

    const add = function (reviews) {
      update(store => {
        for (let r of reviews) {
          store.push(r);
        }
        return store;
      });
    };

    const update_review = function (review) {
      if (review.length == 0) return;
      if (review[0].status == "Failed" || review[0].status == "Finished") {
        remove([review[0].review_id]);
        return;
      }

      update(store => {
        for (let i = 0; i < store.length; i++){
          if (store[i].review_id == review[0].review_id){
            store[i] = review[0];
            break;
          }
        }
        return store;
      });
    };

    const remove = function (ids) {
      update(store => {
        for (let i = 0; i < store.length; i++){
          if (ids.includes(store[i].review_id)){
            store.splice(i, 1);
          }
        }
        return store;
      });
    };

    const getFromTrade = function (trade) {
      let store = get(trade_reviews);
      if (!store || store.length == 0) return null;
      else {
        for (let review of store){
          let orders = trade.getAllOrders();
          let correct = true;
          for (let o of orders) {
            if (!review.orders.includes(o.order_id)) {
              correct = false;
              break;
            }
          }
          if (correct) {
            return (review);
          }
        }
      }
      return null;
    };

    function containsOrder (id) {
      let store = get(trade_reviews);
      for (let r of store) {
        if (r.orders.includes(id)) {
          return r;
        }
      }
      return null;
    }

    const validate = function (trade_review) {
      function price_validation() {
        if (orders_cache.length > 2) {
          // TODO: Add proper validation handling for multi-cpty trades
          return true;
        } else {
          return orders_cache[0].price == orders_cache[1].price;
        }
      }

      const me = user.get();
      if (trade_review == null || !trade_review.reviewers.includes(me) || trade_review.reviewed_by.includes(me)) {
        return false;
      }
      const orders_cache = trade_review.orders.map(o => orders.get(o));
      // If order doesn't exist, remove the trade review
      if (orders_cache.some(o => !o)) {
        remove([trade_review.review_id]);
        return false;
      }
      // If order exists, validate the reviews if its firmed and has a correct price. 
      if (orders_cache.every(o => o.firm) && price_validation()) {
        return true;
      } else {
        remove([trade_review.review_id]);
        websocket.deleteTradeReview([trade_review.review_id]);
        return false;
      }
    };

    return {
      subscribe,
      update_review,
      get,
      add,
      remove,
      set,
      getFromTrade,
      containsOrder,
      validate
    };
  }());

export default trade_reviews;