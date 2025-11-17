'use strict';

// Banks are largely unchanging structures.

import { writable, get } from 'svelte/store';

const banks = (function () {
  const { subscribe, set } = writable([]);

  const getBank = function (bank_id) {
    // Get a bank by its ID.

    if (bank_id === 0) {
      return { bank_id: 0, bank: 'Legs' };
    }

    const arr = get(banks);
    const bank = arr.find(b => b.bank_id == bank_id);
    return bank;
  };
  const getBankFromShortCode = function (shortCode) {
    if (!shortCode) return;  
    return get(banks).find(b => b.ov_bank_id == shortCode);
  }

  return {
    subscribe,
    set,
    get: getBank,
    getBankFromShortCode
  };
}());

export default banks;
