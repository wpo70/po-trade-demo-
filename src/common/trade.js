'use strict';

import traders from '../stores/traders.js';
import orders from '../stores/orders.js';
import bank_divisions from '../stores/bank_divisions.js';

class Trade {
  constructor(year, fwd = null) {
    this.year = year;
    this.fwd = fwd;
    this.offers = [];
    this.bids = [];
    this.price = null;
    this.offers_rvolumes = []; // Relative offer volumes used for trade volume calculation
    this.bids_rvolumes = []; // Relative bid volumes used for trade volume calculation
    this.volume = null;
    this.offer_brokerages = [];
    this.bid_brokerages = [];
    this.currency = '';
    this.bank_divisions = [];
    this.clearhouse = 'LCH';
  }

  // Overwrite Bank_divisions Array
  // Rules: NAB(id=1), BNP(id=6) only match with NFPS(id=4)
  // Rules: JPM(id=2), NUF(id=7) only match with NIP(id=3)
  // The list of NOM subdivisions is set default at NIP
  // If one of the pair bank_divisions_id = 2 or 7 the other bank_divisions_id = 3
  // If one of the pair bank_divisions_id = 1 or 6 the other bank_divisions_id = 4
  // If one of the paid bank_divisions_id =  3, check theo other bank_divisions_id 2 or 7 match with 3
  validateBankDivision() {


    // let len = this.bank_divisions.length;

    // if (len === 2) {
    //   for (let i = 0; i < len; i++){
    //     if (this.bank_divisions[i].bank_division_id == 3) {

      
    //       if (i === 1){
    //         let x = this.bank_divisions[i-1].bank_division_id;
    //         if (x === 1 || x === 6) {
    //           this.bank_divisions[i].bank_division_id = 4;
    //         }
    //       } else {
    //         let x = this.bank_divisions[i+1].bank_division_id;
    //         if (x === 1 || x === 6) {
    //           this.bank_divisions[i].bank_division_id = 4;
    //         }
    //       }
    //     }
    //   } 
    // }
    
  }

  // Insert an order into the offers/bids array

  insertOrder(order, bid) {
    let trader = traders.get(order.trader_id);

    if (!bid) {
      if (!this.offersContain(order.order_id)) {
        this.offers.push(order);

        // Set bank division to first division in list
        let defaultDiv;
        if (trader.bank_div_id != null) defaultDiv = bank_divisions.get(trader.bank_div_id)?.bank_division_id;
        else defaultDiv = bank_divisions.getBankDivisions(trader.bank_id)[0].bank_division_id;

        this.bank_divisions.push({
          order_id: order.order_id,
          bank_division_id: defaultDiv
        });
      }
    } else {
      if (!this.bidsContain(order.order_id)) {
        this.bids.push(order);

        // Set bank division to first division in list
        let defaultDiv;
        if (trader.bank_div_id != null) defaultDiv = bank_divisions.get(trader.bank_div_id)?.bank_division_id;
        else defaultDiv = bank_divisions.getBankDivisions(trader.bank_id)[0].bank_division_id;

        this.bank_divisions.push({
          order_id: order.order_id,
          bank_division_id: defaultDiv,
        });
      }
    }

    // Set initial relative volume

    let rvol = order.volumeAtYear(this.year);
    this.insertRelativeVolume(order.order_id, bid, rvol);
  }

  // Insert new relative volume of given order

  insertRelativeVolume(order_id, bid, rvol) {
    const insertRelVol = function (rvol_arr, order_id, rvol) {
      rvol_arr.push({
        order_id: order_id,
        volume: rvol
      });
    };

    if (!bid) {
      insertRelVol(this.offers_rvolumes, order_id, rvol);
    } else {
      insertRelVol(this.bids_rvolumes, order_id, rvol);
    }
  }

  // Set relative volume of given order

  setRelativeVolume(order_id, bid, new_rvol) {
    const setRelVol = function (rvol_arr, order_id, new_rvol) {
      for (let rvol of rvol_arr) {
        if (rvol.order_id === order_id) {

          rvol.volume = new_rvol;
          return;
        }
      }

      console.error(`Given order_id ${order_id} not in rvol_arr ${rvol_arr}`);
    };

    if (!bid) {
      setRelVol(this.offers_rvolumes, order_id, new_rvol);
    } else {
      setRelVol(this.bids_rvolumes, order_id, new_rvol);
    }
  }

  // Set brokerage in offer/bid brokerages 

  setBrokerage(order_id, brokerage, bid) {
    const setBro = function (bro_arr, order_id, brokerage) {
      if (brokerage == null) return;
      for (let bro of bro_arr) {
        if (bro.order_id === order_id) {
          bro.brokerage = brokerage;
          break;
        }
      }
    };

    const addBro = function (bro_arr, order_id, brokerage) {
      bro_arr.push({
        order_id: order_id,
        brokerage: brokerage
      });
    };

    // If brokerage exists, update it
    // otherwise, add new brokerage

    if (!bid) {
      if (!this.offer_brokerages.some((bro) => bro.order_id == order_id)) {
        addBro(this.offer_brokerages, order_id, brokerage);
      } else {
        setBro(this.offer_brokerages, order_id, brokerage);
      }
    } else {
      if (!this.bid_brokerages.some((bro) => bro.order_id == order_id)) {
        addBro(this.bid_brokerages, order_id, brokerage);
      } else {
        setBro(this.bid_brokerages, order_id, brokerage);
      }
    }
  }

  // Set the selected bank division of the given order to given selected bank division

  setBankDivision(order_id, bank_division_id) {
    for (let bd of this.bank_divisions) {
      if (bd.order_id === order_id) {
        bd.bank_division_id = bank_division_id;
      }
    }
  }

  // Return volume of a specific order

  getOrderVolume(order_id, bid) {
    const getOrderVol = function (order_arr, order_id, year) {
      for (let order of order_arr) {
        if (order.order_id === order_id) {
          return order.volumeAtYear(year);
        }
      }

      return null;
    };

    if (!bid) {
      return getOrderVol(this.offers, order_id, this.year);
    } else {
      return getOrderVol(this.bids, order_id, this.year);
    }
  }

  // Return relative volume of a specific order

  getRelativeOrderVolume(order_id, bid) {
    const getRelVol = function (rvol_arr, order_id) {
      for (let rvol of rvol_arr) {
        if (rvol.order_id === order_id) {
          return rvol.volume;
        }
      }

      return null;
    };

    if (!bid) {
      return getRelVol(this.offers_rvolumes, order_id);
    } else {
      return getRelVol(this.bids_rvolumes, order_id);
    }
  }

  // Return the total volume of all offers

  getTotalOfferVolume() {
    let vol = 0;
    for (let order of this.offers) {
      vol += this.getOrderVolume(order.order_id, false);
    }

    return vol;
  }

  // Return the total volume of all bids

  getTotalBidVolume() {
    let vol = 0;
    for (let order of this.bids) {
      vol += this.getOrderVolume(order.order_id, true);
    }

    return vol;
  }

  // Return the total relative volume of given bid

  getTotalRelativeVolume(bid) {

    const getTotalRelVol = function(rvol_arr) {
      let tot_rvol = 0;
      for (let rvol of rvol_arr) {
        tot_rvol += rvol.volume;
      }
      return tot_rvol;
    };

    if (!bid) {
      return getTotalRelVol(this.offers_rvolumes);
    } else {
      return getTotalRelVol(this.bids_rvolumes);
    }
  }

  // Return brokerage given order_id and bid bool

  getBrokerage(order_id, bid) {
    const getBro = function (bro_arr, order_id) {
      for (let bro of bro_arr) {
        if (bro.order_id === order_id) {
          return bro.brokerage;
        }
      }

      return null;
    };

    if (!bid) {
      return getBro(this.offer_brokerages, order_id);
    } else {
      return getBro(this.bid_brokerages, order_id);
    }
  }

  // Return the selected bank division of the given order_id

  getBankDivision(order_id) {
    let bd = this.bank_divisions.find(bd => bd.order_id === order_id);
    return bd.bank_division_id;
  }

  getAllOrders() {
    return this.bids.concat(this.offers);
  }

  // Get the offers/bids array of this trade

  getOrders(bid) {
    return bid ? this.bids : this.offers;
  }

  setBicBid(newBicBid) {
    this.bic_bid = newBicBid;
  }

  setBicOffer(newBicOffer) {
    this.bic_offer = newBicOffer;
  }

  // Remove an order from this trade

  removeOrder(order_id) {

    const spliceMatching = function (arr, match, field) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i][field] === match) {
          arr.splice(i, 1);
        }
      }
    };

    // Remove the order from offers/bids, brokerages, rvolumes, bank_divisions arrays

    let field = 'order_id';
    spliceMatching(this.offers, order_id, field);
    spliceMatching(this.bids, order_id, field);
    spliceMatching(this.offer_brokerages, order_id, field);
    spliceMatching(this.bid_brokerages, order_id, field);
    spliceMatching(this.offers_rvolumes, order_id, field);
    spliceMatching(this.bids_rvolumes, order_id, field);
    spliceMatching(this.bank_divisions, order_id, field);
  }

  // Return true if this trade contains order

  containsOrder(order_id) {

    if (this.offersContain(order_id) || this.bidsContain(order_id)) {
      return true;
    }

    return false;
  }

  // Return true if this contains order on offer

  offersContain(order_id) {
    for (let offer of this.offers) {
      if (offer.order_id === order_id) {
        return true;
      }
    }

    return false;
  }

  // Return true if this contains order on bid

  bidsContain(order_id) {
    for (let bid of this.bids) {
      if (bid.order_id === order_id) {
        return true;
      }
    }

    return false;
  }

  // Return true if order has a

  hasBrokerage(order) {
    // If order is spread short or fly wing, no brokerage

    if (order.isSpread() && order.spreadLeg(this.year) === 'short'
      || order.isButterfly() && (order.butterflyLeg(this.year) === 'wing1' || order.butterflyLeg(this.year) === 'wing2'))
      return false;

    return true;
  }
}

export default Trade;