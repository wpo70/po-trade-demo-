'use strict';

import { spreadVol, flyWingVolFromBody } from './calculations.js';

import Interest from './interest';

class Order extends Interest {

  // An order can be constructed from an object that has come from the server vis JSON.

  constructor(rxo) {
    // Copy the fields of the other object and do some checks on the fields.
    super(rxo);
  }

  spreadLeg (year) {
    if (this.years.length !== 2) console.error('spreadLeg() called on non-spread Order');

    if (this.years[0] === year) {
      return 'short';
    } else if (this.years[1] === year) {
      return 'long';
    }

    return null;
  }

  butterflyLeg (year) {
    if (this.years.length !== 3) console.error('butteflyLeg() called on non-buttefly Order');

    if (this.years[0] === year) {
      return 'wing1';
    } else if (this.years[1] === year) {
      return 'body';
    } else if (this.years[2] === year) {
      return 'wing2';
    }

    return null;
  }

  hasSameTenor (o) {
    // Return true if the given order has the same tenor as this order.

    const n = this.years.length;
    if (n !== o.years.length) return false;

    for (let i = 0; i < n; i++) {
      if (this.years[i] !== o.years[i]) return false;
    }

    return true;
  }

  bidAtYear (year) {
    // Return the bid boolean value of this order at the given year

    let idx = this.years.indexOf(year);
    if (this.isOutright() && idx === 0
    || this.isSpread() && idx === 1
    || this.isButterfly() && idx === 1) {
      return this.bid;
    } else {
      return !this.bid;
    }
  }

  volumeAtYear (year) {
    if (!this.years.includes(year)) {
      console.error(`Order.volumeAtYear(): ${year} not found in ${this.years}`);
    }

    if (this.isOutright()) {
      return this.volume;
    } else if (this.isSpread()) {
      let spr_leg = this.spreadLeg(year);

      if (spr_leg === 'short') {
        return spreadVol(this.product_id, this.years[1], year, this.volume);
      } else if (spr_leg === 'long') {
        return this.volume;
      }
    } else if (this.isButterfly()) {
      let fly_leg = this.butterflyLeg(year);

      if (fly_leg === 'wing1') {
        return flyWingVolFromBody(this.product_id, this.years[1], year, this.volume);
      } else if (fly_leg === 'body') {
        return this.volume;
      } else if (fly_leg === 'wing2') {
        return flyWingVolFromBody(this.product_id, this.years[1], year, this.volume);
      }
    }
  }

}

export default Order;
