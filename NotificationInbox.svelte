<script>
  'use strict';
  
  import { createEventDispatcher, onMount } from "svelte";
  
  import { Button } from "carbon-components-svelte";
  import NotificationInboxTile from "./NotificationInboxTile.svelte";
  import { fade } from "svelte/transition";
  import Launch from 'carbon-icons-svelte/lib/Launch.svelte';
  import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';

  import products from "../../stores/products";
  import brokers from "../../stores/brokers";
  import user from "../../stores/user";
  import trade_reviews from "../../stores/trade_reviews";
  import notifications from "../../stores/notifications";

  const dispatch = createEventDispatcher();

  export let scope = "all";

  // Expandable tile heights aren't reactive to parent rescales (from page resizes or having a scrollbar added) while open
  // The following block of code tracks the width changes and passes it to the tiles to react accordingly
  let inbox_width;
  const observer = new ResizeObserver((e) => {
    if (e[0].contentRect.width != inbox_width) {
      inbox_width = e[0].contentRect.width;
    }
  });
  onMount(() => {observer.observe(document.getElementsByClassName("inbox")[0]);});

  let notification_list = [];
  $: setNotificationList($trade_reviews, $notifications);

  function setNotificationList() {
    let ret = [];
    let me = user.get();
    if (scope == "all") {
      let notifs = $notifications.map(n_original => {
        let n = Object.assign({}, n_original);
        n.id = "N"+n.notification_id;
        n.timestamp = new Date(n.timestamp);
        return n;
      });
      ret.push.apply(ret, notifs);
    }
    $trade_reviews.forEach(tr => {
      if (tr.reviewers.includes(me) && !tr.reviewed_by.includes(me)) {
        const p = products.name(tr.trade_data.tickets[0].product_id);
        let tr_n = {
          id: "TR"+tr.review_id,
          subject: `Review request for ${(/[aeiou]/i).test(p.charAt(0)) ? "an" : "a"} ${p} trade`,
          tr,
          timestamp: new Date(tr.timestamp),
          sender: tr.initiated_by
        };
        ret.push(tr_n);
      }
    });
    ret.sort((a, b) => b.timestamp - a.timestamp);
    notification_list = ret.slice();
  }

  function formatTimestamp(ts) {
    return ts < new Date().setHours(0, 0, 0, 0) ? ts.toLocaleDateString() : ts.toLocaleTimeString().replace(/:\d{2}\s/, " ");
  }

  function formatSender(sender) {
    sender = +sender;
    return sender == 999 || isNaN(sender) ? "System Admin" : brokers.name(sender);
  }

  $: if (document.activeElement.localName == "button") { document.activeElement.blur(); }

  function handleView(n) {
    dispatch("viewTR", {pid:n.tr.trade_data.tickets[0].product_id});
  }

  function handleDelete(n) {
    notifications.remove(n.notification_id);
  }
</script>


<div class="inbox" in:fade={{duration: 175}}>
  {#each notification_list as n, i (n.id)}
    {#if n.tr}
      <NotificationInboxTile
        expandable={false}
        {inbox_width}
        style="border-bottom:{i == notification_list.length-1 ? 'none' : '1px solid var(--cds-border-strong)'};"
        >
        <div slot="above" class="inbox_tile_above" on:click={(e) => {console.log(e); e.stopPropagation(); e.preventDefault();}}>
          <div class="inbox_tile_above_val" style="width:15%;">{formatTimestamp(n.timestamp)}</div>
          <div class="inbox_tile_above_val inbox_tile_sender" style="width:25%;">{formatSender(n.sender)}</div>
          <div class="inbox_tile_above_val" style="width:52%;">{n.subject}</div>
          <div style="width:8%; display:flex; justify-content:flex-end;">
            <Button on:click={() => handleView(n)} icon={Launch} iconDescription="Go To Trade" tooltipPosition="left" tooltipAlignment="center"/>
          </div>
        </div>
      </NotificationInboxTile>
    {:else}
      {@const has_body = n.body != null}
      <NotificationInboxTile
        expandable={has_body}
        {inbox_width}
        style="border-bottom:{i == notification_list.length-1 ? 'none' : '1px solid var(--cds-border-strong)'};"
        >
        <div slot="above" class="inbox_tile_above" on:click={(e) => {if (!has_body) {e.stopPropagation();}}}>
          <div class="inbox_tile_above_val" style="width:15%;">{formatTimestamp(n.timestamp)}</div>
          <div class="inbox_tile_above_val inbox_tile_sender" style="width:25%;">{formatSender(n.sender)}</div>
          <div class="inbox_tile_above_val" style="width:{has_body ? '60%' : '52%'};">{n.subject}</div>
          {#if !has_body}
            <div style="width:8%; display:flex; justify-content:flex-end;">
              <Button on:click={(e) => {handleDelete(n)}} kind="danger-tertiary" icon={TrashCan} iconDescription="Delete Notification" tooltipPosition="left" tooltipAlignment="center"/>
            </div>
          {/if}
        </div>
        <div slot="below" class="inbox_tile_below">
          {#if has_body}
            <div style="white-space:pre-wrap; padding:1rem 0; color:var(--cds-text-02);">{`${n.body}`}</div>
            <div><Button on:click={(e) => {handleDelete(n)}} kind="danger-tertiary" icon={TrashCan} iconDescription="Delete Notification" tooltipPosition="right" tooltipAlignment="center"/></div>
          {/if}
        </div>
      </NotificationInboxTile>
    {/if}
  {:else}
    <h4 style="display:flex; height:288px; justify-content:center; align-items:center;">You do not currently have any {scope=="tr" ? "trade reviews" : "notifications"}</h4>
  {/each}
</div>

<style>
  .inbox {
    display: inline-block;
    width: 100%;
  }

  :global(.inbox_tile[hide_chevron="true"] > div > .bx--tile__chevron) {
    visibility: hidden !important;
  }

  .inbox_tile_above {
    display: flex;
  }

  .inbox_tile_above_val {
    max-width: 100%;
    padding: 0 1rem;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    min-height: 30px;
  }

  .inbox_tile_above_val:first-child {
    padding-left: 0;
    justify-content: center;
  }

  .inbox_tile_above_val:nth-child(3) {
    padding-right: 24px;
  }

  .inbox_tile_sender {
    justify-content: center;
    border-left: 1px solid var(--cds-border-subtle);
    border-right: 1px solid var(--cds-border-subtle);
  }

  .inbox_tile_below {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
  }
</style>