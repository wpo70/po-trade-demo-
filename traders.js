'use strict';

// Banks and traders are largely unchanging structures.
import { writable, get } from 'svelte/store';
import banks from './banks.js';
import brokers from './brokers.js';
import user from './user.js';

const traders = (
  function () {

    let anonVals = {};
    let anonBankNum = 1;
    let anonTraderNum = 1;
    let sorted_traders = [];
    const { subscribe, set, update } = writable([]);

    const getTrader = function (trader_id) {
      // Get the trader by ID.
      if (trader_id === 0) {
        return { trader_id: 0, firstname: "", lastname: "", preferredname: "", bank_id: 0 };
      }

      const arr = get(traders);
      const trader = arr.find(t => t.trader_id === trader_id);
      return trader;
    };

    const bankName = function (trader_id) {
      // Get the name of the trader's bank by trader ID.

      const trader = getTrader(trader_id);
      const bank = banks.get(trader.bank_id);
      const broker = brokers.get(user.get());

      if (trader.bank_id == 0){
        return "Legs";
      }
      // Checks if user is allowed to view this data, if not replaces it with "Bank X"
      if (broker) {
        if (!broker.permission["Not Anonymous"]){
          if (!anonVals[bank.bank]){
            anonVals[bank.bank] = "Bank " + anonBankNum;
            anonBankNum++;
          }
          return anonVals[bank.bank];
        } else {
          return bank.bank;
        }
      }

    };

    const name = function (trader_id) {
      // Return the name of the trader (first and last names) by ID.

      const trader = getTrader(trader_id);
      if (!trader) return;
      const name = (trader.firstname === "") ? trader.lastname : trader.firstname + " " + trader.lastname;
      const broker = brokers.get(user.get());

      // Checks if user is allowed to view this data, if not replaces it with "Trader X"
      if (!broker.permission["Not Anonymous"]){
        if (!anonVals[name]){
          anonVals[name] = "Trader " + anonTraderNum;
          anonTraderNum++;
        }
        return anonVals[name];
      } else {
        return name;
      }
    };

    const fullName = function (trader) {
      // Static function.  Return the full name of the trader, including preferred name and the bank code.

      if (trader == null) return;

      // Get the trader's bank.

      const bank = banks.get(trader.bank_id);

      // Concatenate the trader's fullname and bank.

      let name;

      // Checks if user is allowed to view this data, if not replaces it with "Trader X [Bank X]"
      const broker = brokers.get(user.get());
      if (!broker.permission["Not Anonymous"]){
        let traderName =  trader.firstname + " " + trader.lastname;
        if (!anonVals[traderName]){
          anonVals[traderName] = "Trader " + anonTraderNum;
          anonTraderNum++;
        }
        let bankName = bank.bank;
        if (!anonVals[bankName]){
          anonVals[bankName] = "Bank " + anonBankNum;
          anonBankNum++;
        }
        return anonVals[traderName] + " [" + anonVals[bankName] + "]";
      } else {
        name = trader.firstname + " " + trader.lastname + " [" + bank.bank + "]";
        return name;
      }
    };

    const fullNameWithPreferred = function (trader) {
      // Static function.  Return the full name of the trader, including preferred name and the bank code.

      if (typeof trader === "undefined") return;

      // Get the trader's bank.

      const bank = banks.get(trader.bank_id);

      // Concatenate the trader's fullname and bank.

      let name = trader.firstname;
      if (trader.preferredname !== "") {
        name += " (" + trader.preferredname + ")";
      }
      name += " " + trader.lastname + " [" + bank.bank + "]";

      return name;
    };

    const initials = function (trader_id) {
      // Return the initials of the trader (first and last names) by ID.

      const trader = getTrader(trader_id);
      const initials = trader.firstname.charAt(0) + trader.lastname.charAt(0);

      return initials;
    };

    const add = function (trader) {
      // adds a trader to the store
      update(store => {
        store.push(trader);
        return store;
      });
    };

    const updateTrader = function (trader) {
      // updates a trader in the store

      let updatedTrader;

      update(store => {

        let idx = store.findIndex((t) => t.trader_id === trader.trader_id);

        if (idx !== -1) {
          store[idx] = trader;
          updatedTrader = trader;
        }

        return store;
      });

      return updatedTrader;
    };

    const remove = function (trader_ids) {
      // deletes a trader from the store

      let deleted_traders = [];

      update(store => {
        trader_ids.forEach((trader_id) => {
          let idx = store.findIndex((t) => t.trader_id === trader_id);

          if (idx !== -1) {
            deleted_traders.push(store[idx]);
            store.splice(idx, 1);
          }
        });

        return store;
      });

      return deleted_traders;
    };

    const setSortedTraders = function (sorted_ts) {
      sorted_traders = sorted_ts;
    };

    const getSortedTraders = function () {
      return sorted_traders;
    };

    return {
      subscribe,
      set,
      get: getTrader,
      bankName,
      name,
      fullName,
      fullNameWithPreferred,
      initials,
      add,
      update: updateTrader,
      remove, 
      setSortedTraders,
      getSortedTraders,
    };
  }());

export default traders;
