<script>
  import ticker from '../stores/ticker.js';
  import currency_state from '../stores/currency_state.js';
  import quotes_store from '../stores/quotes.js';
  import { roundToNearest, yearsToSortCode } from '../common/formatting.js';
  import prices from '../stores/prices.js';
  import data_collection_settings from '../stores/data_collection_settings.js';

  export let ref;
 
  /* ========== Data Structure ========== */

  $: ticker_data = setTickers($currency_state)

  $: quotes = setQuotesTickers($currency_state);

  function setTickers(curr = $currency_state) {
    let tickers = ["yma", "xma", "abfs"]; // Default to AUD products if other curr not defined below
    if (['USD'].includes(curr)) {
      tickers = ["ct2","ct3","ct4","ct5","ct6","ct7","ct8","ct9","ct10","ct12","ct15","ct20", "ct30"];
    }
    return tickers.map(t => ({
        ticker: t,
        prev: $ticker[t]?.last, // floats holding the previous last values 
        up: null, // booleans handling the colour state
      }));
  }

  function setQuotesTickers(curr = $currency_state) {
    quotes = [];
    if (curr == 'AUD') {
      quotes.push(...[
        { name: "1Y1Y FWD IRS", product_id: 19, year: 1, fwd: 1 },
        { name: "5Y5Y FWD IRS", product_id: 19, year: 5, fwd: 5 },
        { name: "1Y1Y FWD B/S", product_id: 26, year: 1, fwd: 1 },
        { name: "5Y5Y FWD B/S", product_id: 26, year: 5, fwd: 5 }
      ]);
    }
    updateQuotes();
    return quotes;
  }

  /* ========== Data Updates/Reactivity ========== */

  $: updateTickers($ticker);

  function updateTickers() {
    const upOrDown = (val, prev, prev_up) => prev === undefined ? null : val === prev ? prev_up : val > prev;

    ticker_data.forEach(i => { // handles updating the colour state 
      const last = $ticker[i.ticker]?.last;
      i['up'] = upOrDown(last, i['prev'], i['up']);
      i['prev'] = last;
    });
    ticker_data = ticker_data;
  }

  $: updateQuotes($prices);

  function updateQuotes() {
    quotes = quotes.map(q => {
      let pg = prices.getPriceGroup({product_id:q.product_id, years: [q.year], sortCode: yearsToSortCode([q.year], q.fwd)});
      if (!pg) { return q; }
      return {
        ...q,
        bid: pg.bids?.[0]?.price,
        ask: pg.offers?.[0]?.price,
        mid: quotes_store.get(q.product_id, q.year).fwd_mids[q.year],
      }
    });
  }

  /* ========== Visual Formatting ========== */

  const eighthbp = 800;
  const tickerVal = (tic, field) => !data_collection_settings.activeGatewayCount() ? '\u2014' : roundToNearest($ticker[tic]?.[field], eighthbp);

  function tickerTitle(ticker) {
    switch (ticker) {
      case"yma":
        return "3Y FUT";
      case "xma":
        return "10Y FUT";
      case "abfs":
        return "3Yx10Y FUT";
      default:
        return  ticker.toUpperCase();
    }
  }
</script>


<div bind:this={ref} class="card-group">
  {#each ticker_data as t}
    {@const movement = t.up}
    <div class="market-card">
      <span class="title">{tickerTitle(t.ticker)}</span>
      <span class="field bid">
        BID {tickerVal(t.ticker, 'bid')}
      </span>
      <span class="field ask">
        ASK {tickerVal(t.ticker, 'ask')}
      </span>
      <span class="field last"
        class:up={movement}
        class:down={movement !== null ? !movement : false}
        >
        LAST {tickerVal(t.ticker, 'last')}
        {#if movement == true}
          {"\u2002\u25B2"}
        {:else if movement == false}
          {"\u2002\u25BC"}
        {/if}
      </span>
    </div>
  {/each}
  {#each quotes as quote}
    <div class="market-card">
      <span class="title">
        {quote.name}
      </span>
      <span class="field bid">
        BID {quote.bid == null ? '\u2014' : roundToNearest(quote.bid, eighthbp)}
      </span>
      <span class="field ask">
        ASK {quote.ask == null ? '\u2014' : roundToNearest(quote.ask, eighthbp)}
      </span>
      <span class="field last">
        MID {roundToNearest(quote.mid, eighthbp)}
      </span>
    </div>
  {/each}
</div>


<style>
  .card-group {
    display: flex;
    gap: 14px;
    margin: 8px 7px;
    &:first-child {
      margin-left: 0px;
    }
  }

  .market-card {
    display: grid;
    grid-template: 'title bid' 1fr 'title ask' 1fr 'last last' 1fr;
    grid-template-columns: auto max-content;
    gap: 0px 14px;
    padding: 5px 8px;
    height: 70px;
    width: 200px;
    background-color: var(--cds-button-separator);
    font-size: small;
  }

  .title {
    grid-area: title;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.2;
    color: #EB8A04;
    justify-self: start;
    text-align: left;
  }

  .field {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
  }

  .bid, .ask { justify-self: end; max-width: 105px; }
  .bid { grid-area: bid;  }
  .ask { grid-area: ask; align-self: center; }
  .last { grid-area: last; justify-self: start; align-self: center; }

  .up { color: #3bdb23; }
  .down { color: red; }
</style>
