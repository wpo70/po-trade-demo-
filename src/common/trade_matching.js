'use strict';

import { get } from 'svelte/store';
import Trades from './trades.js';
import prices from '../stores/prices';
import tradess from '../stores/tradess.js';
import products from '../stores/products.js';
import { addTenorToDate, round, toTenor, convertDateToString, timestampToISODate } from './formatting.js';

let derived_trades;

export default function deriveTradesFromPrices (product_ids) {
  /*
    Prices with matching price values and price_groups can be used to
    construct trades objects.
    The prices used to construct trades must:
    * have the same product_id
    * be in the same price group (have the same years/sort code)
    * have opposite bids
    * have the same price value

    Since multiple prices can match across multiple price groups but
    still be part of the same trades, be careful not to create multiple
    trades for the same orders.
  */

  const price_list = get(prices);

  /*
    for each product,
      for each shape array (outright, spread fly)
        for each price_group array in shape
          for each bid/offer of price_group.bids/offers
            if the bid/offer prices match and they are a distinct pair
              add them to matching prices list
  */

  let matching_prices = {};
  let price_pair, pair_orders, already_derived;
  for (let product_id of product_ids) {
    matching_prices[product_id] = [];

    for (let shape of price_list[product_id]) {
      if (!shape || shape.length == 0 || !Array.isArray(shape)) continue;
      for (let price_group of shape) {
        for (let offer of price_group.offers) {
          if (!offer.firm || offer.eoi) continue;
          for (let bid of price_group.bids) {
            if (!bid.firm || bid.eoi) continue;

            // If the offer and bid prices match, a Price pair has been found

            if (round(offer.price, 8) === round(bid.price, 8)) {
              price_pair = { offer: offer, bid: bid };
              pair_orders = getPricePairOrders(price_pair);

              // Check if any orders in the offer/bid already exist in the tradess store
              // Or have already been derived

              already_derived = anyAlreadyDerived(matching_prices[product_id], price_pair);

              if (tradess.containsOrder(pair_orders).length !== 0 || already_derived !== null) {
                continue;
              }

              // Handle STIR orders

              const fwdConds = product_id === 17 || product_id === 18 || product_id === 27 || products.isFwd(product_id);
              if(fwdConds && (offer.start_date && bid.start_date)) {
                // If the product is a STIR and the dates are not equal, do not match
                if(offer.start_date.toString() !== bid.start_date.toString()) {
                  continue;
                }
              } else if(fwdConds && (offer.start_date || bid.start_date)) {
                // If the product is a stir, and one of the orders is a spot date and the other is a fixed date
                // calculate the spot date and check if the spot date falls on the same date as the fixed date,
                // if it does not, do not match these prices
                let today = new Date();

                today.setDate(today.getDate() + 1);

                const spotDate = addTenorToDate(toTenor(offer.fwd ?? bid.fwd), today);

                if(timestampToISODate(offer.start_date ?? bid.start_date) !== spotDate) {
                  continue;
                }
              }

              // Otherwise, add the new price pair to the matching prices array

              matching_prices[product_id].push(price_pair);
            }
          }
        }
      }
    }
  }

  // Create a new trades object for each matching price pair

  derived_trades = [];
  let trades;

  for (let product_id of product_ids) {
    for (let matching_price of matching_prices[product_id]) {
      // Attempt to construct a Trades with the prices, log if error occurs

      try {
        trades = new Trades(matching_price.offer, matching_price.bid);
        derived_trades.push(trades);
      } catch (err) {
        console.log(err);
        continue;
      }
    }
  }

  return derived_trades;
}

function anyAlreadyDerived(added_pairs, new_pair) {
  // Get all orders in the new pair

  let new_orders = getPricePairOrders(new_pair);

  // For each added pair, check if the new pair has a matching order

  let added_orders;
  for (let added_pair of added_pairs) {
    added_orders = getPricePairOrders(added_pair);

    for (let added_order of added_orders) {
      if (new_orders.includes(added_order)) {
        // Return the already added pair with matching order

        return added_pair;
      }
    }
  }

  // No added_pair contains any order in the new_pair

  return null;
}

// Return an array of distinct orders in the given price pair

function getPricePairOrders(price_pair) {
  let orders = price_pair.offer.links.concat(price_pair.bid.links);

  // Return distinct orders only

  return Array.from(new Set(orders));
}
