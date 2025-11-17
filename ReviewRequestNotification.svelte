<script>
  'use strict';

  import { createEventDispatcher, onMount } from 'svelte';
  import { Button, ButtonSet } from 'carbon-components-svelte';
  import { fly } from 'svelte/transition';
  import { quintInOut, quintOut } from 'svelte/easing';
  import InformationFilled from 'carbon-icons-svelte/lib/InformationFilled.svelte';
  import Launch from 'carbon-icons-svelte/lib/Launch.svelte';
    
  import orders from '../stores/orders';
  import trade_reviews from '../stores/trade_reviews';
  import products from '../stores/products';
  import user from '../stores/user';
  import brokers from '../stores/brokers';

  const dispatch = createEventDispatcher();

  let notification;
  
  // Trade review notifications

  let reviewRequest = false;
  let trade_review;

  $: tr(false, $trade_reviews);
  onMount(() => { tr(true); });
  function tr(first) {
    if (!$trade_reviews[0]) { reviewRequest = false; return; }
    for (let i = 0, rev = $trade_reviews[i]; i < $trade_reviews.length; rev = $trade_reviews[++i]) {
      if (!rev.acknowledged && trade_reviews.validate(rev) && (first || rev.initiated_by != user.get() && !rev.reviewed_by.length)) {
        doRev(rev);
        break;
      }
    }
  }

  function doRev(rev) {
    trade_review = rev;
    reviewRequest = true;
    if (document.visibilityState == "hidden") {
      Notification.requestPermission().then(perm => {
        if (perm == 'granted') {
          const notification = new Notification("Trade Review", {
            body: brokers.name(trade_review.initiated_by) + " has requested you to review a trade",
            requireInteraction: true
          });
          notification.addEventListener("click", () => window.focus());
        }
      });
    }
  }

  function handleTradeReview () {
    trade_review.acknowledged = true;
    let pid = orders.get(trade_review.orders[0]).product_id;
    dispatch("viewTR", {pid});
    reviewRequest = false;
  }

  function textContent(tr) {
    let p = products.name(tr.trade_data.tickets[0].product_id);
    return `${brokers.name(tr.initiated_by)} has requested you review ${(/[aeiou]/i).test(p.charAt(0)) ? "an" : "a"} ${p} trade.`;
  }
</script>


{#if reviewRequest}
  <div id="reviewReq" bind:this={notification}
    style="z-index:9500; position:absolute; top:100px; left: calc(50vw - (432px/2)); 
      display:grid; gap:3px; grid-template-columns:50px 375px; grid-template-rows:150px 58px; grid-template-areas:'info text' 'buttons buttons';
      border-left:4px solid var(--cds-interactive-01); background-color:var(--cds-ui-05); color:var(--cds-text-inverse); box-shadow: 1px 1px 20px var(--cds-ui-background);"
    in:fly={{y:-300, duration:2500, easing:quintInOut}} out:fly={{y:-300, duration:1000, easing:quintOut}}
    >
    <div style="grid-area:info; color:var(--cds-interactive-01); justify-self:center; margin-top:15px;"><InformationFilled size={28}/></div>
    <div style="grid-area:text;">
      <h3 style="margin:12px 0px; font-weight:bold">Review Request</h3>
      <p style="padding-right:50px;">{textContent(trade_review)}</p>
    </div>
    <div style="grid-area:buttons;" on:click|stopPropagation>
      <ButtonSet style="justify-content:center;">
        <Button icon={Launch} on:click={handleTradeReview}>View Trade</Button>
        <Button kind="secondary" on:click={() => {reviewRequest = false; trade_review.acknowledged = true;}}>Dismiss</Button>
      </ButtonSet>
    </div>
  </div>
{/if}