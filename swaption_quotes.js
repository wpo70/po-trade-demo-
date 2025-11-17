'use strict';

import { get, writable } from 'svelte/store';
import { tenorToYear } from '../common/formatting';

/**
 * @typedef {Object} BBSWSwaptionQuote
 * @property {number} swaption_quote_id
 * @property {number} swap_year
 * @property {number} option_year
 * @property {number} strike
 * @property {number} premium
 * @property {number} mmp
 */

/**
 * @typedef {Object} RBASwaptionQuote
 * @property {number} quote_id
 * @property {string} rba_meeting
 * @property {string} option_expiry - ISO date string
 * @property {string} swap_tenor
 * @property {string} option_type
 * @property {string} strike
 * @property {number} strike_rate
 * @property {string} swap_start_date - ISO date string
 * @property {string} swap_end_date - ISO date string
 * @property {string} swap_freq
 * @property {string} floating_rate_index
 * @property {number} premium
 */

const swaption_quotes = (function () {
  const { subscribe, update } = writable({
    'bbsw': [],
    'rba': []
  });

  /**
   * @param {BBSWSwaptionQuote[]} val
   */
  const setBBSW = (val) => {
    update(store => {
      store.bbsw = val;
      return store;
    });
  };

  /**
   * @param {RBASwaptionQuote[]} val
   */
  const setRBA = (val) => {
    update(store => {
      store.rba = val;
      return store;
    });
  };

  /**
   * @param {string} swapTerm
   * @param {string} optionExpiry
   * @returns {BBSWSwaptionQuote}
   */
  const getBBSW = (swapTerm, optionExpiry) => {
    const store = get(swaption_quotes).bbsw;

    if(swapTerm == undefined || optionExpiry == undefined) {
      return undefined;
    }

    return store.find(quote =>
      quote.swap_year === tenorToYear(swapTerm)[0] &&
      quote.option_year === tenorToYear(optionExpiry)[0]
    );
  };

  return {
    subscribe,
    setBBSW,
    setRBA,
    getBBSW,
  };
}());

export default swaption_quotes;
