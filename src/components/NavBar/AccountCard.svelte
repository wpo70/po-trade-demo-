<script>
  import { HeaderGlobalAction, Button } from "carbon-components-svelte";
  import { fade, fly } from "svelte/transition";
  import { quadInOut } from "svelte/easing";
  import { tick } from "svelte";

  import User from 'carbon-icons-svelte/lib/User.svelte';
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";
  import UserAvatarFilledAlt from "carbon-icons-svelte/lib/UserAvatarFilledAlt.svelte";
  import Logout from "carbon-icons-svelte/lib/Logout.svelte";
  import AccountSettings from "./AccountSettings.svelte";
  import NotificationMenu from "./NotificationMenu.svelte";

  import websocket from "../../common/websocket";
  import { blink, shake } from "../../common/animations";
  import user from "../../stores/user";
  import trade_reviews from "../../stores/trade_reviews";
  import notifications from "../../stores/notifications";

  // stores whether the card is open or not
  export let open;

  // stores whether the settings modal is open or not
  let settingsOpen = false;

  // stores the html nodes of the card and the button that opens the dropdown
  let cardRef;
  let buttonRef;

  /*
    This statement handles transfering focus back to the card when the settings
    modal is closed.
  */
  $: if (cardRef && !settingsOpen && open) {
    cardRef.focus();
  } 

  /* 
    Function that handles bluring. 
    When the user clicks outside of the account card, the card should close.
  */ 
  const handleBlur = (event) => {
    /* first condition checks the focus didn't move to one of the child buttons on the card */
    /* second condition checks that the focus didn't shift to the button that opens the dropdown */
    if (!event.currentTarget.contains(event.relatedTarget) && 
        !buttonRef.isEqualNode(event.relatedTarget)) {
      open = false;
    }
  }

  /* Function that handles the click to open the dropdown. */
  const handleDropdownToggle = () => {
    open = !open;
  }


  /* Function that handles the click to open the settings modal */
  const handleSettingsToggle = () => settingsOpen = !settingsOpen; 

  const submitLogout = () => {
    user.logout();
    websocket.handlerLogout();
  };

  let badgeO;
  let badgeI;
  let notification_count = null;
  $: handleNotificationBadge($notifications, $trade_reviews);

  function handleNotificationBadge() {
    async function anim() {
      await tick();
      badgeO?.animate(blink(), {duration: 1000, iterations: 5, endDelay: 333});
      badgeI?.animate(shake(), {duration: 1000, iterations: 5, endDelay: 333});
    }

    let new_count = notifications.count();
    if (new_count > notification_count) { anim(); }
    notification_count = new_count;
  }
</script>

<!-- Header Button -->

<HeaderGlobalAction aria-label="account">

  <button class:bx--overflow-menu="{true}"
    on:click
    on:click={handleDropdownToggle}
    bind:this={buttonRef}>
    <UserAvatarFilledAlt class="header-icon" size=21/>
    {#if notification_count && !open}
      <div class="badge" bind:this={badgeO} transition:fly={{duration: 100, y:30, easing:quadInOut}}>
        <div bind:this={badgeI}>
          {notification_count}
        </div>
      </div>
    {/if}
  </button>

</HeaderGlobalAction>

<!-- Dropdown Card -->

{#if open}

  <!-- svelte-ignore a11y-autofocus -->
  <div class="account__card"
    tabindex="-1" 
    on:blur={handleBlur}
    bind:this={cardRef}
    transition:fade="{{duration: 200, easing:quadInOut}}"
    style="height:{($user.firstname + $user.lastname).length > 18 ? "120px" : ""}"
    >

    <div class="account__card--left">

      <User style="position: absolute; top: 0; margin: 13.375px;" size=32/>

      <Button class="account__settings-button"
        on:blur={handleBlur}
        kind="ghost"
        icon={Settings}
        on:click={handleSettingsToggle}
        iconDescription="Settings" />

    </div>

    <div class="account__card--right">

      <div class="account__header">
        <h4 class="account__name">{$user.firstname} {$user.lastname}</h4>

      </div>
      
      <Button class="account__logout-button"
      on:blur={handleBlur}
      on:click={submitLogout}
      kind="ghost"
      icon={Logout}
      iconDescription="Logout" />

      <div class="notification-btn-wrapper">
        <NotificationMenu on:viewTR on:viewTR={() => {open = false;}}/>
      </div>

    </div>
  </div>

{/if}

<!-- Settings modal -->

<AccountSettings bind:open={settingsOpen}/>

<style>

:global(.header-icon) {
  fill: white;
}

:global(.account__logout-button) {
  position: absolute !important;
  bottom: 0;
  right:0;
}

:global(.account__settings-button) {
  position: absolute !important;
  bottom: 0;
}

.notification-btn-wrapper {
  position: absolute !important;
  padding-right: 16px;
  bottom: 8px;
  left: 0;
  padding-left: 0.8rem;
}

.account__card--left {
  width: 20%; 
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--cds-ui-background);
}

.account__card--right {
  width: 80%;
  height: 100%;
  position: relative;
  font-weight: bold;
  background-color: var(--cds-ui-01);
}

.account__name {
  position: absolute;
  left: 0;
  padding: 0.8rem;
  padding-left: 0.8rem;
}

.account__card {
  width: 265px;
  height: 100px;
  background-color: red;
  display: flex;
  position: fixed;
  top: 48px;
  right: 0;
  border: 1px solid var(--cds-ui-03);
  border-top: none;
}

.badge {
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 1px 6px;
  border-radius: 50%;
  background-color: red;
  color: white;
  font-weight: bold;
}
</style>
