<script>
  import { Button } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
  import Close from "carbon-icons-svelte/lib/Close.svelte";
  import swaption_market_structures from "../../stores/swaption_market_structures";
  import websocket from "../../common/websocket";
  import Validator from "../../common/validator";
  import swaption_quotes from "../../stores/swaption_quotes";
  import user from "../../stores/user";
  import brokers from '../../stores/brokers.js';
  
  export let copyData;

  $:permission = user.getPermission($brokers);

  /**
   * @param {KeyboardEvent} e
   */
  const handleKeyPress = (e) => {
    if (e.shiftKey && e.key === "Enter") {
      moveFocusUpRow(e);
    } else if (e.key === "Enter") {
      moveFocusDownRow(e);
    }
  };

  /**
   * @param {FocusEvent} e
   * @param {import("../../stores/swaption_market_structures").SwaptionMarketStructure} e
   */
  const handleBlur = (e, row) => {
    if (e.relatedTarget && areSiblings(e.target, e.relatedTarget)) {
      return;
    }

    const arr = $swaption_market_structures;
    if (!isEmptyRow(arr[arr.length - 1])) {
      addRow();
    } else {
      websocket.submitSwaptionMarketStructure(row);
    }
  };

  const isEmptyRow = (row) => {
    const isStringEmpty = (val) => val === "" || val == null;

    return (
      isStringEmpty(row.option_expiry) &&
      isStringEmpty(row.swap_term) &&
      isStringEmpty(row.strike) &&
      isStringEmpty(row.option_type) &&
      isStringEmpty(row.bid_price) &&
      isStringEmpty(row.offer_price) &&
      isStringEmpty(row.bid_volume) &&
      isStringEmpty(row.offer_volume)
    );
  };

  /**
   * Returns true if 2 HTMLElement's are siblings but not the same node.
   * @param {HTMLElement} a
   * @param {HTMLElement} b
   */
  const areSiblings = (a, b) => a != b && a.parentNode == b.parentNode;

  /**
   * Adds a new row.
   */
  const addRow = () => {
    websocket.submitSwaptionMarketStructure({
      id: 0,
      option_expiry: "",
      swap_term: "",
      strike: "",
      option_type: "",
      bid_price: "",
      offer_price: "",
      bid_volume: "",
      offer_volume: "",
    });
  };

  const deleteRow = (id) => {
    websocket.deleteSwaptionMarketStructure([id]);
  };

  // TODO: parse the row, put into order form
  const copyToOrderForm = (id) => {
    const row = $swaption_market_structures.find(r => r.id === id);

    const validate = (fn, val, def) => {
      try {
        return fn(val);
      } catch (err) {
        return def;
      }
    };

    const option_expiry = validate(Validator.scanTenorShape, row.option_expiry, "");
    const swap_term = validate(Validator.scanTenorShape, row.swap_term, "");
    const premium_bp = validate(parseFloat, row.bid_price, 0);
    const notional = validate(Validator.scanVolume, Math.min(row.bid_volume, row.offer_volume), 0);

    let strike_rate;
    if (row.strike.slice(0,1) == "-" || row.strike.slice(0,1) == "+") {
      strike_rate = swaption_quotes.getBBSW(row.swap_term, row.option_expiry).strike + validate(Validator.scanPrice, row.strike, 0)/100;
      strike_rate = strike_rate.toFixed(4);
    } else {
      strike_rate = validate(Validator.scanPrice, row.strike, 0);
    }

    copyData = {
      option_expiry: option_expiry,
      option_type: row.option_type,
      swap_term: swap_term,
      strike_rate: strike_rate,
      premium_bp: premium_bp,
      notional: notional,
    };
  };

  /**
   * Moves focus n rows higher.
   * @param {KeyboardEvent} e
   * @param {number} rows
   */
  const moveFocusUpRow = (e, rows = 1) => {
    e.preventDefault();
    const originalCell = e.target;
    const originalRow = originalCell.parentNode;

    let targetRow = originalRow;
    for (let i = 0; i < rows; i++) {
      targetRow = targetRow.previousElementSibling;
    }

    if (targetRow == null) {
      return;
    }

    for (let cell of targetRow.childNodes) {
      if (cell.cellIndex === originalCell.cellIndex) return cell.focus();
    }
  };

  /**
   * Moves focus n rows lower. Will add a new row if row doesn't already exist.
   * @param {KeyboardEvent} e
   * @param {number} rows
   */
  const moveFocusDownRow = (e, rows = 1) => {
    e.preventDefault();
    const originalCell = e.target;
    const originalRow = originalCell.parentNode;

    let targetRow = originalRow;
    for (let i = 0; i < rows; i++) {
      targetRow = targetRow.nextElementSibling;
    }

    if (targetRow == null) {
      addRow();
      return;
    }

    for (let cell of targetRow.childNodes) {
      if (cell.cellIndex === originalCell.cellIndex) return cell.focus();
    }
  };
</script>

<table>
  <tr>
    <th class="header" rowspan="2">
      {#if !permission["View Only"]}
        <Button
          icon={Add}
          kind="ghost"
          iconDescription="Add"
          tooltipPosition="right"
          on:click={() => addRow()}
        />
      {:else}
        <Button
          icon={Add}
          kind="ghost"
          iconDescription="Add"
          tooltipPosition="right"
          on:click={() => addRow()}
          disabled
        />
      {/if}
    </th>
    <th class="header" rowspan="2">Exp</th>
    <th class="header" rowspan="2">Swap</th>
    <th class="header" rowspan="2">Strike</th>
    <th class="header" rowspan="2">Option Type</th>
    <th
      style="border: 1px solid var(--cds-text-01); border-bottom: none;"
      colspan="2"
    >
      Price
    </th>
    <th
      style="border: 1px solid var(--cds-text-01); border-bottom: none;"
      colspan="2"
    >
      Volume
    </th>
    <th class="header" rowspan="2" />
  </tr>
  <tr>
    <th class="bid-offer header">Bid</th>
    <th class="bid-offer header">Offer</th>
    <th class="bid-offer header">Bid</th>
    <th class="bid-offer header">Offer</th>
  </tr>

  {#each $swaption_market_structures as row (row.id)}
    <tr>
      {#if !permission["View Only"]}
      <td>
        <Button
          icon={Close}
          kind="ghost"
          iconDescription="Close"
          tooltipPosition="right"
          on:click={() => deleteRow(row.id)}
        />
      </td>
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.option_expiry}
      /><td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.swap_term}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.strike}
        />
      <td
      on:keydown={handleKeyPress}
      on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.option_type}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.bid_price}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.offer_price}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.bid_volume}
      />
      <td
      on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="true"
        bind:textContent={row.offer_volume}
      />
      <td>
        <Button
          icon={ChevronRight}
          kind="ghost"
          iconDescription="Copy to order form"
          tooltipPosition="left"
          on:click={() => copyToOrderForm(row.id)}
          />
      </td>
      {:else}
      <td>
        <Button
          icon={Close}
          kind="ghost"
          iconDescription="Close"
          tooltipPosition="right"
          on:click={() => deleteRow(row.id)}
          disabled
        /></td>
        <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.option_expiry}
      /><td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.swap_term}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.strike}
        />
      <td
      on:keydown={handleKeyPress}
      on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.option_type}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.bid_price}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.offer_price}
      />
      <td
        on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.bid_volume}
      />
      <td
      on:keydown={handleKeyPress}
        on:blur={(e) => handleBlur(e, row)}
        contenteditable="false"
        bind:textContent={row.offer_volume}
      />
      <td>
        <Button
          icon={ChevronRight}
          kind="ghost"
          iconDescription="Copy to order form"
          tooltipPosition="left"
          disabled
          on:click={() => copyToOrderForm(row.id)}
          />
      </td>
      {/if}
    </tr>
  {/each}
</table>

<style>
  tr:nth-child(1) > th {
    border-top: 1px solid var(--cds-text-01);
  }

  th:nth-child(1) {
    border-left: 1px solid var(--cds-text-01);
  }

  .header {
    border-bottom: 1px solid var(--cds-text-01);
  }

  .bid-offer:nth-child(odd) {
    border-left: 1px solid var(--cds-text-01);
  }

  .bid-offer:nth-child(even) {
    border-right: 1px solid var(--cds-text-01);
  }

  .bid-offer {
    width: 100px !important;
  }

  table {
    table-layout: fixed;
    width: 100%;
  }

  th {
    background-color: var(--cds-ui-03);
    font-weight: bold;
    height: 2em;
    text-align: center;
    vertical-align: middle;
  }

  td {
    border: 1px solid var(--cds-text-01);
    height: 2em;
  }

  td {
    text-align: center;
    vertical-align: middle;
  }

  td:focus {
    border: 4px solid var(--cds-inverse-support-01);
  }

  td:first-child,
  th:first-child,
  th:last-child {
    width: 48px;
  }
</style>
