<script>
import {
    Button, 
    ContextMenu,
    ContextMenuOption, 
    ContextMenuDivider,
    Modal,  
    Select, 
    SelectItem,
} from "carbon-components-svelte";
import CertificateCheck from "carbon-icons-svelte/lib/CertificateCheck.svelte";
import NonCertified from "carbon-icons-svelte/lib/NonCertified.svelte";
import CloseOutline from "carbon-icons-svelte/lib/CloseOutline.svelte";
import AddAlt from "carbon-icons-svelte/lib/AddAlt.svelte";
import Paste from "carbon-icons-svelte/lib/Paste.svelte";
import Layers from "carbon-icons-svelte/lib/Layers.svelte";
import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";

import { createEventDispatcher, onMount } from "svelte";
import { generateConfo, round, toVolumeString } from "../common/formatting";
import { mapTrades } from "../common/ov_trade_mapper";
import TradesObject from "../common/trades";
import websocket from "../common/websocket";
import currency_state from "../stores/currency_state";

import orders from "../stores/orders";
import prices from "../stores/prices";
import quotes from "../stores/quotes";
import tradess from "../stores/tradess";
import traders from "../stores/traders";
import TicketView from "./TicketView.svelte";
import Trades from "./Trades.svelte";
import trade_reviews from "../stores/trade_reviews";
import brokers from "../stores/brokers";
import user from "../stores/user";
import Tickets from "../common/tickets";
import ocos from "../stores/ocos";
import OrderTable from "./OrderTable.svelte";
import products from "../stores/products";
import banks from '../stores/banks';
import OrderForm from "./OrderForm/OrderForm.svelte";
import { getReference } from "../common/calculations";

export let product_id;  
export let year_ft = year_ft; 
export let bid_ft = bid_ft;
export let price_ft = price_ft;
export let vol_ft = vol_ft;
export let firm_ft = firm_ft;
export let order_ft = order_ft; 
export let canDelete = false;
export let isInterest = false;
export let ctxMenuTarget = null;


let modals_ft_div;
let click_within_f;
let click_within_t;
onMount(() => {
  modals_ft_div.addEventListener('mousewheel', (e) => {e.stopPropagation();}, false);
  modals_ft_div.children[0].firstElementChild.addEventListener('mousedown', (e) => {click_within_f = true;});
  modals_ft_div.children[0].addEventListener('mouseup', (e) => {if (!click_within_f) { showForm = false; } click_within_f = false;});
  modals_ft_div.children[1].firstElementChild.addEventListener('mousedown', (e) => {click_within_t = true;});
  modals_ft_div.children[1].addEventListener('mouseup', (e) => {if (!click_within_t) { showTrade = false; } click_within_t = false;});
});

price_ft = round(price_ft, 7);

if (canDelete && isNaN(order_ft.order_id)) canDelete = false;
if (vol_ft) vol_ft = toVolumeString(vol_ft);

$:permission = user.getPermission($brokers);
let leftover_bool = false;
let leftover_err_message = "";
let tradeExists = false;
let trades = null;
let showForm = false;
let showTrade = false;
let showTicket = false;
let tickets = [];
let tradesComponent;
let start_date;
const dispatch = createEventDispatcher();
let selected = {};

$: setSelected(order_ft);

//Selected updates when dv01/vol is changed from editable legs
function setSelected() {
  if (showForm || showTrade) { return; }
  selected={
    order_id: isInterest ? order_ft.order_id : 0,
    bid: isInterest ? bid_ft : !bid_ft,
    firm: order_ft.firm,
    years: year_ft,
    price: price_ft,
    volume: vol_ft,
    fwd: order_ft.fwd,
    product_id: product_id,
    start_date: order_ft.start_date,
    trader_id: isInterest ? order_ft.trader_id : undefined
  }
}

checkforTrade(true);

$: closeTrade($tradess, $orders);
async function closeTrade(t) {
  await checkforTrade(true);
  if (trades != null && !t[trades.product_id].includes(trades)){
    showTrade = false;
    if (orders.get(order_ft.order_id) == null) {
      dispatch('close');
    }
  }
}

$: checkforTrade(false, order_ft);

let refresh = 0;

$: if(openApproveModal == false || openReviewModal == false) updateTradeFromTicket();

function updateTradeFromTicket() {
  if(!trades || !tickets || !trades.hasOwnProperty('trades') || !tickets.hasOwnProperty('tickets')) return;
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
        trade.price = ticket.price;
      }
    }
  }
  refresh += 1;
}

// Show Create order form
async function onRightClick(e) {
    if (showForm) {
        showForm = false;
        await new Promise(res => setTimeout(res, 10));
    }
    selected.firm = true;
    showForm = true;
}

// Delete selected order
function deleteOrder() {
  dispatch('close');
  websocket.deleteOrders([order_ft.order_id]);
}

// Check to see if the selected order is part of an existing trade
async function checkforTrade(init) {
  trades = null;
  let i = 0;

  // Wait for the new trade to appear 
  // if new order has just been made this may take a small amount of time
  // as the trade matcher is running in the background
  while (trades == null && i < 4){
    let check = null;
    if (order_ft.links){
      check = tradess.containsOrder(order_ft.links)[0];
    } else {
      check = tradess.containsOrder([order_ft])[0];
    }
    if (check){
        trades = check;
        break;
    }
    if (init){
      return false;
    }
    await new Promise(res => setTimeout(res, 50));
    i++;
  }

  if (trades == null && i == 4) {
    tradeExists = false;
    return false;
  }

  // check that every link is contained in the trade
  if (order_ft.links){
    let tradeOrders = trades.getAllOrders();
    if (order_ft.links.every((o) => tradeOrders.includes(o))){
      tradeExists = true;
      return true;
    }
    return false;
  } else {
    tradeExists = true;
    return true;
  }
}

// Called after creating a new order to match up the new trade 
// This might be overly complicated but im not entirely sure. It works though
async function handleTrade(event) {

  let submittedOrder = event.detail.order;

  let ordersList = orders.getOrdersByProduct(submittedOrder.product_id);

  let newOrder = null;
  // Wait for the new order to appear
  while (!newOrder){
    for (let o of ordersList){
      if (
        o.bid === submittedOrder.bid &&
        o.firm === submittedOrder.firm &&
        JSON.stringify(o.years) === JSON.stringify(submittedOrder.years) &&
        o.price === submittedOrder.price &&
        o.volume === submittedOrder.volume &&
        o.broker_id === submittedOrder.broker_id &&
        o.trader_id === submittedOrder.trader_id && 
        (submittedOrder.start_date ? new Date(o.start_date).toDateString() == new Date(submittedOrder.start_date).toDateString() : true) &&
        (submittedOrder.fwd ? o.fwd == submittedOrder.fwd : true)){
          newOrder = o;
          break;
        }
    }
    await new Promise(res => setTimeout(res, 100));
  }

  let expectedOrders = [];
  if (order_ft.links){
    expectedOrders = expectedOrders.concat(order_ft.links);
  } else {
    expectedOrders.push(order_ft);
  }
  expectedOrders.push(newOrder);

  // Match new trade
  if (checkforTrade(false)) {
    let bidPrices;
    let offerPrices;
    if (newOrder.bid){
      bidPrices = prices.derivedFromAll([newOrder]);
      offerPrices = prices.derivedFromAll(order_ft.links ? order_ft.links : [order_ft]);
      if (offerPrices.length > 1){
        for (let p of offerPrices){
          if (round(p.price, 8) === round(bidPrices.price, 8) && p.years === bidPrices.years){
            offerPrices = [p];
            break;
          }
        }
      }
    } else {
      offerPrices = prices.derivedFromAll([newOrder]);
      bidPrices = prices.derivedFromAll(order_ft.links ? order_ft.links : [order_ft]);

      if (bidPrices.length > 1){
        for (let p of bidPrices){
          if (round(p.price, 8) === round(offerPrices.price, 8) && p.years === offerPrices.years){
            bidPrices = [p];
            break;
          }
        }
      }
    }
    tradess.remove([trades]);
    trades = new TradesObject(offerPrices[0], bidPrices[0]);
    tradess.add([trades]);
    tradeExists = true;
    return;
  }
}

function handleTickets(event) {
  tickets = event.detail.tickets;
  showTrade = false;
  showTicket = true;
}

async function onRightClickTrade(e) {
    if (showTrade) {
        showTrade = false;
        await new Promise(res => setTimeout(res, 10));
    }
    showTrade = true;
}

async function afterSubmit () {
  // Send the tickets to Oneview
  submitOvTickets(tickets)

  // Update brokerages table
  updateBrokerages(tickets);

  //Remove OCO orders
  orders.removeOCOOrders(tickets.tickets);
  
  dispatch("close");
}

  // Handle Ticket confirm
  async function HandleTicketConfirm() {
    showTicket = false;

    tradesComponent.handleLeftovers(trades);

    if (trade_review){
      let id = trade_review.review_id;
      trade_review.status = "Finished";
      websocket.updateTradeReview(trade_review);
      await new Promise(res => setTimeout(res, 100));
      websocket.deleteTradeReview([id]);
    }

    // Update mids using trade prices
    // This is not needed at the moment as bbg quotes are updated frequently
    // It may be more usefull when we are making our own market 
    // i.e. using our own mids ask and bids instead of bbg
    // updateMids(); 

    // Insert the tickets into the trades table
    websocket.callFunctionWithCallback(websocket.insertTickets, [tickets], "insert_tickets", afterSubmit);
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

  function makeOrderFirm () {
    websocket.submitOrder({
      order_id: order_ft.order_id,
      firm: !firm_ft,
      time_placed: new Date(),
      reference: getReference(order_ft.years, order_ft.product_id, order_ft.start_date, order_ft.fwd),
    });
    dispatch('close');
  }

  let trade_review;
  let inReview = false; 
  let approvedByMe = false;
  let pendingApproval = false;
  let invalidReviewers = false;

  $: {
    let t = $trade_reviews;
    if (trades) {
      trade_review = trade_reviews.getFromTrade(trades);
    } else {
      trade_review = null;
    }
  };
  $: inReview = trade_review != null && trade_review.reviewed_by.length < 2;
  $: approvedByMe = trade_review != null && inReview && trade_review.reviewed_by.includes(me);
  $: pendingApproval = trade_review != null && !approvedByMe && trade_review.reviewers.includes(me);
  $: invalidReviewers = !(reviewer1 != -1 && reviewer2 != -1 && reviewer1 != reviewer2);
  let openReviewModal = false; 
  let openApproveModal = false;
  let reviewer1 = -1;
  let reviewer2 = -1;
  
  $: reviewersList = $brokers.filter((b) => b.active && b.permission["Approve Trades"] && !b.permission["Developer Override"]);

  let me = user.get();
  let devOverride = (brokers.get(me).permission["Developer Override"]);

  function handleRequestReview (e) {
     
    start_date = e.detail.start_date;

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
      openApproveModal = false;
      websocket.updateTradeReview(trade_review);
      HandleTicketConfirm();
      return;
    }

    websocket.updateTradeReview(trade_review);
    openApproveModal = false;
  }
  
  async function rejectTrade() {
    if (devOverride) {
      openApproveModal = false;
      return;
    }
    trade_review.status = "Failed";
    let id = trade_review.review_id;
    websocket.updateTradeReview(trade_review);
    await new Promise(res => setTimeout(res, 100));
    websocket.deleteTradeReview([id]);
    openApproveModal = false;
  }

  function handleReview (event) {
    tickets = event.detail.tickets;
    openApproveModal = true;
  }

function convertToInterest () {
    let order = {
      order_id: order_ft.order_id,
      eoi: true,
      firm: false
    }
    websocket.submitOrder(order, true);
    dispatch('close');
}

// OCO - One Cancels The Other
async function OCO () {
  if (order_ft.trader_id) {
    ocos.setOCO(traders.get(order_ft.trader_id).bank_id, order_ft.product_id, !ocos.isOCO(traders.get(order_ft.trader_id).bank_id, order_ft.product_id)); 
  }
}
let active_orders;
$: if (order_ft.trader_id) {
  active_orders = $orders[order_ft.product_id].filter( o => traders.get(o.trader_id).bank_id == traders.get(order_ft.trader_id).bank_id);
}
let openOCOModal = false;
let selection = [];
</script>

{#if !permission["View Only"]}
  {#if isInterest}
  <ContextMenu target={ctxMenuTarget}> 
    <ContextMenuOption
      icon={AddAlt}
      id="convert"
      indented
      labelText="Convert to Order"
      on:click={() => {onRightClick();}}
    />
    {#if canDelete}
      <ContextMenuOption
        icon={AddAlt}
        id="create"
        indented
        kind="danger"
        labelText="Delete Interest"
        on:click={deleteOrder}
      />
    {/if}
  </ContextMenu>
  {:else}
    <ContextMenu target={ctxMenuTarget}> 
      <!-- Create Order -->
        <ContextMenuOption
          icon={AddAlt}
          id="create"
          indented
          labelText="Create Order"
          on:click={() => {onRightClick();}}
        />
      <!-- View Trade -->
        {#if order_ft.firm}
          <ContextMenuOption
            icon={CertificateCheck}
            id="trade"
            indented
            labelText="Trade Order"
            on:click={() => {
              onRightClickTrade();}}
          />
        {/if}
       
        <!--Refer/Make Firm-->
        {#if order_ft.eoi || !order_ft.hasOwnProperty('price_id')}
          <ContextMenuDivider />
          <ContextMenuOption
            icon={firm_ft ? NonCertified : CertificateCheck}
            id="makeFirm"
            indented
            labelText={firm_ft ? "Refer" : "Make Firm"}
            on:click={() => {
              makeOrderFirm();}}
          />
          
          <ContextMenuOption
            icon={Paste}
            id="convert"
            indented
            labelText="Convert to Interest"
            on:click={convertToInterest}
          />
        {/if}

        <!--OCO -->
        {#if order_ft.eoi || !order_ft.hasOwnProperty('price_id')}
          <ContextMenuOption
            icon={Layers}
            id="OCO"
            indented
            labelText={"OCO"}
            >
            <ContextMenuOption
              id="highlightOCO"
              labelText="Set & Highlight OCO Group"
              indented
              icon={ocos.isOCO(traders.get(order_ft.trader_id).bank_id, order_ft.product_id) ? Checkmark : undefined}
              on:click={() => { OCO(); dispatch('close'); }}/>
            <ContextMenuOption id="viewOCO" labelText="View OCO Group" indented on:click={() => {openOCOModal = true}}/>
            <ContextMenuOption id="clearOCO" labelText="Remove all OCO Groups" indented on:click={() => {ocos.removeAllOCO()}}/>
          </ContextMenuOption>
        {/if}

        <!--Delete-->
        {#if canDelete}
          <ContextMenuDivider />
          <ContextMenuOption
            icon={CloseOutline}
            id="delete"
            indented
            kind="danger"
            labelText="Delete Order"
            on:click={deleteOrder}
          />
        {/if}
        
    </ContextMenu>
  {/if}
{/if}

<div class="modals_ft" bind:this={modals_ft_div}>
  <Modal
    size ="sm"
    bind:open={showForm}
    preventCloseOnClickOutside
    passiveModal
    modalHeading="Order Form"
    modalAriaLabel="quick-order-title"
    aria-describedby="quick-order-content"
    >
      <div id="quick-order-content">
        <OrderForm 
          {selected}
          {order_ft}
          on:server_error 
          on:order_updated={() => {showForm = false; dispatch('closeLegs')}} />
      </div>
  </Modal>
  
  <Modal 
    bind:open={showTrade}
    preventCloseOnClickOutside
    on:close
    size="sm"
    passiveModal
    modalHeading="Trade"
    modalAriaLabel="quick-order-title"
    aria-describedby="quick-order-content"
    >
      {#if tradeExists}
        <Trades {trades} bind:leftover_bool={leftover_bool} bind:leftover_err_message={leftover_err_message} bind:refresh={refresh}
            fromWhiteboard={true} on:openticket={handleTickets} bind:this={tradesComponent}
            on:handleRequestReview={handleRequestReview} on:handleReview={handleReview}/>
      {:else}
        <OrderForm 
            {selected}  
            {order_ft}
            opposingOrder={true}
            on:server_error 
            on:order_updated={handleTrade} />
      {/if}
  </Modal>

  {#if openApproveModal}
    <Modal
      size="sm"
      bind:open={openApproveModal}
      modalHeading="Tickets Summary"
      on:open
      on:close={() => openApproveModal = false}
      primaryButtonText="Approve Ticket"
      secondaryButtonText="Reject Ticket"
      preventCloseOnClickOutside
      
      on:click:button--secondary={rejectTrade}
      on:click:button--primary={approveTrade}
    >
      <div style="width: 36vw;">
        <TicketView bind:tickets={tickets} editable={devOverride} openTicket={openApproveModal}/>
      </div>
    </Modal>
  {/if}


  {#if openReviewModal}
    <Modal
      size="sm"
      bind:open={openReviewModal}
      modalHeading="Request Reviews"
      on:open
      on:close={openReviewModal = false}
      primaryButtonText="Confirm"
      on:click:button--primary={sendReview}
      primaryButtonDisabled={invalidReviewers}
      preventCloseOnClickOutside
    >
      <div style="width: 36vw;">
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
              {#each reviewersList.filter(b => b.broker_id != reviewer2) as r (r.broker_id)}
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
              {#each reviewersList.filter(b => b.broker_id != reviewer1) as r (r.broker_id)}
                  <SelectItem value={r.broker_id} text={brokers.name(r.broker_id)} />
              {/each}  
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  {/if}
  {#if openOCOModal}
    <Modal
      hasScrollingContent
      passiveModal
      bind:open={openOCOModal}
      modalHeading={`OCO - One Cancels The Other Group | ${banks.get(traders.get(order_ft.trader_id).bank_id).bank} | ${products.name(order_ft.product_id)}`}
      on:open
      on:close={() => openOCOModal = false}
    >
      <div style="height: 300px; width: 850px">
        <OrderTable {active_orders} {selection}/> 
      </div>
    </Modal>
  {/if}

</div>

<style>
.review {
    min-height: 52px;
    display: flex;
    overflow-y: auto;
    justify-content: center;
    padding-bottom: 0;
}
.ticket {
  height: 88%;
  overflow-y: auto;
}
:global(.modals_ft .bx--modal-content) {
  max-height: fit-content;
  /* height: fit-content; */
  margin-bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
:global(.modals_ft .bx--modal-container) {
  width: fit-content;
  padding-bottom: 15px;
}
</style>

