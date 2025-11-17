'use strict';

import { get } from 'svelte/store';
import active_product from '../stores/active_product.js';
import products from '../stores/products.js';
import { addDays, toVolume } from './formatting.js';
import Ticket from './ticket.js';

// tickets are constructed once trades have been submitted
// tickets are similar to trades, but have only one offer and bid per ticket
// tickets represent the individual trades that will take place
// the offers' and bids' volumes are matched up regardless of how many
// counterparties are on each side

class Tickets {
  constructor(trades, timestamp, start_date) {
    this.tickets = [];

    if(trades != null && timestamp != null && start_date != null){
      // T+2 for USD, NZD, CCBasisSwaps
      if (start_date == "") start_date = addDays(
        (products.isXccy(trades?.product_id ?? get(active_product)) || products.isNZD(trades?.product_id ?? get(active_product)) || products.isUSD(trades?.product_id ?? get(active_product)))
          ? addDays(new Date(), 1,trades?.product_id ?? get(active_product)) : new Date(), 1,trades?.product_id ?? get(active_product));

      this.insertTickets(trades, timestamp, start_date);

      this.resolveBrokerages();

      this._roundVolumes();
    }
  }

  insertTickets(trades, timestamp, start_date) {
    for (let trade of trades.trades) {
      let trade_tickets = this.convertTradeToTickets(trade, timestamp, start_date);

      this.tickets = this.tickets.concat(trade_tickets);
    }
  }

  // Converting a Trade to a ticket can produce 1 or more Ticket objects
  // depending on how many offers and bids are involved and what their volumes are

  convertTradeToTickets(trade, timestamp, start_date) {
    let tickets = [];
    
    // If one offer and one bid, create a ticket with trade volume

    if (trade.offers.length === 1 && trade.bids.length === 1) {
      let ticket = new Ticket(trade, trade.offers[0], trade.bids[0], trade.volume, timestamp, start_date);
      tickets.push(ticket);
      
      return tickets;
    }

    // All Tickets have been created once offer and bid volumes are 0

    let tot_offer_vol = toVolume(trade.getTotalRelativeVolume(false));
    let tot_bid_vol = toVolume(trade.getTotalRelativeVolume(true));
    while (tot_offer_vol > 0 && tot_bid_vol > 0) {
      // Loop over each offer and find an appropriate bid

      for (let offer of trade.offers) {
        let offer_vol = trade.getRelativeOrderVolume(offer.order_id, false);

        while (toVolume(offer_vol) > 0) {
          // Choose bid with lowest difference in volume to offer

          let min_delta = Infinity;
          var min_delta_vol;
          var min_delta_bid;
          for (let bid of trade.bids) {
            let bid_vol = trade.getRelativeOrderVolume(bid.order_id, true);

            if (bid_vol === 0) continue;

            let delta = Math.abs(offer_vol - bid_vol);
            if (delta < min_delta) {
              min_delta = delta;
              min_delta_vol = bid_vol;
              min_delta_bid = bid;
            }
          }

          // Get the volume of the trade using the min delta volume

          let trade_vol = Math.min(offer_vol, min_delta_vol);

          // Subtract trade vol from offer vol and bid vol

          tot_offer_vol = offer_vol - trade_vol;
          tot_bid_vol = min_delta_vol - trade_vol;

          offer_vol = tot_offer_vol;

          // Create a ticket using the obtained volume

          let ticket = new Ticket(trade, offer, min_delta_bid, trade_vol, timestamp, start_date);
          
          tickets.push(ticket);
        }
      }
    }
    return tickets;
  }

  // During ticket splitting, brokerage may be assigned to two tickets
  // Detect these cases and divide the brokerage by the number of splits

  resolveBrokerages() {
    // Get all distinct years in the tickets

    let years = [];
    for (let ticket of this.tickets) {
      if (!years.includes(ticket.year)) years.push(ticket.year);
    }

    for (let year of years) {
      // Get all tickets at year

      let tickets_at_year = this.getTickets(year);

      // Add all offers at year and bids at year to seaparate arrays,
      // attach the count of each order_id

      let all_offers = [];
      let all_bids = [];
      for (let t_at_y of tickets_at_year) {
        this._addOrderCount(all_offers, t_at_y.offer.order_id);
        this._addOrderCount(all_bids, t_at_y.bid.order_id);
      }

      // Loop over all offers at year and check if count is greater than 1

      for (let offer of all_offers) {
        if (offer.count > 1) {
          // offer is split across tickets, so remove the brokerage of all but one tickets with this order_id

          for (let idx = 1; idx < tickets_at_year.length; idx++) {
            if (tickets_at_year[idx].offer.order_id === offer.order_id) {
              tickets_at_year[idx].offer_brokerage = null;
            }
          }
        }
      }

      // Loop over all bids at year and check if count is greater than 1

      for (let bid of all_bids) {
        if (bid.count > 1) {
          // bid is split across tickets, so remove the brokerage of all but one tickets with this order_id

          for (let idx = 1; idx < tickets_at_year.length; idx++) {
            if (tickets_at_year[idx].bid.order_id === bid.order_id) {
              tickets_at_year[idx].bid_brokerage = null;
            }
          }
        }
      }
    }
  }

  // Add order_id to order_arr. update count if order_id already exists

  _addOrderCount(order_arr, order_id) {
    let idx = this._indexOf(order_arr, order_id);

    if (idx !== -1) {
      order_arr[idx].count++;
    } else {
      order_arr.push({ order_id: order_id, count: 1 });
    }
  }
  
  // Round all volumes to next whole

  _roundVolumes() {
    for (let ticket of this.tickets) {
      ticket.volume = toVolume(ticket.volume);

    }
  }

  // Return the index of the given order_id in the given array

  _indexOf(order_arr, order_id) {
    for (let idx = 0; idx < order_arr.length; idx++) {
      if (order_arr[idx].order_id === order_id) return idx;
    }

    return -1;
  }

  // Return a list of all Ticket objects for given year

  getTickets(year) {
    let tickets = [];

    for (let ticket of this.tickets) {
      if (ticket.year === year) {
        tickets.push(ticket);
      }
    }

    return tickets;
  }
}

export default Tickets;