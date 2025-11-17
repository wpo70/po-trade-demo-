<script>
  'use strict';

  import {
    Modal,
    TileGroup,
    RadioTile,
  } from "carbon-components-svelte";
  import Notification from "carbon-icons-svelte/lib/Notification.svelte"
  import NotificationNew from "carbon-icons-svelte/lib/NotificationNew.svelte";
  import NotificationInbox from "./NotificationInbox.svelte";
  import NotificationDispatch from "./NotificationDispatch.svelte"

  import trade_reviews from "../../stores/trade_reviews";
  import notifications from "../../stores/notifications";
  import user from "../../stores/user";

  export let open_notification_menu;

  let notification_count = 0;
  $: {
    let j = $notifications && $trade_reviews;
    notification_count = notifications.count();
  }

  let menu_options = ['All Notifications', 'Trade Reviews'];
  let submenu = menu_options[0];

</script>

<div class="notification_menu_button" on:click={() => {open_notification_menu = true;}}>
  {#if !notification_count}
    <Notification size="1rem"/>
    <span style="vertical-align:text-top;">
      &nbsp;Notifications
    </span>
  {:else}
    <NotificationNew size="1rem"/>
    <span style="vertical-align:text-top;">
      &nbsp;Notifications
    </span>
    <div class="badge">
      {notification_count}
    </div>
  {/if}
</div>

<Modal passiveModal bind:open={open_notification_menu} modalHeading="Notification Inbox">
  <div class="notification_menu">
    <div class="notification_menu_sidebar">
      <TileGroup on:select={({ detail }) => (submenu = detail)}>
        {#each menu_options as value}
          <RadioTile {value} checked={submenu === value}>{value}</RadioTile>
        {/each}
        {#if user.getPermission()["Developer Override"]}
          <RadioTile value={"Send Notifications"} checked={submenu === "Send Notifications"}>{"Send Notifications"}</RadioTile>
        {/if}
      </TileGroup>
    </div>
    <div class="notification_menu_content"  on:keypress|stopPropagation>
      {#if submenu === "All Notifications"}
        <NotificationInbox on:viewTR on:viewTR={() => open_notification_menu = false} scope="all"/>
      {:else if submenu === "Trade Reviews"}
        <NotificationInbox on:viewTR on:viewTR={() => open_notification_menu = false} scope="tr"/>
      {:else if submenu === "Send Notifications"}
        <NotificationDispatch />
      {/if}
    </div>
  </div>
</Modal>

<style>
  .notification_menu_button {
    cursor: pointer;
    background-color: var(--cds-button-secondary);
    color: var(--cds-text-04);
    position: relative;
    display: inline-block;
    border-radius: 1px;
    padding: 6px 10px;
  }

  .notification_menu_button:has(> .badge) {
    padding: 6px 18px 6px 10px;
  }

  .notification_menu_button:hover {
    background-color: var(--cds-button-secondary-hover);
  }

  .notification_menu_button .badge {
    position: absolute;
    top: -9px;
    right: -9px;
    padding: 4px 7px;
    border-radius: 50%;
    background-color: red;
    color: white;
    font-weight: bold;
  }

  :global(.bx--modal-content:has(> .notification_menu)) {
    margin-bottom: 1rem;
  }

  .notification_menu {
    display: flex;
    min-height: 300px;
  }

  .notification_menu_sidebar {
    width: 194px;
    padding-right: 14px;
  }

  .notification_menu_content {
    width: 695px;
    max-height: 75vh;
    padding: 7px 7px 3px;
    background-color: var(--cds-ui-02);
    border: 1px solid var(--cds-ui-03);
    border-left: 1px inset var(--cds-border-strong);
    overflow-y: auto;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
</style>