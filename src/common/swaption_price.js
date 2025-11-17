
/**
 * @typedef {import("../stores/swaption_prices").SwaptionOrder} SwaptionOrder
 */

class SwaptionPrice {
  bids = [];
  offers = [];
  swap_term = "";
  option_expiry = "";

  constructor(swap_term, option_expiry) {
    this.swap_term = swap_term;
    this.option_expiry = option_expiry;
  }

  #offer_sort(a, b) {
    return a.price - b.price;
  }
  #bid_sort(a, b) {
    return b.price - a.price;
  }

  /**
   * Adds a order to the price group.
   * NOTE: this sorts the orders array for every insertion, to insert several
   * orders use the {@link addOrders} function.
   * @param {SwaptionOrder} order
   */
  add(order) {
    if (order.bid) {
      this.bids.push(order);
      this.bids.sort(this.#bid_sort);
    } else {
      this.offers.push(order);
      this.offers.sort(this.#offer_sort);
    }
  }

  /**
   * Adds an array of orders to the price group.
   * @param {SwaptionOrder[]} orders
   */
  addOrders(orders) {
    let gotBid = false;
    let gotOffer = false;

    orders.forEach((order) => {
      if (order.bid) {
        gotBid = true;
        this.bids.push(order);
      } else {
        gotOffer = true;
        this.offers.push(order);
      }
    });

    if (gotBid) {
      this.bids.sort(this.#bid_sort);
    }

    if (gotOffer) {
      this.offers.sort(this.#offer_sort);
    }
  }

  /**
   * @param {SwaptionOrder} order
   * @returns {SwaptionOrder | undefined} returns the order deleted if the function succeeds, otherwise returns undefined
   */
  delete(order) {
    let orderArray = order.bid ? this.bids : this.offers;
    let i = orderArray.findIndex(o => o.order_id === order.order_id);
    if(i !== -1) {
      orderArray.splice(i, 1);
    }
  }

  /**
   * Gets the best (highest) bid
   * @returns {SwaptionOrder | undefined}
   */
  getBestBid() {
    // NOTE: this works as long as orders are sorted when they're added
    return this.bids[0];
  }

  /**
   * Gets the best (lowest) offer
   * @returns {SwaptionOrder | undefined}
   */
  getBestOffer() {
    // NOTE: this works as long as orders are sorted when they're added
    return this.offers[0];
  }

  /**
   * Returns true if there is a matching bid and offer.
   * @returns {boolean}
   */
  hasMatchingPrice() {
    for (let bid of this.bids) {
      for (let offer of this.offers) {
        if (bid.premium === offer.premium) {
          return true;
        } else if (bid.premium < offer.premium) {
          return false;
        }
      }
    }
    return false;
  }
}

export default SwaptionPrice;
