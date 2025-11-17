'use strict';

// Brokers are largely unchanging structures.

import { writable, get } from 'svelte/store';
import user from './user';
import preferences from './preferences';

const brokers = (function () {
  const { subscribe, set, update } = writable([]);

  let anonVals = {};
  let anonNum = 1;

  const getBroker = function (broker_id) {
    // Get the broker by ID.
  
    if (broker_id === 0) {
      return { broker_id: 0, firstname: "", lastname: "POC"};
    }
  
    const arr = get(brokers);
    const broker = arr.find(b => b.broker_id === broker_id);
    return broker;
  };
  
  const name = function (broker_id) {
    // Concatenate the broker's full name.
    const broker = getBroker(broker_id);
    const name = broker.firstname + ' ' + broker.lastname;

    // Checks if user is allowed to view this data, if not replaces it with "Broker X"
    const currentuser = brokers.get(user.get());
    if (!currentuser.permission["Not Anonymous"]){
      if (!anonVals[name]){
        anonVals[name] = "Broker " + anonNum;
        anonNum++;
      }
      return anonVals[name];
    } else {
      return name;
    }
  };

  const add = function (broker) {
    // adds a trader to the store
    update(store => {
      store.push(broker);
      return store;
    });
  };

  const updateBroker = function (broker) {
    // updates a trader in the store

    let updatedBroker;

    update(store => {

      let idx = store.findIndex((b) => b.broker_id === broker.broker_id);

      if (idx !== -1) {
        store[idx] = broker;
        updatedBroker = broker;
      }

      return store;
    });

    return updatedBroker;
  };

  const remove = function (broker_ids) {
    // deletes a trader from the store

    let deleted_brokers = [];

    update(store => {
      broker_ids.forEach((broker_id) => {
        let idx = store.findIndex((t) => t.broker_id === broker_id);

        if (idx !== -1) {
          // deleted_brokers.push(store[idx]);
          // store.splice(idx, 1);
          store[idx].active = false;
        }
      });

      return store;
    });

    return deleted_brokers;
  };

  const generateRecipientsList = function () {
    let id = user.get();
    return get(brokers).map(b => 
      (b.broker_id == id || !b.can_notify) ? null : {id:b.broker_id, text:b.firstname + " " + b.lastname, broker:b}
    ).filter(b => b != null);
  };

  const getVCONAccounts = function () {
    let store = get(brokers);
    return store.filter(b => !!b.vcon_account).map(b => {return {name: `${b.firstname} ${b.lastname}`, vcon_account: b.vcon_account}})
  }

  const getDefaultVCONAccount = function () {
    let accounts = getVCONAccounts();
    let defaultSender = preferences.getGlobalPrefs().general.default_vconSender;
    let idx = accounts.findIndex(b => b.vcon_account == defaultSender);
    return accounts[idx == -1 ? 0 : idx].vcon_account;
  }

  return {
    subscribe,
    set,
    get: getBroker,
    name,
    add,
    update: updateBroker,
    remove,
    generateRecipientsList,
    getVCONAccounts,
    getDefaultVCONAccount,
  };
}());

export default brokers;
