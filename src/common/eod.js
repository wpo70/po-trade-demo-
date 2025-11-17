import bank_divisions from '../stores/bank_divisions.js';
import banks from '../stores/banks.js';
import traders from '../stores/traders.js';
import products from '../stores/products.js';
import { tickerString } from '../common/ov_trade_mapper.js';
import { toTenor, toRBATenor, toEFPSPSTenor } from './formatting.js';

  /**
   * @type 0 : trades - 1: Swaption - 2: 
   * @eod Our Reference, MarkitWire ID,	USI,	Product Type,	Swap Tenor,	Option Tenor,	Direction	Currency,	Counter Party,	Notional,	Rate/Strike,	Futures,	Clearing house
   */
class EOD {
  constructor(trades, direction, type) {
  
    this.our_reference = trades?.trade_id_ov,
    this.markitwire_id = trades?.markit_id,
    this.markitwire_status = trades?.markit_status,
    this.usi = "",
    this.brokerage = this._brokerage(trades, direction, type),
    this.product_type = this._product_type(trades, direction, type),

    /**
     * @direction payer-buyer (bid) || seller (offer)
     */
    this.your_direction = direction ?  "payer" : "seller",
    this.currency = trades?.currency,
    this.counter_party = this._counter_party(trades, direction, type),
    this.counter_party_trader_name = this._counter_party_trader_name(trades, direction, type),
    this.notional = this._notional(trades, direction, type),
    this.tenor = trades?.product_id !== 20 ? (trades?.product_id !== 17 ? (trades?.year ? toTenor([trades?.year]) : "" ): toEFPSPSTenor(trades?.start_date)) : toRBATenor([trades?.year], trades?.start_date),
    this.settlement = trades?.timestamp ? new Date(trades?.timestamp).toLocaleDateString() : "",
    this.start_date = this._start_date(trades, direction, type),
    this.end_date = trades?.endDate,
    this.breaks = trades?.breaks,
    this.thereafter = trades?.thereafter,
    this.rates_strikes = this._rates_strikes(trades, direction, type),

    /**
     * @lots @bank Buys @fut_ticker @ @fut_strike
     */
    this.futures = (trades?.lots !== null && trades?.lots) ? `${direction? "BUY" : "SELL"} ${trades?.lots} ${tickerString( trades?.year,  trades?.start_date )} @ ${trades?.fut_strike}` :"",
    this.sef = trades?.sef ? "ON" : "OFF",
    this.clearing_house = trades?.clearhouse,
    
    // Swaption only
    this.option_type = trades?.option_type,
    this.option_tenor = trades?.option_expiry,
    this.premium_bp = trades?.premium_bp,
    this.premium_date = trades?.premium_date ? new Date(trades?.premium_date).toLocaleDateString() : "",
    this.swap_start_date = trades?.swap_start_date ? new Date(trades?.swap_start_date).toLocaleDateString() : "",
    this.swap_maturity_date = type == 1 ? trades?.swap_maturity_date :"",
    this.swap_tenor = trades?.swap_term,
    this.swap_settlement = type == 1 ? trades?.settlement : "",
    this.spot_or_fwd = type ==1 ? trades?.spot_or_fwd : "",
    this.rba = trades?.rba
      
  }
  _insertEOD(trades) {
  }
  // insert product type
  _product_type (trades, direction, type) {
    switch(type) {
      case 0:
        return  products.name(trades?.product_id);
      case 1:
        return  "Swaption";
      case 2:
        return trades?.producttype;
    }   
  }
  //insert counter party
  _counter_party (trades, direction, type) {
    switch(type) {
      case 0:
        return trades ? ( direction? banks.get(bank_divisions.get(trades?.offer_bank_division_id).bank_id).bank : banks.get(bank_divisions.get(trades?.bid_bank_division_id).bank_id).bank):"";
      case 1:
        return trades ? ( direction? banks.get(bank_divisions.get(trades?.seller_bank_division).bank_id).bank : banks.get(bank_divisions.get(trades?.buyer_bank_division).bank_id).bank):"";
      case 2:
        return trades ? ( direction? trades?.cpty_2: trades?.cpty) :"";
    }   
  }
  //insert counter party trader name
  _counter_party_trader_name (trades, direction, type) {
    let trader_name ="";
    switch(type) {
      case 0:
        trader_name = trades? (direction ? (trades?.offer_trader_id ? traders.name(trades?.offer_trader_id) : "") : (trades?.bid_trader_id ? traders.name(trades?.bid_trader_id) : "") ): "";
        break;
      case 1:
        trader_name = trades? (direction ? (trades?.seller_id ? traders.name(trades?.seller_id): "") : (trades?.buyer_id ? traders.name(trades?.buyer_id) : "") ): "";
        break;
      case 2:
        trader_name = trades? (direction ? trades?.CptyBTrader : trades?.CptyATrader): "";
        break;
    } 
    return trader_name;  
  }
  //insert notional
  _notional (trades, direction, type) {
    switch(type) {
      case 0:
        return trades?.volume;
      case 1:
        return trades?.notional;
      case 2:
        return parseFloat(trades?.notional /1000000);
    }   
  }
    //insert start date
    _start_date (trades, direction, type) {
      switch(type) {
        case 0:
          return trades?.start_date ? new Date(trades?.start_date).toLocaleDateString(): "";
        case 1:
          return trades?.start_date ? new Date(trades?.start_date).toLocaleDateString(): "";
        case 2:
          return trades?.startDate;
      }   
    }
    _rates_strikes(trades, direction, type) {
      switch(type) {
        case 0:
          return trades?.price;
        case 1:
          return trades?.strike_rate;
        case 2:
          return trades?.rate;
      }   
    }
    _brokerage(trades, direction, type) {
      switch(type) {
        case 0:
          return direction ? trades?.bid_brokerage : trades?.offer_brokerage;
        case 1:
          return direction ? trades?.buyer_brokerage : trades?.seller_brokerage;
        case 2:
          return direction ? trades?.Brokerage_A : trades?.Brokerage_B;
      }   
    }
}
export default EOD;