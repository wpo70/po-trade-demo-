<script>
'use strict';

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
  Modal,
  Checkbox,
} from 'carbon-components-svelte';
import Filter from 'carbon-icons-svelte/lib/Filter.svelte';
import FilterEdit from 'carbon-icons-svelte/lib/FilterEdit.svelte';
import ConnectionSignal from 'carbon-icons-svelte/lib/ConnectionSignal.svelte';
import ConnectionSignalOff from 'carbon-icons-svelte/lib/ConnectionSignalOff.svelte';
import TextLongParagraph from "carbon-icons-svelte/lib/TextLongParagraph.svelte";
import SkillLevelAdvanced from "carbon-icons-svelte/lib/SkillLevelAdvanced.svelte";
import SkillLevel from "carbon-icons-svelte/lib/SkillLevel.svelte";
import IbmCloudPakMantaAutomatedDataLineage from "carbon-icons-svelte/lib/IbmCloudPakMantaAutomatedDataLineage.svelte";
import DataTable from "carbon-icons-svelte/lib/DataTable.svelte";
import IdManagement from "carbon-icons-svelte/lib/IdManagement.svelte";
import ChartCustom from "carbon-icons-svelte/lib/ChartCustom.svelte";
import DashboardReference from "carbon-icons-svelte/lib/DashboardReference.svelte";

import { onMount, tick } from 'svelte';
import { fade } from 'svelte/transition';

// Import the necessary components.

import Trading from './Trading.svelte';
import Swaption from './Swaption/Swaption.svelte';
import QuickOrderForm from './QuickOrderForm.svelte';
import AccountCard from './NavBar/AccountCard.svelte';
import MenuModal from './MenuModal.svelte';
import TraderManagement from './TraderManagement/TraderManagement.svelte';
import History from './History/History.svelte';
import BrokerManagement from './BrokerManagement.svelte';
import WhiteBoardFilters from './NavBar/WhiteBoardFilters.svelte';
import ReviewRequestNotification from './ReviewRequestNotification.svelte';
import Calculator from './Calculation/Calculator.svelte';
import WhiteboardCustomPage from './WhiteboardCustomPage.svelte';
import Confo from './Confo.svelte';
// Import the writable stores that hold data from the server.

import currency_state from '../stores/currency_state.js';
import user from '../stores/user.js';
import brokers from '../stores/brokers.js';
import products from '../stores/products.js';
import active_product from '../stores/active_product.js';
import custom_whiteboards, { selected_custom_wb } from '../stores/custom_whiteboards';
import prices from '../stores/prices';
import filters from '../stores/filters';
import websocket from '../common/websocket';
import data_collection_settings from '../stores/data_collection_settings';
import confos from '../stores/confos';
import markitwire_connected from '../stores/markitwire_connected';
import AccountSettings from './NavBar/AccountSettings.svelte';
import config from "../../config.json";

let permission;
$: {let b = $brokers; permission = user.getPermission();}

let isSideNavOpen = false;
document.addEventListener("mousedown", ({target}) => {
  if (!target.closest(".bx--side-nav__navigation") && !target.closest(".bx--header__menu-toggle") ) {
    isSideNavOpen = false;
  }
});
$: can_sidenav = ["custom-whiteboards", "trading", "swaption"].includes(main_content);

// Add default currency AUD
let currency_type;
let isDisabled = false;
let current_products;
let confoMenuOpen = false;
let showFilters = false;
$: showFilters = false && $active_product;
let filterDefault;
$: { let j = $filters; filterDefault = filters.isDefault($active_product, $selected_custom_wb); }

$: if (typeof currency_type !== 'undefined') {
        getsync(currency_type);
      } else {
      currency_type ="AUD";
    }

$: setProducts($products, $currency_state);

function setProducts() {
  let filter = [1, 2, 17, 18, 20, 27, 28, 29];
  filter.push.apply(filter, products.getFwdProducts());
  // Remove any combined products
  current_products = $products.filter(p => { return p.currency_code === currency_type && !filter.includes(p.product_id) });
}
// Set timeout between get_quotes table and the MID/DURR titles
  // There is a lagging time bwteen Switching titles of Indicators table and getting a quote table
    // It results the title of indicator switching faster than the data or content of the table
      // The reason is WS send message currency to get data from quote table and Update Store Table $currency_state


async function getsync(currency_type) {
  setProducts();
  currency_state._set(currency_type, false);

  // Set default when tab switching
    // If tab is selected at NZD, active_product default will be '10' or IRS
      // If tab is selected at AUD, active_product default will be '1' or IRS

  if ( currency_type === 'NZD' ) {
    if (main_content != "custom-whiteboards") {
      $active_product = 10; lastPage = {active: {product_id:10}, label: "irs__page", main: "trading"};
    } else {
      removeTabHighlight();
    }
    if ($selected_custom_wb.board_id !== -1) {
      custom_whiteboards.setToLive();
    }
  }
  if ( currency_type === 'AUD' ) {
    if (main_content != "custom-whiteboards") {
      $active_product = 1; lastPage = {active: {product_id:1}, label: "efp_irs__page", main: "trading"};
    } else {
      removeTabHighlight();
    }
    if ($selected_custom_wb.board_id !== -1) {
      custom_whiteboards.setToLive();
    }
  }
  if ( currency_type === 'USD' ) {
    if (main_content != "custom-whiteboards") {
      $active_product = 29; lastPage = {active: {product_id:29}, label: "sofr_irs__page", main: "trading"};
    } else {
      removeTabHighlight();
    }
  }

  websocket.getCurrency(currency_type);
}

// Whether to show the indicators side bar.

let showIndicators = false;
function handleShowIndicatorsClick() {
  showIndicators = !showIndicators;
}

// The active_tab is the product object that the Tabs component binds to.
// Update the active_product from the active_tab.

let active_tab = {product_id: -1};
$: if (typeof active_tab !== 'undefined') {
  $active_product = active_tab.product_id;
  if ([0, -1, 100, 101, 102, 103].indexOf(active_tab.product_id) < 0) prices.sort(active_tab.product_id);
}
/**
 * Main_content = 'trading' | 'swaption' | 'history' | 'trader-management' | 'custom-whiteboards' | 'broker-management'
 * view =  | 'orders' | 'trades' | 'whiteboard' | 'FxOptions' | 'fwds' | 'swaption' | 'history" | 'custom-whiteboards'
 * 
 * Default Home Page
 * lastPage = {active: {product_id:-1}, label: "custom-whiteboards__page", main: "custom-whiteboards", view: "custom-whiteboards"}
 * 
 * While main_content, view, active_tab maintains as a key towards a targeted page, 
 * the last page stores the previous page user had accessed
 * active: {product_id: -1}  -> custom-whiteboards
 *                      101  -> FWDS
 *                      100  -> Swaptions
 *                      102  -> FXOptions
*/

let main_content = "";

// This is the view to show, whiteboard or orders.

let view = 'custom-whiteboards';

// The navigation switcher

let is_switcher_open = false;

let account_card_open = false;

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

// The gateway connection status popover

let is_gw_conn_popover_open = false;
function showGWConnPopover() {
  is_gw_conn_popover_open = true;
}
function hideGWConnPopover() {
  is_gw_conn_popover_open = false;
}

//MarkitWire Signal Popover
let is_markitwire_popover_open = false;
function showMarkitwirePopover(){
  is_markitwire_popover_open = true;
}
function hideMarkitwirePopover(){
  is_markitwire_popover_open = false;
}

// The quick order form

let quick_order_form;
function quickOrder() {
  quick_order_form.open();
  is_switcher_open = false;
}

function handleServerError(event) {
  // The order form has resulted in a server error.

  server_error = event.detail;
  mySnackbar.open();
}

function handleKeyPress(event) {
  let key = event.key.toLowerCase();

  if(main_content !== 'trading' &&
      main_content !== 'trader-management' &&
      main_content !== 'swaption' &&
      main_content !== 'custom-whiteboards') {
    return;
  }

  switch (key) {
    case 'w':
      if (view != 'fwds' && view != 'fxOption' && view != 'swaption' && view != "history" && view != 'whiteboard' ) { 
        handleViewSwitchingKey('whiteboard');
        showIndicators = false; 
      }
      break;
    case 'o':
      if (view != 'fwds' && view != 'fxOption' && view != 'swaption' && view != "history" && view != 'orders' ) { 
        handleViewSwitchingKey('orders');
        showIndicators = true; 
      }
      break;
    case 't':
      if (view != 'fwds' && view != 'fxOption' && view != 'swaption' && view != "history" && view != 'trades' ) { 
        handleViewSwitchingKey('trades');
        showIndicators = true;
      }
      break;
    case 'q':
      if (main_content === 'trading' && view === 'whiteboard') quickOrder();
      break;
    case 'i':
      showIndicators = !showIndicators;
      break;
    case 'l':
      removeTabHighlight();
      custom_whiteboards.setToLive();
      storeLastAndUpdate({product_id:-1}, "custom-whiteboards__page", "custom-whiteboards", "custom-whiteboards");
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

onMount(viewCustomWBs);

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

let lastPage = {active: {product_id:-1}, label: "custom-whiteboards__page", main: "custom-whiteboards", view: "custom-whiteboards"}; // Default page to revert to, until another page is selected
function storeLastAndUpdate(product, ariaLabel, main = "trading", _view = "whiteboard", force_view = false) {
  if (!product) { // given no parameters, will default to first product of current currency selection
    if (currency_state.get_cur() == "AUD") {
      product = {product_id:1};
      ariaLabel = "efp_irs__page";
    } else if (currency_state.get_cur() == "USD") {
      product = {product_id: 29};
      ariaLabel = "sofr_irs__page";
    } else {
      product = current_products[0];
      ariaLabel = current_products[0].product+"__page";
    }
  }
  active_tab = product;
  lastPage.active = structuredClone(active_tab);
  lastPage.label = ariaLabel;
  _view = force_view || !(main == "trading" && ["whiteboard", "trades", "orders"].includes(view)) ? _view : view;
  view = _view;
  lastPage.view = _view;
  main_content = main;
  lastPage.main = main;
}

function applyLastProduct() {
  active_tab = lastPage.active;
  addClassList(lastPage.label);
  main_content = lastPage.main;
  view = lastPage.view;
}

function viewCustomWBs(page) {
  removeTabHighlight();
  if (page == "custom") { custom_whiteboards.setToCustom(); }
  else if (page === "live") { custom_whiteboards.setToLive(); }
  storeLastAndUpdate({product_id:-1}, "custom-whiteboards__page", "custom-whiteboards", "custom-whiteboards");
}

function handleViewSwitchingKey(_view) {
  // If currently on RBA OIS, reset to default product before switching
  if (view === 'rba-ois' || active_tab.product_id === 103) {
    storeLastAndUpdate({product_id: 1}, "efp_irs__page", "trading", _view, true);
    return;
  }
  if (main_content != "trading") {
    if (lastPage.main == "trading") {
      applyLastProduct();
    } else {
      storeLastAndUpdate();
    }
  }
  lastPage.view = _view;
  view = _view ?? "whiteboard";
}

async function goToTradeReview (e) {
  let pid = e.detail.pid;
  if (pid == 17 || pid == 27) pid = 18;
  if (pid == 2) pid = 1;
  if (pid == 28) pid = 29;
  currency_type = products.currency(pid);
  currency_state._set(products.currency(pid), false);
  active_product.set(products.nonFwd(pid)); 
  setProducts();
  removeTabHighlight();
  await tick();
  storeLastAndUpdate({product_id: pid}, products.name(pid)+"__page", "trading", "trades", true);
  websocket.getCurrency(currency_type);
}

$: tab_title = () => {
  switch (active_tab?.product_id) {
    case -1:
    case 0:
      return "";
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
        if (confoMenuOpen == false) confos.purge();
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

let IsProductButtonOpen = false;

let currentuser = brokers.get(user.get());
let open = false;

onMount(() => {
  if(currentuser.accesslevel ===999 && config.env == 'prod') open = true;
});

let acceptAdminResponsibility = false;

</script>
<div class="login_warning">
  <Modal
    modalHeading="Logged in as admin"
    primaryButtonText="Accept Responsibility"
    secondaryButtonText="Logout"
    size='sx'
    bind:open
    danger=true
    on:click:button--secondary={() => {user.logout(); websocket.handlerLogout();}}
    on:click:button--primary= {() => {open=false;}}
    primaryButtonDisabled={!acceptAdminResponsibility}
    preventCloseOnClickOutside
  >
    <div style="text-align: center; display: flex; flex-direction: column; gap: 20px;">
      <p style="padding: 0;">You are logged in as an admin with a high access level.</p>
      <div style="display: flex; gap: 5px; align-items: center;">
        <Checkbox bind:checked={acceptAdminResponsibility}/>
        <p style="padding: 0;" on:click={() => {acceptAdminResponsibility = !acceptAdminResponsibility;}}>I understand that this grants me extra permissions that may be dangerous.</p>
      </div>
    </div>
  </Modal>
</div>
<!-- Handle shortcut keys -->
<svelte:window on:keypress={handleKeyPress} />

<svelte:head>
  <title>Rate Edge OMS {tab_title()}</title>
</svelte:head>
  
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore missing-declaration -->      
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->

<Header bind:isSideNavOpen {can_sidenav} expansionBreakpoint={1612}>
  <button class="bx--btn bx--btn--sm bx--btn--ghost title-btn" ariaLabel="custom-whiteboards__page"
    class:custom-wbs-selected={main_content == "custom-whiteboards"}
    on:click={() => { if (main_content != "custom-whiteboards") { viewCustomWBs(); }}}
    >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="130" height="32">
      <defs>
        <linearGradient id="hdr-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#475569"/>
          <stop offset="100%" style="stop-color:#cbd5e1"/>
        </linearGradient>
      </defs>
      <g transform="translate(5, 8)">
        <path d="M 3 28 Q 12 25, 20 16 Q 28 8, 35 4" 
              fill="none" stroke="url(#hdr-grad)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="35" cy="4" r="3.5" fill="#ef4444"/>
        <line x1="3" y1="35" x2="35" y2="35" stroke="#475569" stroke-width="2"/>
      </g>
      <text x="50" y="32" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" 
            font-size="26" font-weight="600" letter-spacing="0.5">
        <tspan fill="#f1f5f9">Rate</tspan><tspan fill="#ef4444">Edge</tspan>
      </text>
    </svg>
  </button>

  <!-- This isn't connected to anything - seems unneeded
  <div slot="skip-to-content">
    <SkipToContent />
  </div>
  -->

  <!-- Gateway signal -->
  <div
    on:mouseenter={showGWConnPopover}
    on:mouseleave={hideGWConnPopover}
    style:position="relative"
  >
    {#if $data_collection_settings.gateways.length > 0}
      <ConnectionSignal
        size={24}
        class="gateway-connected-icon"
      />
    {:else}
      <ConnectionSignalOff
        size={24}
        class="gateway-disconnected-icon"
      />
    {/if}

    <Popover
      align="bottom-center"
      bind:open={is_gw_conn_popover_open}
    >
      <div style="padding: var(--cds-spacing-05)">{$data_collection_settings.gateways.length > 0 ? 'A' : 'No'} gateway is connected</div>
    </Popover>
  </div>

  <!-- Markitwire signal -->
  <div
    on:mouseenter={showMarkitwirePopover}
    on:mouseleave={hideMarkitwirePopover}
    style:position='relative'
  >
    <div style="margin-left: 20px;">
      {#if $markitwire_connected.connected && $markitwire_connected.active}
      <!-- App connected, Markitwire logged in -->
      <SkillLevelAdvanced
        size={24}
        class="gateway-connected-icon"
      /><div style="font-size: 70%; color:var(--cds-support-02)">{$markitwire_connected.env?.toUpperCase()}</div>
      {:else if $markitwire_connected.connected && !$markitwire_connected.active}
      <!-- App connected, Markitwire logged out -->
        <SkillLevel
          size={24}
          class="gateway-disconnected-icon"
      /><div style="font-size:70%; color:var(--cds-support-02)" >{$markitwire_connected.env?.toUpperCase()}</div>
      {:else}
      <!-- App not connected -->
      <SkillLevel
        size={24}
        class="gateway-disconnected-icon"
      /><div style="font-size:70%" class="gateway-disconnected-icon">{$markitwire_connected.env?.toUpperCase()}</div>
      {/if}
    </div>
    <Popover
    align="bottom-center"
    bind:open={is_markitwire_popover_open}
    >
      <div style="padding: var(--cds-spacing-05)">{$markitwire_connected.active ? '' : 'No'} MarkitWire connected</div>
    </Popover>
  </div>
  <!-- End of Signals -->

{#if main_content === 'trading' || main_content === 'swaption' || main_content === 'custom-whiteboards'}
  <HeaderNav style="margin-left: 16px;">
        <!-- Update the navigation bar for product if the currency seletecd is NZD -->
        <!-- EFP rate is not available on NZD -->
        <!-- For AUD, available products are IRS, EFP, OIS, 3v1, 6v3, BOB, BBSW/LIBOR, BBSW/SOFR, AONIA/SOFR [1,2,3,4,5,6,7,8,9] -->
        <!-- For NZD, available products are IRS, OIS, 3v1, 6v3, BOB, BKBM/LIBOR, BKBM/SOFR [10,11,12,13,14,15,16] -->
    {#if $currency_state.currency == "AUD"}
        
    <!-- TAB EFP | IRS -->
      <HeaderNavItem aria-label="efp_irs__page" text="EFP | IRS" style="cursor:pointer"
      on:click={() => {
        if (active_tab?.product_id != 1) {
          removeTabHighlight(); storeLastAndUpdate({product_id: 1}, "efp_irs__page"); 
        } else document.activeElement.blur();
        }}
        isSelected={$active_product === 1} />
    {/if}

    {#if $currency_state.currency == "USD"}        
    <!-- TAB SOFR SPREAD | IRS SWAPS -->
      <HeaderNavItem aria-label="sofr_irs__page" text="SOFR SPREAD | IRS SWAPS" style="cursor:pointer"
      on:click={() => {
        if (active_tab?.product_id != 29) {
          removeTabHighlight(); storeLastAndUpdate({product_id: 29}, "sofr_irs__page"); 
        } else document.activeElement.blur();
        }}
        isSelected={$active_product === 29} />
    {/if}

    {#each current_products as product}
       <!-- TAB OTHER PRODUCTS -->
      <HeaderNavItem   
      aria-label={product.product+"__page"}
      text={product.product}
      style="cursor:pointer"
      on:click={() => {if (active_tab?.product_id != product.product_id) {removeTabHighlight(); storeLastAndUpdate(product, product.product+"__page"); } else document.activeElement.blur();}}
      isSelected={$active_product === product.product_id}/>
    {/each}

    {#if $currency_state.currency == "AUD"}
      <!-- TAB STIR -->
      <HeaderNavItem aria-label="stir__page" text="STIR" style="cursor:pointer"
        on:click={() => {if (active_tab?.product_id != 18) {removeTabHighlight(); storeLastAndUpdate({product_id: 18}, "stir__page");} else document.activeElement.blur();}}
        isSelected={$active_product === 18} />
      <!-- TAB RBA OIS -->
      <HeaderNavItem aria-label="rba_ois__page" text="RBA OIS" style="cursor:pointer" 
        on:click={() => {addClassList("rba_ois__page"); storeLastAndUpdate({product_id: 103}, "rba_ois__page", "trading", "rba-ois", true)}}
        isSelected={active_tab.product_id == 103}/>
      <!-- TAB SWAPTION - DISABLED FOR DEMO -->
      <!-- <HeaderNavItem aria-label="swaption__page" text="SWAPTION" style="cursor:pointer" 
        on:click={() => {addClassList("swaption__page"); storeLastAndUpdate({product_id: 100}, "swaption__page", "swaption", "swaption")}}
        isSelected={active_tab.product_id == 100}/> -->
      <!-- TAB FWDS -->
      <HeaderNavItem aria-label="forwards__page" text="FORWARDS" style="cursor:pointer" 
        on:click={() => {addClassList("forwards__page"); storeLastAndUpdate({product_id: 101}, "forwards__page", "trading", "fwds", true)}}
        isSelected={active_tab.product_id == 101}/>
      <!-- TAB FX OPTIONS-->
      <HeaderNavItem aria-label="fx_options__page" text="FX OPTIONS" style="cursor:pointer" 
        on:click={() => {addClassList("fx_options__page"); storeLastAndUpdate({product_id: 102}, "fx_options__page", "trading", "fxOption", true)}}
        isSelected={active_tab.product_id == 102}/>
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

      {#if main_content == 'custom-whiteboards' || main_content === 'trading' && view === 'whiteboard'}
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
    <!-- Setting the Currency, Support: AUD, NZD -->
      {#if ['custom-whiteboards', 'trading', 'swaption'].includes(main_content)}
      <div class="currency_header_action">
        <HeaderGlobalAction aria-label="currency" on:click={()=>{openClose("currency");}}>
          <OverflowMenu  id="currency-overflow-menu">
            <div slot="menu" 
            style={`color: white; font-weight: bold; font-size: small;display: inline-flex; align-items:center;
            --image-flag: url('./flags/${currency_state.get_cur(currency_type).slice(0, 2).toLowerCase()}.svg');`} 
            class="currency-overflow-menu_selected"
            >
            {currency_state.get_cur(currency_type)}</div>
            {#each currency_state.getAllCurrencies() as curr}
              <OverflowMenuItem
                hasDivider
                disabled={!["AUD", "NZD", "USD"].includes(curr) || $currency_state.button_isDisabled}
                text={currency_state.symbolString(curr)}
                id={curr}
                on:click={() => {currency_type = curr;}}
                primaryFocus={$currency_state.currency == curr}
                />
            {/each}
          </OverflowMenu>
        </HeaderGlobalAction>
      </div>
      {/if}

    <!-- Account card Settings -->
      <AccountCard
        on:click={()=>{openClose("account")}}
        bind:open={account_card_open}
        on:viewTR={goToTradeReview}
      /> 

    <HeaderAction bind:isOpen={is_switcher_open} on:click={()=>{openClose("switcher")}}>
      <HeaderPanelLinks>
        <h3 style="padding-left: 0.8rem">Navigation Menu</h3>
        {#if main_content == "trading" && ![18].includes($active_product)}
          <HeaderPanelDivider><h5>Change View</h5></HeaderPanelDivider>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('whiteboard'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable />&nbsp; Whiteboard </div></HeaderPanelLink>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('orders'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable />&nbsp; Orders</div></HeaderPanelLink>
          <HeaderPanelLink on:click={() => {handleViewSwitchingKey('trades'); is_switcher_open=false;}}><div class="nav-menu_item"><DataTable />&nbsp; Trades</div></HeaderPanelLink>
        {/if}

        <HeaderPanelDivider><h5>Page</h5></HeaderPanelDivider>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; viewCustomWBs("live");}}><div class="nav-menu_item"><DashboardReference />&nbsp;  Live Orders</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; viewCustomWBs("custom");}}><div class="nav-menu_item"><ChartCustom/>&nbsp;  Custom Whiteboards</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {is_switcher_open=false; handleViewSwitchingKey();}}><div class="nav-menu_item"><DataTable />&nbsp;  Main Products</div></HeaderPanelLink>
        <HeaderPanelLink on:click={() => {main_content = 'history'; is_switcher_open=false}}><div class="nav-menu_item"><IbmCloudPakMantaAutomatedDataLineage /> &nbsp; Trade History</div></HeaderPanelLink>

        {#if permission["Trader Management"] || permission["Broker Management"]}
          <HeaderPanelDivider><h5>Administration</h5></HeaderPanelDivider>
          {#if permission["Trader Management"] }
          <HeaderPanelLink on:click={() => { main_content = 'trader-management'; is_switcher_open=false; }}>
            <div class="nav-menu_item"><IdManagement /> &nbsp; Trader Management</div>
          </HeaderPanelLink>
          {/if}
          {#if permission["Broker Management"]}
          <HeaderPanelLink on:click={() => { main_content = 'broker-management'; is_switcher_open=false; }}>
            <div class="nav-menu_item"><IdManagement /> &nbsp; Broker Management</div>
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
        {#if $currency_state.currency == "AUD"}
          <!-- AUD EFP and IRS -->
          <SideNavMenuItem text="EFP | IRS"
            style={$active_product === 1 ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate({product_id: 1}, "efp_irs__page"); isSideNavOpen = false;}}
            />
        {/if}
        {#if $currency_state.currency == "USD"}
        <!-- AUD EFP and IRS -->
        <SideNavMenuItem text="SOFR SPREAD | IRS SWAPS"
          style={$active_product === 29 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate({product_id: 29}, "sofr_irs__page"); isSideNavOpen = false;}}
          />
      {/if}
        {#each current_products as product}
          <!-- OTHER PRODUCTS -->
          <SideNavMenuItem text={product.product}
            style={$active_product === product.product_id ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate(product, product.product+"__page"); isSideNavOpen = false;}}
            />
        {/each}
        {#if $currency_state.currency == "AUD"}
          <!-- TAB STIR -->
          <SideNavMenuItem text="STIR"
            style={$active_product === 18 ? "color: var(--cds-link-01);" : ""}
            on:click={() => {storeLastAndUpdate({product_id: 18}, "stir__page"); isSideNavOpen = false;}}
            />
        {/if}
      </SideNavMenu>
      {#if $currency_state.currency == "AUD"}
        <SideNavDivider/>
        <!-- TAB RBA OIS -->
        <SideNavLink text="RBA OIS"
          style={active_tab.product_id == 103 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate({product_id: 103}, "rba_ois__page", "trading", "rba-ois", true); isSideNavOpen = false;}}
          />
        <!-- TAB SWAPTION - DISABLED FOR DEMO -->
        <!-- <SideNavLink text="SWAPTION"
          style={active_tab.product_id == 100 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate({product_id: 100}, "swaption__page", "swaption", "swaption"); isSideNavOpen = false;}}
          /> -->
        <!-- TAB FWDS -->
        <SideNavLink text="FORWARDS"
          style={active_tab.product_id == 101 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate({product_id: 101}, "forwards__page", "trading", "fwds", true); isSideNavOpen = false;}}
          />
        <!-- TAB FX OPTIONS-->
        <SideNavLink text="FX OPTIONS"
          style={active_tab.product_id == 102 ? "color: var(--cds-link-01);" : ""}
          on:click={() => {storeLastAndUpdate({product_id: 102}, "fx_options__page", "trading", "fxOption", true); isSideNavOpen = false;}}
          />
      {/if}
    </SideNavItems>
  </SideNav>
</div>


<!-- The Content component from CCS changes background color and creates too much padding, so use a div instead -->

<div class="content">
  <!-- Window main content is the Trading component. -->

  {#if main_content === 'trading'}
    <Trading bind:view bind:showIndicators/>
  {:else if main_content === 'swaption'}
    <Swaption />
  {:else if main_content === "custom-whiteboards"}
    <WhiteboardCustomPage/>
  {:else if main_content === 'trader-management'}
    <TraderManagement on:close={applyLastProduct}/>
  {:else if main_content === 'history'}
    <div style="display: flex; flex-direction: column;">
      <History />
      
    </div>
  {:else if main_content === 'broker-management'}
    <BrokerManagement on:close={applyLastProduct}/>
  {/if}

  <!-- Modals -->

  <!-- Menu Modal -->
  <MenuModal bind:view bind:main_content bind:showMenus></MenuModal>

  <!-- This is the quick order form modal -->
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

  <ReviewRequestNotification on:viewTR={goToTradeReview}/>
  <div id="myCalculator" style="position: fixed; right: 15px;  bottom: 10px; display: flex; flex-direction: column; gap:3px;"> 
    <!-- svelte-ignore a11y-invalid-attribute -->
    <div id="cal"><Calculator/></div>
  </div>

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
/*<!--overflow-menu -->*/
:global(#currency-overflow-menu > ul) {
  width: 700px ;
  font-weight: bold;
  font-size: small;

}
:global(button.bx--overflow-menu ) {
  width: 100%;
  height: 100%;
  background-color: inherit;
}
 /* national flag - currency  */
:global(ul.bx--overflow-menu-options ) {
  width: 700px ;
  padding: 10px;
}
:global(ul.bx--overflow-menu-options  li) {
  width: 700px ;
}
:global(ul.bx--overflow-menu-options *:focus ) {
  outline:none;

}
:global(ul.bx--overflow-menu-options *:focus a:before) {
  content: "";
  position:absolute;
  background-color: rgb(0,98,221);
  width: 4px;
  height: 100%;
  bottom: 0px;
  left: 0px;
  background-color: rgba(0, 115, 255, 0.14);
}
:global(ul.bx--overflow-menu-options li#USD:before ) {
  background-image: url('./flags/us.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}
:global(ul.bx--overflow-menu-options  li#AUD:before ) {
  background-image: url('./flags/au.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 23 / 17;
}

:global(ul.bx--overflow-menu-options li#NZD:before ) {
  background-image: url('./flags/nz.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}

:global(ul.bx--overflow-menu-options li#CAD:before ) {
  background-image: url('./flags/ca.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}
:global(ul.bx--overflow-menu-options li#JPY:before ) {
  background-image: url('./flags/jp.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}
:global(ul.bx--overflow-menu-options li#GBP:before ) {
  background-image: url('./flags/gp.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}
:global(ul.bx--overflow-menu-options li#EUR:before ) {
  background-image: url('./flags/eu.svg');
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}
.currency-overflow-menu_selected::before {
  background-image: var(--image-flag);
  display: inline-flex;
  align-items: center;
  margin-right: 10px;
  width: 23px; 
  height: 17px;
  content:"";
  box-sizing: border-box;
  overflow-clip-margin: content-box;
  overflow: clip;
  aspect-ratio: auto 30 / 17;
}

/* :global(button.bx--overflow-menu  ul.bx--overflow-menu-options ) {
  width: 140%;
} */

:global(button.bx--overflow-menu  ul.bx--overflow-menu-options li.bx--overflow-menu-options__option) {
  color: #000000;
}

:global(a[aria-current] span.bx--text-truncate--end) {
  color: var(--cds-link-01, #78a9ff);
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
:global(svg.gateway-connected-icon) {
  fill: var(--cds-support-02);
}
:global(svg.gateway-disconnected-icon) {
  fill: var(--cds-support-01);
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
  :global(.bx--header__nav){
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
/* Fix Calculator Menu's z-index overlapped */
:global(div.bx--data-table-container > section) {
  z-index: 0 !important;
}
:global(.bx--header__global > .currency_header_action > .bx--header__action  ) {
  width: 6rem;
}
/* Login as Admin Modal */
:global(.login_warning  .bx--modal-container) {
  width: 40rem;
}
:global(.login_warning .bx--modal-header){
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 1rem;
  margin-bottom: 0;
}
:global(.login_warning .bx--modal-header__heading){
  font-weight: bold;
  font-size: 35px;
}
:global(.login_warning .bx--modal-content){
  display: flex;
  justify-content: center;
  margin: 2rem;
  padding-top: 0;
}
:global(.login_warning .bx--modal-close){
  display: none;
}
:global(.login_warning .bx--modal-footer .bx--btn){
  justify-content: center;
  padding: 0;
  font-weight: bold;
}
</style>
