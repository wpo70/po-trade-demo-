<script>
  import { InlineNotification } from "carbon-components-svelte";
  import { onMount } from "svelte";
  import swaption_prices from "../../stores/swaption_prices";

  import { flip } from "svelte/animate";
  import { quintOut } from "svelte/easing";
  import traders from "../../stores/traders";

  /**
   * @typedef {Object} Notification
   * @property {number} id
   * @property {string} title
   * @property {string} subtitle
   * @property {NotificationKind} kind
   */

  /**
   * @typedef {'info' | 'info-square' | 'error' | 'success' | 'warning' | 'warning-alt'} NotificationKind
   */

  /** @type {Notification[]} */
  let notifications = [];
  let id = 0;

  onMount(() => {
    swaption_prices.addOrderCallback((operation, order, order2) => {
      switch (operation) {
        case "add":
          notify("Swaption price added:", swaptionOrderString(order), "info");
          break;
        case "delete":
          notify("Swaption price closed:", swaptionOrderString(order), "error");
          break;
        case "update":
          notify(
            "Swaption price updated:",
            orderDiffString(order, order2),
            "warning-alt"
          );
          break;
      }
    });
  });

  /**
   * Stringifys an order to the following format:
   * JPM 1m x 1y Bid @ 100.00bp 20mio
   * @param {import("../../common/swaption_price").SwaptionOrder} order
   * @returns {string}
   */
  const swaptionOrderString = (order) => {
    return `${traders.bankName(order.trader_id)}
      ${order.option_expiry} x ${order.swap_term}
      ${order.bid ? "Bid" : "Offer"} @
      ${order.premium.toFixed(2)}bp ${order.volume}mio`;
  };

  /**
   * @param {Notification} notification
   */
  const removeNotification = (notification) => {
    notifications = notifications.filter((n) => n.id !== notification.id);
  };

  const orderDiffString = (order, order2) => {
    const diffFields = [];

    for (let field in order) {
      if (order[field] !== order2[field]) {
        diffFields.push(field);
      }
    }

    const snakeCaseToProperCase = (text) => {
      text = text.replace(/\_/g, " ");
      return text[0].toUpperCase() + text.slice(1);
    };

    let output = traders.bankName(order.trader_id);
    output += ` ${order.option_expiry} x ${order.swap_term} | `;
    let first = true;
    diffFields.forEach((field) => {
      if (!first) {
        output += ", ";
      }
      output += snakeCaseToProperCase(field);
      output += `: ${order2[field]} → ${order[field]}`;
      first = false;
    });

    return output;
  };

  /**
   * @param {string} title
   * @param {NotificationKind} kind
   */
  const notify = (title, subtitle, kind) => {
    const notification = {
      id: id++,
      kind: kind,
      title: title,
      subtitle: subtitle,
    };
    notifications = [...notifications, notification];
  };
</script>

<div class="notification-container">
  {#each notifications as notification (notification.id)}
    <div animate:flip={{ duration: 250, easing: quintOut }}>
      <InlineNotification
        kind={notification.kind}
        title={notification.title}
        subtitle={notification.subtitle}
        on:close={(e) => {
          e.preventDefault();
          removeNotification(notification);
        }}
        timeout={10000}
      />
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    left: 0;
    bottom: 0;
    display: flex;
    flex-direction: column-reverse;
    gap: 4px;
    z-index: 1000;
  }
</style>
