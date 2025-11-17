'use strict';

import { insertOrders, deleteOrders, updateOrders } from './handle_orders.js';
import user from '../stores/user.js';
import products from '../stores/products.js';
import brokers from '../stores/brokers.js';
import banks from '../stores/banks.js';
import bic from '../stores/bic.js';
import traders from '../stores/traders.js';
import swaption_quotes from '../stores/swaption_quotes.js';
import swaption_orders from '../stores/swaption_orders.js';
import quotes from '../stores/quotes.js';
import prices from '../stores/prices.js';
import ticker from '../stores/ticker.js';
import brokerages from '../stores/brokerages.js';
import interest_groups from '../stores/interest_groups.js';
import bank_divisions from '../stores/bank_divisions.js';
import currency_state from '../stores/currency_state.js';
import active_product from '../stores/active_product.js';
import trade_count from '../stores/trade_count.js';
import swaptions_count from '../stores/swaptions_count.js';
import liquidity_trade_count from '../stores/liquidity_trade_count.js';
import { get } from 'svelte/store';
import calc_inputs from '../stores/calc_inputs.js';
import swaption_prices from '../stores/swaption_prices.js';
import swaption_market_structures from '../stores/swaption_market_structures.js';
import trades from '../stores/trades.js';
import liquidityTrades from '../stores/liquidityTrades.js';
import trade_reviews from '../stores/trade_reviews.js';
import notifications from '../stores/notifications.js';
import preferences from '../stores/preferences.js';
import { addDays, timestampToISODate } from './formatting';
import dailyfx from '../stores/fxrate.js';
import ocos from '../stores/ocos.js';
import { addToast } from '../stores/toast';
import data_collection_settings from '../stores/data_collection_settings.js';
import confos from '../stores/confos.js';
import report from '../stores/report.js';
import custom_whiteboards from '../stores/custom_whiteboards.js';
import { markitwire, websocket as ws_store } from '../stores/connections.js';
import config from "../../config.json";
import { validateTime } from "./time_validation.js";

let initialisationComplete = false;
const websocket = {

  socket: null,
  callbacks: {},


  // This submits the login credentials to the server using a promise.  If they
  // are accepted it creates a new promise to make a websocket connection.  On a
  // successful connection it send a request via for the
  // Temporary code to allow logins to work. FIXME: The real code should do this via AJAX.

  submitLogin: function (credentials) {

    return fetch('/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
      .then(response => {
        // If the login failed throw an exception.

        if (response.status !== 200) {
          throw new Error('Login failed');
        }

        // Create a promise that gets and returns the websocket.

        return new Promise(function (resolve, reject) {
          const loc = window.location;
          var ws = new WebSocket(`${config.env == 'prod' ? 'wss' : 'ws'}://` + loc.host + loc.pathname);
          websocket.socket = ws;

          // Set up handlers for the web socket.  When the connection opens the
          // promise.  If the connection fails to open reject with an error.

          ws.onopen = function () {
            ws_store.set(true);
            resolve(ws);
          };

          ws.onerror = function (err) {
            console.log(err);
            reject(err);
          };

          // Handle ws disconnects

          ws.onclose = function (event) {
            console.log(event);
            // Using store instead of just logging out/reloading as it allows for graceful ui notification to the user (and if its due to the server going down, cannot reload page anyway)
            ws_store.set(false);
            initialisationComplete = false;
          };

          // Set up an incoming message handler.

          ws.onmessage = function (event) {
            if (JSON.parse(event.data).hasOwnProperty("ping")) {
              ws.send(JSON.stringify({ ping: 0 }))
            }
            
            // Check if PC time matches server time, force logout time is wrong
            if(!validateTime()){
              // Parse the JSON message and process it.
              var msg = JSON.parse(event.data);
              // Make sure the message is not empty.
              if (Object.keys(msg).length === 0) {
                return;
              }
              websocket.receiveMessage(msg);
            } else {
              ws.close();
              window.location.reload();
            }
          };
        });
      })
      .then(ws => {
        // The websocket connection is up and running.  Make a request for all
        // initial data.

        ws.send(JSON.stringify({ initialize_me: 0 }));
        return ws;
      });
  },

  //Click Log out button and clear the user ID, cookies
  handlerLogout: function () {
    return fetch('/logout',{
      method: 'GET'
    }).then(response => {
      initialisationComplete = false;
    });
  },

  // Submit a change password request to the server
  submitPasswordChange: function (credentials) {
    return fetch('/change_password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
      .then(response => {
        // If the login failed throw an exception.

        if (response.status !== 200) {
          if (response.status === 401) {
            throw new Error('Incorrect current password');
          }

          if (response.status === 412) {
            throw new Error('New passwords must match');
          }

          throw new Error('Password change failed');
        }
      });
  },

  // If temporary password is used, Redirects to change password right away
  // and changes the password.
  submitTemporaryPasswordChange: function (credentials) {
    return fetch('/change_temporary_password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
      .then(response => {
        // If the login failed throw an exception.
        if (response.status !== 200) {
          if (response.status === 401) {
            throw new Error('Incorrect current password');
          }
          if (response.status === 412) {
            throw new Error('New passwords must match');
          }
          throw new Error('Password change failed');
        }
      });
  },

  //Email handling
  submitTemporaryPassword: function (credentials) {
    return fetch('/temp_pass', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })
      .then(response => {
        // If the login failed throw an exception.

        if (response.status !== 201) {
          if (response.status === 401) {
            throw new Error('Incorrect current email');
          }
          if (response.status === 412) {
            throw new Error('New email must match');
          }
          throw new Error('email change failed');
        }
      });
  },

  // Forgot password
  submitForgotPassword: function (credentials) {
    return fetch('/handle_forgot_password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    // Passing error message if want to check email is sent.
    // .then(response => {
    //   // If email failed to send, throw an exception.
    //   if (response.status !== 201) {
    //     throw new Error('Failed to Send');
    //   }
    // });
  },

  // Send Report Email
  emailReport: async function (addresses, addressesCC, subject, report, textContent, filename) {
    return fetch('/send_report', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({addresses, addressesCC, subject, report, textContent, filename}),
    }).then(response => {
      // If email failed to send, throw an exception.
      if (response.status !== 201) {
        throw new Error('Failed to Send');
      }
    });
  },

  // This function can probably be removed. prefs are gotten on initial and returned whenever updated, so there's no need to query the db for the prefs otherwise
  getBrokerPrefs: function (broker_id) {
    websocket.socket.send(JSON.stringify({ get_broker_preferences: broker_id }));
  },
  
  /** This expects a json in the form '{ broker_id: broker_id or 999 for global, key, value }' where key is the db col header and value is the new field value */
  updateBrokerPrefs: function (json) {
    websocket.socket.send(JSON.stringify({ update_broker_preferences: json }));
  },
  
  /** This expects a json in the form '{ product_id, years, change: "add" or "remove" }' */
  updateWhiteboardGlobal: function (json) {
    websocket.socket.send(JSON.stringify({ update_whiteboard_global: json }));
  },

  /* The following Custom WB [Whiteboard] functions all expect wb to be a custom wb object */
  addUpdateCustomWB: function (wb, type) {
    if (!type) {
      type = wb.board_id ? "update" : "add";
    }
    if (type == "add") {
      websocket.socket.send(JSON.stringify({ new_custom_wb: wb }));
    } else if (type == "update") {
      websocket.socket.send(JSON.stringify({ update_custom_wb: wb }));
    }
  },

  deleteCustomWB: function (wb) {
    websocket.socket.send(JSON.stringify({ delete_custom_wb: wb }));
  },

  shareCustomWB: function (wb, recipient) {
    websocket.socket.send(JSON.stringify({ export_custom_wb: {wb, recipient} }));
  },

  swapCustomWBs: function (board_id1, board_id2) {
    websocket.socket.send(JSON.stringify({ swap_custom_wbs: {board_id1, board_id2} }))
  },

  /**
   * Used this function for RBAOIS
   * @param {*} offerOrder 
   * @param {*} bidOrder 
   * @param {*} tradeTicket 
   */
  submitTicketWithOrders: function (offerOrder, bidOrder, tradeTicket) {
    if(tradeTicket.start_date?.length > 0) {
      tradeTicket.start_date = new Date(tradeTicket.start_date);
    } else {
      // T+2 for USD, NZD, CCBasisSwaps
      tradeTicket.start_date = addDays(
        ( products.isXccy(tradeTicket.product_id ?? get(active_product)) || products.isNZD(tradeTicket.product_id ?? get(active_product)) || products.isUSD(trades?.product_id ?? get(active_product))) ? 
          addDays(new Date(), 1, tradeTicket.product_id ?? get(active_product)) : new Date(), 1, tradeTicket.product_id ?? get(active_product));
    }
    
    const orders_with_ticket = {offer: offerOrder, bid: bidOrder, ticket: tradeTicket};
    websocket.socket.send(JSON.stringify({ insert_ticket_with_orders: orders_with_ticket })); 
  },

  // This submits the order insert/update.

  submitOrder: function (order, trUpdate) {
    // Send the order to the server, if order_id === 0 it is a new order.
    // Otherwise it is an update.

    if (order.order_id === 0) {
      // Don't send the order_id field when inserting a new order.
      websocket.socket.send(JSON.stringify({ insert_orders: [order] }));
    } else {
      websocket.socket.send(JSON.stringify({ update_orders: [order] }));
      
      if (trUpdate) {
        let tr = trade_reviews.containsOrder(order.order_id);
        if (tr != null && tr.orders.includes(order.order_id)){
          tr.reviewed_by = [];
          tr.status = "New";
          websocket.updateTradeReview(tr);
        }
      }
    }
  },

  submitSwaptionOrder: function (order) {
    let message;

    if (order.order_id === 0) {
      message = { insert_swaption_live_orders: [order] };
    } else {
      message = { update_swaption_live_orders: [order] };
    }

    websocket.socket.send(JSON.stringify(message));
  },

  deleteSwaptionOrders: function (order_ids) {
    websocket.socket.send(JSON.stringify({ delete_swaption_live_orders: order_ids }));
  },

  // This command asks for all quotes for a product from Bloomberg

  getQuotes: function (product_id) {

    if ([17,27].includes(product_id) || products.isFwd(product_id) || (get(data_collection_settings).calcOIS && product_id == 3)){
      return;
    }
    
    if ([1,2].includes(product_id)){
      product_id = [1,2];
    } else if ([28,29].includes(product_id)){
      product_id = [28,29];
    } else if (product_id == 18) {
      product_id = [1,5];
    }

    if(typeof product_id != "number") {
      if (get(data_collection_settings).calcIRS && product_id.includes(1)) {
        let securities = [quotes.get(1,0.25).security, quotes.get(1,0.5).security, quotes.get(1,0.75).security, quotes.get(1,1).security];
        let fields = ["PX_MID", "SW_CNV_RISK"];
        websocket.socket.send(JSON.stringify({ get_specific_quotes: {securities, fields} }));
        product_id.splice(product_id.indexOf(1), 1);
        if (!product_id.includes(2)) product_id.push(2);
      }
      for (let id of product_id) {
        if (get(data_collection_settings).calcOIS) continue;
        websocket.socket.send(JSON.stringify({ get_quotes: id }));
      }
    } else {
      websocket.socket.send(JSON.stringify({ get_quotes: product_id }));
    }
  },

  // This command asks for the currency state updated from Navigation Bar drop down

  getCurrency: function (currency_state) {
    websocket.socket.send(JSON.stringify({ get_currency: currency_state }));
  },
  // This command overrides a quote.

  overrideQuote: function (indicator, override,currency_code) {
    const msg = {
      override_quote: {
        product_id: indicator.product_id,
        year: indicator.year,
        override: override,
        mid: indicator.mid,
        security: indicator.security,
        nmx_security: indicator.nmx_security,
        currency_code: currency_code
      }
    };
    websocket.socket.send(JSON.stringify(msg));
  },
  overrideFX: function (fx, ovr) {
    const msg = {
      override_fx : {
        fx: fx,
        override: ovr 
      }
    };
    // send msg to backend
    websocket.socket.send(JSON.stringify(msg));
    // override fx on store
    dailyfx.overrideFX(fx, ovr);
  },

  updateSwaptionQuotes: function (quotes) {
    websocket.socket.send(JSON.stringify({ update_swaption_quotes: quotes }));
  },

  addSwaptionOrder: function (order) {
    websocket.socket.send(JSON.stringify({ add_swaption_order: order }));
  },

  refreshSwaptionOrders: function () {
    websocket.socket.send(JSON.stringify({ refresh_swaption_orders: 0 }));
  },

  modifyOCO: function (input) {
    websocket.socket.send(JSON.stringify({ modify_oco: input }));
  },

  clearAllOCOs: function () {
    websocket.socket.send(JSON.stringify({ clear_all_ocos: 0 }));
  },

  setOCOColour: function (input) {
    websocket.socket.send(JSON.stringify({ update_oco_colour: input }));
  },

  addCalcInput: function (input) {
    websocket.socket.send(JSON.stringify({ add_calc_input: input }));
  },

  updateCalcInput: function (input) {
    websocket.socket.send(JSON.stringify({ update_calc_input: input }));
  },

  deleteCalcInput: function (input_ids) {
    websocket.socket.send(JSON.stringify({ delete_calc_input: input_ids }));
  },

  addTradeReview: function (input) {
    websocket.socket.send(JSON.stringify({ add_trade_review: input }));
  },

  updateTradeReview: function (input) {
    websocket.socket.send(JSON.stringify({ update_trade_review: input }));
  },

  deleteTradeReview: function (input) {
    websocket.socket.send(JSON.stringify({ delete_trade_reviews: input }));
  },

  addConfo: function (input) {
    websocket.socket.send(JSON.stringify({ insert_confos: input }));
  },

  deleteConfos: function (input) {
    websocket.socket.send(JSON.stringify({ delete_confos: input }));
  },

  refreshConfos: function (input) {
    websocket.socket.send(JSON.stringify({ refresh_confos: input }));
  },

  refreshNotifications: function (after) {
    websocket.socket.send(JSON.stringify({ refresh_notifications: after}));
  },

  sendNotifications: function (input) {
    websocket.socket.send(JSON.stringify({ send_notifications: input }));
  },

  deleteNotification: function (notif_id) {
    websocket.socket.send(JSON.stringify({ delete_notification: notif_id}));
  },

  refreshOrders: function () {
    websocket.socket.send(JSON.stringify({ refresh_trades: 0 }));
  },
  
  refreshLiquidityTrades: function () {
    websocket.socket.send(JSON.stringify({ refresh_liquidity_trades: 0 }));
  },

  refreshCounts: function () {  // refreshes all count stores with latest counts
    websocket.socket.send(JSON.stringify({ refresh_swaption_counts: 0 }));
    websocket.socket.send(JSON.stringify({ refresh_trade_counts: 0 }));
    websocket.socket.send(JSON.stringify({ refresh_liquidity_counts: 0 }));
  },

  favouriteCurrentTrader: function(trader_ids, current_broker_id) {
    websocket.socket.send(JSON.stringify({
      update_broker_preferences: {broker_id: current_broker_id, key: 'trader_favourites', value: trader_ids} }))
  },
  // This deletes any number of orders.

  deleteOrders: function (order_ids) {
    for (let id of order_ids) {
      let tr = trade_reviews.containsOrder(id);
      if (tr != null){
        websocket.updateTradeReview({
          review_id: tr.review_id,
          orders: tr.orders,
          status: "Finished"
        });
        websocket.deleteTradeReview([tr.review_id]);
      }
    }
    websocket.socket.send(JSON.stringify({ delete_orders: order_ids })); 
  },

  // This deletes any number of orders at a specified time.

  deleteOrdersAtTime: function (order_ids, time) {
    websocket.socket.send(JSON.stringify({ delete_orders_at_time: order_ids, time: time }));
  },

  // This submits completed trades

  insertTickets: function (tickets) {
    tickets = structuredClone(tickets);
    for(let idx in tickets.tickets){
      let ticket = tickets.tickets[idx];
      ticket.start_date = timestampToISODate(new Date(ticket.start_date));
      tickets.tickets[idx] = ticket;
    }
    websocket.socket.send(JSON.stringify({ insert_tickets: tickets }));
  },

  // Pass submitted trades on to Oneview

  submitOvTickets: function (ov_tickets) {
    websocket.socket.send(JSON.stringify({ submit_ov_tickets: ov_tickets }));
  },
  // Pass submitted trades on to Markit

  submitTickets: function (mk_tickets) {
    console.log(mk_tickets);
    websocket.socket.send(JSON.stringify({ submit_tickets: mk_tickets }));
  },
  // Brokerages have been updated, update brokerages

  updateBrokerages: function (brokerages) {
    websocket.socket.send(JSON.stringify({ update_brokerages: brokerages }));
  },

  // This function should be fed the initial data from the server,
  // and will initialize all the stores in the correct order

  initialize: function (msg) {
    user.set(msg.user);
    preferences.set(msg.init_prefs);
    products.set(msg.init_products);
    brokers.set(msg.init_brokers);
    ocos.init(msg.init_banks);
    delete msg.init_banks.ocos;
    delete msg.init_banks.oco_colours;
    banks.set(msg.init_banks);
    bic.set(msg.init_bic);
    traders.set(msg.init_traders);
    quotes.set(msg.init_quotes);
    brokerages.set(msg.init_brokerages);
    interest_groups.set(msg.init_interest_groups);
    bank_divisions.set(msg.init_bank_divisions);
    trade_reviews.set(msg.init_trade_reviews);
    notifications.set(msg.init_notifications);
    confos.set(msg.init_confos);
    calc_inputs.set(msg.init_calc_inputs);
    data_collection_settings.setGateways(msg.init_gateways);
    data_collection_settings.setCalcIRS(msg.calcIRS);
    data_collection_settings.setCalcOIS(msg.calcOIS);
    data_collection_settings.setStraightInterp(msg.interpChoice);
    swaption_quotes.setBBSW(msg.init_swaption_quotes);
    swaption_quotes.setRBA(msg.init_rba_swaption_quotes);
    swaption_market_structures.set(msg.init_swaption_structure);
    swaption_orders.set_Swaptions(msg.init_swaption_orders);
    trades.set_trades(msg.init_trades);
    liquidityTrades.set_trades(msg.init_liquidityTrades);
    dailyfx.set(msg.init_fxrate);
    quotes.setRbaDates(msg.init_rba_dates);
    markitwire.set({connected: msg.init_markitwire, env : msg.init_markitwire_env, active: msg.init_markitwire_active});
    report.set(msg.init_eod);

    for(let pid of get(products)) {
      prices.defaultPrices(pid.product_id);
    }

    custom_whiteboards.init(msg.init_custom_wbs);
    initialisationComplete = true;
  },
  // This updates report email
  updateReportEmail: function(report) {
    let msg;
    if (report.id === 0 ) {
      msg = JSON.stringify({ insert_report_email: [report] });
    } else {
      msg = JSON.stringify({ update_report_email: [report] });
    }
    websocket.socket.send(msg);
  },

  // This sumbits the deletion of report email
  deleteReportEmail: function(report_email_ids) {
    websocket.socket.send(JSON.stringify({
      delete_report_emails: report_email_ids
    }));
  },

  // This submits the either insertion or update of a trader

  submitTrader: function (trader) {
    // If the trader is passed in without a trader id of 0, insert
    // a new trader. Otherwise, update the trader with the trader id
    // given
    let msg;
    if (trader.trader_id === 0) {
      msg = JSON.stringify({ insert_traders: [trader] });
    } else {
      msg = JSON.stringify({ update_traders: [trader] });
    }
    websocket.socket.send(msg);
  },

  // This submits the deletion of a trader

  deleteTrader: function (trader_ids) {
    websocket.socket.send(JSON.stringify({
      delete_traders: trader_ids
    }));
  },

  submitBroker: function (broker) {
    // If the trader is passed in without a trader id of 0, insert
    // a new trader. Otherwise, update the trader with the trader id
    // given
    let msg;
    if (broker.broker_id === 0) {
      msg = JSON.stringify({ insert_brokers: [broker] });
    } else {
      msg = JSON.stringify({ update_brokers: [broker] });
    }
    websocket.socket.send(msg);
  },

  // This submits the deletion of a trader

  deleteBroker: function (broker_ids) {
    websocket.socket.send(JSON.stringify({
      delete_brokers: broker_ids
    }));
  },

  submitSwaptionMarketStructure: function (swaption_struct) {
    let msg;
    if(swaption_struct.id === 0) {
      msg = JSON.stringify({ add_swaption_structure: swaption_struct });
    } else {
      msg = JSON.stringify({ update_swaption_structure: swaption_struct });
    }
    websocket.socket.send(msg);
  },

  deleteSwaptionMarketStructure: function (ids) {
    websocket.socket.send(JSON.stringify({ delete_swaption_structure: ids }));
  },

  setCalcIRS: function (bool) {
    websocket.socket.send(JSON.stringify({ setCalcIRS: bool }));
  },

  setCalcOIS: function (bool) {
    websocket.socket.send(JSON.stringify({ setCalcOIS: bool }));
  },

  setStraightInterp: function (bool) {
    websocket.socket.send(JSON.stringify( { setStraightInterp: bool}))
  },

  disconnectGateway: function (id) {
    websocket.socket.send(JSON.stringify({ disconnectGateway: id }));
    data_collection_settings.removeGateway(id);
  },

  requestPriceHistory: function (years, product_id, fwd, start) {
    websocket.socket.send(JSON.stringify({ requestPriceHistory: {years, product_id, fwd, start}}));
  },

  // calls the given function, with the given parameters
  // Then when the message given by the supplied callbacktigger comes back, call the supplied call back function
  callFunctionWithCallback: function (mainFunction, params, callbackTrigger, callbackFunction) {
    this.callbacks[callbackTrigger] = callbackFunction;
    mainFunction(...params);
  },

  // Set a function to call when the given message comes back
  setMessageCallback: function (callbackTrigger, callbackFunction) {
    this.callbacks[callbackTrigger] = callbackFunction;
  },

  receiveMessage: function (msg) {

     var product_ids;
    // The server message is an object, with separate messages held in different
    // properties.  That allows a single message to convey any number of data
    // types.

    // Make sure the message is not empty.

    if (Object.keys(msg).length === 0) {
      console.error('Received a message with no content');
    }

    // If a message has been received with the "init_products" property we can assume
    // this is the initialize message
    if (msg.hasOwnProperty('init_products')) this.initialize(msg);

    if (!initialisationComplete) {return;}

    // Handle all possible actions in a pre-determined order.
    if (msg.hasOwnProperty('security_data')) {
      ticker.set(msg.security_data);
    }
    // Handle fx data from bloomberg
    if (msg.hasOwnProperty('fx_data')) {
      dailyfx.updateFX(msg.fx_data);
    }
    // update stores with updated data from ov
    if(msg.hasOwnProperty('update_ov_id')) {
      // Add Toast 
      msg.update_ov_id.forEach(updatedRow => {
        if (updatedRow.message) {
          addToast ({
            message: updatedRow.message,
            type: "success",
            dismissible: true,
            timeout: 6000,
          });
        }
      });
      // Add to DataBase
      msg.update_ov_id.forEach(updatedRow => {
        switch(updatedRow.table) {
          case 'trades':
            delete updatedRow.table;
            delete updatedRow.message;
            trades.updateTrade(updatedRow);
            break;
          case 'swaption_orders':
            delete updatedRow.table;
            delete updatedRow.message;
            swaption_orders.updateSwaption(updatedRow);
            break;            
        }
      });
    }

    // The next two messages require whiteboard mids to be recalculated.
    if (msg.hasOwnProperty('set_quotes')) {
      // filter the data in currency_code
      quotes.refresh(msg.set_quotes);

      product_ids = [];
      for (let i = 0; i < msg.set_quotes.length; i++){
        if (!product_ids.includes(msg.set_quotes[i].product_id)){
          product_ids.push(msg.set_quotes[i].product_id);
          if (product_ids.length > 2){
            product_ids = products.ids();
            break;
          }
        }
      }
      prices.recalculateMids(product_ids);
    }

    if (msg.hasOwnProperty('override_quotes')) {
      // filter the data in currency_code
      quotes.override(msg.override_quotes);
      product_ids = msg.override_quotes.map(ovr => ovr.product_id);
      prices.recalculateMids(product_ids);
    }

    if (msg.hasOwnProperty('update_swaption_quotes')) swaption_quotes.setBBSW(msg.update_swaption_quotes);
    if (msg.hasOwnProperty('update_rba_swaption_quotes')) swaption_quotes.setRBA(msg.update_rba_swaption_quotes);

    if (msg.hasOwnProperty('insert_traders')) msg.insert_traders.forEach((trader) => traders.add(trader));
    if (msg.hasOwnProperty('update_traders')) msg.update_traders.forEach((trader) => traders.update(trader));
    if (msg.hasOwnProperty('delete_traders')) traders.remove(msg.delete_traders);

    if (msg.hasOwnProperty('insert_brokers')) msg.insert_brokers.forEach((broker) => brokers.add(broker));
    if (msg.hasOwnProperty('update_brokers')) {
      msg.update_brokers.forEach((broker) => {
        brokers.update(structuredClone(broker));
        if (broker.broker_id === user.get()){
          user.set(structuredClone(broker));
        }
      });
    }

    if (msg.hasOwnProperty('delete_brokers')) brokers.remove(msg.delete_brokers);

    if (msg.hasOwnProperty('insert_swaption_live_orders')) { msg.insert_swaption_live_orders.forEach(order => swaption_prices.add(order)); }
    if (msg.hasOwnProperty('delete_swaption_live_orders')) { msg.delete_swaption_live_orders.forEach(oid => swaption_prices.delete(oid)); }
    if (msg.hasOwnProperty('update_swaption_live_orders')) { msg.update_swaption_live_orders.forEach(order => swaption_prices.update(order)); }

    if (msg.hasOwnProperty('user')) user.set(msg.user);

    if (msg.hasOwnProperty('get_broker_preferences')) preferences.getBrokerPrefs(msg.get_broker_preferences);
    if (msg.hasOwnProperty('update_broker_preferences')) preferences.updateBrokerPrefs(msg.update_broker_preferences);
    if (msg.hasOwnProperty('update_whiteboard_global')) prices.updateFromGlobal(msg.update_whiteboard_global);

    if (msg.hasOwnProperty('new_custom_wb')) custom_whiteboards.receiveNewWB(msg.new_custom_wb);
    if (msg.hasOwnProperty('import_custom_wb')) {if (msg.import_custom_wb.recipient == user.get()) { custom_whiteboards.importWB(msg.import_custom_wb.wb); }}

    if (msg.hasOwnProperty('insert_orders')) insertOrders(msg.insert_orders);
    if (msg.hasOwnProperty('update_orders')) updateOrders(msg.update_orders);
    if (msg.hasOwnProperty('delete_orders')) deleteOrders(msg.delete_orders);

    if (msg.hasOwnProperty('modify_oco')) { msg.modify_oco.forEach(oco => ocos.modifyOCO(oco)); }
    if (msg.hasOwnProperty('update_oco_colour')) ocos.setOCOColour(msg.update_oco_colour.bank_id, msg.update_oco_colour.oco_colour);

    if (msg.hasOwnProperty('add_calc_input')) calc_inputs.add(msg.add_calc_input);
    if (msg.hasOwnProperty('delete_calc_input')) calc_inputs.remove(msg.delete_calc_input);
    if (msg.hasOwnProperty('update_calc_input')) calc_inputs.update_inputs(msg.update_calc_input);

    if (msg.hasOwnProperty('insert_trade_reviews')) trade_reviews.add(msg.insert_trade_reviews);
    if (msg.hasOwnProperty('update_trade_review')) trade_reviews.update_review(msg.update_trade_review);
    
    if (msg.hasOwnProperty('receive_notifications')) { msg.receive_notifications.forEach(n => notifications.add(n)); }    

    if (msg.hasOwnProperty('update_brokerages')) brokerages.updateBrokerages(msg.update_brokerages);
    if (msg.hasOwnProperty('trade_count')) trade_count.setTotal(msg.trade_count);
    if (msg.hasOwnProperty('monthly_trades')) trade_count.setMonthly(msg.monthly_trades);
    if (msg.hasOwnProperty('daily_trades')) trade_count.setDaily(msg.daily_trades);
    if (msg.hasOwnProperty('pending_trades')) trade_count.setPending(msg.pending_trades);

    if (msg.hasOwnProperty('add_swaption_order')) msg.add_swaption_order.forEach(order => swaption_orders.addSwaption(order));
    if (msg.hasOwnProperty('insert_tickets')) msg.insert_tickets.forEach(order => trades.addTrade(order));

    if (msg.hasOwnProperty('add_swaption_structure')) swaption_market_structures.add(msg.add_swaption_structure);
    if (msg.hasOwnProperty('delete_swaption_structure')) swaption_market_structures.remove(msg.delete_swaption_structure);
    if (msg.hasOwnProperty('update_swaption_structure')) swaption_market_structures.update(msg.update_swaption_structure);

    if (msg.hasOwnProperty('refresh_trades')) trades.set_trades(msg.refresh_trades);
    if (msg.hasOwnProperty('refresh_swaption_orders')) swaption_orders.set_Swaptions(msg.refresh_swaption_orders);
    if (msg.hasOwnProperty('refresh_liquidity_trades')) liquidityTrades.set_trades(msg.refresh_liquidity_trades);

    if (msg.hasOwnProperty('swaptions_count')) swaptions_count.setTotal(msg.swaptions_count);
    if (msg.hasOwnProperty('monthly_swaptions')) swaptions_count.setMonthly(msg.monthly_swaptions);
    if (msg.hasOwnProperty('daily_swaptions')) swaptions_count.setDaily(msg.daily_swaptions);
    if (msg.hasOwnProperty('pending_swaptions')) swaptions_count.setPending(msg.pending_swaptions);

    if (msg.hasOwnProperty('refresh_swaption_counts')) swaptions_count.setAll(msg.refresh_swaption_counts);
    if (msg.hasOwnProperty('refresh_trade_counts')) trade_count.setAll(msg.refresh_trade_counts);
    if (msg.hasOwnProperty('refresh_liquidity_counts')) liquidity_trade_count.setAll(msg.refresh_liquidity_counts);
    
    if (msg.hasOwnProperty('setCalcIRS')) data_collection_settings.setCalcIRS(msg.setCalcIRS);
    if (msg.hasOwnProperty('setInterpChoice')) data_collection_settings.setStraightInterp(msg.setInterpChoice);
    if (msg.hasOwnProperty('setCalcOIS')) data_collection_settings.setCalcOIS(msg.setCalcOIS);
    if (msg.hasOwnProperty('gateway_connected')) data_collection_settings.addGateway(msg.gateway_connected);
    if (msg.hasOwnProperty('gateway_disconnected')) data_collection_settings.removeGateway(msg.gateway_disconnected);
    if (msg.hasOwnProperty('gateway_updated')) data_collection_settings.updateGateway(msg.gateway_updated);
    if (msg.hasOwnProperty('delete_trade_reviews')) {trade_reviews.remove(msg.delete_trade_reviews);}

    if (msg.hasOwnProperty('set_fwd_mids')) quotes.updateFWDMids(msg.set_fwd_mids);
    
    if (msg.hasOwnProperty('insert_confos')) confos.add(msg.insert_confos[0]);
    if (msg.hasOwnProperty('delete_confos')) confos.remove(msg.delete_confos);
    if (msg.hasOwnProperty('refresh_confos')) confos.update_confo(msg.refresh_confos);

    // When the app connected, wait until it sends out the martkitwire connection env. 
    // The signal Markitwire is only recognized if it is fully logged into Markitwire environment, 
    if (msg.hasOwnProperty('markit_connection_env')) markitwire.set({
                                                                      connected : true,
                                                                      env: msg.markit_connection_env,
                                                                      active: true
                                                                    });
    // If markit logged out/in but still connected, set markit active to false/true                                                               
    if (msg.hasOwnProperty('markit_active')) markitwire.update_active(msg.markit_active);
    // Set markit connection to true
    if (msg.hasOwnProperty('markit_connection')) markitwire.updated_connection(true);
    // Reset markitwire store
    if (msg.hasOwnProperty('markit_disconnected')) {
      markitwire.updated_connection(false);
      markitwire.update_active(false);
    }
    // Update report email
    if (msg.hasOwnProperty("update_report_email")) report.updateReportEmail(msg.update_report_email);
    // Create report email
    if (msg.hasOwnProperty("insert_report_email")) report.addReportEmail(msg.insert_report_email);
    // Remove Report Email
    if (msg.hasOwnProperty("delete_report_emails")) report.removeReportEmails(msg.delete_report_emails);

    // run relavent callbacks
    for (const [key, value] of Object.entries(msg)) {
      if (this.callbacks.hasOwnProperty(key)){
        let callback = this.callbacks[key];
        callback(value);
        delete this.callbacks[key];
      }
    }
  },
};

export default websocket;
