<script>
'use strict';

import config from "../../config.json";

// Import Carbon Components Svelte components.
import {
  Header,
  HeaderNav,
  HeaderNavItem,
  HeaderUtilities,
  HeaderGlobalAction,
  HeaderAction,
  HeaderPanelDivider,
  HeaderPanelLinks,
  HeaderPanelLink,
  ToastNotification,
  Popover,
  OverflowMenu,
  OverflowMenuItem,
  SideNav,
  SideNavItems,
  SideNavMenu,
  SideNavMenuItem,
  SideNavLink,
  SideNavDivider,
  Checkbox,
  Button,
} from 'carbon-components-svelte';
import Filter from 'carbon-icons-svelte/lib/Filter.svelte';
import FilterEdit from 'carbon-icons-svelte/lib/FilterEdit.svelte';
import ConnectionSignal from 'carbon-icons-svelte/lib/ConnectionSignal.svelte';
import ConnectionSignalOff from 'carbon-icons-svelte/lib/ConnectionSignalOff.svelte';
import TextLongParagraph from "carbon-icons-svelte/lib/TextLongParagraph.svelte";
import SkillLevelAdvanced from "carbon-icons-svelte/lib/SkillLevelAdvanced.svelte";
import SkillLevelBasic from "carbon-icons-svelte/lib/SkillLevelBasic.svelte";
import SkillLevel from "carbon-icons-svelte/lib/SkillLevel.svelte";
import IbmCloudPakMantaAutomatedDataLineage from "carbon-icons-svelte/lib/IbmCloudPakMantaAutomatedDataLineage.svelte";
import DataTable from "carbon-icons-svelte/lib/DataTable.svelte";
import IdManagement from "carbon-icons-svelte/lib/IdManagement.svelte";
import ChartCustom from "carbon-icons-svelte/lib/ChartCustom.svelte";
import DashboardReference from "carbon-icons-svelte/lib/DashboardReference.svelte";
import Restart from "carbon-icons-svelte/lib/Restart.svelte";

import { onMount, tick } from 'svelte';
import { fade } from 'svelte/transition';

// Import the necessary components.

import UnclosableModal from "./Utility/UnclosableModal.svelte";
import Trading from './Trading.svelte';
import Swaption from './Swaption/Swaption.svelte';
import QuickOrderForm from './QuickOrderForm.svelte';
import AccountCard from './NavBar/AccountCard.svelte';
import TraderManagement from './TraderManagement/TraderManagement.svelte';
import History from './History/History.svelte';
import BrokerManagement from './BrokerManagement.svelte';
import DataConnections from './NavBar/DataConnections.svelte';
import WhiteBoardFilters from './NavBar/WhiteBoardFilters.svelte';
import ReviewRequestNotification from './ReviewRequestNotification.svelte';
import Calculator from './Calculation/Calculator.svelte';
import WhiteboardCustomPage from './WhiteboardCustomPage.svelte';
import Confo from './Confo.svelte';
import Toasts from './Toasts.svelte';

// Import the writable stores that hold data from the server.

import currency_state from '../stores/currency_state.js';
import user from '../stores/user.js';
import brokers from '../stores/brokers.js';
import products from '../stores/products.js';
import active_product, { main_content, view } from '../stores/active_product.js';
import custom_whiteboards, { selected_custom_wb } from '../stores/custom_whiteboards';
import prices from "../stores/prices";
import filters from '../stores/filters';
import websocket from '../common/websocket';
import data_collection_settings from '../stores/data_collection_settings';
import confos from '../stores/confos';
import { markitwire, websocket as ws_store } from '../stores/connections';
import { toasts } from '../stores/toast';

let admin_warning = false;
let acceptAdminResponsibility = false;
let permission;
$: {let b = $brokers; permission = user.getPermission();}

let isSideNavOpen = false;
document.addEventListener("mousedown", ({target}) => {
  if (!target.closest(".bx--side-nav__navigation") && !target.closest(".bx--header__menu-toggle") ) {
    isSideNavOpen = false;
  }
});
$: can_sidenav = ["custom-whiteboards", "trading", "swaption"].includes($main_content);

let showIndicators = false;
let confoMenuOpen = false;
let is_switcher_open = false; // The navigation switcher
let account_card_open = false;
let conn_popover_open = false;
let showFilters = false;
$: showFilters = false && $active_product;
$: filterDefault = $filters && filters.isDefault($active_product, $selected_custom_wb);

$: current_products = $products && products.getCurrentProds();

async function updateCurr(curr) {
  const default_prod = currency_state.set(curr);
  current_products = products.getCurrentProds();
  if (default_prod && default_prod !== -1) {
    removeTabHighlight();
    lastPage.active = default_prod;
    const label = navAria(default_prod);
    addClassList(label);
    lastPage.label = label;
  }
  websocket.getCurrency(curr);
}

// Menu Modal
let showMenus = false;
function menuHandler () {
  showMenus = !showMenus;
};

// Toast notification displayer
let notification = null;
$: {
  if ($data_collection_settings.gateways.length == 0) {
    notification = {
      kind: 'error',
      title: 'No Gateways Connected',
      message: 'Not receiving data from Bloomberg.'
    }
  }
}
function resetNotification() {
  notification = null;
}

// The quick order form
let quick_order_form;
function quickOrder() {
  quick_order_form.open();
  is_switcher_open = false;
}

function handleServerError(event) {  // The order form has resulted in a server error.
  server_error = event.detail;
  mySnackbar.open();
}

function handleKeyPress(event) {
  let key = event.key.toLowerCase();
  if($main_content !== 'trading' &&
      $main_content !== 'trader-management' &&
      $main_content !== 'swaption' &&
      $main_content !== 'custom-whiteboards') {
    return;
  }
  switch (key) {
    case 'w':
      if ($view != 'fwds' && $view != 'fx-options' && $view != 'swaption' && $view != "history" &&  $view != 'whiteboard' ) { 
        handleViewSwitchingKey('whiteboard');
        showIndicators = false; 
      }
      break;
    case 'o':
      if ($view != 'fwds' && $view != 'fx-options' && $view != 'swaption' && $view != "history" && $view != 'orders' ) { 
        handleViewSwitchingKey('orders');
        showIndicators = true; 
      }
      break;
    case 't':
      if ($view != 'fwds' && $view != 'fx-options' && $view != 'swaption' && $view != "history" && $view != 'trades' ) { 
        handleViewSwitchingKey('trades');
        showIndicators = true;
      }
      break;
    case 'q':
      if ($main_content === 'trading' && $view === 'whiteboard') quickOrder();
      break;
    case 'i':
      showIndicators = !showIndicators;
      break;
    case 'l':
      removeTabHighlight();
      custom_whiteboards.setToLive();
      storeLastAndUpdate(-1, "custom-whiteboards__page", "custom-whiteboards", "custom-whiteboards");
      break;
    // case 'z':
    //   menuHandler();
    //   break;
    //    case '.':
    //    case '6':
    //      active_tab = products.next(active_tab);
    //      break;
    //    case ',':
    //    case '4':
    //      active_tab = products.prev(active_tab);
    //      break;
    default:
      break;
  }
}

onMount(() => {
  removeTabHighlight();
  if ($active_product > 0) { addClassList(navAria($active_product)); prices.sort($active_product); }
  if ($view == "orders") { showIndicators = true; }
  if ($user.accesslevel === 999 && config.env == 'prod') { admin_warning = true; }
});

function removeTabHighlight () {
  const current_pages = document.querySelectorAll(`a[aria-current="page"]`);
  current_pages.forEach(page => page.removeAttribute("aria-current",`page`));
  document.activeElement.blur();
}

function addClassList(ariaLabel) {
  removeTabHighlight();
  const element = document.querySelector(`[aria-label="${ariaLabel}"]`);
  if (element) { element.setAttribute("aria-current", `page`); }
}

function navAria(p) {
  if (typeof +p != "number") {
    return p+"__page";
  }
  const pid = +p;
  switch (pid) {
    case 1:
      return "efp_irs__page";
    case 18:
      return "stir__page";
    case 29:
      return "sofr_irs__page";
    case 100:
      return "swaption__page";
    case 101:
      return "forwards__page";
    case 102:
      return "fx_options__page";
    default:
      return products.name(pid)+"__page";
  }
}

let lastPage = {active: {product_id:$active_product}, label: navAria($active_product), main: $main_content, view: $view}; // Default page to revert to, until another page is selected
function storeLastAndUpdate(product, ariaLabel, main = "trading", _view = "whiteboard", force_view = false) {
  if (!product) { // given no parameters, will default to first product of current currency selection
    if ($currency_state == "AUD") {
      product = 1;
      ariaLabel = navAria(1);
    } else if ($currency_state == "USD") {
      product = 29;
      ariaLabel = navAria(29);
    } else {
      product = current_products[0].product_id;
      ariaLabel = navAria(current_products[0].product_id);
    }
  }
  $active_product = product;
  lastPage.active = structuredClone(product);
  lastPage.label = ariaLabel;
  _view = force_view || !(main == "trading" && ["whiteboard", "trades", "orders"].includes($view)) ? _view : $view;
  $view = _view;
  lastPage.view = _view;
  $main_content = main;
  lastPage.main = main;
}

function applyLastProduct() {
  $active_product = lastPage.active;
  addClassList(lastPage.label);
  $main_content = lastPage.main;
  $view = lastPage.view;
}

function viewCustomWBs(page) {
  removeTabHighlight();
  if (page == "custom") { custom_whiteboards.setToCustom(); }
  else if (page === "live") { custom_whiteboards.setToLive(); }
  storeLastAndUpdate(-1, "custom-whiteboards__page", "custom-whiteboards", "custom-whiteboards");
}

function handleViewSwitchingKey(_view) {
  if ($main_content != "trading") {
    if (lastPage.main == "trading") {
      applyLastProduct();
    } else {
      storeLastAndUpdate();
    }
  }
  lastPage.view = _view;
  $view = _view ?? "whiteboard";
}

async function goToTradeReview (e) {
  let pid;
  switch (e.detail.pid) {
    case 2:
      pid = 1;
      break;
    case 17: case 27:
      pid = 18;
      break;
    case 28:
      pid = 29;
      break;
    default:
      pid = products.nonFwd(e.detail.pid);
      break;
  }
  updateCurr(products.currency(pid));
  removeTabHighlight();
  await tick();
  storeLastAndUpdate(pid, products.name(pid)+"__page", "trading", "trades", true);
}

$: tab_title = () => {
  switch ($active_product) {
    case 0:
    case null:
    case undefined:
      return "";
    case -1:
      if ($selected_custom_wb?.board_id == -1) {
        return " - Live Orders"
      } else if ($selected_custom_wb?.board_id) {
        return ` - Custom: ${$selected_custom_wb.name}`;
      } else {
        return "";
      }
    case 1:
      return "- EFP | IRS";
    case 18:
      return "- STIR";
    case 29:
      return "- SOFR SPREAD | IRS SWAPS";
    case 100:
      return "- Swaption";
    case 101:
      return "- Forwards";
    case 102:
      return "- FX Options";
    default:
      let p = products.name($active_product);
      return p ? "- " + p : "";
  }};

  let currencyOpen = false;
  function openClose (button) {
    switch(button) {
      case "filter":
        showFilters = !showFilters;
        account_card_open = false;
        currencyOpen = false;
        is_switcher_open = false;
        confoMenuOpen = false;
        break;
      case "confo":
        confoMenuOpen = !confoMenuOpen;
        account_card_open = false;
        currencyOpen = false;
        is_switcher_open = false;
        showFilters = false;
        break;
      case "switcher":
        account_card_open = false;
        currencyOpen = false;
        confoMenuOpen = false;
        showFilters = false;
        break;
      case "currency":
        account_card_open = false;
        is_switcher_open = false;
        confoMenuOpen = false;
        showFilters = false;
        break;
      case "account":
        currencyOpen = false;
        is_switcher_open = false;
        confoMenuOpen = false;
        showFilters = false;
        break;
    }
    if (button != "currency") document.activeElement.blur();
  }
</script>


<!-- Handle shortcut keys -->
<svelte:window on:keypress={handleKeyPress} />

<svelte:head>
  <title>PO Trade {tab_title()}</title>
</svelte:head>

<UnclosableModal
  modalHeading="Logged in as Admin"
  primaryButtonText="Accept Responsibility"
  secondaryButtonText="Logout"
  bind:open={admin_warning}
  danger=true
  on:click:button--secondary={() => {user.logout(); websocket.handlerLogout();}}
  on:click:button--primary= {() => {admin_warning = false;}}
  primaryButtonDisabled={!acceptAdminResponsibility}
  >
  <div style="text-align: center; display: flex; flex-direction: column; gap: 20px;">
    <p style="padding: 0;">You are logged in as an admin with an elevated access level.</p>
    <div style="display: flex; gap: 5px; align-items: center;">
      <Checkbox bind:checked={acceptAdminResponsibility}/>
      <p style="padding: 0;" on:click={() => {acceptAdminResponsibility = !acceptAdminResponsibility;}}>I understand that this grants me extra permissions that may be dangerous.</p>
    </div>
  </div>
</UnclosableModal>

<UnclosableModal
  modalHeading="Connection Closed"
  open={!$ws_store}
  passiveModal
  >
  <div style="display:flex; flex-direction:column; align-items:center; gap:50px;">
    <p style="padding: 0;">Your connection to the POTrade server has expired. Please refresh your page.</p>
    <Button style="width:200px;" autofocus icon={Restart} on:click={()=>window.location.reload()}>Refresh</Button>
  </div>
</UnclosableModal>

<Header bind:isSideNavOpen {can_sidenav} expansionBreakpoint={1612}>
  <button class="bx--btn bx--btn--sm bx--btn--ghost title-btn" ariaLabel="custom-whiteboards__page"
    class:custom-wbs-selected={$main_content == "custom-whiteboards"}
    on:click={() => { if ($main_content != "custom-whiteboards") { viewCustomWBs(); }}}
    >
    <h5>PO&nbsp;Trade<code class="version">v{config.version}</code></h5>
  </button>
  
  <!-- Connection Indicators -->
  <div
    on:mouseenter={() => {conn_popover_open = true;}}
    on:mouseleave={() => {conn_popover_open = false;}}
    style="position:relative; display:flex; align-items:center; gap:20px; padding:5px 0;"
    >
    {#if $data_collection_settings.gateways.length && $data_collection_settings.gateways.some(gw => gw.blp_connected) }
      <ConnectionSignal size={24} style="position: relative; color: var(--cds-support-02);"/>
    {:else if $data_collection_settings.gateways.length > 0}
      <ConnectionSignalOff size={24} style="position: relative; color: var(--cds-support-03);"/>
    {:else}
      <ConnectionSignalOff size={24} style="position: relative; color: var(--cds-support-01);"/>
    {/if}
    <span>
      {#if $markitwire.connected && $markitwire.active} <!-- App connected, Markitwire logged in -->
        <SkillLevelAdvanced size={24} style="color:var(--cds-support-02);"/>
        <div style="font-size: 70%; color:var(--cds-support-02)">
          {$markitwire.env?.toUpperCase()}
        </div>
      {:else if $markitwire.connected && !$markitwire.active} <!-- App connected, Markitwire logged out -->
        <SkillLevelBasic size={24} style="color:var(--cds-support-03);"/>
        <div style="font-size:70%; color:var(--cds-support-03)">
          {$markitwire.env?.toUpperCase()}
        </div>
      {:else}
        <SkillLevel size={24} style="color:var(--cds-support-01);"/>
        <div style="font-size:70%; color:var(--cds-support-01)">
          {$markitwire.env?.toUpperCase()}
        </div>
      {/if}
    </span>
    <Popover align="bottom" bind:open={conn_popover_open}>
      <DataConnections summary style="padding:15px; width:240px;"/>
    </Popover>
  </div>
  <!-- End Connection Indicators -->

{#if $main_content === 'trading' || $main_content === 'swaption' || $main_content === 'custom-whiteboards'}
  <HeaderNav style="margin-left: 16px;">
    <!-- Update the navigation bar for product if the currency seletecd is NZD -->
    <!-- EFP rate is not available on NZD -->
    <!-- For AUD, available products are IRS, EFP, OIS, 3v1, 6v3, BOB, BBSW/LIBOR, BBSW/SOFR, AONIA/SOFR [1,2,3,4,5,6,7,8,9] -->
    <!-- For NZD, available products are IRS, OIS, 3v1, 6v3, BOB, BKBM/LIBOR, BKBM/SOFR [10,11,12,13,14,15,16] -->
    {#if $currency_state == "AUD"}
      <!-- TAB EFP | IRS -->
      <HeaderNavItem aria-label="efp_irs__page" text="EFP | IRS" style="cursor:pointer"
        on:click={() => {if ($active_product != 1) {storeLastAndUpdate(1, "efp_irs__page");}}}
        isSelected={$active_product === 1}
      />
    {/if}

    {#if $currency_state == "USD"}        
    <!-- TAB SOFR SPREAD | IRS SWAPS -->
      <HeaderNavItem aria-label="sofr_irs__page" text="SOFR SPREAD | IRS SWAPS" style="cursor:pointer"
        on:click={() => {if ($active_product != 29) {storeLastAndUpdate(29, "sofr_irs__page");}}}
        isSelected={$active_product === 29}
      />
    {/if}

    {#each current_products as product}
      <!-- TAB OTHER MAIN PRODUCTS -->
      <HeaderNavItem   
        aria-label={product.product+"__page"}
        text={product.product}
        style="cursor:pointer"
        on:click={() => {if ($active_product != product.product_id) {storeLastAndUpdate(product.product_id, product.product+"__page");}}}
        isSelected={$active_product === product.product_id}
      />
    {/each}

    {#if $currency_state == "AUD"}
      <!-- TAB STIR -->
      <HeaderNavItem aria-label="stir__page" text="STIR" style="cursor:pointer"
        on:click={() => {if ($active_product != 18) {storeLastAndUpdate(18, "stir__page");}}}
        isSelected={$active_product === 18}
      />
      <!-- TAB SWAPTION -->
      <HeaderNavItem aria-label="swaption__page" text="SWAPTION" style="cursor:pointer" 
        on:click={() => {storeLastAndUpdate(100, "swaption__page", "swaption", "swaption");}}
        isSelected={$active_product == 100}
      />
      <!-- TAB FWDS -->
      <HeaderNavItem aria-label="forwards__page" text="FORWARDS" style="cursor:pointer" 
        on:click={() => {storeLastAndUpdate(101, "forwards__page", "trading", "fwds", true);}}
        isSelected={$active_product == 101}
      />
      <!-- TAB FX OPTIONS-->
      <HeaderNavItem aria-label="fx_options__page" text="FX OPTIONS" style="cursor:pointer" 
        on:click={() => {storeLastAndUpdate(102, "fx_options__page", "trading", "fx-options", true);}}
        isSelected={$active_product == 102}
      />
    {/if}
  </HeaderNav>
{/if}

  <HeaderUtilities>
    <!-- Confo  -->
    {#if $confos.length > 0}
      <HeaderGlobalAction on:click={() => {openClose("confo")}}>
        <TextLongParagraph/>
      </HeaderGlobalAction>
      {#if confoMenuOpen} <!-- seems pointless but is used to force time to refresh-->
        <div class="confo_popover">
          <Popover bind:open={confoMenuOpen} align="bottom-right" style="min-width: 240px;">
            <h4 style="text-align: center; padding-top: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--cds-border-strong);">CONFOS</h4>
            <div style="overflow-y: auto; max-height: 90.4vh">
              {#each $confos as confo (confo.confo_id)}
                <Confo {confo}/>
              {/each}
            </div>
          </Popover>
        </div>
      {/if}
    {/if}

    {#if $main_content == 'custom-whiteboards' || $main_content === 'trading' && $view === 'whiteboard'}
      <HeaderGlobalAction
        aria-label="Filter Whiteboard"
        on:click={() => {openClose("filter")}}
        >
          {#if filterDefault}
            <Filter style="fill:white; margin-right:2px" size=22/>
          {:else}
            <FilterEdit style="fill:var(--cds-link-01)" size=22/>
          {/if}
        </HeaderGlobalAction>
        <WhiteBoardFilters bind:showFilters/>
      {/if}
      
    
    <!-- Currency -->
    {#if ['custom-whiteboards', 'trading', 'swaption'].includes($main_content)}
    <div class="currency_header_action">
      <HeaderGlobalAction aria-label="currency" on:click={()=>{openClose("currency");}}>
        <OverflowMenu id="currency-overflow-menu">
          <div slot="menu" style="color:white; font-weight:bold; font-size:small; display:flex; align-items:center; justify-content:center;">
            <img src={`./build/flags/${$currency_state}.svg`} style="margin-right:0.5rem;"/>
            {$currency_state}
          </div>
          {#each currency_state.getAllCurrencies() as curr}
            <OverflowMenuItem
              hasDivider
              disabled={!["AUD", "NZD", "USD"].includes(curr)}
              id={curr}
              on:click={() => {updateCurr(curr);}}
              primaryFocus={$currency_state == curr}
              >
              <div style="display:flex; align-items:center;">
                <img src={`./build/flags/${curr}.svg`} height="20px" style="margin-right:1rem;"/>
                {currency_state.symbolString(curr)}
              </div>
            </OverflowMenuItem>
          {/each}
        </OverflowMenu>
      </HeaderGlobalAction>
    </div>
    {/if}

    <AccountCard
      on:click={()=>{openClose("account")}}
      bind:open={account_card_open}
      on:viewTR={goToTradeReview}
    /> 

    <HeaderAction bind:isOpen={is_switcher_open} on:click={()=>{openClose("switcher")}}>
      <HeaderPanelLinks>
        <h3 style="padding-left: 0.8rem">Navigation Menu</h3>
        {#if $main_content == "trading" && ![18].includes($active_product)}
          <HeaderPanelDivider><h5>Change View</h5></HeaderPanelDivider>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('whiteboard'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable/>&emsp;Whiteboard </div></HeaderPanelLink>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('orders'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable/>&emsp;Orders</div></HeaderPanelLink>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('trades'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable/>&emsp;Trades</div></HeaderPanelLink>
        {/if}

        <HeaderPanelDivider><h5>Page</h5></HeaderPanelDivider>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; viewCustomWBs("live");}}><div class="nav-menu_item"><DashboardReference/>&emsp;Live Orders</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; viewCustomWBs("custom");}}><div class="nav-menu_item"><ChartCustom/>&emsp;Custom Whiteboards</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; handleViewSwitchingKey();}}><div class="nav-menu_item"><DataTable/>&emsp;Main Products</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {$main_content = 'history'; is_switcher_open=false}}><div class="nav-menu_item"><IbmCloudPakMantaAutomatedDataLineage/>&emsp;Trade History</div></HeaderPanelLink>

        {#if permission["Trader Management"] || permission["Broker Management"]}
          <HeaderPanelDivider><h5>Administration</h5></HeaderPanelDivider>
          {#if permission["Trader Management"] }
          <HeaderPanelLink on:click={() => { $main_content = 'trader-management'; is_switcher_open=false; }}>
            <div class="nav-menu_item"><IdManagement/>&emsp;Trader Management</div>
          </HeaderPanelLink>
          {/if}
          {#if permission["Broker Management"]}
          <HeaderPanelLink on:click={() => { $main_content = 'broker-management'; is_switcher_open=false; }}>
            <div class="nav-menu_item"><IdManagement/>&emsp;Broker Management</div>
          </HeaderPanelLink>
          {/if}
        {/if}
        <HeaderPanelLink on:click={() => {window.location.reload();}}>
          <span in:fade={{duration:30, delay:125}} out:fade={{duration:10, delay:1}}>Reload Application</span>
        </HeaderPanelLink>
      </HeaderPanelLinks>
    </HeaderAction>
  </HeaderUtilities>
</Header>

<!-- Navigation bar activated when min-width reaches 1720px -->

<div class="side-nav" id="side-nav">
  <SideNav bind:isOpen={isSideNavOpen} ariaLabel="side-nav">
    <SideNavItems>
      <SideNavMenu text="Products" expanded={true}>
        {#if $currency_state == "AUD"}
          <!-- AUD EFP and IRS -->
          <SideNavMenuItem text="EFP | IRS"
            style={$active_product === 1 ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate(1, "efp_irs__page"); isSideNavOpen = false;}}
          />
        {:else if $currency_state == "USD"}
          <!-- USD SOFR and IRS -->
          <SideNavMenuItem text="SOFR SPREAD | IRS SWAPS"
            style={$active_product === 29 ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate(29, "sofr_irs__page"); isSideNavOpen = false;}}
            />
        {/if}
        {#each current_products as product}
          <!-- OTHER PRODUCTS -->
          <SideNavMenuItem text={product.product}
            style={$active_product === product.product_id ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate(product.product_id, product.product+"__page"); isSideNavOpen = false;}}
          />
        {/each}
        {#if $currency_state == "AUD"}
          <!-- TAB STIR -->
          <SideNavMenuItem text="STIR"
            style={$active_product === 18 ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate(18, "stir__page"); isSideNavOpen = false;}}
          />
        {/if}
      </SideNavMenu>
      {#if $currency_state == "AUD"}
        <SideNavDivider/>
        <!-- TAB SWAPTION -->
        <SideNavLink text="SWAPTION"
          style={$active_product == 100 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate(100, "swaption__page", "swaption", "swaption"); isSideNavOpen = false;}}
        />
        <!-- TAB FWDS -->
        <SideNavLink text="FORWARDS"
          style={$active_product == 101 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate(101, "forwards__page", "trading", "fwds", true); isSideNavOpen = false;}}
        />
        <!-- TAB FX OPTIONS-->
        <SideNavLink text="FX OPTIONS"
          style={$active_product == 102 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate(102, "fx_options__page", "trading", "fx-options", true); isSideNavOpen = false;}}
        />
      {/if}
    </SideNavItems>
  </SideNav>
</div>


<!-- The Content component from CCS changes background color and creates too much padding, so use a div instead -->

<div class="content">
  <!-- Window main content is the Trading component. -->

  {#if $main_content === 'trading'}
    <Trading bind:showIndicators/>
  {:else if $main_content === 'swaption'}
    <Swaption />
  {:else if $main_content === "custom-whiteboards"}
    <WhiteboardCustomPage bind:showIndicators/>
  {:else if $main_content === 'trader-management'}
    <TraderManagement on:close={applyLastProduct}/>
  {:else if $main_content === 'history'}
    <div style="display: flex; flex-direction: column;">
      <History />
    </div>
  {:else if $main_content === 'broker-management'}
    <BrokerManagement on:close={applyLastProduct}/>
  {/if}

  <!-- Modals -->
  
  <!-- // Currently Unused // <MenuModal bind:showMenus></MenuModal> -->
  
  <QuickOrderForm bind:qorder={quick_order_form} on:server_error={handleServerError} />

  <div class="notification">
    {#if notification !== null}
      <ToastNotification
        kind={notification.kind}
        title={notification.title}
        subtitle={notification.message}
        caption={new Date().toLocaleString()}
        timeout=10000
        on:close={resetNotification}
      />
    {/if}
  </div>

  {#if $toasts}
    <div id="toasts" style="--offset:{$active_product == -1 ? "40px" : "0px"};">
      <Toasts/>
    </div>
  {/if}

  <ReviewRequestNotification on:viewTR={goToTradeReview}/>
  
  <Calculator/>

</div>


<style> 
.title-btn {
  margin-left: -42px;
  margin-right: 13px;
  padding: 0px 30px;
  height: 100%;
  color: white;
  border-color: #00000000;
  &.custom-wbs-selected {
    color: var(--cds-link-01, #4589ff);
  }
  &:hover {
    cursor: pointer;
    background-color: transparent;
  }
  &:focus {
    box-shadow: none;
  }
}
.title-btn.custom-wbs-selected::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: -1px;
  left: 0;
  width: 100%;
  border-bottom: 3px solid var(--cds-inverse-support-04, #4589ff);
  content: "";
}
.version {
  font-size: 70%;
  padding-left: 0.5rem;
}

:global(.confo_popover .bx--popover-contents){
  max-width: none;
}

/* Navbar tabs */
:global(:is(a.bx--header__menu-item[aria-current=page], .bx--header__menu-item--current):focus) {
  border-color: #0000;
  box-shadow: none;
  &::after{
    border-bottom: 3px solid var(--cds-inverse-support-04, #4589ff);
  }
}
:global(a.bx--header__menu-item[aria-current] span.bx--text-truncate--end) {
  color: var(--cds-link-01, #78a9ff);
}

/*<!--overflow-menu -->*/
:global(button.bx--overflow-menu ) {
  width: 100%;
  height: 100%;
  background-color: inherit;
}
:global(#currency-overflow-menu) {
  outline: none;
  & > ul.bx--overflow-menu-options {
    width: 205%;
    & *:focus {
      outline:none;
    }
  }
}

:global(button.bx--overflow-menu  ul.bx--overflow-menu-options li.bx--overflow-menu-options__option) {
  color: #000000;
}

.content {
  top:48px;
  font-size: 14px;
  height: calc(100vh-48px);
  /* height: 890px; */
  position: fixed; 
  right: 0px;  
  bottom: 0px;
  left: 0px;
  /* display: flex;
  align-items: center; */
}
.notification {
  position: absolute;
  bottom: 30px;
  z-index: 100;
}
#toasts {
  position: absolute;
  right: 0;
  z-index: 100;
  top: calc(37px + var(--offset));
}
:global(.bx--header__action > .bx--overflow-menu) {
  transition: none !important;
  background: inherit !important;
  border: inherit !important;
}
:global(.bx--header__action > .bx--overflow-menu > bx--overflow-menu-options-open) {
  transition: none !important;
  background: inherit !important;
  border: inherit !important;
}
:global(.js-is-hidden) {
  display: none;
}
:global(ul.bx--side-nav__items ) {
  background-color: var(--cds-background);
  color: var(--cds-text-primary);
  border-left: 1px solid var(--cds-border-subtle);
  border-right: 1px solid var(--cds-border-subtle);
}
:global(.bx--header__menu-toggle) { border: none; }
:global(.bx--header__menu-toggle:has(+ a[can_sidenav="false"])) {
  display: none;
}
@media (min-width: 1612px) {
  :global(nav[aria-label] ){
    display: none;
  }
}
@media (max-width: 1612px) { 
  :global(.bx--header__nav) {
    display: none;
  }
}
:global(.side-nav .bx--side-nav__link) { color: var(--cds-text-primary); &:hover{ cursor:pointer; }}
:global(.side-nav .bx--side-nav__submenu:not(:hover)) { color: inherit !important; }
:global(.side-nav .bx--side-nav__link-text) { color: inherit !important; }

:global(li.bx--switcher__item:last-of-type) {
  position: absolute;
  bottom: 0.5rem;
}

/* Scroll Bars */
:global(::-webkit-scrollbar) {
  width: 12px;
  height: 12px;
  cursor: pointer;
}
:global(::-webkit-scrollbar-thumb) {
  background-color: #696969;
  border: 2px solid var(--cds-ui-01);
  border-radius: 6px;
  cursor: pointer;
}
:global(::-webkit-scrollbar-thumb:hover) {
  background-color: var(--cds-icon-01);
  cursor: pointer;
}
:global(::-webkit-scrollbar-track) {
  background: var(--cds-ui-01);
}
:global(::-webkit-scrollbar-corner) {
  background: var(--cds-ui-01);
}
:global([role="listbox"] ::-webkit-scrollbar) {
  width: 10px;
  height: 10px;
}
.nav-menu_item {
  display: flex; 
  flex-direction: row;
  align-items: center;
}
/* //TODO: Check the below */
/* Fix Calculator Menu's z-index overlapped */
:global(div.bx--data-table-container > section) {
  z-index: 0 !important;
}
:global(.bx--header__global > .currency_header_action > .bx--header__action  ) {
  width: 6rem;
}
</style>
