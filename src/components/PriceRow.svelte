<script>
import { createEventDispatcher } from 'svelte';

import Marked from './Marked.svelte';
import { toPrice, round, toBPPrice, removeTrailZero, toEFPSPSTenor } from '../common/formatting.js';
import traders from '../stores/traders.js';
import user from '../stores/user';
import brokers from '../stores/brokers.js';
import tradess from '../stores/tradess';
import quotes from '../stores/quotes';
import { addToast } from '../stores/toast';
import websocket from '../common/websocket';
import currency_state from '../stores/currency_state';
import prices from '../stores/prices';

const dispatch = createEventDispatcher();

// Parameters to display.

export let row;
export let price_group;
export let size;
export let highlight = null;
export let tenor = null;

let permission;
$:{
  let b = $brokers;
  permission = user.getPermission();
}
// Flags for whether there are offers and bids for the current row.

let has_offer, the_offer, offer_bank, offer_is_good, offer_is_old;
let has_bid, the_bid, bid_bank, bid_is_good, bid_is_old;

let has_offer_interest, the_offer_interest, offer_interest_bank;
let has_bid_interest, the_bid_interest, bid_interest_bank;

// Reactive calculations for offers in the price group of the current row.
$: {
  let b = $brokers; // Trigger reactivity when the brokers store is updated.
  if (price_group.offers.length > row && !price_group.offers[row].eoi) {
    has_offer = true;
    the_offer = price_group.offers[row];
    offer_bank = traders.bankName(the_offer.trader_id);
    if (offer_bank.split(" ")[0] == "Bank"){
      offer_bank = "POC";
    }
    offer_is_good = price_group.offers[row].priceIsGood(price_group.mid_point);
    offer_is_old = new Date(the_offer.time_placed) < new Date().setHours(0, 0, 0, 0);
  } else {
    has_offer = false;
  }

  if(price_group.offers.length > row && price_group.offers[row].eoi) {
    has_offer_interest = true;
    the_offer_interest = price_group.offers[row];
    offer_interest_bank = traders.bankName(the_offer_interest.trader_id);
    if (offer_interest_bank.split(" ")[0] == "Bank"){
      offer_bank = "POC";
    }
    offer_is_old = new Date(the_offer_interest.time_placed) < new Date().setHours(0, 0, 0, 0);
  } else {
    has_offer_interest = false;
  }
}

// Reactive calculations for bids in the price group of the current row.

$: {
  let b = $brokers; // Trigger reactivity when the brokers store is updated.
  if (price_group.bids.length > row && !price_group.bids[row].eoi) {
    has_bid = true;
    the_bid = price_group.bids[row];
    bid_bank = traders.bankName(the_bid.trader_id);
    if (bid_bank.split(" ")[0] == "Bank"){
      bid_bank = "POC";
    }
    bid_is_good = price_group.bids[row].priceIsGood(price_group.mid_point);
    bid_is_old = new Date(the_bid.time_placed) < new Date().setHours(0, 0, 0, 0);
  } else {
    has_bid = false;
  }
  if(price_group.bids.length > row && price_group.bids[row].eoi) {
    has_bid_interest = true;
    the_bid_interest = price_group.bids[row];
    bid_interest_bank = traders.bankName(the_bid_interest.trader_id);
    if (bid_interest_bank.split(" ")[0] == "Bank"){
      bid_bank = "POC";
    }
    bid_is_old = new Date(the_bid_interest.time_placed) < new Date().setHours(0, 0, 0, 0);
  } else {
    has_bid_interest = false;
  }
}

// Reactive calculations for offers/bids that match price

let offer_is_tradable = false;
let bid_is_tradable = false;

// detirmines if the offer of this row should be highlighted as existing in a trade
$: {
  let tradesStore = $tradess; // Just used to make this section react to changes in the tradess store
  let price = price_group.offers[row];
  if (price){
    if (!price.eoi){
      let links = price.links;
      if (links.length == 1){
        if (tradess.containsOrder(links)[0]){
          offer_is_tradable = true;
        } else {
          offer_is_tradable = false;
        }
      } else {
        let found = false;
        let possible = tradess.containsOrder(links)[0];
        if (possible){ 
          for (let p of price_group.bids) {
            let allOrders = links.concat(p.links);
            if (allOrders.every((o) => possible.getAllOrders().includes(o)) && 
                JSON.stringify(price.years) === JSON.stringify(p.years) &&
                JSON.stringify(price.years) === JSON.stringify(possible.years) &&
                round(price.price, 8) === round(p.price, 8)){
              found = true;
              break;
            }
          }
        }
        offer_is_tradable = found;
      }
    }
  }
}

// detirmines if the bid of this row should be highlighted as existing in a trade
$: {
  let tradesStore = $tradess; // Just used to make this section react to changes in the tradess store
  let price = price_group.bids[row];
  if (price){
    if (!price.eoi){
      let links = price.links;
      if (links.length == 1){
        if (tradess.containsOrder(links)[0]){
          bid_is_tradable = true;
        } else {
          bid_is_tradable = false;
        }
      } else {
        let found = false;
        let possible = tradess.containsOrder(links)[0];
        if (possible){ 
          for (let p of price_group.offers) {
            let allOrders = links.concat(p.links);

            if (allOrders.every((o) => possible.getAllOrders().includes(o)) && 
                JSON.stringify(price.years) === JSON.stringify(p.years) && 
                JSON.stringify(price.years) === JSON.stringify(possible.years) &&
                round(price.price, 8) === round(p.price, 8)){
              found = true;
              break;
            }
          }
        }
        bid_is_tradable = found;
      }
    }
  }
}

let editable = price_group.product_id == 17;
let editing = false;
let html_row;
$: { if (row === 1 && html_row) {
  let el = html_row.getElementsByClassName("mid-point")[0];
  if (editing) { el.focus(); }
  else { el.blur(); }
}}

let mid;
$: refreshMid($prices);
function refreshMid () {
  if (row == 1) {
    price_group = prices.getPriceGroup(price_group);
  } 
  mid = (price_group.product_id == 1 || price_group.product_id == 3 || price_group.product_id == 20) && price_group.years.length != 1 ? 
          toBPPrice(price_group.mid_point) : toPrice(price_group.mid_point);
}

function handleOverride (event) {
  let ovr = parseFloat(event.srcElement.innerText);
  if (ovr != +mid) {
    if (isNaN(ovr)) {
      addToast ({
        message: "Price isn't correct. Please try again.",
        type: "error",
        dismissible: true,
        timeout: 1000,
      });
      event.srcElement.innerText = removeTrailZero(mid);
      return;
    } else {
      // Update the order volume
      addToast ({
        message:"Successfully updated order.",
        type: "success",
        dismissible: true,
        timeout: 1000,
      });
      let quote = quotes.get(price_group.product_id, price_group.years[0]);
      websocket.overrideQuote(quote, ovr, $currency_state);
    }
  }
}

function tenorDateFormat(tenor){
  const date = new Date(tenor);
  return date.getDate() + "-" + (date.getMonth() + 1) + "-" + (date.getFullYear() - 2000);
}

let delay;
function openFutRef (e, open, price) {
  if (open && price && (price?.links?.length == 1 || price.eoi)) {
    delay = setTimeout(() => {
      let element;
      if (e.target.localName == 'td') element = e.target;
      else element = e.target.parentElement;
      let rect = element.getBoundingClientRect();
      let left = price.bid ? rect.left + 70 : rect.left + 20;
      let tenor;
      switch (price.product_id) {
        case 1:
          if (price.years.length > 1 && !price.years.some(y => y > 3)) {
            tenor = "MID";
            break;
          }
        case 2:
          tenor = price.years.length == 1 ? (price.years[0] > 5 ? '10Y' : '3Y') : '3x10'
          break;
        case 17:
        case 27:
          tenor = toEFPSPSTenor(price.start_date).split(" ")[0];
          break;
        default:
          tenor = "MID";
          break;
      }
      dispatch("showFutRef", {open, left: left, top: rect.top + rect.height - 15, tenor, rate: round(price.reference, 6)});
    }, 650);
  } else {
    clearTimeout(delay);
    dispatch("showFutRef", {open: false});
  }
}

</script>

<!-- Show the row only if it has data. -->

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
{#if row < 2 || has_offer || has_bid || has_bid_interest || has_offer_interest}
  <!-- Show the offer only if there is one for this row. -->
  <tr bind:this={html_row}>
    {#if has_offer}
        <td class={`${offer_is_tradable ? 'highlight' : ''}` }
          on:click={() => dispatch('show_legs', the_offer)}
        >
          <Marked order_={the_offer} oco={the_offer.oco} mark={offer_is_good}>{offer_bank}</Marked>{offer_is_old ? '❄️' : !the_offer.firm ? '⛔' : ''}
        </td>
        
        <td style="text-align: left;" class={`${offer_is_tradable ? 'highlight' : ''}` }
        on:click={() => dispatch('show_legs', the_offer)} on:mouseenter={(e) => openFutRef(e, true, the_offer)} on:mouseleave={(e) => openFutRef(e, false)}>
          <Marked order_={the_offer} oco={the_offer.oco} mark={offer_is_good}>{(the_offer.product_id == 1 || the_offer.product_id == 3 || the_offer.product_id == 20) && price_group.years.length != 1 ?  removeTrailZero(toBPPrice(the_offer.price)) :  removeTrailZero(toPrice(the_offer.price))}</Marked>{the_offer.isBelowMMP() ? '⚠️' : ''}
        </td>

    {:else if has_offer_interest}
      <td on:click={() => dispatch('show_legs', the_offer_interest)}>
        <Marked order_={null}  interest={true}>{offer_interest_bank}</Marked>
      </td>
      {#if the_offer_interest.price != null}
        <td style="text-align: left;" on:click={() => dispatch('show_legs', the_offer_interest)} on:mouseenter={(e) => openFutRef(e, true, the_offer_interest)} on:mouseleave={(e) => openFutRef(e, false)}>
          <Marked order_={null}  interest={true}>{(the_offer_interest.product_id == 1 || the_offer_interest.product_id == 3 || the_offer_interest.product_id == 20) && price_group.years.length != 1 ? removeTrailZero(toBPPrice(the_offer_interest.price)) : removeTrailZero(toPrice(the_offer_interest.price))}</Marked>
        </td>
      {:else}
        <td style="text-align: left;" on:click={() => dispatch('show_legs', the_offer_interest)}/>
      {/if}
    {:else}
      <td />
      <td />
    {/if}

    <!-- The centre cell shows something in rows 0 and 1 and nothing in row 2. -->
    {#if row === 0}  
      <td class="centralCells {price_group.shape}" class:expandable={size > 3 || highlight} class:wide-shape={price_group.tenor.length > 6} class:highlight={offer_is_tradable}
        on:click={() => dispatch('expand')}>
        {#if price_group.product_id == 18}
          {tenor ? tenor : new Date(price_group.tenor).toLocaleDateString()}
        {:else}
          {tenor ? tenor : price_group.tenor}
        {/if}
      </td>
    {:else if row === 1}
      {#if editable && !permission["View Only"]}
        <td contenteditable={editing} tabindex="0" on:blur={(e) => {handleOverride(e); editing = false;}} on:keypress={e => {if (e.key == "Enter") { editing = false; }}}
          style="cursor: text;" class="mid-point centralCells {price_group.shape}" class:expandable={size > 3 || highlight} class:highlight={offer_is_tradable} 
          on:click={(e) => {if (e) {editing = true;}}}>{removeTrailZero(mid)}</td>
      {:else}
        <td class="mid-point centralCells {price_group.shape}" class:expandable={size > 3 || highlight} class:highlight={offer_is_tradable} 
          on:click={() => dispatch('expand')}>{removeTrailZero(mid)}</td>
      {/if}
    {:else}
      <td class="centralCells {price_group.shape}" class:expandable={size > 3 || highlight} class:highlight={offer_is_tradable} on:click={() => dispatch('expand')}/>
    {/if}

    <!-- Show the bid only if there is one for this row. -->
    {#if has_bid}
      <td style="text-align: right;" class={`${bid_is_tradable ? 'highlight' : ''}`}
        on:click={() => dispatch('show_legs', the_bid)} on:mouseenter={(e) => openFutRef(e, true, the_bid)} on:mouseleave={(e) => openFutRef(e, false)}
      >
        {the_bid.isBelowMMP() ? '⚠️' : ''}<Marked order_={the_bid} oco={the_bid.oco} mark={bid_is_good}>{(the_bid.product_id == 1 || the_bid.product_id == 3 || the_bid.product_id == 20) && price_group.years.length != 1 ?  removeTrailZero(toBPPrice(the_bid.price)) :  removeTrailZero(toPrice(the_bid.price))}</Marked>
      </td>
      <td class={`${bid_is_tradable ? 'highlight' : ''}`}
        on:click={() => dispatch('show_legs', the_bid)}
      >

        {bid_is_old ? '❄️' : !the_bid.firm ? '⛔' : ''}<Marked order_={the_bid} oco={the_bid.oco} mark={bid_is_good}>{bid_bank}</Marked>

      </td>

    {:else if has_bid_interest}
      {#if the_bid_interest.price != null}
      <td style="text-align: right;" on:click={() => dispatch('show_legs', the_bid_interest)} on:mouseenter={(e) => openFutRef(e, true, the_bid_interest)} on:mouseleave={(e) => openFutRef(e, false)}>
        <Marked order_={null} interest={true}>{(the_bid_interest.product_id == 1 || the_bid_interest.product_id == 3 || the_bid_interest.product_id == 20) && price_group.years.length != 1 ?  removeTrailZero(toBPPrice(the_bid_interest.price)) :  removeTrailZero(toPrice(the_bid_interest.price))}</Marked>
      </td>
      {:else}
      <td style="text-align: right;" on:click={() => dispatch('show_legs', the_bid_interest)}/>
      {/if}
      <td on:click={() => dispatch('show_legs', the_bid_interest)} >
        <Marked order_={null} interest={true}>{bid_interest_bank}</Marked>
      </td>
    {:else}
      <td />
      <td />
    {/if}
  </tr>
{/if}

<!-- Show the row only if it has data. -->

<style>
.centralCells {
  color: white;
  cursor: context-menu;
}
td {
  padding-top: 1px;
}
td:has(> *):hover {
  cursor: pointer;
  background-color: var(--cds-hover-row);
}
td:first-child {
  text-align: left;
}
td:last-child {
  text-align: right;
}
.outright {
  background-color: darkblue !important;
}
.spread {
  background-color: darkgreen !important;
}
.butterfly {
  background-color: darkred !important;
}
.highlight {
  background-color: var(--cds-support-02);
}
.highlight:hover {
  background-color: var(--cds-support-02);
}
.expandable {
  border-left: solid 2px white !important;
  border-right: solid 2px white !important;
  cursor: pointer;
}
:global(.secondary-prices) .outright {
  background-color: blue !important;
}
:global(.secondary-prices) .spread {
  background-color: rgba(46, 168, 15) !important;
}
:global(.secondary-prices) .butterfly {
  background-color: rgb(210, 25, 0) !important;
}
:global(.efpsps .white) .outright {
  background-color: #161616 !important;
  border-left: solid 1px lightgrey;
  border-right: solid 1px lightgrey;
}
:global(.efpsps .red) .outright {
  color: red !important;
  background-color: #161616 !important;
  border-left: solid 1px lightgrey;
  border-right: solid 1px lightgrey;
}
:global(.efpsps .green) .outright {
  color: limegreen !important;
  background-color: #161616 !important;
  border-left: solid 1px lightgrey;
  border-right: solid 1px lightgrey;
}
:global(.efpsps .gold) .outright {
  color: gold !important;
  background-color: #161616 !important;
  border-left: solid 1px lightgrey;
  border-right: solid 1px lightgrey;
}
:global(.broadsps) .outright {
  background-color: darkgreen !important;
  cursor: pointer;
}
:global(.sps) .outright {
  background-color: indigo !important;
}
:global(.fwd) .outright {
  background-color: rgb(216, 120, 24) !important;
}
.mid-point {
  font-weight: bold;

}
.mmp {
  font-size: xx-small;
}
.wide-shape {
  font-stretch: 50%;
  white-space: nowrap;
}
tr {
  height: 1.25em;
}
</style>
