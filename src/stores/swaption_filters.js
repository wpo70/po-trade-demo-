'use strict';

import { writable } from "svelte/store";
import { tenorToYear, toTenor } from "../common/formatting";
import swaption_prices from "./swaption_prices";
import swaption_quotes from "./swaption_quotes";

const swaption_filters = (
  function () {

    const { subscribe, update } = writable({
      option_tenor: {
        all: [],
        priced: []
      },
      swap_tenor: {
        all: [],
        priced: []
      }
    });

    swaption_quotes.subscribe(getTenorsFromQuotes);
    swaption_prices.createPriceGroupCallback(addAllTenor);
    swaption_prices.subscribe(updatePricedTenors);

    function sort_fn(a, b) { return tenorToYear(a) - tenorToYear(b); }

    /**
     * Gets all the tenors with corresponding quotes.
     * @returns {[string[], string[]]} swap_tenors, option_tenors
     */
    function getTenorsFromQuotes(quotes) {
      const swap_tenors = new Set();
      const option_tenors = new Set();

      quotes.bbsw.forEach(quote => {
        swap_tenors.add(toTenor([quote.swap_year]));
        option_tenors.add(toTenor([quote.option_year]));
      });

      update(store => {
        store.swap_tenor.all = Array.from(swap_tenors).sort(sort_fn);
        store.option_tenor.all = Array.from(option_tenors).sort(sort_fn);
        return store;
      });
    }

    function addAllTenor(swap_tenor, option_tenor) {
      update(store => {
        if(swap_tenor && !store.swap_tenor.all.includes(swap_tenor)) {
          store.swap_tenor.all.push(swap_tenor);
          store.swap_tenor.all.sort(sort_fn);
        }

        if(option_tenor && !store.option_tenor.all.includes(option_tenor)) {
          store.option_tenor.all.push(option_tenor);
          store.option_tenor.all.sort(sort_fn);
        }

        return store;
      });
    }

    function updatePricedTenors() {
      update(store => {
        [store.swap_tenor.priced, store.option_tenor.priced] = swaption_prices.getTenorsWithPrices();
        return store;
      });
    }

    return {
      subscribe,
      addAllTenor
    };
  }()
);

export default swaption_filters;
