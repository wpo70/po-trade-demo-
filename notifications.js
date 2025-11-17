'use strict';

import { writable, get } from 'svelte/store';
import websocket from '../common/websocket';
import trade_reviews from './trade_reviews';
import user from './user';

const notifications = (
  function () {

    const { subscribe, set, update } = writable([]);

    const add = function (n) {
      update(store => {
        const me = user.get();
        let existing = store.map(n => n.notification_id);
        if (n.broker_id == me && !existing.includes(n.notification_id)) {
          store.unshift(n);
        }
        return store;
      });
    };

    const remove = function (id) {
      let idx;
      update(store => {
        idx = store.findIndex(n => n.notification_id == id);
        if (idx != -1) {
          store.splice(idx, 1);
        }
        return store;
      });
      if (idx != -1) {
        websocket.deleteNotification(id);
      }
    };

    const count = function() {
      const me = user.get();
      const reviews = get(trade_reviews);
      let rev_count = reviews.reduce((count, tr) => tr.reviewers.includes(me) && !tr.reviewed_by.includes(me) ? ++count : count, 0);
      return get(notifications).length + rev_count;
    };

    return {
      subscribe,
      get,
      set,
      add,
      remove,
      count,
    };
  }());

export default notifications;