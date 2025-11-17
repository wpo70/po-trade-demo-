'use strict';

import Order from "./order.js";

class Price extends Order {
  // Unique ID to use for prices.

  static uid = 0;

  // An price can be constructed in two ways:
  // * using another Order instance to make a price.  The links field will be
  //   initialised with a reference to the order to indicate what order the
  //   price is derived from.  The price_id field will be assigned a unique
  //   integer.
  // * A list of the values to initialise every property.  The links field will
  //   be empty so it is essential to use the addManyLinks() or addOneLink()
  //   methods after constructing in this way.  The price_id will be assigned a
  //   unique integer.  The broker_id and trader_id will be set to 0 to indicate
  //   it is a derived price.

  // Do not use a price to construct a price.  Use the last form of the
  // constructor and set the fields separately.  Prices can be derived only from
  // order.

  constructor(product_id, bid, firm, years, price, volume, time_placed, fwd, start_date) {

    var other;

    // Was only one argument supplied
    if (typeof bid === 'undefined') {
      other = product_id;
      // Make sure other is an order

      if (!(other instanceof Order)) {
        // Other is not an Order and constructing this way is not allowed.
        throw new Error('Constructing a price using another price to initialise it is not permitted.');
      }

      if(other.fwd == null) delete other.fwd;

      // Copy the fields of the Order and create links to it.
      
      super(other);
      this.price_id = Price.uid++;
      this.links = [other];
    } else {
      // The constructor has been provided all of the fields individually.
      // Links is deliberately set to null to force addManyLinks to be called
      // immediately after this constructor.

      other = {
        price_id: Price.uid++,
        product_id: product_id,
        bid: bid,
        firm: firm,
        years: years,
        price: price,
        volume: volume,
        broker_id: 0,
        trader_id: 0,
        links: null,
        time_placed: time_placed,
        start_date: typeof start_date == "string" ? new Date(start_date) : start_date,
      };

      if (typeof fwd !== 'undefined') {
        other[fwd] = fwd;
      }

      super(other);
    }
  }

  addManyLinks (links) {
    // Call this function after Provide this function with a list of Order
    // objects.  Ensure that the generated price does not have the same tenor as
    // one of its own linked orders.  If it does the order is immediately
    // disqualified.  In that case return true.

    var test;

    // Ensure that the generated price does not have the same tenor as one of its
    // own linked orders.  If it does the order is immediately disqualified.  In
    // that case return false.

    test = links.some((o) => o.hasSameTenor(this));
    if (test) return true;

    this.links = links.slice();
    return false;
  }

  addOneLink (order) {
    // Provide this function with a single Order object.

    this.links.push(order);
  }

  isDerivedPrice() {
    // Returns true if this price has been derived
    // false if price is constructed using an order instance

    return (this.broker_id === 0 && this.trader_id === 0);
  }
}

export default Price;
