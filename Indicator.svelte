<script>
import { Tooltip } from 'carbon-components-svelte';
import websocket from '../common/websocket.js';
import { removeTrailZero, toPrice, toRBATenor, toTenor } from '../common/formatting.js';
import currency_state from '../stores/currency_state';
import quotes from '../stores/quotes.js';
import { createEventDispatcher } from 'svelte';
import active_product from '../stores/active_product.js';
import user from '../stores/user.js';
import brokers from '../stores/brokers.js';
import products from '../stores/products.js';
  
export let primary_indicator;
export let secondary_indicator = null;
export let highlight = 0;
export let product_id = $active_product;

let close_fx = {left: 0, top: 0, value: 0};
let primary_up;
let secondary_up;
let permission;
let show_yesterday = false;
$:permission = user.getPermission($brokers);
const dispatch = createEventDispatcher();

// handles setting the primary indicators mid colour 
$: {
  // get the previous quote
  let prev_quote = quotes.getPrevQuote(primary_indicator.quote_id);

  // if the previous quote does not exist, set "up" values to null
  if (prev_quote === null) {
    primary_up = null;
    break $;
  }

  // if the quote is overriden, don't set a colour
  if (primary_indicator.override !== null) {
    primary_up = null;
    break $;
  }

  // get the current and previous mid values
  let curr_mid = primary_indicator.mid;
  let prev_mid = prev_quote.mid;

  // set the up value according to current and previous mid values
  primary_up = colourLogic(curr_mid, prev_mid);
}

// handles setting the secondary indiciators colour
$: if (secondary_indicator) {
  // get the previous quote
  let prev_quote = quotes.getPrevQuote(secondary_indicator.quote_id);
  
  // if the previous quote does not exist, set "up" value to null
  if (prev_quote === null) {
    secondary_up = null;
    break $;
  }

  // if the quote is overriden, don't set a colour
  if (secondary_indicator.override !== null) {
    secondary_up = null;
    break $;
  }
  
  // get the current and previous mid values
  let curr_mid = secondary_indicator.mid;
  let prev_mid = prev_quote.mid;

  // set the up value according to the current and previous mids values
  secondary_up = colourLogic(curr_mid, prev_mid);
}

// handles the logic for setting the colours
// if the new value is greater than the previous, returns true (green)
// if the new value is less than the previous, returns false (red)
// if the new value is equal to the previous, returns null (grey default colour)
function colourLogic(val, prev) {
  if (val > prev) {
    return true;
  } else if (val < prev) {
    return false;
  } else {
    return null;
  }
}

// When the user finishes editing an editable field send it to the server.
// If the override is not a valid number reset the override by sending the server "null".

function submitOverride(ind, text) {
  var ovr = parseFloat(text);

  if (isNaN(ovr) || text === removeTrailZero(toPrice(ind.mid))) {
    ovr = null;
  }
  websocket.overrideQuote(ind, ovr,$currency_state);
}

function handleOverride(indicator, source) {
  // submit the override to the server
  submitOverride(indicator, source.textContent);
  // if the text field was set to empty, update the text field to contain the current indicator value
  if (source.textContent === '') {
    source.textContent = removeTrailZero(toPrice(indicator.override === null ? indicator.mid : indicator.override));
  }
}

function handleKeyPress(event) {
  // amount of decimal places currently
  let dp = event.target.textContent.split('.')[1]?.length;
  // the current index of the decimal place
  let dpIdx = event.target.textContent.indexOf('.');

  // the indexes of the start and end of the currently selected text
  let selectionStartIdx = event.view.getSelection().anchorOffset;
  let selectionEndIdx = event.view.getSelection().focusOffset;

  if (event.key && !isCharNumber(event.key)) {
    // if the event is not a number, prevent the event from happening
    event.preventDefault();
  } else if (dp !== undefined &&
            (selectionStartIdx > dpIdx) &&
            (![1, 3, 18].includes(products.nonFwd(product_id)) && dp >= 3 || dp >= 5) &&
            (selectionStartIdx === selectionEndIdx)) {
    // if the event would add more than 4 decimal places, prevent it from happening 
    event.preventDefault();
  } 
}

function handleKeyDown(event, source, indicator) {
  // keycode 13 is enter, 27 is esc
  if (event.keyCode === 13 || event.keyCode === 27) {
    // handle the override and prevent the keystroke from being registered in the text box
    handleOverride(indicator, source); 
    event.preventDefault();
  } 
}

function handlePrimaryBlur() {
  handleOverride(primary_indicator, this);
}

function handleSecondaryBlur() {
  handleOverride(secondary_indicator, this);
}

function handlePrimaryKeyDown(event) {
  handleKeyDown(event, this, primary_indicator);
}

function handleSecondaryKeyDown(event) {
  handleKeyDown(event, this, secondary_indicator); 
}

// returns true if the given character is between 0-9 OR is '.' or '+'or '-'
function isCharNumber(c) {
  return (c >= '0' && c <= '9') || (c === '.' || c === '+' || c === '-');
}

let delay;

function showYesterdayClose(e, open, indicator) {
  const indicatorObject = indicator === 'primary' ? primary_indicator : secondary_indicator;
  if(indicatorObject.yesterday_close == null) return open = false;
  if(open){
    delay  = setTimeout(() => {
      let element = e.target;
      let rect = element.getBoundingClientRect();
      close_fx.left = rect.left + (rect.width / 2);
      close_fx.top = rect.top;
      close_fx.value = indicatorObject.yesterday_close;
      show_yesterday = open;
    }, 400)
  } else {
    clearTimeout(delay);
    show_yesterday = open;
  }
}
</script>

<tr on:click={() => dispatch("copy")} class={highlight === primary_indicator.year ? 'highlight' : ''}>
  <!-- Display the provided indicators -->
  <td style="cursor:{$active_product != -1 ? "pointer" : "default"}">{product_id == 20 ? toRBATenor([primary_indicator.year]) : toTenor([primary_indicator.year])}</td>
  {#if !permission["View Only"]}
      <td
        contenteditable="true"
        class:overridden={primary_indicator.override !== null}
        class:stale={primary_indicator.mid_is_stale}
        class:green={primary_up !== null ? primary_up : false}
        class:red={primary_up !== null ? !primary_up : false}
        on:mouseenter={(e) => showYesterdayClose(e, true, "primary")}
        on:mouseleave={(e) => showYesterdayClose(e, false, "primary")}
        on:blur={handlePrimaryBlur}
        on:keydown={handlePrimaryKeyDown}
        on:keypress={handleKeyPress}
      >
      {@html removeTrailZero(toPrice(
        primary_indicator.override === null ? primary_indicator.mid : primary_indicator.override
      ))}
      </td>
  {:else}
    <td
      contenteditable="false"
      class:overridden={primary_indicator.override !== null}
      class:stale={primary_indicator.mid_is_stale}
      class:green={primary_up !== null ? primary_up : false}
      class:red={primary_up !== null ? !primary_up : false}
      on:mouseenter={(e) => showYesterdayClose(e, true, "primary")}
      on:mouseleave={(e) => showYesterdayClose(e, false, "primary")}
      on:blur={handlePrimaryBlur}
      on:keydown={handlePrimaryKeyDown}
      on:keypress={handleKeyPress}
    >
    {@html removeTrailZero(toPrice(
      primary_indicator.override === null ? primary_indicator.mid : primary_indicator.override
    ))}
    </td> 
  {/if}
  {#if secondary_indicator !== null && typeof secondary_indicator !== 'undefined'}
    {#if secondary_indicator === 0}
      <td>-</td>
    {:else}
      {#if !permission["View Only"]}
      <td
        contenteditable="true"
        class:overridden={secondary_indicator.override !== null}
        class:stale={secondary_indicator.mid_is_stale}
        class:green={secondary_up !== null ? secondary_up : false}
        class:red={secondary_up !== null ? !secondary_up : false}
        on:mouseenter={(e) => showYesterdayClose(e, true, "secondary")}
        on:mouseleave={(e) => showYesterdayClose(e, false, "secondary")}
        on:blur={handleSecondaryBlur}
        on:keydown={handleSecondaryKeyDown}
        on:keypress={handleKeyPress}
      >
        {@html removeTrailZero(toPrice(
          secondary_indicator.override === null ? secondary_indicator.mid : secondary_indicator.override
        ))}
      </td>
      {:else}
      <td
        contenteditable="false"
        class:overridden={secondary_indicator.override !== null}
        class:stale={secondary_indicator.mid_is_stale}
        class:green={secondary_up !== null ? secondary_up : false}
        class:red={secondary_up !== null ? !secondary_up : false}
        on:mouseenter={(e) => showYesterdayClose(e, true, "secondary")}
        on:mouseleave={(e) => showYesterdayClose(e, false, "secondary")}
        on:blur={handleSecondaryBlur}
        on:keydown={handleSecondaryKeyDown}
        on:keypress={handleKeyPress}
      >
        {@html removeTrailZero(toPrice(
          secondary_indicator.override === null ? secondary_indicator.mid : secondary_indicator.override
        ))}
      </td>
      {/if}
    {/if}
  {/if}
</tr>


<Tooltip class='yesterdayCloseFX' style="left: {close_fx.left}px; top: {close_fx.top}px;" hideIcon={true} bind:open={show_yesterday}>
    CLOSE @ {close_fx.value}
</Tooltip>


<style>
:global(.yesterdayCloseFX){
  position: fixed !important;
  margin-top:10px;
}

:global(.yesterdayCloseFX .bx--tooltip) {
  width: fit-content; 
  min-width: fit-content;
  white-space: nowrap;
  padding: 4px;
}

.stale {
  color: grey;
}
.overridden {
  color: black;
  background-color: lemonchiffon;
}
.green {
  color: #3bdb23;
}
.red {
  color: red;
}

.highlight {
  border: 2px solid white;
}

td:hover{
    cursor: pointer;
    background-color: var(--cds-hover-selected-ui);
}
</style>