'use strict';

import { writable, get } from 'svelte/store';
import brokers from './brokers.js';
import traders from './traders.js';
import user from './user.js';

const bank_divisions = (function () {
  let anonVals = {};
  let anonLet = 'A';
  const { subscribe, set } = writable([]);

  const getAllBankDivisions = function () {
    const broker = brokers.get(user.get());

    // Checks if user is allowed to view this data, if not replaces the bank division name with "XXX"
    if (broker.permission["Not Anonymous"]){
      return get(bank_divisions);
    }else{
      let bdlist = structuredClone(get(bank_divisions));
      bdlist.forEach((div) => {
        if (!anonVals[div.name]){
          anonVals[div.name] = anonLet + anonLet + anonLet;
          anonLet = getNextChar(anonLet);
        }
        div.name = anonVals[div.name];
      });
      return bdlist;
    }
    // return [null, 'Unauthorised to access bank divisions.'];
  };

  const getBankDivision = function (bank_division_id) {
    const arr = get(bank_divisions);
    const bank_division = arr.find(bd => bd.bank_division_id === bank_division_id);
    const broker = brokers.get(user.get());

    if(bank_division_id === null) return;

    // Checks if user is allowed to view this data, if not replaces the bank division name with "XXX"
    if (!broker.permission["Not Anonymous"]){
      if (!anonVals[bank_division.name]){
        anonVals[bank_division.name] = anonLet + anonLet + anonLet;
        anonLet = getNextChar(anonLet);
      }
      return {
        bank_division_id: bank_division.bank_division_id,
        bank_id: bank_division.bank_id,
        name: anonVals[bank_division.name],
        firm_id: bank_division.firm_id,
        account_id: bank_division.account_id,
        clearing_id: bank_division.clearing_id,
        sef: bank_division.sef,
        clearhouse: bank_division.clearhouse
      };
    }
    return bank_division;
  };

  const getBankDivisions = function (bank_id) {
    const arr = get(bank_divisions);
    let bank_divs = arr.filter(bd => bd.bank_id === bank_id);
    const broker = brokers.get(user.get());

    // Checks if user is allowed to view this data, if not replaces all the bank division names with "XXX"
    if (!broker.permission["Not Anonymous"]){
      bank_divs = bank_divs.map( div => {
        if (!anonVals[div.name]){
          anonVals[div.name] = anonLet + anonLet + anonLet;
          anonLet = getNextChar(anonLet);
        }
        return {
          bank_division_id: div.bank_division_id,
          bank_id: div.bank_id,
          name: anonVals[div.name],
          firm_id: div.firm_id,
          account_id: div.account_id,
          clearing_id: div.clearing_id,
          sef: div.sef
        };
      });
    }
    return bank_divs;
  };

  function getNextChar(char) {
    if (char === 'Z') {
      return 'A';
    }
  
    return String.fromCharCode(char.charCodeAt(0) + 1);
  }

  const accountIdTrader = function (bank_division_id, trader_id) {
    // Return tera bank account id with trader initials appended

    const tera_bank = getBankDivisions(bank_division_id);
    let account_id = tera_bank.account_id;
    const initials = traders.initials(trader_id);
    const account_id_trader = account_id + '_' + initials;

    return account_id_trader;
  };

  return {
    subscribe,
    set,
    get: getBankDivision,
    getBankDivisions,
    getAllBankDivisions,
    accountIdTrader
  };
}());

export default bank_divisions;
