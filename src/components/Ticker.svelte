
<script>
import ticker from '../stores/ticker.js';
import currency_state from '../stores/currency_state.js';
import data_collection_settings from '../stores/data_collection_settings.js';

const n = 4;

let signals = [];
let tickers = ["yma", "xma", "abfs"]; // default at AUD

$: {
  if (['AUD','NZD'].includes($currency_state.currency)) {
    tickers = ["yma", "xma", "abfs"];
    signals = [];
    for (let tic of tickers ) {
        signals.push({
          ticker: tic,
          prev: 0, // floats holding the previous last values 
          up: null // booleans handling the colour state
      })
    }
  } else if (['USD'].includes($currency_state.currency)) {
    tickers = ["ct2","ct3","ct4","ct5","ct6","ct7","ct8","ct9","ct10","ct12","ct15","ct20", "ct30"];
    signals = [];
    for (let tic of tickers) {
        signals.push({
          ticker: tic,
          prev: 0, // floats holding the previous last values 
          up: null // booleans handling the colour state
      });
    
    }
  }
}
$: { 
  if (signals.length !== 0){
   for (let i of signals ) {
    // handles updating the colour state 
    if (i?.['prev'] !== 0) {
      i['up'] = upOrDown($ticker[`${i['ticker']}`]?.last,i?.['prev'],i?.['up']); 
    }
    i['prev'] = $ticker[`${i['ticker']}`]?.last;
  }
}
}

const converTickerToName =(ticker) =>{
  switch (ticker) {
    case"yma":
      return "3Y FUT";
    case "xma":
      return "10Y FUT";
    case "abfs":
      return "3Y x 10Y FUT";
    default:
      return  ticker.toUpperCase();
  }
}

// handles the logic for setting the colours
// if the new value is greater than the previous, returns true (green)
// if the new value is less than the previous, returns false (red)
// if the new value is equal to the previous, returns null (grey default colour)
function upOrDown(val, prev, prev_up) {
  if (prev === null) {
    return null;
  }

  if (val > prev) {
    return true;
  } else if (val < prev) {
    return false;
  } else {
    return prev_up;
  }
}
const getSignalStatus =(tic, $ticker) =>{
  return signals?.filter(i => i["ticker"] == tic)?.[0]?.up
}
</script>

  <div class="ticker-banner_layout" style="display: flex;flex-direction:row;gap:10px; font-size:small;">
  {#each tickers as tic, i }
    <div class="ticker-card_wrapper" style="box-shadow: 0 6px 0px 0 rgba(0, 0, 0, 0.10)">
      <card class=" MarketCard-container" >
        <div class="MarketCard-row" >
          <span class="MarketCard-symbol">{converTickerToName(tic)}</span>
          <span class="MarketCard-stockPosition" class:MarketChangepts={$data_collection_settings.gateways.length !== 0}>
            BID {$ticker[`${tic}`]?.bid?.toFixed(n)}
          </span>
        </div>
        <div class="MarketCard-row">
          <!-- arrow signal -->
          <span class={ getSignalStatus(tic, $ticker) !== null ? (getSignalStatus(tic, $ticker) ? "MarketCard-triangle-up" : "MarketCard-triangle-down") : ""} aria-hidden="true"></span>
          <div style="display: flex;flex-direction: column;">
            <div class="MarketCard-changeData">
              <span class="MarketCard-stockPosition"  class:MarketChangepts={$data_collection_settings.gateways.length !== 0}>
                ASK {$ticker[`${tic}`]?.ask?.toFixed(n)}
              </span>
            </div>
          </div>
        </div>
        <div class="MarketCard-row">
          <div>
            <span class="MarketCard-lastTime MarketCard-stockPosition"  
                  class:MarketChangepts={$data_collection_settings.gateways.length !== 0}
                  class:green={getSignalStatus(tic, $ticker) !== null ? getSignalStatus(tic, $ticker) : false} 
                  class:red={getSignalStatus(tic, $ticker) !== null ? !getSignalStatus(tic, $ticker) : false}
                  >LAST {$ticker[`${tic}`]?.last?.toFixed(n)}
            </span>
          </div>
        </div>
      </card>
    </div>
  {/each}
</div>

<style>

  .green {
    color: #3bdb23;
  }
  .red {
    color: red;
  }
  .MarketCard-container:first-child {
    margin-left: 0;
}
.MarketCard-row{
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 33.33%;
  justify-content: space-between;
  padding: 0 10px;
  width: 100%;
}

.MarketCard-stockPosition {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  opacity: .7;
}
.MarketChangepts{
  opacity: 1;
}
.MarketCard-symbol {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--cds-link-01, #78a9ff);
}
.MarketCard-row:first-child {
    transform: translateY(2px);
}
.MarketCard-row:last-child {
    transform: translateY(-2px);
}
.MarketCard-container {
    background-color: inherit;
    display: block;
    height: 66px;
    margin: 0 5px;
    max-width: 180px;
    min-width: 180px;
    position: relative;
    background-color: #181818;
}
.MarketCard-container:hover{
  background-color: #393939;
}
.MarketCard-triangle-down {
    border-top: 10px solid red;
}
.MarketCard-triangle-up {
    border-bottom: 10px solid #3bdb23;
}
.MarketCard-triangle-down, 
.MarketCard-triangle-up {
    border-left: 5px solid #0000;
    border-right: 5px solid #0000;
    height: 0;
    width: 0;
}
.MarketCard-lastTime {
    left:0;
}
</style>
