<script>
import Indicator from './Indicator.svelte';
import quotes from '../stores/quotes.js';

import currency_state from '../stores/currency_state';
import ticker from '../stores/ticker';
import { addMonths, toPrice, removeTrailZero, roundToNearest, getSecondThursday } from '../common/formatting';

// Benign declaration and initialisation.

// Get the quotes for the active product.  Normally the active product is simply the active product.
// But if the active product is either IRS or EFP then the primary quotes will be the IRSs and the
// secondary quotes will be the EFPs.

// NOTE: THESE REACTIVE ASSIGNMENTS ARE HARD CODED TO EXPECT THE PRODUCT_ID OF IRS TO BE 1 AND EFP TO BE 2,
// AS DEFINED IN THE DATABASE.
let quotes_90dIR, quotes_irs, quotes_6v3, quotes_bbsw;
let items = ["90d IR", "IRS", "6v3"];
let activeTabValue = 0;
let changes = [null, null, null, null, null, null, null, null, null, null, null, null];

let headers_90dIR = [];
let today = new Date();
let monthDiff = (today.getMonth() + 1) % 3;

if (monthDiff == 0) {
  let date = getSecondThursday(today.getMonth() + 1, today.getFullYear());
  if (date.getTime() < today.getTime()) {
    today = addMonths(today, 3);
  }
} else {
  today = addMonths(today, 3 - monthDiff);
}

for (let i = 1; i <= 12; i++){
  headers_90dIR.push(today.toString().split(" ")[1] + " " + (today.getFullYear() - 2000));

  today = addMonths(today, 3);
}

$: quotes_irs = $quotes[1];
$: quotes_6v3 = $quotes[5];
$: {
  let t = $ticker;
  let new90d = ticker.get90dFutures();
  if (!quotes_90dIR) quotes_90dIR = new90d;
  else {
    let change = false;
    for (let i = 0; i < quotes_90dIR.length; i++){
      let color = colourLogic(new90d[i].ask, quotes_90dIR[i].ask);
      if (color != null && !change) {
        change = true;
        changes = [null, null, null, null, null, null, null, null, null, null, null, null]
        changes[i] = color;
      } else if (color != null && change) {
        changes[i] = color;
      }
    }
    quotes_90dIR = new90d;
  }

  quotes_bbsw = ticker.getBBSW();
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

const handleClick = tabValue => () => (activeTabValue = tabValue);


</script>

  <div class="content" >
    <ul class="indicators">
      {#each items as item, idx}
        <li class={activeTabValue === idx ? 'active' : ''}>
          <span on:click={handleClick(idx)}>{item}</span>
        </li>
      {/each}
    </ul>

    <table class="indicators">
      <thead >
        <tr>
          {#if activeTabValue == 0}
          <th>Tenor</th>
          <th>Ask</th>
          {:else if activeTabValue == 1}
          <th>Tenor</th>
          <th>Mid</th>
          {:else if activeTabValue == 2}
          <th>Tenor</th>
          <th>Mid</th>
          {/if}
        </tr>
      </thead>
    </table>

    <div class="full-indicators-wrapper">
      <table class="indicators">
      
        <tbody  class='indicator_body'>
          {#if activeTabValue == 0}
            {#each headers_90dIR as tenor, i}
              <tr>
                <td>{tenor}</td>
                <td class:green={changes[i] !== null ? changes[i] : false}
                class:red={changes[i] !== null ? !changes[i] : false}>{removeTrailZero(toPrice(quotes_90dIR[i].ask))}</td>
              </tr>
            {/each}
          {:else if activeTabValue == 1}
            {#each quotes_irs as quote, i}
              <Indicator primary_indicator={quote} secondary_indicator={null}/>
            {/each}
          {:else if activeTabValue == 2}
            {#each quotes_6v3 as quote, i}
              <Indicator primary_indicator={quote} secondary_indicator={null}/>
            {/each}
          {/if}
        </tbody>
      </table>
      <div style="height: 20px;"></div>
      <table class="indicators" >
        <thead>
          <tr>
            <th>Tenor</th>
            <th>Mid</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BBSW 1M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[0].mid, 800)))}</td>
          </tr>
          <tr>
            <td>BBSW 2M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[1].mid, 800)))}</td>
          </tr>
          <tr>
            <td>BBSW 3M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[2].mid, 800)))}</td>
          </tr>
          <tr>
            <td>BBSW 4M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[3].mid, 800)))}</td>
          </tr>
          <tr>
            <td>BBSW 5M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[4].mid, 800)))}</td>
          </tr>
          <tr>
            <td>BBSW 6M</td>
            <td>{@html removeTrailZero(toPrice(roundToNearest(quotes_bbsw[5].mid, 800)))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>


<style>
.green {
  color: #3bdb23;
}
.red {
  color: red;
}
ul {
    display: flex;
    flex-wrap: nowrap;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
    border-bottom: 2px solid var(--cds-text-secondary);
}
li {
    margin-bottom: -1px;
}

span {
    border: 1px solid transparent;
    border-top-left-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
    display: block;
    padding: 0.4rem 0.72rem;
    cursor: pointer;
}

span:hover {
    border-color: #e9ecef #e9ecef #dee2e6;
}

li.active > span {
    color: #495057;
    background-color: #fff;
    border-color: #dee2e6 #dee2e6 #fff;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7px;
}
.indicator_body::-webkit-scrollbar-thumb{
  background-color: #393939;
  border: 2px solid var(--cds-ui-01);
  border-radius: 6px;
  cursor: pointer;
}

.full-indicators-wrapper{
  max-height: calc(100vh - 86px - 48px - 100px - 20px); 
  position: fixed; 
  top: 310px; 
  bottom: 20px;
  overflow-y: hidden; 
  left: 22px;
}
.full-indicators-wrapper:hover{
  overflow-y: auto;
}
</style>