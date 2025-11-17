'use strict';

import Price from './price.js';
import orders from '../stores/orders.js';
import quotes from '../stores/quotes.js';
import products from '../stores/products.js';

let derived_prices;

export default function derivePricesFromOrder (order) {
  /* 
     An order generates a price.  In combination with other orders it can derive
     more prices as follows:

     An outright order can be paired with complementary:

     * outright orders to derive spread prices.
     * spread orders to derive outright prices.
     * pairs of outright orders to derive butterfly prices.
     * outrights and butterflys to derive outright prices

     A spread order can be paired with complementary:

     * outright orders to derive outright prices.
     * spread orders to derive butterfly prices.
     * spread orders to derive spread prices.
     * butterfly orders to derive spread prices.

     A butterfly order can be paired with complementary:

     * spread orders to derive spread prices.
     * butterfly orders to derive spread prices.
     * spread orders to derive butterfly prices
     * pairs of outright orders to derive outright prices.

     The derived prices are combined with more orders to derive further prices.
     If orders seek complementary orders only from amongst the ones that are
     older it avoids the problem of deriving the same price twice. 
  */

  // The derived prices are saved in a list.  Derived prices are paired with a
  // list of all the orders that have not been used to create the derived price.
  // The first derived price is the made from the given order.

  // const server_orders = get(orders);
  const server_orders = orders.getOrdersOnly();
  derived_prices = [];
  newDerivedPrice(new Price(order), server_orders[order.product_id]);

  // If the new price is for an EFP then make sure that no butterflys and only
  // 3x10, 4x10 and 5x10 spreads are accepted.
  // New handling allows other spreads if they are manually entered, but no legs should be 
  // generated for these non-standard spreads. See also comment in derivePricesFromOutright
  if (products.name(order.product_id) === 'EFP' && order.isButterfly()) {
    return;
  } else if (order.product_id == 2 && order.isSpread() && (order.years[1] !== 10 || order.years[0] < 3 || order.years[0] > 5)) {
    derivePricesFromSpread(derived_prices[0]);
    return derived_prices.map(dp => dp.price);
  }

  // A lot of derived prices can be generated and they can generate other
  // derived prices.  So keep processing until they are all tested.
  // When deriving prices EFPs have to be treated specially.  There are
  // limited spreads and no butterflys allowed.  But instead of writing new
  // outrightToSpread etc. functions, because they are very error prone, it is
  // better to eliminate invalid EFP prices in the newDerivedPrice function.

  let idx = 0;
  while (idx < derived_prices.length) {
    let derived_price = derived_prices[idx++];

    if (derived_price.price.isOutright()) {
      derivePricesFromOutright(derived_price);
    } else if (derived_price.price.isSpread()) {
      derivePricesFromSpread(derived_price);
    } else if (derived_price.price.isButterfly()) {
      derivePricesFromButterfly(derived_price);
    }
  }

  // Return only the prices, not the derived prices objects with the free_orders.

  return derived_prices.map(dp => dp.price);
}

function newDerivedPrice (price, free_orders, order, order2) {
  // The price is copied into the derived order.  A filtered copy of the free
  // orders is made.  The purpose of the filter is to remove any orders used to make the price
  // _and_ all orders with the same tenor (and that includes the new price itself).  By removing all orders with the
  // same tenor it eliminates the possibility of generating prices that circle
  // back to where they started.

  var free, filter_fn;

  // Add the orders to the list that the new price is derived from.  At the same
  // time make a filter function depending on whether none, one or two orders
  // were given.

  if (typeof order === 'undefined') {
    filter_fn = (o) => !o.hasSameTenor(price);
  } else if (typeof order2 === 'undefined') {
    price.addOneLink(order);
    filter_fn = (o) => (!(o.hasSameTenor(price) || o.hasSameTenor(order)));
  } else {
    price.addOneLink(order);
    price.addOneLink(order2);
    filter_fn = (o) => (!(o.hasSameTenor(price) || o.hasSameTenor(order) || o.hasSameTenor(order2)));
  }

  // Filter out orders with the same tenor as the new price.

  free = free_orders.filter(filter_fn);

  // Make the derived price and add it to the end of the list of derived prices,
  // waiting to be processed.

  let dp = {
    price: price,
    free_orders: free
  };
  derived_prices.push(dp);
}

function derivePricesFromOutright (derived_price) {
  // Loop over the free orders

  const n = derived_price.free_orders.length;

  for (let j = 0; j < n; j++) {
    const order = derived_price.free_orders[j];

    // If the order is an outright try to make a spread from it.

    // EFP: Extremely unlikely that other spreads (other than 3x10, 4x10, 5x10) will be traded, so they can be manually added,
    // but only generate legs for the standard box orders
    if (order.isOutright() && (order.product_id != 2 || 
      (order.years[0] >= 3 && order.years[0] <= 5 && derived_price.price.years[0] == 10) ||
      (order.years[0] == 10 && derived_price.price.years[0] >= 3 && derived_price.price.years[0] <= 5))) {
      outrightsToSpread(derived_price, order);

      // No butterflies for EFP, so don't bother checking
      if (order.product_id != 2) {
        // Having got one outright keep searching for other orders after this one
        // that can make a three-way match.

        for (let k = j + 1; k < n; k++) {
          const order2 = derived_price.free_orders[k];

          if (order2.isOutright()) {
            outrightsToButterfly(derived_price, order, order2);
          } else if (order2.isButterfly() && order2.years.includes(derived_price.price.years[0]) &&
            order2.years.includes(order.years[0])) {
            outrightsAndButterflyToOutright(derived_price, order, order2);
          }
        }
      }
    }

    // Search for spread orders to derive outright prices.

    if (order.isSpread()) {
      outrightAndSpreadToOutright(derived_price, order);
    }

    // Search for butterflys

    if (order.isButterfly() && order.years.includes(derived_price.price.years[0])) {
      // Keep searching for outrights after the butterfly that can make a three-way
      // match

      for (let k = j + 1; k < n; k++) {
        const order2 = derived_price.free_orders[k];

        if (order2.isOutright() && order.years.includes(order2.years[0])) {
          outrightsAndButterflyToOutright(derived_price, order, order2);
        }
      }
    }
  }
}

function derivePricesFromSpread (derived_price) {
  // Loop over the free orders

  const n = derived_price.free_orders.length;

  for (let j = 0; j < n; j++) {
    const order = derived_price.free_orders[j];

    // If the order is an outright try to make an outright from it.

    if (order.isOutright()) {
      outrightAndSpreadToOutright(derived_price, order);
    }

    // Search for spread orders to derive butterfly and spread prices.
    // spreadsToButterfly and spreadsToSpread are mutually exclusive.

    if (order.product_id == 2) continue;

    if (order.isSpread()) {
      spreadsToButterfly(derived_price, order);
      spreadsToSpread(derived_price, order);
    }

    // Search for butterfly orders to derive spread prices.

    if (order.isButterfly()) {
      spreadAndButterflyToSpread(derived_price, order);
      spreadAndButterflyToButterfly(derived_price, order);
    }
  }
}

function derivePricesFromButterfly (derived_price) {
  // Loop over the free orders

  const n = derived_price.free_orders.length;

  for (let j = 0; j < n; j++) {
    const order = derived_price.free_orders[j];

    // If the order is a spread try to make another spread or butterfly from it.

    if (order.isSpread()) {
      spreadAndButterflyToSpread(derived_price, order);
      spreadAndButterflyToButterfly(derived_price, order);
    }

    // Search for butterfly orders to derive spread prices.

    if (order.isButterfly()) {
      butterflysToSpread(derived_price, order);
    }

    // Search for pairs of outright orders to derive outright prices.

    if (order.isOutright() && derived_price.price.years.includes(order.years[0])) {

      // Having got one outright keep searching for other outrights after this one
      // that can make a three-way match.

      for (let k = j + 1; k < n; k++) {
        const order2 = derived_price.free_orders[k];

        // Test the second outright.

        if (order2.isOutright() && derived_price.price.years.includes(order2.years[0])) {
          outrightsAndButterflyToOutright(derived_price, order, order2);
        }
      }
    }
  }
}

// Functions to detect and process the various combinations of orders that make
// prices.

function outrightsToSpread (derived_price, order) {
  var a, b, vol, spread, time_placed;
  const price = derived_price.price;

  // To make a spread one outright must be an offer and the other a bid and the
  // years must be different.

  if (order.bid === price.bid || order.years[0] === price.years[0]) return;

  // Get the outrights into increasing order

  if (price.years[0] < order.years[0]) {
    a = price;
    b = order;
  } else {
    a = order;
    b = price;
  }
  // Get the minimum volume.

  vol = quotes.minimumVolume(a.product_id, a.volume, a.years[0], b.volume, b.years[0]);

  // Get the latest time placed.

  time_placed = latestTime([a.time_placed, b.time_placed]);

  // Construct the new spread price.  Exit if the new price is disqualified by
  // addManyLinks().
  spread = new Price(a.product_id, b.bid, a.firm && b.firm, [a.years[0], b.years[0]], b.price - a.price, vol, time_placed);
  if (spread.addManyLinks(price.links)) return;

  // Remove the matching orders from the list of free orders then make the new
  // price.

  newDerivedPrice(spread, derived_price.free_orders, order);
}

function outrightsToButterfly (derived_price, order, order2) {
  // All arguments are outrights.

  var sort_me, vol, butterfly, years, the_price, time_placed;
  const price = derived_price.price;

  // Get the lower leg, body and upper leg in order.

  sort_me = [price, order, order2];
  sort_me = sort_me.sort((a, b) => a.years[0] - b.years[0]);
  let [ll, bd, ul] = [...sort_me];

  // To make a butterfly the years must be different and the bids must alternate

  if (ll.years[0] === bd.years[0] || bd.years[0] === ul.years[0] ||
    ll.bid === bd.bid || bd.bid === ul.bid) return;

  // Get the minimum volume of all legs.

  vol = 2 * quotes.minimumVolume(ll.product_id, ll.volume, ll.years[0], ul.volume, ul.years[0]);
  vol = quotes.minimumVolume(ll.product_id, vol, ul.years[0], bd.volume, bd.years[0]);

  // Make the butterflys years and price

  years = [ll.years[0], bd.years[0], ul.years[0]];
  the_price = 2 * bd.price - ul.price - ll.price;

  // Get the latest time_placed.

  time_placed = latestTime([ll.time_placed, bd.time_placed, ul.time_placed]);

  // Make the butterfly.  Exit if the new price is disqualified by
  // addManyLinks().

  butterfly = new Price(ll.product_id, bd.bid, ll.firm && bd.firm && ul.firm, years, the_price, vol, time_placed);
  if (butterfly.addManyLinks(price.links)) return;

  // Remove the matching orders from the list of free orders then make the new
  // price.

  newDerivedPrice(butterfly, derived_price.free_orders, order, order2);
}

function outrightsAndButterflyToOutright (derived_price, order, order2) {
  var a, b, vol, outright, outright2, butterfly, years, bid, the_price, time_placed;
  const price = derived_price.price;

  // One argument is a butterfly the others are outrights.

  if (price.isButterfly()) {
    butterfly = price;
    outright = order;
    outright2 = order2;
  } else if (order.isButterfly()) {
    butterfly = order;
    outright = price;
    outright2 = order2;
  } else if (order2.isButterfly()) {
    butterfly = order2;
    outright = order;
    outright2 = price;
  }

  // Get the outrights in increasing order

  if (outright.years[0] < outright2.years[0]) {
    a = outright;
    b = outright2;
  } else if (outright.years[0] > outright2.years[0]) {
    b = outright;
    a = outright2;
  } else {
    // The outrights must not be the same year;
    return;
  }

  // To make an outright the years and bids must match the butterfly's.  Get the
  // new outright's price accordingly.

  if (a.years[0] === butterfly.years[1] && a.bid !== butterfly.bid &&
    b.years[0] === butterfly.years[2] && b.bid === butterfly.bid) {
    // The new outright is on the lower leg of the butterfly.

    years = [butterfly.years[0]];
    bid = !butterfly.bid;
    the_price = 2 * a.price - b.price - butterfly.price;

    vol = quotes.minimumVolume(a.product_id, a.volume, a.years[0], butterfly.volume, butterfly.years[1]);
    vol = quotes.minimumVolume(a.product_id, 2 * b.volume, b.years[0], vol, butterfly.years[1]);
    vol = quotes.volumeAt(a.product_id, butterfly.years[0], vol / 2, butterfly.years[1]);

  } else if (a.years[0] === butterfly.years[0] && a.bid === butterfly.bid &&
    b.years[0] === butterfly.years[2] && b.bid === butterfly.bid) {
    // The new outright is on the body of the butterfly.

    years = [butterfly.years[1]];
    bid = butterfly.bid;
    the_price = (butterfly.price + a.price + b.price) / 2;

    vol = 2 * quotes.minimumVolume(a.product_id, a.volume, a.years[0], b.volume, b.years[0]);
    vol = quotes.minimumVolume(a.product_id, vol, b.years[0], butterfly.volume, butterfly.years[1]);

  } else if (a.years[0] === butterfly.years[0] && a.bid === butterfly.bid &&
    b.years[0] === butterfly.years[1] && b.bid !== butterfly.bid) {
    // The new outright is on the upper leg of the butterfly.

    years = [butterfly.years[2]];
    bid = !butterfly.bid;
    the_price = 2 * b.price - a.price - butterfly.price;

    vol = quotes.minimumVolume(a.product_id, b.volume, b.years[0], butterfly.volume, butterfly.years[1]);
    vol = quotes.minimumVolume(a.product_id, 2 * a.volume, a.years[0], vol, butterfly.years[1]);
    vol = quotes.volumeAt(a.product_id, butterfly.years[2], vol / 2, butterfly.years[1]);

  } else {
    // The outrights do not match the butterfly
    return;
  }

  // Get the latest time placed.

  time_placed = latestTime([a.time_placed, b.time_placed, butterfly.time_placed]);

  // Make the outright.  Exit if the new price is disqualified by
  // addManyLinks().

  outright = new Price(butterfly.product_id, bid, butterfly.firm && a.firm && b.firm, years, the_price, vol, time_placed);
  if (outright.addManyLinks(price.links)) return;

  // Remove the matching orders from the list of free orders then make the new
  // price.

  newDerivedPrice(outright, derived_price.free_orders, order, order2);
}

function outrightAndSpreadToOutright (derived_price, order) {
  var vol, bid, years, the_price, outright, outright2, spread, time_placed;
  const price = derived_price.price;

  // Determine which is the outright and which is the spread.

  if (price.isOutright()) {
    outright = price;
    spread = order;
  } else {
    outright = order;
    spread = price;
  }

  // Get the minimum volume of all legs.

  vol = quotes.minimumVolume(spread.product_id, outright.volume, outright.years[0], spread.volume, spread.years[1]);

  // Is the given outright the upper leg or the lower.  

  if (spread.years[0] === outright.years[0] && spread.bid === outright.bid) {
    // The new outright is the upper leg of the spread

    bid = spread.bid;
    years = [spread.years[1]];
    the_price = outright.price + spread.price;

  } else if (spread.years[1] === outright.years[0] && spread.bid !== outright.bid) {
    // The new outright is the lower leg of the spread.  The volume must be
    // referred to the lower leg.

    bid = !spread.bid;
    years = [spread.years[0]];
    the_price = outright.price - spread.price;
    vol = quotes.volumeAt(spread.product_id, spread.years[0], vol, spread.years[1]);

  } else {
    // The outright does not match the spread.
    return;
  }

  // Get the latest time placed.

  time_placed = latestTime([outright.time_placed, spread.time_placed]);

  // Make the outright.  Exit if the new price is disqualified by
  // addManyLinks().

  outright2 = new Price(spread.product_id, bid, spread.firm && outright.firm, years, the_price, vol, time_placed);
  if (outright2.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(outright2, derived_price.free_orders, order);
}

function spreadsToButterfly (derived_price, order) {
  var a, b, vol, butterfly, time_placed;
  const price = derived_price.price;

  // Price and order are both spreads.  Ensure the bids match.

  if (price.bid === order.bid) return;

  // Get the spreads into increasing order

  if (price.years[1] === order.years[0]) {
    a = price;
    b = order;
  } else if (price.years[0] === order.years[1]) {
    a = order;
    b = price;
  } else {
    // The spreads don't match
    return;
  }

  // Construct the new butterfly price.

  vol = 2 * quotes.minimumVolume(a.product_id, b.volume, b.years[1], a.volume, a.years[1]);

  // Get the latest time placed.

  time_placed = latestTime([a.time_placed, b.time_placed]);

  // Make the butterfly.  Exit if the new price is disqualified by
  // addManyLinks().

  butterfly = new Price(a.product_id, a.bid, a.firm && b.firm, [a.years[0], a.years[1], b.years[1]], a.price - b.price, vol, time_placed);
  if (butterfly.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(butterfly, derived_price.free_orders, order);
}

function spreadsToSpread (derived_price, order) {
  var a, b, vol, spread, bid, years, the_price, time_placed;
  const price = derived_price.price;

  // Price and order are both spreads.  Get them into increasing order

  if (price.years[0] < order.years[0] || price.years[1] < order.years[1]) {
    a = price;
    b = order;
  } else {
    a = order;
    b = price;
  }

  // Get the minimum volume of the two spreads.

  vol = quotes.minimumVolume(a.product_id, a.volume, a.years[1], b.volume, b.years[1]);

  // Get the years of the new spread.

  if (a.bid === b.bid && a.years[1] === b.years[0]) {
    // Middle legs match, outer legs make a spread

    years = [a.years[0], b.years[1]];
    bid = a.bid;
    the_price = a.price + b.price;

  } else if (a.bid !== b.bid && a.years[0] !== b.years[0] && a.years[1] === b.years[1]) {
    // Upper legs match, lower legs make a spread

    years = [a.years[0], b.years[0]];
    bid = a.bid;
    the_price = a.price - b.price;
    vol = quotes.volumeAt(a.product_id, b.years[0], vol, b.years[1]);

  } else if (a.bid !== b.bid && a.years[0] === b.years[0] && a.years[1] !== b.years[1]) {
    // Lower legs match, upper legs make a spread

    years = [a.years[1], b.years[1]];
    bid = b.bid;
    the_price = b.price - a.price;
  } else {
    // The spreads don't match
    return;
  }

  // Get the latest time_placed.

  time_placed = latestTime([a.time_placed, b.time_placed]);

  // Make the spread price.  Exit if the new price is disqualified by
  // addManyLinks().

  spread = new Price(a.product_id, bid, a.firm && b.firm, years, the_price, vol, time_placed);
  if (spread.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(spread, derived_price.free_orders, order);
}

function spreadAndButterflyToSpread (derived_price, order) {
  var vol, bid, years, the_price, spread, spread2, butterfly, time_placed;
  const price = derived_price.price;

  // Determine which is the spread and which is the order.

  if (price.isButterfly()) {
    butterfly = price;
    spread = order;
  } else {
    spread = price;
    butterfly = order;
  }

  // Get the minimum volume of the spread and butterfly.

  vol = quotes.minimumVolume(butterfly.product_id, spread.volume, spread.years[1], butterfly.volume / 2, butterfly.years[1]);

  // Is the new spread to be the upper half or the lower half of the butterfly.  

  if (butterfly.bid !== spread.bid && butterfly.years[0] === spread.years[0] && butterfly.years[1] === spread.years[1]) {
    // The new spread is the upper half of the butterfly

    bid = !butterfly.bid;
    years = [butterfly.years[1], butterfly.years[2]];
    the_price = spread.price - butterfly.price;
    vol = quotes.volumeAt(butterfly.product_id, butterfly.years[2], vol, butterfly.years[1]);

  } else if (butterfly.bid === spread.bid && butterfly.years[1] === spread.years[0] && butterfly.years[2] === spread.years[1]) {
    // The new spread is the lower half of the butterfly

    bid = butterfly.bid;
    years = [butterfly.years[0], butterfly.years[1]];
    the_price = spread.price + butterfly.price;

  } else {
    // The spread and butterfly don't match
    return;
  }

  // Get the latest time_placed.

  time_placed = latestTime([butterfly.time_placed, spread.time_placed]);

  // Make the spread.  Exit if the new price is disqualified by
  // addManyLinks().

  spread2 = new Price(butterfly.product_id, bid, butterfly.firm && spread.firm, years, the_price, vol, time_placed);
  if (spread2.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(spread2, derived_price.free_orders, order);
}

function spreadAndButterflyToButterfly (derived_price, order) {
  var vol, years, the_price, spread, butterfly, butterfly2, yl, yu, by, sy, time_placed;
  const price = derived_price.price;

  // Determine which is the spread and which is the order.

  if (price.isButterfly()) {
    butterfly = price;
    spread = order;
  } else {
    spread = price;
    butterfly = order;
  }
  by = butterfly.years;
  sy = spread.years;

  // Find the years that don't match.

  yl = butterfly.years.indexOf(spread.years[0]);
  yu = butterfly.years.indexOf(spread.years[1]);

  // One and only one may match

  if (yl < 0 && yu < 0 || yl >= 0 && yu >= 0) return;

  // Now note the unmatched spread leg and the matched butterfly leg.

  if (yl < 0) {
    by = yu;
    sy = 0;
  } else {
    by = yl;
    sy = 1;
  }

  // Make up the years.  They must be in order to be a match.

  years = butterfly.years.slice();
  years[by] = spread.years[sy];
  if (years[1] <= years[0] || years[1] >= years[2]) return;

  // Check the bids match

  if (by === 1 && sy === 1 && butterfly.bid === spread.bid) {

    the_price = butterfly.price + 2 * spread.price;
    vol = quotes.minimumVolume(butterfly.product_id, butterfly.volume, butterfly.years[1], spread.volume, spread.years[1]);

  } else if (by !== 1 && sy === 1 && butterfly.bid !== spread.bid) {

    the_price = butterfly.price - spread.price;
    vol = quotes.minimumVolume(butterfly.product_id, 2 * spread.volume, spread.years[1], butterfly.volume, butterfly.years[1]);

  } else if (by === 1 && sy === 0 && butterfly.bid !== spread.bid) {

    the_price = butterfly.price - 2 * spread.price;
    vol = quotes.minimumVolume(butterfly.product_id, butterfly.volume, butterfly.years[1], spread.volume, spread.years[1]);
    vol = quotes.volumeAt(butterfly.product_id, years[1], vol, butterfly.years[1]);

  } else if (by !== 1 && sy === 0 && butterfly.bid === spread.bid) {

    the_price = butterfly.price + spread.price;
    vol = quotes.minimumVolume(butterfly.product_id, 2 * spread.volume, spread.years[1], butterfly.volume, butterfly.years[1]);

  } else {
    // The bids do not match
    return;
  }

  // Get the latest time placed.

  time_placed = latestTime([spread.time_placed, butterfly.time_placed]);

  // Make the butterfly.  Exit if the new price is disqualified by
  // addManyLinks().

  butterfly2 = new Price(butterfly.product_id, butterfly.bid, butterfly.firm && spread.firm, years, the_price, vol, time_placed);
  if (butterfly2.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(butterfly2, derived_price.free_orders, order);
}

function butterflysToSpread (derived_price, order) {
  var a, b, y, bid, years, the_price, vol, spread, py, oy, time_placed;
  const price = derived_price.price;

  py = price.years;
  oy = order.years;

  // Price and order are both butterflys.  The bids must oppose.

  if (price.bid === order.bid) return;

  // Find the years that don't match.

  if (py[0] !== oy[0] && py[1] === oy[1] && py[2] === oy[2]) {
    // The lower legs don't match
    y = 0;
  } else if (py[0] === oy[0] && py[1] !== oy[1] && py[2] === oy[2]) {
    // The bodies don't match
    y = 1;
  } else if (py[0] === oy[0] && py[1] === oy[1] && py[2] !== oy[2]) {
    // The upper legs don't match
    y = 2;
  } else {
    // The spread and butterfly don't match
    return;
  }

  // Get the butterflys and years into ascending order

  if (py[y] < oy[y]) {
    a = price;
    b = order;
  } else {
    b = price;
    a = order;
  }
  years = [a.years[y], b.years[y]];

  // Get the minimum volume of the two butterflys and convert it to the year
  // of the generated spread.

  vol = quotes.minimumVolume(a.product_id, a.volume, a.years[1], b.volume, b.years[1]);
  vol = quotes.volumeAt(a.product_id, years[1], vol, b.years[1]);

  // Calculate the volume, bid and price.  They depend on whether mismatched leg
  // is the body.

  if (y === 1) {
    bid = b.bid;
    the_price = (b.price - a.price) / 2;
  } else {
    bid = a.bid;
    the_price = a.price - b.price;
    vol = vol / 2;
  }

  // Get the latest time placed.

  time_placed = latestTime([a.time_placed, b.time_placed]);

  // Construct the new spread price.  Exit if the new price is disqualified by
  // addManyLinks().

  spread = new Price(a.product_id, bid, a.firm && b.firm, years, the_price, vol, time_placed);
  if (spread.addManyLinks(price.links)) return;

  // Add the new price to the list of unprocessed prices. Copy the free_orders.

  newDerivedPrice(spread, derived_price.free_orders, order);
}

function latestTime(times) {
  let latest = times.reduce((a, b) => {
    const a_time = new Date(a);
    const b_time = new Date(b);
  
    if (a_time > b_time) {
      return a;
    } else {
      return b;
    }
  });

  return latest;
}
