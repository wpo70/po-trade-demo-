<script>
  import {
    Button,
    ContextMenu,
    ContextMenuOption,
    Modal,
    StructuredList,
    StructuredListCell,
    StructuredListRow,
  } from "carbon-components-svelte";

  import AddFilled from "carbon-icons-svelte/lib/AddFilled.svelte";
  import List from "carbon-icons-svelte/lib/List.svelte";
  import FilterEdit from "carbon-icons-svelte/lib/FilterEdit.svelte";

  import CellSelectableTable from "../CellSelectableTable.svelte";
  import SwaptionLiveOrderFilters from "./SwaptionLiveOrderFilters.svelte";
  import SwaptionPriceModal from "./SwaptionPriceModal.svelte";
  import SwaptionOrdersListModal from "./SwaptionOrdersListModal.svelte";

  import { tenorToYear } from "../../common/formatting";
  import websocket from "../../common/websocket";

  import swaption_prices from "../../stores/swaption_prices";
  import swaption_quotes from "../../stores/swaption_quotes";
  import traders from "../../stores/traders";
  import user_options from "../../stores/user_options";
  import user from "../../stores/user";
  import brokers from '../../stores/brokers.js';

  export let copyData;

  let cells;
  
  $:permission = user.getPermission($brokers);

  let copyOrderToForm;

  // variables relating to the open state of various modals
  let filtersOpen = false;
  let orderFormOpen = false;
  let deleteOrderOpen = false;
  let ctxOrderListOpen = false;
  let fullOrderListOpen = false;

  // variables relating to the context menu
  let ctx_x;
  let ctx_y;
  let order_ctx_open;
  let ctx_target;
  let mid_ctx_open;

  let hovered_cell;
  let hover_selected_cell;
  let orderToDelete;

  let allSwaptionPrices;

  swaption_prices.subscribe(() => {
    allSwaptionPrices = swaption_prices.findAllOrders();
  });

  $: x_labels =
    $user_options.swaptionSwapTenors?.sort(
      (a, b) => tenorToYear(a) - tenorToYear(b)
    ) ?? [];
  $: y_labels =
    $user_options.swaptionOptionTenors?.sort(
      (a, b) => tenorToYear(a) - tenorToYear(b)
    ) ?? [];

  $: cells = mapToObject($swaption_prices);

  const mapToObject = (map) => {
    let obj = {};
    for (let [k, v] of map) {
      if (v instanceof Map) {
        obj[k] = mapToObject(v);
      } else {
        obj[k] = mapPriceToCell(v);
      }
    }
    return obj;
  };

  /**
   * @param {import("../common/swaption_price").default} price
   */
  const mapPriceToCell = (price) => {
    const orderString = (order) => {
      if (order === undefined) {
        return "-";
      }

      const price = order.premium.toFixed(2);

      if (new Date(order.time_placed) < new Date().setHours(0, 0, 0, 0)) {
        return price + ' ❄️';
      }

      if (!order.firm) {
        return price + " ⛔";
      }

      return price;
    };

    const tooltipString = (order) => {
      if (order === undefined) {
        return undefined;
      }

      const bank = traders.bankName(order.trader_id);
      const trader = traders.name(order.trader_id);

      return `${bank} ${trader} @ ${order.volume}mio`;
    };

    const bid = price.getBestBid();
    const offer = price.getBestOffer();

    if (bid || offer) {
      return [
        {
          value: orderString(bid),
          tooltip: tooltipString(bid),
          ...(bid && { id: bid.order_id }),
        },
        {
          value: orderString(offer),
          tooltip: tooltipString(offer),
          ...(offer && { id: offer.order_id }),
        },
      ];
    } else {
      return {
        value:
          swaption_quotes
            .getBBSW(price.swap_term, price.option_expiry)
            ?.premium?.toFixed(2) ?? "-",
      };
    }
  };

  /**
   * @param {string} _
   * @param {string} x
   * @param {string} y
   */
  const color_fn = (_, x, y, idx) => {
    if (
      (idx === 0 && !swaption_prices.hasBid(x, y)) ||
      (idx === 1 && !swaption_prices.hasOffer(x, y)) ||
      idx === undefined
    ) {
      return "var(--cds-disabled-02)";
    }
  };

  /**
   * @param {Array<unknown>} _
   * @param {string} x
   * @param {string} y
   */
  const background_color_fn = (_, x, y) => {
    if (swaption_prices.hasBid(x, y) || swaption_prices.hasOffer(x, y)) {
      if (swaption_prices.hasMatch(x, y)) {
        return "var(--cds-inverse-support-02)";
      }
      return "var(--cds-inverse-support-04)";
    }
  };

  const handleCtxMenu = (e) => {
    order_ctx_open = false;
    mid_ctx_open = false;

    if (hovered_cell) {
      ctx_x = e.clientX;
      ctx_y = e.clientY;
      hover_selected_cell = hovered_cell;
      if (hover_selected_cell.id != null) {
        order_ctx_open = true;
      } else {
        mid_ctx_open = true;
      }
    }
  };

  const handleTableHover = (event) => {
    const detail = event.detail;

    hovered_cell = {
      x: detail.x,
      y: detail.y,
      id: detail.id,
    };
  };

  const handleCtxOrder = () => {
    let order = {
      order_id: 0,
      firm: true,
      swap_term: tenorToYear(hover_selected_cell.x),
      option_expiry: tenorToYear(hover_selected_cell.y),
      option_type: "Straddle",
      volume: swaption_quotes.getBBSW(
        hover_selected_cell.x,
        hover_selected_cell.y
      )?.mmp,
    };

    if (hover_selected_cell.id) {
      const originalOrder = swaption_prices.findOrder(hover_selected_cell.id);
      order.bid = !!!!!!!originalOrder.bid;
      order.premium = originalOrder.premium;
    } else {
      order.bid = !!true;
      order.premium =
        swaption_quotes.getBBSW(hover_selected_cell.x, hover_selected_cell.y)
          ?.premium ?? 0;
    }

    copyOrderToForm(order);
    orderFormOpen = true;
  };

  const handleCtxUpdate = () => {
    const order = swaption_prices.findOrder(hover_selected_cell.id);

    copyOrderToForm(order);
    orderFormOpen = true;
  };

  const handleCtxViewOrders = () => {
    ctxOrderListOpen = true;
  };

  const handleCtxDelete = () => {
    deleteOrderOpen = true;
    orderToDelete = swaption_prices.findOrder(hover_selected_cell.id);
  };

  const handleTableClick = (event) => {
    const detail = event.detail;

    if (!detail.x || !detail.y) {
      return;
    }

    if (detail.id) {
      const order = swaption_prices.findOrder(detail.id);
      const swap_term = detail.x;
      const option_expiry = detail.y;

      // with one order, we set the notional to the volume of the order
      copyData = {
        ...(order.bid
          ? { buyer_id: order.trader_id }
          : { seller_id: order.trader_id }),
        option_type: order.option_type,
        notional: order.volume,
        strike_rate: swaption_quotes
          .getBBSW(swap_term, option_expiry)
          ?.strike?.toFixed(4),
        option_expiry: option_expiry,
        swap_term: swap_term,
        premium_bp: order.premium,
        settlement: "Physical",
        order_ids: [order.order_id],
      };

      let matching_order = swaption_prices.getMatch(order.order_id);

      // if there is a matching order, we add the trader to the corresponding side of the trade,
      // as well as overriding the notional with the minimum between the two orders
      if (matching_order) {
        copyData = {
          ...copyData,
          ...(matching_order.bid
            ? { buyer_id: matching_order.trader_id }
            : { seller_id: matching_order.trader_id }),
          notional: Math.min(order.volume, matching_order.volume),
          order_ids: [order.order_id, matching_order.order_id],
        };
      }
    } else {
      const swap_term = detail.x;
      const option_expiry = detail.y;

      const quote = swaption_quotes.getBBSW(swap_term, option_expiry);

      copyData = {
        swap_term: swap_term,
        option_expiry: option_expiry,
        ...(quote && {
          strike_rate: quote?.strike?.toFixed(4),
          premium_bp: quote?.premium?.toFixed(2),
        }),
        option_type: "Straddle",
        settlement: "Physical",
      };
    }
  };
</script>

<!--
  MODALS
-->

<!-- Filter modal -->
<SwaptionLiveOrderFilters bind:open={filtersOpen} />

<!-- Order form modal -->
<SwaptionPriceModal bind:open={orderFormOpen} bind:copyOrderToForm={copyOrderToForm} />

<!-- Delete order modal -->
<Modal
  danger
  bind:open={deleteOrderOpen}
  modalHeading="Delete order"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  on:click:button--primary={() => {
    websocket.deleteSwaptionOrders([orderToDelete.order_id]);
    deleteOrderOpen = false;
  }}
  on:click:button--secondary={() => (deleteOrderOpen = false)}
  on:close={() => (orderToDelete = null)}
>
  {#if orderToDelete}
    <StructuredList>
      <StructuredListRow>
        <StructuredListCell style="width: 25%;" head>Trader</StructuredListCell>
        <StructuredListCell style="width: 25%;">
          {traders.name(orderToDelete.trader_id)}
        </StructuredListCell>
        <StructuredListCell style="width: 25%;" head
          >Direction</StructuredListCell
        >
        <StructuredListCell style="width: 25%;">
          {orderToDelete.bid ? "Bid" : "Offer"}
        </StructuredListCell>
      </StructuredListRow>
      <StructuredListRow>
        <StructuredListCell style="width: 25%;" head
          >Option Type</StructuredListCell
        >
        <StructuredListCell style="width: 25%;">
          {orderToDelete.option_type}
        </StructuredListCell>
        <StructuredListCell style="width: 25%;" head>Firm</StructuredListCell>
        <StructuredListCell style="width: 25%;">
          {orderToDelete.firm ? "Yes" : "No"}
        </StructuredListCell>
      </StructuredListRow>
      <StructuredListRow>
        <StructuredListCell style="width: 25%;" head
          >Option Expiry</StructuredListCell
        >
        <StructuredListCell style="width: 25%;">
          {orderToDelete.option_expiry}
        </StructuredListCell>
        <StructuredListCell style="width: 25%;" head
          >Swap Term</StructuredListCell
        >
        <StructuredListCell style="width: 25%;">
          {orderToDelete.swap_term}
        </StructuredListCell>
      </StructuredListRow>
      <StructuredListRow>
        <StructuredListCell style="width: 25%;" head>Premium</StructuredListCell
        >
        <StructuredListCell style="width: 25%;">
          {orderToDelete.premium}
        </StructuredListCell>
        <StructuredListCell style="width: 25%;" head>Volume</StructuredListCell>
        <StructuredListCell style="width: 25%;">
          {orderToDelete.volume}
        </StructuredListCell>
      </StructuredListRow>
    </StructuredList>
  {/if}
</Modal>

<!-- View all orders modal -->

<!--
   orders={(() => {
     const swapTerm = hover_selected_cell?.x;
     const optionExpiry = hover_selected_cell?.y;
     if (swapTerm && optionExpiry) {
       return swaption_prices.findAllOrdersAtTenor(swapTerm, optionExpiry);
     }
   })()}
-->

{#key $swaption_prices}
  <SwaptionOrdersListModal
    title={`${hover_selected_cell?.y} x ${hover_selected_cell?.x} Orders`}
    orders={swaption_prices.findAllOrdersAtTenor(hover_selected_cell?.x, hover_selected_cell?.y)}
    bind:open={ctxOrderListOpen}
  />
{/key}

<SwaptionOrdersListModal
  title={"All Prices"}
  orders={allSwaptionPrices}
  bind:open={fullOrderListOpen}
/>

<!--
  CONTEXT MENUS
-->
{#if !permission["View Only"]}
<div bind:this={ctx_target} class="ctx_target" style:display={"none"} />

<!-- Context menu for spots on the table that have orders -->
<ContextMenu
  target={ctx_target}
  bind:x={ctx_x}
  bind:y={ctx_y}
  bind:open={order_ctx_open}
>
  <ContextMenuOption
    labelText="Create opposing order"
    on:click={handleCtxOrder}
  />

  <ContextMenuOption labelText="Update order" on:click={handleCtxUpdate} />

  <ContextMenuOption labelText="Delete order" on:click={handleCtxDelete} />

  <ContextMenuOption
    labelText={`View ${hover_selected_cell?.y} x ${hover_selected_cell?.x} Orders`}
    on:click={handleCtxViewOrders}
  />
</ContextMenu>

<!-- Context menu for spots on the table that don't have orders -->
<ContextMenu
  target={ctx_target}
  bind:x={ctx_x}
  bind:y={ctx_y}
  bind:open={mid_ctx_open}
>
  <ContextMenuOption labelText="Create order" on:click={handleCtxOrder} />
</ContextMenu>
{/if}
<!-- TABLE -->
<div style="flex: 1 1 auto; height: calc(100% - 2.5rem); overflow:hidden;" on:contextmenu={handleCtxMenu}>
  <CellSelectableTable
  title="ATM Straddle Prices"
  selectable
      {cells}
      {x_labels}
      {y_labels}
      {color_fn}
      {background_color_fn}
      on:hover={handleTableHover}
      on:click={handleTableClick}
      >
      <div slot="button">
        {#if !permission["View Only"]}
        <Button
          kind="ghost"
          icon={List}
          iconDescription="All Orders"
          on:click={() => (fullOrderListOpen = true)}
        />

        <Button
          kind="ghost"
          icon={AddFilled}
          iconDescription="Add Order"
          on:click={() => {
            orderFormOpen = true;
            copyOrderToForm(null);
          }}
        />
        <Button
          kind="ghost"
          icon={FilterEdit}
          iconDescription="Filters"
          on:click={() => (filtersOpen = true)}
        />
        {/if}
      </div>
    </CellSelectableTable>
  </div>
