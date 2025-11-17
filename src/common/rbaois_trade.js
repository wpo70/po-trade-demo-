import { convertDateToString, tenorToYear } from './formatting.js';
import trades from '../stores/trades.js';
import Order from "./order.js";
import { getBrokerage } from './brokerages.js';

class RBAOIS_TradeObject {

  // naming floating_payer_id should be put in context of spread-trades
  constructor(fields, floating_payer_id, fixed_payer_id, bic_offer, bic_bid, breaks, thereafter, term, start_date, expiry_date) {
    this.product_id = fields.rba ? 20: 3,
    this.fixed_payer_id =  floating_payer_id,
    this.fixed_bank_division_id =  null,
    this.floating_payer_id =  fixed_payer_id,
    this.floating_bank_division_id =  null,
    this.notional =  fields.notional,
    this.rate = fields.rate,
    this.expiry_date =  convertDateToString(expiry_date),
    this.term =  term,
    this.start_date =  convertDateToString(start_date),
    this.sef =  fields.sef,
    this.rba =  fields.rba,
    this.timestamp =  new Date(),
    this.currency =  "AUD",
    this.breaks = breaks,
    this.thereafter = thereafter,
    this.clearhouse =  fields.clearhouse,
    this.bid_brokerage =  null,
    this.offer_brokerage =  null,
    this.bic_bid =  bic_offer,
    this.bic_offer =  bic_bid,
    this.clearhouse = 'LCH';
    this.trade_id_ov = `TRADE${Math.floor(Math.random() * 1000)}-${new Date().getTime()}-${trades.getTradeIdMax() + 1}`;
    this._addbrokerage(fields);
  }
  _addbrokerage (fields) {
    let years = [parseFloat(tenorToYear(this.term))];
    let bid_bkge_order = new Order({
      trader_id: this.fixed_payer_id,
      product_id: this.product_id,
      years: years,
      price: this.rate,
      volume: this.notional,
      expiry_date: this.expiry_date,
      spread_expiry_date: fields.spread_expiry_date
    });
    let offer_bkge_order = new Order({
      trader_id: this.floating_payer_id,
      product_id: this.product_id,
      years: years,
      price: this.rate,
      volume: this.notional,
      expiry_date: this.expiry_date,
      spread_expiry_date: fields.spread_expiry_date
    });
    this.bid_brokerage = getBrokerage(bid_bkge_order, this.notional);
    this.offer_brokerage = getBrokerage(offer_bkge_order, this.notional);
  }
}
export default RBAOIS_TradeObject;