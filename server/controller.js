'use strict';

const { overrideQuote, setCalcIRS_quotes, getPriceHistory, setLinearInterp } = require('./db/quotes.js');
const { insertSwaptionQuotes } = require('./db/swaption_quotes.js');
const { insertSwaptionOrder, refreshSwaptionOrders, getAllSwaptionCounts } = require('./db/swaption_orders.js');
const { refreshLiquidityTrades, getAllLiquidityCounts } = require ('./db/liquidity_trades.js');
const { insertOrders, updateOrders, deleteOrders } = require('./db/orders.js');
const { initialData } = require('./db/initial_data.js');
const { sendToAllClients, sendToOneClient, sendToGateway, sendToMarkit, sendToSpecificGateway } = require('./send.js');
const { sendToOneview } = require('./ov_api.js');
const { insertTickets, refreshTrades, tradeCount, tradesThisMonth, getAllTradeCounts} = require('./db/trades.js');
const { updateBrokerages } = require('./db/brokerages.js');
const { sessions, activeMarkit, MarkitLoggedIn } = require('./map.js');
const { logger } = require('./utils/logger.js');
const { insertTraders, updateTraders, deleteTraders, updateReportEmail, insertReportEmail, deleteReportEmails } = require('./db/traders.js');
const { insertBrokers, updateBrokers, deleteBrokers } = require('./db/brokers.js');
const { modifyOCO, clearAllOCOs, setOCOColour } = require('./db/ocos.js');
const { insertCalcInputs, updateCalcInputs, deleteCalcInputs } = require('./db/calc_inputs.js');
const { insertSwaptionLiveOrders, updateSwaptionLiveOrders, deleteSwaptionLiveOrders } = require('./db/swaption_live_orders.js');
const { addSwaptionStructure, deleteSwaptionStructures, updateSwaptionStructures } = require('./db/swaption_market_structures.js');
const { insertTradeReviews, updateTradeReviews, deleteTradeReviews } = require('./db/trade_reviews.js');
const { getNotifications, sendNotifications, deleteNotification } = require('./db/notifications.js');
const { getBrokerPreferences, updateBrokerPreferences, updateCalcIRSPreference, updateInterpPreference, updateCalcOISPreference, getGeneralPreferences } = require('./db/preferences.js');
const { overrideFX } = require('./db/fxrate.js');
const { getSpecificSecurities, setCalcIRS_controller, getSecurities } = require('./gw_controller.js');
const { insertConfos, deleteConfos, updateConfosMW } = require('./db/confos.js');
const { addNewCustomWB, updateCustomWB, deleteCustomWB, swapCustomWBs } = require('./db/custom_whiteboards.js');
const config = require('../config.json');


module.exports.messageReceived = async function (message, sess) {
  // Parse the JSON message.
  // Prepare a message to send to all of the clients.
  const msg = JSON.parse(message);
  var client_message = {};
  var got_message = false;

  if (msg.hasOwnProperty('ping')) {
    got_message = true;
    sendToOneClient(sess.socket, {"pong" : 0});
  } else {
    logger.info(`message received from broker ${sess.broker_id}: ${message}`);
  }

  // Each message type is provided under its own property.  The first two
  // messages are sent back to only the clients that requested them.

  // The clients can ask for all data to initialize themselves after login.

  if (msg.hasOwnProperty('initialize_me')) {
    got_message = true;
    client_message = await initialData(sess.broker_id); // get the initial data from the database
    let gateways = [];
    sessions.forEach((sess) => {if (sess.is_gateway) gateways.push(sess)});
    client_message.init_gateways = gateways;
    let calcPrefs = await getGeneralPreferences();
    client_message.calcIRS = calcPrefs.calcIRS;
    client_message.calcOIS = calcPrefs.calcOIS;
    client_message.interpChoice = calcPrefs.interpChoice;
    
    // Send markitwire connection to client
    client_message.init_markitwire = activeMarkit('userId') ? true : false;
    client_message.init_markitwire_active = MarkitLoggedIn('userId') ? true: false;
    client_message.init_markitwire_env = config.env;
  
    sendToOneClient(sess.socket, client_message);
    getSecurities("bbsw init");
    getSecurities("rbacor init");
    getSecurities("main");
    getSecurities("fut");
    getSecurities("fx");
    getSecurities("eod");
    return;
  }

  if (msg.hasOwnProperty('get_broker_preferences')) {
    got_message = true;
    client_message.get_broker_preferences = await getBrokerPreferences(msg.get_broker_preferences);
    sendToOneClient(sess.socket, client_message);
    return;
  }
  
  if (msg.hasOwnProperty('new_custom_wb')) {
    got_message = true;
    client_message.new_custom_wb = await addNewCustomWB(sess.broker_id, msg.new_custom_wb);
    sendToOneClient(sess.socket, client_message);
    return;
  }

  if (msg.hasOwnProperty('update_custom_wb')) {
    got_message = true;
    await updateCustomWB(msg.update_custom_wb);
    return;
  }

  if (msg.hasOwnProperty('delete_custom_wb')) {
    got_message = true;
    await deleteCustomWB(msg.delete_custom_wb);
    return;
  }

  if (msg.hasOwnProperty('swap_custom_wbs')) {
    got_message = true;
    await swapCustomWBs(sess.broker_id, msg.swap_custom_wbs);
    return;
  }

  if (msg.hasOwnProperty('refresh_notifications')) {
    got_message = true;
    client_message.receive_notifications = await getNotifications(sess.broker_id, msg.refresh_notifications.after);
    sendToOneClient(sess.socket, client_message);
    return;
  }

  if (msg.hasOwnProperty('delete_notification')) {
    got_message = true;
    await deleteNotification(sess.broker_id, msg.delete_notification);
    return;
  }

  // All remaining message types involve updating data on every client.

  if (msg.hasOwnProperty('update_broker_preferences')) {
    got_message = true;
    let ret = msg.update_broker_preferences;
    ret.value = await updateBrokerPreferences(msg.update_broker_preferences);
    client_message.update_broker_preferences = ret;
    if (ret.broker_id !== 999) {
      sendToOneClient(sess.socket, client_message);
      return;
    }
  }

  if (msg.hasOwnProperty('update_whiteboard_global')) {
    got_message = true;
    client_message.update_whiteboard_global = msg.update_whiteboard_global;
  }

  if (msg.hasOwnProperty('export_custom_wb')) {
    got_message = true;
    let { recipient, wb } = msg.export_custom_wb;
    delete wb.board_id;
    client_message.import_custom_wb = {recipient, wb:await addNewCustomWB(recipient, wb)};
    let notif = {brokers:[recipient], subject:`I've shared a custom whiteboard with you. It's called ${wb.name}`, body:""};
    client_message.receive_notifications = await sendNotifications(sess.broker_id, notif);
  }
  
  if (msg.hasOwnProperty('send_notifications')) {
    got_message = true;
    client_message.receive_notifications = await sendNotifications(sess.broker_id, msg.send_notifications);
  }
  
  // The set_quotes message can come from both users and gateways.
  // When overriding quotes, also send to oneview

  if (msg.hasOwnProperty('override_quote')) {
    got_message = true;
    client_message.override_quotes = await overrideQuote(msg.override_quote);
    // sendToOneview({ update_mid: msg.override_quote });
  }

  // If a client asks for all quotes to be refreshed from Bloomberg, pass it on
  // to the gateway.

  if (msg.hasOwnProperty('get_quotes')) {
    got_message = true;
    sendToGateway({ get_quotes: msg.get_quotes });
  }

  if (msg.hasOwnProperty('get_specific_quotes')) {
    got_message = true;
    getSpecificSecurities(msg.get_specific_quotes.securities, msg.get_specific_quotes.fields);
  }

  if (msg.hasOwnProperty('update_swaption_quotes')) {
    got_message = true;
    client_message.update_swaption_quotes = await insertSwaptionQuotes(msg.update_swaption_quotes);
  }

  if (msg.hasOwnProperty('add_swaption_order')) {
    got_message = true;
    client_message.add_swaption_order = await insertSwaptionOrder(msg.add_swaption_order);
    client_message.refresh_swaption_counts = await getAllSwaptionCounts();
  }

  // refresh swaption orders on front-end
  if (msg.hasOwnProperty('refresh_swaption_orders') || msg.hasOwnProperty('update_ov_id')) {
    got_message = true;
    client_message.refresh_swaption_orders = await refreshSwaptionOrders(sess.broker_id);
    client_message.refresh_swaption_counts = await getAllSwaptionCounts();
  }

  if (msg.hasOwnProperty('refresh_swaption_counts') || msg.hasOwnProperty('update_ov_id')) {
    got_message = true;
    client_message.refresh_swaption_counts = await getAllSwaptionCounts();
  }

  if (msg.hasOwnProperty('modify_oco')) {
    got_message = true;
    client_message.modify_oco = await modifyOCO(msg.modify_oco);
  }

  if (msg.hasOwnProperty('clear_all_ocos')) {
    got_message = true;
    client_message.modify_oco = await clearAllOCOs();
  }

  if (msg.hasOwnProperty('update_oco_colour')) {
    got_message = true;
    client_message.update_oco_colour = await setOCOColour(msg.update_oco_colour);
  }

  if (msg.hasOwnProperty('add_calc_input')) {
    got_message = true;
    client_message.add_calc_input = await insertCalcInputs(msg.add_calc_input);
  }

  if (msg.hasOwnProperty('update_calc_input')) {
    got_message = true;
    client_message.update_calc_input = await updateCalcInputs(msg.update_calc_input);
  }

  if (msg.hasOwnProperty('delete_calc_input')) {
    got_message = true;
    client_message.delete_calc_input = await deleteCalcInputs(msg.delete_calc_input);
  }

  if (msg.hasOwnProperty('insert_swaption_live_orders')) {
    got_message = true;
    client_message.insert_swaption_live_orders = await insertSwaptionLiveOrders(msg.insert_swaption_live_orders);
  }

  if (msg.hasOwnProperty('update_swaption_live_orders')) {
    got_message = true;
    client_message.update_swaption_live_orders = await updateSwaptionLiveOrders(msg.update_swaption_live_orders);
  }

  if (msg.hasOwnProperty('delete_swaption_live_orders')) {
    got_message = true;
    await deleteSwaptionLiveOrders(msg.delete_swaption_live_orders);
    client_message.delete_swaption_live_orders = msg.delete_swaption_live_orders;
  }

  // refresh trade orders on front-end
  if (msg.hasOwnProperty('refresh_trades') || msg.hasOwnProperty('update_ov_id')) {
    got_message = true;
    client_message.refresh_trades = await refreshTrades(sess.broker_id);
    client_message.refresh_trade_counts = await getAllTradeCounts();
  }

  // refresh trade orders on front-end
  if (msg.hasOwnProperty('refresh_liquidity_trades') || msg.hasOwnProperty('update_ov_id')) {
    got_message = true;
    client_message.refresh_liquidity_trades = await refreshLiquidityTrades(sess.broker_id);
    client_message.refresh_liquidity_counts = await getAllLiquidityCounts();
  }  

  // refresh frontend trade_count store
  if (msg.hasOwnProperty('refresh_liquidity_counts') || msg.hasOwnProperty('update_ov_id')) {
    got_message = true;
    client_message.refresh_liquidity_counts = await getAllLiquidityCounts();
  }

  // Place two orders and immediately make trade. This is used for OIS trades on RBA OIS page.
  if (msg.hasOwnProperty('insert_ticket_with_orders')) {
    got_message = true;
    const offer = msg.insert_ticket_with_orders.offer;
    const bid = msg.insert_ticket_with_orders.bid;
    let ticket = msg.insert_ticket_with_orders.ticket;

    const offer_order = await insertOrders([offer]);
    const bid_order = await insertOrders([bid]);

    ticket.offer = offer_order[0];
    ticket.bid = bid_order[0];
    let tickets = {tickets: [ticket]};

    let saved_trade = await insertTickets(tickets);
    client_message.insert_tickets = saved_trade;
    client_message.refresh_trade_counts = await getAllTradeCounts();
  }

  if (msg.hasOwnProperty('interest_to_order')){
    got_message = true;
    // convert in db
    //update orders store
  }

  // An order can be placed by users.

  if (msg.hasOwnProperty('insert_orders')) {
    got_message = true;
    client_message.insert_orders = await insertOrders(msg.insert_orders);
  }

  // An order can be updated by users.

  if (msg.hasOwnProperty('update_orders')) {
    got_message = true;
    client_message.update_orders = await updateOrders(msg.update_orders);
  }

  // An order can be deleted by users.

  if (msg.hasOwnProperty('delete_orders')) {
    got_message = true;
    await deleteOrders(msg.delete_orders);
    client_message.delete_orders = msg.delete_orders;
  }

  // A trade review can be entered by users.

  if (msg.hasOwnProperty('add_trade_review')) {
    got_message = true;
    client_message.insert_trade_reviews = await insertTradeReviews(msg.add_trade_review);
  }

  // A trade review can be updated by users.

  if (msg.hasOwnProperty('update_trade_review')) {
    got_message = true;
    client_message.update_trade_review = await updateTradeReviews(msg.update_trade_review);
  }

  // A trade review can be updated by users.

  if (msg.hasOwnProperty('delete_trade_reviews')) {
    got_message = true;
    await deleteTradeReviews(msg.delete_trade_reviews);
    client_message.delete_trade_reviews = msg.delete_trade_reviews;
  }

  if (msg.hasOwnProperty('insert_traders')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      client_message.insert_traders = await insertTraders(msg.insert_traders);
    }
  }

  if (msg.hasOwnProperty('update_traders')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      client_message.update_traders = await updateTraders(msg.update_traders);
    }
  }

  if (msg.hasOwnProperty('delete_traders')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      let order_ids = await deleteTraders(msg.delete_traders);
      client_message.delete_traders = msg.delete_traders;
      client_message.delete_orders = order_ids;
    }
  }

  if (msg.hasOwnProperty('insert_brokers')) {
    if (sess.permission["Broker Management"]) {
      got_message = true;
      client_message.insert_brokers = await insertBrokers(msg.insert_brokers);
    }
  }

  if (msg.hasOwnProperty('update_brokers')) {
    if (sess.permission["Broker Management"]) {
      got_message = true;
      client_message.update_brokers = await updateBrokers(msg.update_brokers);
    }
  }

  if (msg.hasOwnProperty('delete_brokers')) {
    if (sess.permission["Broker Management"]) {
      got_message = true;
      client_message.delete_brokers = await deleteBrokers(msg.delete_brokers);
    }
  }

  if (msg.hasOwnProperty('insert_confos')) {
    got_message = true;
    client_message.insert_confos = await insertConfos(msg.insert_confos);
  }

  if (msg.hasOwnProperty('delete_confos')) {
    got_message = true;
    client_message.delete_confos = await deleteConfos(msg.delete_confos);
  }

  if (msg.hasOwnProperty('refresh_confos')) {
    got_message = true;
    client_message.refresh_confos = await updateConfosMW(msg.refresh_confos);
  }

  // An order deleted once trade has been confirmed
  // match the order deletion time with the trade time

  if (msg.hasOwnProperty('delete_orders_at_time')) {
    got_message = true;
    await deleteOrders(msg.delete_orders_at_time, msg.time);
    client_message.delete_orders = msg.delete_orders_at_time;
  }

  // Trades have been confirmed. Add them to the database

  if (msg.hasOwnProperty('insert_tickets')) {
    got_message = true;
    client_message.insert_tickets = await insertTickets(msg.insert_tickets);
    client_message.refresh_trade_counts = await getAllTradeCounts();
  }

  // Trades have been confirmed. Send them to Oneview

  if (msg.hasOwnProperty('submit_ov_tickets')) {
    got_message = true;
    sendToOneview({ submit_ov_tickets: msg.submit_ov_tickets });
  }
  // Trades have been confirmed. Send them to Markit

  if (msg.hasOwnProperty('submit_tickets')) {
    got_message = true;
    logger.info('sending trades to Markit');
    sendToMarkit({ submit_tickets: msg.submit_tickets });
  }
  // A trade can be confirmed by users.
  // Brokerages of involved banks are updated in the database

  if (msg.hasOwnProperty('update_brokerages')) {
    got_message = true;
    client_message.update_brokerages = await updateBrokerages(msg.update_brokerages);
    client_message.trade_count =  await tradeCount();
    client_message.monthly_trades = await tradesThisMonth();
  }

  if(msg.hasOwnProperty('get_currency')) {
    got_message = true;
  }

  if(msg.hasOwnProperty('add_swaption_structure')) {
    got_message = true;
    if(Array.isArray(msg.add_swaption_structure)) {
      client_message.add_swaption_structure = await addSwaptionStructure(msg.add_swaption_structure);
    } else {
      client_message.add_swaption_structure = await addSwaptionStructure([msg.add_swaption_structure]);
    }
  }

  if(msg.hasOwnProperty('delete_swaption_structure')) {
    got_message = true;
    deleteSwaptionStructures(msg.delete_swaption_structure);
    client_message.delete_swaption_structure = msg.delete_swaption_structure;
  }

  if(msg.hasOwnProperty('update_swaption_structure')) {
    got_message = true;
    client_message.update_swaption_structure = await updateSwaptionStructures([msg.update_swaption_structure]);
  }

  if(msg.hasOwnProperty('override_fx')){
    got_message = true;
    client_message.override_fx = await overrideFX(msg.override_fx);
  }

  if(msg.hasOwnProperty('setCalcIRS')){
    got_message = true;
    let bool = msg.setCalcIRS;
    updateCalcIRSPreference(bool);
    setCalcIRS_controller(bool);
    setCalcIRS_quotes(bool);
    client_message.setCalcIRS = bool;
  }

  if(msg.hasOwnProperty('setStraightInterp')){
    got_message = true;
    let bool = msg.setStraightInterp;
    updateInterpPreference(bool);
    setLinearInterp(bool);
    client_message.setInterpChoice = bool;
  }

  if(msg.hasOwnProperty('setCalcOIS')){
    got_message = true;
    let bool = msg.setCalcOIS;
    updateCalcOISPreference(bool);
    client_message.setCalcOIS = bool;
  }

  if(msg.hasOwnProperty('disconnectGateway')){
    got_message = true; 
    sendToSpecificGateway(msg.disconnectGateway, {disconnect: true});
  }

  if(msg.hasOwnProperty('requestPriceHistory')){
    got_message = true;
    client_message['got_price_history'] = await getPriceHistory(msg.requestPriceHistory.years, msg.requestPriceHistory.product_id, msg.requestPriceHistory.fwd, msg.requestPriceHistory.start);
  }

  // create new report email
  if (msg.hasOwnProperty('insert_report_email')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      client_message.insert_report_email = await insertReportEmail(msg.insert_report_email);
    }
  }

  // update report email
  if (msg.hasOwnProperty('update_report_email')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      client_message.update_report_email = await updateReportEmail(msg.update_report_email);
    }
  }

  // delete report email
  if (msg.hasOwnProperty('delete_report_emails')) {
    if (sess.permission["Trader Management"]) {
      got_message = true;
      await deleteReportEmails(msg.delete_report_emails);
      client_message.delete_report_emails =msg.delete_report_emails;
    }
  }

  // Report an error if no message content was processed.

  if (!got_message) {
    if (!msg.hasOwnProperty('ping')) logger.warn('Received message with no recognisable content %s', message);
  }

  // After all parts of the message have been processed send all clients an
  // update if a return message has been generated.

  if (Object.keys(client_message).length !== 0) {
    sendToAllClients(client_message);
  }
};