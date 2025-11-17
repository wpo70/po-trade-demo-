'use strict';

import quotes from '../stores/quotes';
import ticker from '../stores/ticker';
import active_product from '../stores/active_product';
import products from '../stores/products';
import { round, roundToNearest, addDays, addMonths, getEFPSPS_Dates, toTenor } from './formatting';
import { calc3mSps, calc6mSps } from './pricing_models';
import { get } from 'svelte/store';


// ****** VOLUME CALCULATIONS ******

// Calculate the volume of either leg of a spread given volume of other leg
export function spreadVol(product_id, known_year, unknown_year, known_vol) {
  let dv01_a = quotes.dv01(product_id, known_year);
  let dv01_b = quotes.dv01(product_id, unknown_year);

  let val = (dv01_a / dv01_b) * known_vol;
  return val;
}

// Calculate the volume of either wing of a fly using the body
export function flyWingVolFromBody(product_id, body_year, wing_year, vol) {
  let dv01_body = quotes.dv01(product_id, body_year);
  let dv01_wing = quotes.dv01(product_id, wing_year);

  let val = ((((dv01_body / dv01_wing) / 2) * vol));
  return val;
}

// Calculate the volume of body of a fly using wing
export function flyBodyVolFromWing(product_id, wing_year, body_year, vol) {
  let dv01_wing = quotes.dv01(product_id, wing_year);
  let dv01_body = quotes.dv01(product_id, body_year);

  let val = ((dv01_wing / dv01_body) * 2) * vol;
  return val;
}

// Calculate the volume of a wing using other wing volume
export function flyWingVolFromWing(product_id, wing1_year, wing2_year, vol) {
  let dv01_wing1 = quotes.dv01(product_id, wing1_year);
  let dv01_wing2 = quotes.dv01(product_id, wing2_year);

  let val = (dv01_wing1 / dv01_wing2) * vol;
  return val;
}

// ****** PRICE CALCULATIONS ******

// return spread price
export function spreadPrice(long_leg_price, short_leg_price) {
  return roundToNearest(long_leg_price - short_leg_price, 10000000);
}

// return spread short leg price
export function spreadShortLegPrice(spread_price, long_leg_price) {
  return roundToNearest(long_leg_price - spread_price, 10000000);
}

// return spread long leg price
export function spreadLongLegPrice(spread_price, short_leg_price) {
  return roundToNearest(spread_price + short_leg_price, 10000000);
}

// return fly price
export function flyPrice(body_price, wing1_price, wing2_price) {
  return roundToNearest((2 * body_price) - wing1_price - wing2_price, 10000000);
}

// return fly wing1 price
export function flyWing1Price(fly_price, body_price, wing2_price) {
  return roundToNearest((2 * body_price) - wing2_price - fly_price, 10000000);
}

// return fly body price
export function flyBodyPrice(fly_price, wing1_price, wing2_price) {
  return roundToNearest((fly_price + wing1_price + wing2_price) / 2, 10000000);
}

// return fly wing2 price
export function flyWing2Price(fly_price, wing1_price, body_price) {
  return roundToNearest((2 * body_price) - wing1_price - fly_price, 10000000);
}

export function calcLots(vol, pid, year) {
  // round volume to nearest 0.5
  let volume = roundToNearest(vol, 2);
  if (pid == 17) return volume;

  // get dv01 at year
  let dv01 = quotes.dv01(2, year);

  // Determine which ticker to use (YMA, XMA)
  let tckr
  if (year <= 5) {
    tckr = ticker.getYMA().fut_px_val_bp * 1000;
  } else {
    tckr = ticker.getXMA().fut_px_val_bp * 1000;
  }

  // Calculate futures. Add a check for ticker
  // to prevent division by 0
  let futures;
  if (tckr !== 0) futures = Math.floor(volume * (100 * (dv01 / tckr)));
  else futures = 0;
  return futures;
}

//Calculate relevant Reference for orders

export function getReference(years, prod_id, start_date, fwd_value){
  let ref;
  let pid =  prod_id ?? active_product

  if (pid == 2 || (pid == 1 && (years.length == 1 || years.some(y => y > 3)))){
    if (years.length == 1){
      if (years[0] <= 5){
        ref = get(ticker).yma.ask.toFixed(4);
      }else{
        ref = get(ticker).xma.ask.toFixed(4);
      }
    }else{
      ref = get(ticker).abfs.ask.toFixed(4);
    }
  } else if (pid == 17 || pid == 27) {
    let date = getEFPSPS_Dates();
    let futures = ticker.get90dFutures();
    date.forEach( (val, idx) => {
      if(toTenor(years) === val.tenor){
        ref = futures[idx].ask;
      }
    });
  } else if (pid == 18) {
    let mid;
    let today = new Date();
    today.setHours(0,0,0,0);
    let spot = start_date ? new Date(start_date) : addMonths(addDays(today, 1), 12*fwd_value);
    spot.setHours(0,0,0,0);
    let days = Math.round(spot.getTime() - today.getTime()) / (1000*60*60*24);
    if (years[0] == 0.25) mid = calc3mSps(days);
    else mid = calc6mSps(days);
    ref = mid;
  } else if (products.isFwd(pid)) {
    ref = roundToNearest(quotes.get(products.nonFwd(pid), years[0]).fwd_mids[fwd_value],800);
  } else {
    ref = quotes.mid(pid, years);
    if (products.isPercentageProd(pid) && years.length != 1) ref = round(ref*100, 7);
  }
  return ref;
}