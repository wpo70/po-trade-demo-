<script>
  "use strict";
  import {
    Tile,
    ButtonSet,
    Button,
    DatePicker,
    DatePickerInput,
    TextInput,
    Modal,
    Select,
    SelectItem,
  } from "carbon-components-svelte";
  import Trade from "./Trade.svelte";
  import Tickets from "../common/tickets.js";
  import { mapTrades } from "../common/ov_trade_mapper.js";
  import websocket from "../common/websocket.js";
  import traders from "../stores/traders.js";
  import quotes from "../stores/quotes.js";
  import { createEventDispatcher, onMount } from "svelte";

  // ADD TicketView modal to confirm the tickets
  import TicketView from "./TicketView.svelte";
  import currency_state from "../stores/currency_state";
  import active_product, { main_content, view } from '../stores/active_product';
  import { addDays, addTenorToDays, generateConfo, isBusinessDay, isTenor, roundToNearest, timestampToISODate, toTenor } from "../common/formatting";
  import trade_reviews from "../stores/trade_reviews";
  import user from "../stores/user";
  import brokers from "../stores/brokers";
  import ticker from "../stores/ticker";
  import products from "../stores/products";
  import orders from "../stores/orders";

  export let trades = null;
  export let leftover_bool;
  export let leftover_err_message;
  export let fromWhiteboard = false;
  export let refresh = 0;
  export let total_ts = 0;
  $: active_prod = trades?.product_id ?? $active_product;

  $: if(openReviewModal == false) updateTradeFromTicket();

  function updateTradeFromTicket() {
    for(let trade of trades.trades){
      for(let ticket of tickets.tickets){

        // Map group (bank division) changes in ticket to trade
        trade.setBankDivision(ticket.bid.order_id, ticket.bid_bank_division_id);
        trade.setBankDivision(ticket.offer.order_id, ticket.offer_bank_division_id);

        // Map brokerage changes in ticket to trade
        trade.setBrokerage(ticket.bid.order_id, ticket.bid_brokerage, true);
        trade.setBrokerage(ticket.offer.order_id, ticket.offer_brokerage, false);

        // Map price changes in ticket to trade
        if(ticket.year == trade.year){
          setTradePrice(trade, ticket.price);
        }
      }
    }
    refresh += 1;
  }

  let start_date = '';
  let start_date_disabled = false;

  const getSTIRStartDate = (orders) => {
    let order = orders.find(order => {
      return order.start_date != null;
    });
    if (order == null) {
      order = orders.find(order => {
        return order.fwd != null;
      });
    }
    return order;
  };

  onMount(() => {
    if(products.isStir(active_prod) || products.isFwd(active_prod)) {
      let startDateOrder = getSTIRStartDate([trades.trades[0].offers[0], trades.trades[0].bids[0]]);

      if(!startDateOrder) {
        return;
      }
      if (startDateOrder.start_date) {
        start_date = timestampToISODate(startDateOrder.start_date);
      } else {
        start_date = timestampToISODate(addTenorToDays(toTenor(startDateOrder.fwd), ((products.isXccy(active_prod)|| products.isNZD(active_prod) || products.isUSD(active_prod)) ? addDays(addDays(new Date(), 1, active_prod), 1, active_prod) : addDays(new Date(), 1, active_prod)),active_prod));
      }
      start_date_disabled = true;
    } else if (active_prod == 20) {
      start_date_disabled = true;
    }
  });

  let tickets = new Tickets();

  let dispatch = new createEventDispatcher();
  // Handlers for trade events
  /*
  FIXME: Having this functionality here means a user must click the submit button in order to flow the 
  trades into Oneview. 
  
  The Alternative of putting the trades detection at a higher level 
  produces the following problem:
    * TRADES WILL BE SUBMITTED FOR EACH CLIENT CONNECTED TO THE SERVER - DUPLICATES OF THE SAME TRADES SENT TO ONEVIEW

  Other Alternatives are to:
    1. BRING BACK A SUBMIT BUTTON ON TRADES VIEW THAT DISPLAYS ONLY WHEN ALL TRADES ARE CONFIRMED
    2. GO BACK TO IDEA WITH PUTTING Prices AND Trades ON THE SERVER

  The first alternative still has the problem whereby:
    * A client must be logged in for trades to properly flow into Oneview
    * A potrade client must interact with the server in order to send trades to Oneview

  The second alternative invokes a new problem whereby:
    * The traffic between client and server is greatly increased. Orders create many Prices,
      each price would have to be created, stored in the database and sent to all clients.
      Same for Trades. Prices and Trades update greatly on Order updates/insertion/deletion.
    * POC-BOTs design would have to be greatly altered again, as well as potrade's design.
  However this solution would mean that trades could be sent to Oneview without any potrade
  client being connected or involved in any way
*/

  // Reactively assess order confirmation status across all trades
  // TODO: Logging if necessary?
  let show_submit_button = false;
  let me = user.get();
  let devOverride;
  let traderApproved;
  let checkTrades = (t) => (isTenor(t.breaks) == isTenor(t.thereafter));
  
  $: {
    let b = $brokers;
    devOverride = (brokers.get(me).permission["Developer Override"]);
    traderApproved = (brokers.get(me).permission["Approve Trades"]);
  }
// remove restriction on trade review when gateway is not connected, applied for all users, EFP, SPS EFP
// This taking is reasonable in term of testing and mitigating gateway down time.
// The permission levels remain the same.
  $: {
    let t = $ticker;
    // let gwConnected = $data_collection_settings.gateways.length > 0;
    if (trades && trades.trades.every(checkTrades)) { show_submit_button = true; }
    else  { show_submit_button = false; }
  }

  // This function closes select orders and is used for updating orders (not creating new ones for leftover!!)
  function closeOrders(orders) {
    let order_ids = orders.map((o) => o.order_id);
    websocket.deleteOrders(order_ids);
  }

  function closeAllOrders() {
    let orders = trades.getAllOrders();
    let order_ids = orders.map(o => o.order_id);
    websocket.deleteOrders(order_ids); 
  }

  function updateOrders(updated_orders) {
    updated_orders.forEach((updated_order) => {
      // we set to zero so that it inserts a new order rather than updates the order
      // if you want it to update the order: 1. Remove the two lines below 2. use closeOrders(orders) function instead of closeAllOrders
      updated_order.order_id = 0;
      delete updated_order.time_placed;
      websocket.submitOrder(updated_order, true);
    });
  }

  function isCommandingLeg(order, year) {
    return (
      order.isOutright() ||
      (order.isSpread() && order.spreadLeg(year) === "long") ||
      (order.isButterfly() && order.butterflyLeg(year) === "body")
    );
  }

  export function handleLeftovers(trades) {
    let close_orders = [];
    let update_orders = [];
    let unapplied_leftover_orders = [];

    trades.trades.forEach((trade) => {
      // is less than two mmp means that in one of the legs
      // the volume is higher than mmp and lower than 2*mmp
      let is_less_than_two_mmp = false;

      let high_side, low_side;
      let tot_off_vol = trade.getTotalOfferVolume();
      let tot_bid_vol = trade.getTotalBidVolume();

      
      let prod_id = trade.bids[0].product_id;
      let twice_mmp = Math.round(2 * quotes.mmp(prod_id, trade.year, trade?.fwd));

      // If total offer and bid volume is within 1 mio, then we close all orders in offers and bid
      // if they are a commanding leg.
      // If not, we assign bid and offer side a relative high side and a relative low side
      if (Math.abs(tot_off_vol - tot_bid_vol) < 1) {
        console.log("Closing respective commanding orders.");
        trade.bids.forEach((bid) => {
          if (isCommandingLeg(bid, trade.year)) {
            close_orders.push(bid);
          }
        });

        trade.offers.forEach((offer) => {
          if (isCommandingLeg(offer, trade.year)) {
            close_orders.push(offer);
          }
        });
      } else {
        if (tot_off_vol > tot_bid_vol) {
          high_side = {
            orders: trade.offers,
            total_vol: tot_off_vol,
            year: trade.year,
          };
          low_side = {
            orders: trade.bids,
            total_vol: tot_bid_vol,
            year: trade.year,
          };
        }

        if (tot_bid_vol > tot_off_vol) {
          high_side = {
            orders: trade.bids,
            total_vol: tot_bid_vol,
            year: trade.year,
          };
          low_side = {
            orders: trade.offers,
            total_vol: tot_off_vol,
            year: trade.year,
          };
        }

        // IF the high side is lower than two times the minimum market parcel, then
        // left-over volumes should not be updated
        if (high_side.total_vol < twice_mmp) {
          is_less_than_two_mmp = true;
        }

        if (high_side.orders.length === 1 && !is_less_than_two_mmp) {
          // leftovers will apply in this case
          // assign high side and assign low side to each side (both lengths are 1)

          let high_side_order = high_side.orders[0];

          let updated_order;
          let new_vol;

          // Parse the updated order with the leftovers
          updated_order = JSON.parse(JSON.stringify(high_side_order));
          new_vol = high_side_order.volume - trade.volume;
          updated_order.volume = new_vol;

          // if the high_side is a commanding leg, then push the trade to be updated
          if (isCommandingLeg(high_side_order, trade.year)) {
            console.log(
              `Commanding volume here should have leftover!! ${new_vol} mil remaining`
            );
            update_orders.push(updated_order);
          }

          // low side order handling here
          let low_side_order;

          if (low_side.orders.length === 1) {
            // if the low_side is a commanding leg, then push the trade to be closed
            low_side_order = low_side.orders[0];
            if (isCommandingLeg(low_side_order, trade.year)) {
              close_orders.push(low_side_order);
            }
          } else {
            // for all of the lowside_orders, we push to
            low_side.orders.forEach((order) => {
              if (isCommandingLeg(order, trade.year)) {
                close_orders.push(order);
              }
            });
          }

        // If high side order has length more than one, we have to minus relative volume of the order from the order volume
        } else if (high_side.orders.length !== 1 && !is_less_than_two_mmp) {
          // Handling for high side is: if the order is commanding leg, we do operation (order vol - relative vol) and make leftovers from that
          // For each high side order, we minus the order relative volume from the order
          high_side.orders.forEach((order) => {
              if (isCommandingLeg(order, trade.year)) {
                if(order.volume >= twice_mmp) {
                  let updated_order;
                  let new_vol;

                  new_vol = order.volume - trade.getRelativeOrderVolume(order.order_id, order.bid);

                  // Parse the updated order with the leftovers
                  updated_order = JSON.parse(JSON.stringify(order));
                  updated_order.volume = new_vol;
                  update_orders.push(updated_order)
                } else {
                  leftover_bool = true;                  
                  console.log("warning: leftovers will not apply.");
                  unapplied_leftover_orders.push(order);
                  close_orders.push(order);
                }
              }
            });
          
            // for all of the lowside_orders, we push to
          low_side.orders.forEach((order) => {
            if (isCommandingLeg(order, trade.year)) {
              close_orders.push(order);
            }
          });

        // I think this area is unreachable but will put it in anyway just in case.  
        } else {
          // Just close orders if they are a commanding leg.
          leftover_bool = true;
          console.log("warning: leftovers will not apply.");

          // for all of the lowside_orders, we push to
          high_side.orders.forEach((order) => {
              if (isCommandingLeg(order, trade.year)) {
                close_orders.push(order);
                unapplied_leftover_orders.push(order);
              }
            });
          
            // for all of the lowside_orders, we push to
          low_side.orders.forEach((order) => {
            if (isCommandingLeg(order, trade.year)) {
              close_orders.push(order);
              unapplied_leftover_orders.push(order);
            }
          });
        }
      }
    });

    // Parse the leftover error message
    unapplied_leftover_orders.forEach((order) => {
      leftover_err_message += `Leftover not applied for ${order.bid ? "Bid" : "Offer"} Order at Year ${order.years} with vol ${order.volume} \n`;
    });
    
    if(leftover_err_message !== ""){
      console.log(leftover_err_message);
    }

    // NOTE: Stubbing closeOrders out and replacing with close all orders. 
    // closeOrders(close_orders) is for closing products that dont need to be updated
    // closeOrders(close_orders);
    
    // Executes closing and updating of orders
    closeAllOrders();
    updateOrders(update_orders);
  }

  // Update mid of each year in trades using the price of each trade

  function updateMids() {
    let indicator;
    for (let trade of trades.trades) {
      // Set the indicator of the given product_id and year to trade price

      indicator = quotes.get(trades.product_id, trade.year, $currency_state);
      websocket.overrideQuote(indicator, trade.price, $currency_state);
    }
  }

  async function submitOvTickets(tickets) {
    let mapped_tickets = await mapTrades(tickets);
    
    // websocket.submitOvTickets(mapped_tickets);
    websocket.submitTickets(mapped_tickets);
    
    // Convert mapped tickets to confo
    let [confos, trade_ov_ids] = await generateConfo(tickets.tickets, mapped_tickets);
    websocket.addConfo({brokers: trade_review?.reviewers ?? [], confos: confos, time_submitted: new Date(), trade_ids: trade_ov_ids});  
  }
  
  function updateBrokerages(tickets) {
    let brokerages = [];
    let offer_bank_id, bid_bank_id;
    for (let ticket of tickets.tickets) {
      if (ticket.offer_brokerage !== null) {
        offer_bank_id = traders.get(ticket.offer.trader_id).bank_id;
        brokerages.push({
          bank_id: offer_bank_id,
          brokerage: ticket.offer_brokerage,
        });
      }

      if (ticket.bid_brokerage !== null) {
        bid_bank_id = traders.get(ticket.bid.trader_id).bank_id;
        brokerages.push({
          bank_id: bid_bank_id,
          brokerage: ticket.bid_brokerage,
        });
      }
    }

    websocket.updateBrokerages(brokerages);
  }

  async function afterSubmit () {
    // Send the tickets to Oneview
    submitOvTickets(tickets)

    // Update brokerages table
    updateBrokerages(tickets);
    
    // Remove OCO orders
    orders.removeOCOOrders(tickets.tickets);
    
    // let [confos, trade_ov_ids] = generateConfo(tickets.tickets);
    // websocket.addConfo({brokers: trade_review?.reviewers ?? [], confos: confos, time_submitted: new Date(), trade_ids: trade_ov_ids});  
  }

  // Handle Ticket confirm
  async function HandleTicketConfirm() {

    handleLeftovers(trades);  
    
    if (!devOverride) {
      let id = trade_review.review_id;
      trade_review.status = "Finished";
      websocket.updateTradeReview(trade_review);
      await new Promise(res => setTimeout(res, 50));
      websocket.deleteTradeReview([id]);
    }

    // Update mids using trade prices
    // This is not needed at the moment as bbg quotes are updated frequently
    // It may be more usefull when we are making our own market 
    // i.e. using our own mids ask and bids instead of bbg
    // updateMids(); 

    // Insert the tickets into the trades table
    websocket.callFunctionWithCallback(websocket.insertTickets, [tickets], "insert_tickets", afterSubmit);
    //Force back to whiteboard only when no trades left
    if(total_ts < 2){view.set('whiteboard');}
  }
  
  let trade_review;
  let reviewExists = false;
  let inReview = false;
  let approvedByMe = false;
  let pendingApproval = false; 
  let initiatedByMe = false;
  let invalidReviewers = false;

  $: {
    let t = $trade_reviews;
    if (trades) {
      trade_review = trade_reviews.getFromTrade(trades);
      if (trade_review && trade_review.trade_data && trade_review.trade_data.tickets && trade_review.trade_data.tickets.length != 0) {
        tickets = trade_review.trade_data;
        start_date = trade_review.trade_data.tickets[0].start_date;
        for (let trade of trades.trades) {
          for (let ticket of tickets.tickets) {
            if (ticket.year == trade.year) {
              trade.setBrokerage(ticket.bid.order_id, ticket.bid_brokerage, true);
              trade.setBrokerage(ticket.offer.order_id, ticket.offer_brokerage, false);
              setTradePrice(trade, ticket.price);
            }
          }
        }
      }
    } else {
      trade_review = null;
    }
  };
  $: {
    reviewExists = trade_review != null;
    inReview = reviewExists && trade_review.reviewed_by.length < 2;
    approvedByMe = reviewExists && inReview && trade_review.reviewed_by.includes(me);
    pendingApproval = reviewExists && !approvedByMe && trade_review.reviewers.includes(me);
    invalidReviewers = !(reviewer1 != -1 && reviewer2 != -1 && reviewer1 != reviewer2);
    initiatedByMe = reviewExists && trade_review.initiated_by == me;
  }
  let openReviewModal = false;
  let openApproveModal = false;
  let reviewersList1 = [];
  let reviewersList2 = [];
  let reviewer1 = -1;
  let reviewer2 = -1;
  
  $: reviewersList1 = $brokers.filter((b) => b.active && b.permission["Approve Trades"] && !b.permission["Developer Override"] && b.broker_id != reviewer2);
  $: reviewersList2 = $brokers.filter((b) => b.active && b.permission["Approve Trades"] && !b.permission["Developer Override"] && b.broker_id != reviewer1);

  function handleRequestReview () { 

    if (fromWhiteboard) {
      dispatch("handleRequestReview", {start_date});
      return;
    }
    // Set trades time closed

    let timestamp = new Date();
    trades.time_closed = timestamp;
  
    for (let trade of trades.trades) {
      trade.currency = $currency_state;
    }

    // Convert trades to tickets
    tickets = new Tickets(trades, timestamp, start_date);
    openReviewModal = true;
  }

  function sendReview () {
    
    openReviewModal = false;

    let orderList = trades.getAllOrders().map((o) => o.order_id);
    
    let review = {
      orders: orderList,
      initiated_by: me,
      reviewers: [reviewer1, reviewer2],
      reviewed_by: [],
      status: "New",
      trade_data: JSON.parse(JSON.stringify(tickets))
    };
    websocket.addTradeReview([review]);
  }

  function approveTrade() {
    if (devOverride) {
      HandleTicketConfirm();
      openApproveModal = false;
      return;
    }
    if (trade_review.reviewers.includes(me)) {
      trade_review.reviewed_by.push(me);
    }
    if (trade_review.reviewed_by.length == 2){
      trade_review.status = "Approved";
      HandleTicketConfirm();
    }
    websocket.updateTradeReview(trade_review);
    openApproveModal = false;
  }
  
  async function rejectTrade() {
    if (devOverride) {
      openApproveModal = false;
      return;
    }
    let id = trade_review.review_id;
    websocket.updateTradeReview({
      review_id: trade_review.review_id,
      orders: trade_review.orders,
      status: "Failed"
    });
    await new Promise(res => setTimeout(res, 100));
    websocket.deleteTradeReview([id]);
    openApproveModal = false;
  }

  function handleReview () {
    // Set trades time closed

    if (!pendingApproval) {
      let timestamp = new Date();
      trades.time_closed = timestamp;
    
      for (let trade of trades.trades) {
          trade.currency = $currency_state;
      }
      // Convert trades to tickets
      tickets = new Tickets(trades, timestamp, start_date);
    }
    
    if (fromWhiteboard) {
      dispatch("handleReview", {tickets});
      return;
    }

    openApproveModal = true;
  }

  async function retractReview () {
    let id = trade_review.review_id;
    websocket.updateTradeReview({
      review_id: id,
      orders: trade_review.orders,
      status: "Finished"
    });
    await new Promise(res => setTimeout(res, 100));
    websocket.deleteTradeReview([id]);
  }

  // Copys the breaks data from one leg of the trade to the others
  function copyBreaks (event) {
    for (let t of trades.trades) {
      t.breaks = event.detail.breaks;
      t.thereafter = event.detail.thereafter;
    }
    trades = trades;
  }
  
  // update the other legs of a trade when one yield is updated
  let lockedLeg = null;
  let tradesSpread = calcSpread();
  function calcSpread () {
    let spread = 0;
    if (trades.trades.length == 1) {
      spread = trades.trades[0].price;
    } else if (trades.trades.length == 2) {
      spread = trades.trades[1].price - trades.trades[0].price;
    } else if (trades.trades.length == 3) {
      spread = 2*trades.trades[1].price - trades.trades[0].price - trades.trades[2].price;
    }
    return spread;
  }

  function setTradePrice (trade, price, is_wing = false) { trade.price = roundToNearest(price, (is_wing ? 1 : 10)*1000000); }

  function handleYieldUpdate (e) {
    let tradesList = trades.trades;
    for (let i = 0; i < trades.trades.length; i++) {
      if (tradesList[i].year == e.detail.year) {
        setTradePrice(tradesList[i], e.detail.yield, tradesList.length == 3 && i != 1);
        if (tradesList.length == 2) {
          if (i == 1) setTradePrice(trades.trades[0], tradesList[1].price - tradesSpread);
          else if (i == 0) setTradePrice(trades.trades[1], tradesSpread + tradesList[0].price);
        } else if (tradesList.length == 3) {
          if (i == 1) {
            let changeNeeded = (tradesSpread - calcSpread());
            if (lockedLeg == tradesList[0].year) {
              setTradePrice(trades.trades[2], tradesList[2].price - changeNeeded, true);
            } else if (lockedLeg == tradesList[2].year) {
              setTradePrice(trades.trades[0], tradesList[0].price - changeNeeded, true);
            } else {
              setTradePrice(trades.trades[0], tradesList[0].price - changeNeeded/2, true);
              setTradePrice(trades.trades[2], tradesList[2].price - changeNeeded/2, true);
            }
          } else if (i == 0 || i == 2) {
            if (lockedLeg == tradesList[1].year) {
              if (i == 0) {
                setTradePrice(trades.trades[2], 2*tradesList[1].price - tradesList[0].price - tradesSpread, true);
              } else {
                setTradePrice(trades.trades[0], 2*tradesList[1].price - tradesList[2].price - tradesSpread, true);
              }
            } else {
              setTradePrice(trades.trades[1], (tradesSpread + tradesList[0].price + tradesList[2].price)/2);
            }
          }
        }
        refresh++;
        return;
      }
    }
  }

  function handleLockLeg (e) {
    if (lockedLeg == e.detail.year) {
      lockedLeg = null;
    } else {
      lockedLeg = e.detail.year;
    }
  }

  function handleBroUpdate (e) {
    for (let i = 0; i < trades.trades.length; i++) {
      if (trades.trades[i].year == e.detail.year) {
        trades.trades[i].setBrokerage(e.detail.order_id, e.detail.brokerage, e.detail.bid);
        if (trade_review){
          let change = false;
          if (e.detail.bid) {
            for (let t of trade_review.trade_data.tickets) {
              if (t.bid.order_id == e.detail.order_id && t.bid_brokerage != e.detail.brokerage){
                t.bid_brokerage = isNaN(parseFloat(e.detail.brokerage)) ? null : parseFloat(e.detail.brokerage);
                change = true;
              }
            }
          } else {
            for (let t of trade_review.trade_data.tickets) {
              if (t.bid.order_id == e.detail.order_id && t.offer_brokerage != e.detail.brokerage){
                t.offer_brokerage = isNaN(parseFloat(e.detail.brokerage)) ? null : parseFloat(e.detail.brokerage);
                change = true;
              }
            }
          }
          if (change) {
            trade_review.reviewed_by = [];
            websocket.updateTradeReview(trade_review);
          }
        }
        return;
      }
    }
  }

  function handleBankDivisionUpdate (e) {
    for(let trade of trades.trades){
      trade.setBankDivision(e.detail.order_id, e.detail.bank_div);
      refresh += 1;
    }
  }

  let minStartDate =  new Date(addDays((products.isXccy(active_prod) ||products.isNZD(active_prod) || products.isUSD(active_prod))  ? addDays(new Date(), 1, active_prod) : new Date(), 1,active_prod));
  let invalidStartDate = false;
  let invalidStartDateText = "";

  $: startChange(start_date);
  function startChange () {
    // Automatically roll forward the date
    if (start_date && (timestampToISODate(start_date) <  timestampToISODate(minStartDate))) {
      start_date = minStartDate; 
    }
   if (!isBusinessDay(new Date(start_date), active_prod)) {
      start_date = addDays(start_date,1,active_prod);
    }
  }
</script>


<div class={"trades-container"}>
  {#if trades}
    <Tile style={"width: 440px;"}>
      {#key refresh}
        {#each trades.trades as trade (trade.year.toString() + trade.volume.toString() + trade.price.toString())}
          <Trade bind:trade={trade} 
            bind:reviewExists
            locked={lockedLeg == trade.year || trades.trades.length == 1}
            size={trades.trades.length}
            on:copyBreaks={copyBreaks} 
            on:lockLeg={handleLockLeg}
            on:yieldUpdate={handleYieldUpdate}
            on:bankDivisionUpdate={handleBankDivisionUpdate}
            on:broUpdate={handleBroUpdate}/>
        {/each}
      {/key}

      <div style="height: 10px;"></div>

      {#if start_date_disabled || reviewExists}
        <TextInput readonly size="sm" labelText="Start Date" value={start_date} />
      {:else}
        <DatePicker
          datePickerType="single"
          flatpickrProps={{ static: true }}
          dateFormat="Y-m-d"
          bind:value={start_date}
          minDate={minStartDate}
        >
          <DatePickerInput
            labelText="Start Date"
            size="sm"
            placeholder="yyyy-mm-dd"
          />
        </DatePicker>
      {/if}

      <ButtonSet style={"margin-top: 10px; width: 100%"}>

        {#if devOverride}
          <Button
            on:click={handleReview}
            size="field"
            disabled={!show_submit_button||!traderApproved}
          >
            Submit (Overridden)
          </Button>

        {:else if trade_review == null}
          <Button
            on:click={handleRequestReview}
            size="field"
            disabled={!show_submit_button||!traderApproved}
          >
            Request Review
          </Button>
        {:else if approvedByMe}
          <Button
            size="field"
            disabled={true}
          >
            {"Approved, In Review(" + trade_review.reviewed_by.length + "/2)"}
          </Button>
        {:else if pendingApproval}
          <Button
            on:click={handleReview}
            size="field"
            disabled={!show_submit_button||!traderApproved}
          >
            {"Pending Approval"}
          </Button>
        {:else}
          <Button size="field" disabled={true} >
            {"In Review(" + trade_review.reviewed_by.length + "/2)"}
          </Button>
        {/if}

        {#if initiatedByMe}
          <Button on:click={retractReview} size="field" kind="danger">
            Retract Review
          </Button>
        {/if}

      </ButtonSet>
      {#if devOverride}
        <div style="font-size: small; color: red; width: 100%" >The trade review process has been overriden, remove developer override permission to test this process</div>
      {/if}
    </Tile>
  {/if}
</div>

<div class="modals_ts">
  <Modal
    size="sm"
    bind:open={openApproveModal}
    modalHeading="Tickets Summary"
    on:open
    on:close={updateTradeFromTicket}
    primaryButtonText="Approve Ticket"
    secondaryButtonText="Reject Ticket"
    preventCloseOnClickOutside
    
    on:click:button--secondary={rejectTrade}
    on:click:button--primary={approveTrade}
  >
    <TicketView bind:tickets={tickets} editable={devOverride} openTicket={openApproveModal}/>
  </Modal>
  
  {#if openReviewModal}
    <Modal
      size="sm"
      bind:open={openReviewModal}
      modalHeading="Request Reviews"
      hasScrollingContent = true
      on:open
      on:close
      primaryButtonText="Confirm"
      secondaryButtonText="Cancel"
      on:click:button--secondary={() => (openReviewModal = false)}
      on:click:button--primary={sendReview}
      primaryButtonDisabled={invalidReviewers}
      preventCloseOnClickOutside
    >
      <div class="ticket">
        <TicketView bind:tickets={tickets} editable={true} openTicket={openReviewModal}/>
      </div>
      <div class="review">
        <div>
          <Select
              labelText="Reviewer 1"
              bind:selected={reviewer1}
          >
            <SelectItem value={-1} text={"Please Select"} hidden />
            {#each reviewersList1 as r (r.broker_id)}
                <SelectItem value={r.broker_id} text={brokers.name(r.broker_id)} />
            {/each}  
          </Select>
        </div>
        <div style="width: 15%;"></div>
        <div>
          <Select
            labelText="Reviewer 2"
            bind:selected={reviewer2}
          >
            <SelectItem value={-1} text={"Please Select"} hidden />
            {#each reviewersList2 as r (r.broker_id)}
                <SelectItem value={r.broker_id} text={brokers.name(r.broker_id)} />
            {/each}  
          </Select>
        </div>
      </div>
    </Modal>
  {/if}
</div>

<style>
  .trades-container {
    min-width: 0;
  }
  .review {
    min-height: 52px;
    display: flex;
    overflow-y: auto;
    justify-content: center;
    padding-bottom: 0;
  }
  .ticket {
    max-height: 88%;
    overflow-y: auto;
  }
  :global(.modals_ts .bx--modal-content) {
    margin-bottom: 0;
  }
  
  :global(.trades-container .bx--btn--primary:only-child) {
    max-width: 100%;
    justify-content: center;
    padding-right: 12px;
  }
</style>