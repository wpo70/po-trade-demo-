'use strict';

import { yearsToSortCode, genericToTenor, addMonths, addDays } from '../common/formatting.js';
import { round, timestampToISODate } from '../common/formatting.js';
import quotes from './quotes.js';
import { writable } from 'svelte/store';
import { calc3mSps, calc6mSps, getFwdMid } from '../common/pricing_models.js';
import preferences from './preferences.js';
import { addToast } from "../stores/toast";
import { get } from 'svelte/store';
import active_product from './active_product.js';
import products from './products.js';
import traders from './traders.js';
import ocos from './ocos.js';

// The active prices derived from the orders.  The prices must be
// sorted into the sequence that they will be displayed.  There is one
// array of prices for each product.  And each product's price groups
// are organised into three sorted arrays, one each for outrights,
// spreads and butterfly.  The length of a years array indexes the
// correct shape array to use.  See PriceData.js for information about
// price groups

/*
   The price_index provides a secondary, linear index of all prices.
   It is not used in any components so it does not have to be a store.  It makes
   it easy to locate the prices by using Array.find() and Array.findIndex().
   Once the price is found it is easier to get the arrays that contain them
   within the prices store, because the price itself provides the
   information needed to find them in the store without exhaustively searching.

   PriceIndex is an array of all prices.
   Add and delete items with
   * price_index.push.apply(price_index, new_prices);
   * let x = price_index.indexOf(price); price_index.splice(x, 1);

   Navigate the prices like this:

   * price_groups = price_store[price.product_id][price.years.length - 1];
   * sortCode = yearsToSortCode(price.years);
   * price_group = price_groups.find(price_group => price_group.sortCode === sortCode);
   * price_list = (price.bid) ? price_group.bids : price_group.offers;
   * price_index = price_list.indexOf(price);
   */

/*
  The prices store contains prices as well as interests. Anywhere prices are displayed, interests should be displayed.
  However interests should be emitted from price matching.
*/

const prices = (
  function () {
    // Set the orders to null temporarily.  It will re-initialised
    // with an empty structure by the products store when the products
    // are defined.

    const { subscribe, set, update } = writable(null);

    let _price_index;

    // Initialise the store with an empty structure.  This is done by the
    // products store when it is initialized

    const my_set = function (v) {
      set(v);
      _price_index = [];
    };

    const derivedFrom = function (order_list, include_interests=false) {
      // Given a list of orders find all the prices that are derived from those
      // orders.  A simplistic check could result in prices being identified
      // multiple times.  Don't do that.

      let price_list = [];

      for (let price of _price_index) {
        let found;
        if(price.eoi){
          if(include_interests){
            found = order_list.includes(price);
          }
        } else if (!price.eoi){
          found = price.links.some(r => order_list.includes(r));
        }
        if (found) price_list.push(price);
      }

      return price_list;
    };

    const derivedFromAll = function (order_list) {
      // Given a list of orders find all the prices that are derived from those
      // orders.  A simplistic check could result in prices being identified
      // multiple times.  Don't do that.

      let price_list = [];

      for (let price of _price_index) {
        if(price.eoi) continue;
        let found;
        if (price.links.length != order_list.length) continue;
        found = price.links.every(r => order_list.some((o) => o.order_id == r.order_id));
        if (found) price_list.push(price);
      }

      return price_list;
    };

    const add = function (new_prices) {
      /* Push all valid prices to new array that can be pushed to price index.
          At this point, only prices that has a start date before the current date are considered invalid.
      */
      const validPrices = [];
      
      // Add a list of new prices to the store, in their correct places in the prices structure.

      update((store) => {
        // Loop over the new prices.
        for (let price of new_prices) {
          // Get the price group for the price.

          if (price.product_id === 18 && price.start_date != null) {
            // Scan Stale IRS SPS, if it is stale, its not moving forward.
            let bid_startDate = new Date(price.start_date);
            let now = new Date();
            let spot = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            spot = addDays(spot, 1);
            if (bid_startDate.getTime() < spot.getTime()) continue;
          }
          let price_group = _getPriceGroup(store, price);
          // Add the price to the price group's offers or bids array, as appropriate.
          // Keep track of the arrays that are modified.  They will have to be sorted
          // later.  Make sure the price does not duplicate one already in the
          // price group.
          if (price.bid) {
            if(!price.eoi) {
              if (_notADuplicate(price, price_group.bids)) {
                let pr_oco_bid = price.trader_id != 0 ? ocos.isOCO(traders.get(price.trader_id).bank_id, price.product_id) : null;
                price.oco = pr_oco_bid ?? false;
                price_group.bids.push(price);
                price_group.bids_are_unsorted = true;
              }
            } else {
              price_group.bids.push(price);
              price_group.bids_are_unsorted = true;
            }
          } else {
            if(!price.eoi) {
              if (_notADuplicate(price, price_group.offers)) {
                let pr_oco_offer = price.trader_id != 0 ? ocos.isOCO(traders.get(price.trader_id).bank_id, price.product_id) : null;
                price.oco = pr_oco_offer ?? false;
                price_group.offers.push(price);
                price_group.offers_are_unsorted = true;
              }
            } else {
              price_group.offers.push(price);
              price_group.offers_are_unsorted = true;
            }
          }
          validPrices.push(price);
        }
        return store;
      });

      // Also maintain the index of prices.  The merge must be done in place -
      // price_index cannot be re-assigned.

      _price_index.push.apply(_price_index, validPrices);
    };

    const remove = function (price_list) {
      // Remove prices from the store.

      update(store => {
        // Loop over the prices.

        let a, g, p, x;

        for (let price of price_list) {
          // Get the array that the price belongs to.  Find its location in the
          // array and remove it.

          // Because of a bug with the checklist selection it is possible that we
          // are being asked to remove orders that have already been removed.
          // Silently ignore prices that we don't have.  THIS COMMENT DOESN'T MAKE
          // SENSE, ORDERS MIGHT HAVE ALREADY BEEN REMOVED BUT WHY DOES THAT AFFECT THE PRICES. I WONDER IF
          // IT IS BECAUSE THE PRICE_INDEX AND PRICES STORE WERE BEING INCONSISTENTLY
          // UPDATED.

          a = store[price.product_id][price.years.length - 1];
          g = _getPriceGroup(store, price);
          if (typeof g === 'undefined') continue; // this is a hack, see comment above
          p = (price.bid) ? g.bids : g.offers;
          x = p.indexOf(price);
          if (x < 0) continue; // this is a hack, see comment above
          p.splice(x, 1);

          // If the price group is set to not persist, and has nothing left in it remove it too.

          if (!g.persist && g.bids.length === 0 && g.offers.length === 0) {
            x = a.indexOf(g);
            if (x >= 0) {
              a.splice(x, 1);
            }
          }
        }

        return store;
      });

      // Remove the prices from the index

      for (let price of price_list) {
        let x = _price_index.indexOf(price);
        _price_index.splice(x, 1);
      }
    };

    /** Remove function for a price in the store. Used to update the store after initialisation when the user changes
     *  their whiteboard preferences. Takes a product id and the tenor/years (in array form) to find the price in the 
     *  price structure before splicing it out */
    const removeFromPrefs = function (id, t_years) {
      if (id == 18) {
        modifyStructure18(t_years, false);
      } else if (products.isStir(id)) {
        update(store => {
          store[id][0] = store[id][0].map(v => {
            if (t_years[0] === v.years[0]) {
              return {...v, persist:false}
            }
            return v;
          });
          return store;
        });
      } else {
        update(store => {
          let len = products.isFwd(id) ? t_years.length-2 : t_years.length-1;
          let rmv_idx = store[id][len].findIndex(search => (search.fwd ? [search.fwd].concat(search.years).toString() : search.years.toString()) == t_years.toString());
          if (rmv_idx != -1) {
            store[id][len].splice(rmv_idx, 1);
          }
          return store;
        });
      }
    };

    const hasGlobalStoreChanged = async function (j_str) {
      let count = 0;
      while (count++ < 10 && JSON.stringify(preferences.getGlobalPrefs.whiteboard_tenors) == j_str) {
        await new Promise(res => setTimeout(res, 500));
      }
      if (count > 10) { return false; }
      return true;
    };

    /** Function takes the new whiteboard_tenors value from a global change, uses the change/difference to update 
     *  the store accordingly.  */
    const updateFromGlobal =  async function (json) {
      let j_str = JSON.stringify(json);
      let prefs = preferences.getGlobalPrefs().whiteboard_tenors;
      try {
        if (json.change == "remove") {
          if (!await hasGlobalStoreChanged(j_str)) {
            throw new Error("store took too long to update");
          }
          let yr_str = json.years.toString();
          let index = prefs[json.product_id].add.findIndex(search => search.toString() == yr_str);
          prefs[json.product_id].add.splice(index, 1);
          removeFromPrefs(json.product_id, json.years);
        } else if (json.change == "add") {
          if (!await hasGlobalStoreChanged(j_str)) {
            throw new Error("store took too long to update");
          }
          prefs[json.product_id].add = [...prefs[json.product_id].add, json.years];
          if (json.product_id == 18) { modifyStructure18(json.years, true); }
          defaultPrices(json.product_id);
          sort(json.product_id);
        } else {
          throw new Error("malformed update request");
        }
      } catch (err) {
        console.error(err.message);
        addToast ({
          message: "Global whiteboard preferences have changed but the request was malformed. Please reload your webpage to get the updated tenors.", // TODO: add link to reload page
          type: "info", // change type (re above todo)
          dismissible: true,
          timeout: 300000,
        });
      }
    };

    const sortByPrice = function (a, b) {
      if(a.bid && b.bid){
        return b.price - a.price;
      } else if(!a.bid && !b.bid){
        return a.price - b.price;
      } else {
        try{
          throw new Error("A Bid Price and Offer Price are in the same list attempting to be sorted. Bids and Offers sould be separate.");
        } catch(e){ console.log(e); }
      }
    };

    const sortByFirm = function (b) {
      return b.firm ? 1 : -1;
    };

    const sortByDate = function (a, b) {
      let a_time = new Date(a.time_placed);
      let b_time = new Date(b.time_placed);
      return a_time.getTime() - b_time.getTime();
    };

    /** This function is to be used as the function passed into an Array.sort call */
    const sort_prices = function (a, b) {
      // Sort the bids and offers arrays in every price group for a given product_id.  First create the sorting functions.
      if(a.price == null && b.price != null) return 1;
      else if(a.price != null &&  b.price == null) return -1;
      else if(a.price == null && b.price == null) {
        return sortByDate(a, b);
      }

      if(round(a.price, 8) != round(b.price, 8)){
        return sortByPrice(a, b);
      } else if ((a.firm != b.firm) && (!a.eoi && !b.eoi)){
        return sortByFirm(b);
      } else {
        return sortByDate(a, b);
      }
    };

    const sort = function (product_id) {
      if (!product_id) return;
      // Get the prices for the given product.
      update(p => {
        let shape_arrays = p[product_id];
        // Loop through each type of price: outrights, spreads, butterflys.
        for (let shape_array of shape_arrays) {
          // Loop through all the price_groups for the current shape array.
          if (!shape_array || shape_array.length == 0) continue;
          for (let price_group of shape_array) {
            // Prices need to be sorted only if they have been touched.
            // Sort the prices from best to worst, ascending for offers, descending for
            // bids. If prices are equal sort by date oldest to newest

            if (price_group.bids_are_unsorted) {
              price_group.bids.sort(sort_prices);
              price_group.bids_are_unsorted = false;
            }

            if (price_group.offers_are_unsorted) {
              price_group.offers.sort(sort_prices);
              price_group.offers_are_unsorted = false;
            }
          }

          // Finally, sort the price groups themselves by the sort code.

          shape_array.sort((a, b) => a.sortCode - b.sortCode);
        }

        // Return the updated price.

        return p;
      });
      
      sort(products.fwdOf(product_id));
      
      let active = get(active_product);
      if (active == product_id && active == 1) {
        sort(2);
      } else if (active == product_id && active == 18) {
        sort(17);
        sort(27);
      }
      
      resortWithFavourites(product_id);
    };

    const resortWithFavourites = function (product_id) {
      if (product_id == 17 || product_id == 18 || product_id == 27) { return; }
      let index = null;
      let fav_str;
      let len;
      let favs = [];
      update(store => {
        for (let fav of preferences.getBrokerPrefs().whiteboard_favourites[product_id]) {
          index = undefined;
          fav_str = fav.toString();
          len = products.isFwd(product_id) ? fav.length-2 : fav.length-1;
          for (let [idx, val] of store[product_id][len].entries()) {
            if (fav_str === (val.fwd ? [val.fwd].concat(val.years).toString() : val.years.toString())) {
              index = idx;
            }
          }
          if (index >= 0) {
            favs.push(store[product_id][len].splice(index, 1)[0]);
          }
        }
        favs.sort((a,b) => { return b.sortCode - a.sortCode; });
        favs.forEach(p => { store[product_id][p.years.length-1].unshift(p); });
        return store;
      });
    };

    /** 
     *  When an SPS is added or removed from the whiteboard, all of the specifics within it need to be updated to persist accordingly
     */
    const modifyStructure18 = function (t_years, persist = true) {
      update(store => {
        let location = store[18].findIndex(loc => loc[0]?.fwd === t_years[0] && loc[0]?.years[0] === t_years[1]);
        if (location != -1) {
          store[18][location] = store[18][location].map(v => { return {...v, persist}});
        }
        return store;
      });
    };

    const initStructure18 = function (location, price, store) {
      let fwdtenor = location;
      if (location > 24) fwdtenor = location - 25;
      let groups = store[price.product_id];
      groups[location] = [];

      let today = new Date();
      today.setHours(0,0,0,0);
      let spot;
      if (fwdtenor == 0){
        spot = addDays(today, 1);
      } else {
        spot = new Date(today);
        spot.setDate(1);
        spot = addMonths(spot, fwdtenor);
      }
      let startMonth = addMonths(today, fwdtenor).getMonth();
      while (spot.getMonth() == startMonth){
        let key = timestampToISODate(spot);
        let mid;
        let days = Math.round(spot.getTime() - today.getTime()) / (1000*60*60*24);

        if (price.years[0] == 0.25) mid = calc3mSps(days);
        else mid = calc6mSps(days);

        let sortCode = yearsToSortCode(price.years);

        let price_group = {
          product_id: price.product_id,
          sortCode: sortCode,
          tenor: key,
          years: price.years,
          fwd: price.fwd,
          mid_point: mid,
          shape: "outright",
          offers: [],
          bids: [],
          offers_are_unsorted: false,
          bids_are_unsorted: false,
          currency: null,
          persist: price.persist,
          expanded: false,
        };
        groups[location].push(price_group);
        spot = addDays(spot, 1);
      }
    };

    const getPriceGroup = function (pg) {
      let shape_array = get(prices)[pg.product_id];
      if (pg.product_id == 18) {
        let startMonth = pg.fwd * 12;
        if (pg.years[0] == 0.5) startMonth + 25;
        let pgArr = shape_array[startMonth];
        for (let group of pgArr) {
          if (pg.tenor == group.tenor) return group;
        }
      } else {
        let pgArr = shape_array[pg.years.length-1];
        for (let group of pgArr) {
          if (pg.sortCode == group.sortCode) return group;
        }
      }
    }

    const _getPriceGroup = function (store, price) {
      // This is a private static function, so the store is supplied as an argument
      // instead of using get in the middle of an update.

      // Prices on the whiteboard are grouped by product and shape.  Get the group
      // that the given price belongs to.  Make the group if it doesn't already
      // exist.

      let groups = store[price.product_id][price.years.length - 1];
      // Convert the years to a unique sort code.

      let sortCode = yearsToSortCode(price.years, price.fwd);

      // Loop over the price groups for the one with our sort code.

      // Generate tenor which will user to find price group
      let tenor = genericToTenor(price, true);
      
      if (price.product_id == 18) {

        // IRS SPS's are organised in the following order:
        // Product Id as usual
        //      Term, i.e. 3m = 0, 6m = 1
        //            Months forward, i.e. 0 => 24
        //                  Then 1 price group for every future business day in said month

        let fwdtenor;
        let now = new Date();
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (price.fwd != null){
          fwdtenor = price.fwd*12;
        } else {
          let date = new Date(price.start_date);
          fwdtenor = date.getMonth() - today.getMonth() + (date.getFullYear() - today.getFullYear())*12;
        }    

        let location = fwdtenor;
        if (price.years[0] == 0.5) location += 25;
        if (!store[price.product_id][location]?.length) { initStructure18(location, price, store); }
        for (let pg of store[price.product_id][location]) {
          if (pg.tenor == tenor) {
            return pg;
          }
        }
      }

      for (let price_group of groups) {
        if (price_group.sortCode === sortCode && tenor == price_group.tenor || (price.product_id == 17 || price.product_id == 27) && tenor == price_group.tenor) {
          return price_group;
        }
      }

      try {
        let mid;
        if (products.isFwd(price.product_id)) { mid = getFwdMid(price.product_id, tenor); }
        else { mid = quotes.mid(price.product_id, price.years); }

        // The price group for that product has not been created yet, so create it
        let price_group = {
          product_id: price.product_id,
          sortCode: sortCode,
          tenor: tenor,
          years: price.years,
          fwd: price.fwd,
          mid_point: mid,
          shape: price.shape(),
          offers: [],
          bids: [],
          offers_are_unsorted: false,
          bids_are_unsorted: false,
          currency: null,
          persist: price.persist ?? false,
          expanded: false,
        };

        // Push the new price group onto the array that corresponds to whether the new
        // price is an outright, spread or butterfly (years.length - 1).
        groups.push(price_group);
        return price_group;
      } catch (err) {
        console.log("Error finding quotes for price group. Product: ", price.product_id, " Years: ", price.years);
        return null;
      }
      
    };

    const defaultPrices = function (product_id) {

      // all the price groups that should always show on whiteboard
      // (generated using the code above)

      let tenor_array = [];
      tenor_array = structuredClone(preferences.getGlobalPrefs().whiteboard_tenors[product_id].add);
      // Add non-dupe user preferences to display list
      if (preferences.getBrokerPrefs().whiteboard_tenors?.[product_id]?.add) {
        for (let val of preferences.getBrokerPrefs().whiteboard_tenors[product_id].add) {
          if (!tenor_array.find(v => v.toString() == val.toString())) { tenor_array.push(val); }
        }
      }
      // Splice user preferences, where they are in the list already, from the display list
      if (preferences.getBrokerPrefs().whiteboard_tenors?.[product_id]?.remove) {
        for (let val of preferences.getBrokerPrefs().whiteboard_tenors[product_id].remove) {
          let idx = tenor_array.findIndex(v => v.toString() == val.toString());
          if (idx !== -1) { tenor_array.splice(idx, 1); }
        }
      }

      if (product_id == 18) {
        
        const fwds = products.getValidSPS();

        // for each year, create a mock price and get the price group associated with it
        update(store => {
          fwds.forEach((fwd) => {

            let todayMonth = new Date().getMonth();
            let tommorrowMonth = addDays(new Date(), 1).getMonth();
            if (!(todayMonth != tommorrowMonth && (fwd[0] == 0))){ 

              let persist = !!tenor_array.find(find => find[0] === fwd[0] && find[1] === fwd[1]);

              // this is a hacky implementation to get the correct price group,
              // by creating a "price" object that has only the values getPriceGroup needs
              let price = {
                years: [fwd[1]],
                product_id: product_id,
                fwd: fwd[0],
                shape: () => 'outright',
                persist
              };

              // this function creates the price group and adds it to the store
              let price_group = _getPriceGroup(store, price);
              if (price_group != null){
                // set these price groups to persist, so they are not deleted when prices are removed
                price_group.persist = persist;
              }
            }
          });

          return store;
        });

      } else if (products.isFwd(product_id)){

        const fwds = tenor_array;

        // for each year, create a mock price and get the price group associated with it
        update(store => {
          fwds.forEach((fwd) => {

            // this is a hacky implementation to get the correct price group,
            // by creating a "price" object that has only the values getPriceGroup needs
            let price = {
              years: [fwd[1]],
              product_id: product_id,
              fwd: fwd[0],
              shape: () => 'outright'
            };

            // this function creates the price group and adds it to the store
            let price_group = _getPriceGroup(store, price);

            if (price_group != null){
              // set these price groups to persist, so they are not deleted when prices are removed
              price_group.persist = true;
            }
          });

          return store;
        });
      
      } else if (product_id == 17 || product_id == 27) {

        // Find next starting date
        // I.E. The thursday which follows the first friday of March, June, September or December
        let today = new Date();
        if ((today.getMonth() + 1)%3 == 0){
          let date = new Date();
          date.setDate(1);
          while (date.getDay() != 5){
            date = addDays(date, 1);
          }
          if (today.getDate() >= date.getDate() + 6){
            today = addMonths(today, 3);
          }
        } else {
          today = addMonths(today, (3 - (today.getMonth() + 1)%3));
        }
        today.setDate(1);

        update(store => {
          for (let i = 0; i < 12; i++ ) {

            let persist = !!tenor_array.find(find => find[0] === 1001+i);

            // this is a hacky implementation to get the correct price group,
            // by creating a "price" object that has only the values getPriceGroup needs
            let price = {
              years: [1001 + i],
              product_id: product_id,
              start_date: today.toISOString(),
              shape: () => 'outright',
              persist
            };

            // this function creates the price group and adds it to the store
            let price_group = _getPriceGroup(store, price);
            // set these price groups to persist, so they are not deleted when prices are removed
            price_group.persist = persist;
            today.setMonth(today.getMonth() + 3);
          }

          return store;
        });

      } else {
        
        const years = tenor_array;
        
        // for each year, create a mock price and get the price group associated with it
        update(store => {
          years.forEach((year) => {

            // this is a hacky implementation to get the correct price group,
            // by creating a "price" object that has only the values getPriceGroup needs
            let price = {
              years: year,
              product_id: product_id,
              shape: () => year.length == 1 ?  'outright' : year.length > 2 ? 'butterfly': 'spread'
            };

            // this function creates the price group and adds it to the store
            let price_group = _getPriceGroup(store, price);

            // set these price groups to persist, so they are not deleted when prices are removed
            if (price_group) { price_group.persist = true; }
          });

          return store;
        });
      }

    };

    const _notADuplicate = function (price, price_list) {
      // This is a private static function, so the store is supplied as an argument
      // instead of using get in the middle of an update.

      // Return true if price is not a duplicate of any in the price_list array.  In
      // this case, it is a duplicate if the price is the same and the list of
      // linked orders is the same (even if the order is different).

      // Loop over the prices in the list.
      for (const p of price_list) {
        // If the prices are different or the numbers of linked orders are different
        // then they are not duplicates.

        if(p.eoi) continue;

        if (price.price !== p.price || price.links.length !== p.links.length) continue;

        // Loop over each of price's links.

        for (const lk of price.links) {
          // If price's link is not in p's list of links they are not duplicates.
          // Go to the next price_list iteration.  Break out of the inner loop
          // to continue the outer loop.

          if (!p.links.includes(lk)) break;

          // The prices match, the arrays of order match.  So there is at least one
          // duplicate of price in price_list.

          return false;
        }
      }

      // If we got this far, price is not a duplicate.

      return true;
    };

    // There are two reasons to recalculate mids: 1. All quotes for a product
    // have been updated from Bloomberg; 2. One override has been changed.
    // This function takes a single product_id or a list of product_ids and
    // recalculates every price_groups mid value for each product.

    const recalculateMids = function (product_ids) {

      update(store => {
        var pid, shapes, groups, price_group;
        let now = new Date();
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let spot;
        // Loop over the override list

        for (pid of product_ids) {
          // Prices on the whiteboard are grouped by product and shape.  Get the group
          // that the override belongs to.  Then loop over its shapes and then
          // the groups.
          if (!store?.[pid]) continue;
          shapes = store[pid];
          for (groups of shapes) {
            if (!groups || groups.length == 0) continue;
            for (price_group of groups) {
              // Calculate the mid
              if (pid == 18){
                let key = price_group.tenor.split("-");
                spot = new Date(parseInt(key[0]), parseInt(key[1])-1, parseInt(key[2]));
                let days = Math.round(spot.getTime() - today.getTime()) / (1000*60*60*24);
                if (price_group.years == 0.25) price_group.mid_point = calc3mSps(days);
                else price_group.mid_point = calc6mSps(days);
              } else if (products.isFwd(pid)){
                price_group.mid_point = getFwdMid(price_group.product_id, price_group.tenor);
              } else {
                price_group.mid_point = quotes.mid(pid, price_group.years);
              }
            }
          }
        }

        return store;
      });
    };

    const expandPriceGroup = function (pg) {
      let price = pg.bids?.[0] ?? pg.offers?.[0];
      if (price) {
        update(store => {
          let group = _getPriceGroup(store, price);
          group.expanded = pg.expanded;
          return store;
        });
      }
    };

    return {
      subscribe,
      set: my_set,
      derivedFrom,
      derivedFromAll,
      add,
      remove,
      removeFromPrefs,
      updateFromGlobal,
      modifyStructure18,
      sort,
      recalculateMids,
      defaultPrices,
      sort_prices,
      expandPriceGroup,
      getPriceGroup,
    };
  }());

export default prices;