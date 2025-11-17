<script>
  import trades from '../../stores/trades';
  import swaption_orders from '../../stores/swaption_orders';
  import liquidityTrades from '../../stores/liquidityTrades';
  import interest_groups from '../../stores/interest_groups';
  import traders from '../../stores/traders';
  import products from '../../stores/products';
  import trade_count from '../../stores/trade_count';
  import swaptions_count from '../../stores/swaptions_count';
  import liquidity_trade_count from '../../stores/liquidity_trade_count';

  import HistoryTable from './HistoryTable.svelte';
  import Filters from './Filters/Filters.svelte';

  import { toRBATenor, toTenor } from '../../common/formatting';
  import config from '../../../config.json'
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // ---------------- INFO BAR ---------------- // 

  let info_bar_items = [];
  $: {
    if(selectedTable == 'Trades') {
      info_bar_items = [
        {
          title: 'Pending Trades',
          value: $trade_count.pending,
        },
        {
          title: "Trades Today",
          value: $trade_count.daily,
        },
        {
          title: 'Trades This Month',
          value: $trade_count.monthly,
        },
        {
          title: 'Total Trades',
          value: $trade_count.total,
        },
      ];
    } else if(selectedTable == 'Swaptions') {
      info_bar_items = [
        {
          title: 'Pending Swaptions',
          value: $swaptions_count.pending,
        },
        {
          title: "Swaptions Today",
          value: $swaptions_count.daily,
        },
        {
          title: 'Swaptions This Month',
          value: $swaptions_count.monthly,
        },
        {
          title: 'Total Swaptions',
          value: $swaptions_count.total,
        },
      ];
    } else if (selectedTable == "Liquidity") {
      info_bar_items = [
        {
          title: 'Pending Trades',
          value: $liquidity_trade_count.pending,
        },
        {
          title: "Trades Today",
          value: $liquidity_trade_count.daily,
        },
        {
          title: 'Trades This Month',
          value: $liquidity_trade_count.monthly,
        },
        {
          title: 'Total Trades',
          value: $liquidity_trade_count.total,
        },
      ];
    }
  };

  // ---------------- Data Format Logic for Table and Filters ---------------- //

  const formatData = function (tableData) {

    let data = structuredClone(tableData);
    
    data.forEach((row, index) => {
      row.id = index;
      (row.breaks != null && row.thereafter != null) ? row.has_break_clause = 'Yes' : row.has_break_clause = 'No';
      for(let fieldName in row){
        if (row[fieldName] == null) {
          row[fieldName] = 'Not Available';
          continue;
        }
        
        // translate product id fields to product names
        if (fieldName == 'product_id') {
          row.product_name = products.name(row[fieldName]);
          continue;
        }

        // translate sef boolean to on or off
        if (fieldName == 'sef') {
          row[fieldName] ? row[fieldName] = 'on' : row[fieldName] = 'off';
          continue;
        }

        // translate trader id fields to trader names
        if (['buyer_id', 'seller_id', 'offer_trader_id', 'bid_trader_id'].includes(fieldName)) {
          const trader_id = row[fieldName];
          const new_fieldName = fieldName.split('_id')[0].concat('_name');
          if(trader_id == 'Not Available') row[new_fieldName] = 'Not Available';
          const trader = traders.get(trader_id);
          if (!trader) continue;
          let traderName = traders.fullName(trader);
          traderName = traderName.split(' [')[0];
          row[new_fieldName] = traderName;
          continue;
        }

        // change Interest Group B fieldName maybe do this in the store formatting

        //translate bank division id fields to interest group names
        if (['buyer_bank_division', 'seller_bank_division', 'offer_bank_division_id', 'bid_bank_division_id'].includes(fieldName)) {

          let new_fieldName = fieldName.split('_bank_division')[0].concat('_interest_group_name');
          const bank_division_id = row[fieldName];
          let interest_group_name;

          for(let group of $interest_groups){
            if(bank_division_id == group.bank_division_id){
              interest_group_name = group.name;
            }
          }

          if(interest_group_name){
            row[new_fieldName] = interest_group_name;
          } else {
            row[new_fieldName] = 'Not Available';
          }
          continue;
        }

        // format date fields
        if (fieldName == 'timestamp') {
          // format date and time
          row[fieldName] = new Date(row[fieldName]).toLocaleString('en-AU', {
            dateStyle: 'medium',
            timeStyle: 'short',
            hour12: false,
          });
        }
        if (['date', 'startDate', 'fixingDate', 'endDate', 'start_date', 'expiry_date', 'swap_start_date', 'premium_date']
        .includes(fieldName) || (selectedTable == "RBA_Swaptions" && fieldName == 'swap_maturity_date')) {
          // format date only
          row[fieldName] = new Date(row[fieldName]).toLocaleString('en-AU', {
            dateStyle: 'medium'
          });
          continue;
        }

        //convert year decimials to tenor format (1m, 2m 1y, 2y...)
        if(fieldName == "year"){
          row[fieldName] = row.product_id == 20 ? toRBATenor([1000], new Date(row["start_date"])) : toTenor(row[fieldName]);
          continue;
        }

        if(fieldName.toLocaleLowerCase().includes('brokerage')) {
          row[fieldName] = row[fieldName].toFixed(2);
          continue;
        }

        if(fieldName == 'producttype' && row[fieldName] == 'SPS30D') { row["displayProdType"] = 'OIS30'; continue; }
        else if (fieldName == 'producttype') { row["displayProdType"] = row[fieldName]; continue; }

        if(fieldName == 'rba') {
          row[fieldName] ? row[fieldName] = 'RBA' : row[fieldName] = 'Standard';
          continue;
        }

        if(selectedTable == 'Liquidity' && fieldName == 'notional') {
          row[fieldName] *= 10e-7;  // convert to millions (1000000000 => 1000 million)
        }
      }
    });
    return data;
  }

  // Genesis rows are the unfiltered rows for each table.
  // Instead of storing the genesis rows we will generate them when needed to avoid a stack overflow.
  // The same approach is taken with filtered tables. They are calculated each time switching between tables rather than storing the filtered table states. 
  function getGenesisRows() {
    if(selectedTable == 'Trades') return formatData($trades.rows);
    else if(selectedTable == 'Swaptions') return formatData($swaption_orders.rows);
    else if(selectedTable == 'Liquidity') return formatData($liquidityTrades.rows);
  }

  // ---------------- set and get Functions ---------------- //
  let excludeTest = config.env == "prod";
  let selectedTable = "Trades" // default
  function setSelectedTable(newTable) {
    selectedTable = newTable;
  }

  let appliedRows = getGenesisRows();
  function setAppliedRows(newRows) {
    appliedRows = newRows;
  }

  let resizer = document.getElementById("resize");
  let wrapper = document.getElementsByClassName("tradehistory");
  let filter_column = document.getElementsByClassName("tradehistory-filter");
  let data_table = document.getElementsByClassName("tradehistory-datatable");
  let isHandlerDragging = false;

  document.addEventListener("mousedown", function(e) {
    if (e.target === resizer) {
      isHandlerDragging = true;
    }
  });

  document.addEventListener("mousemove", function(e){
    if (!isHandlerDragging) {
      return false;
    }
    var OffsetLeft = wrapper.OffsetLeft;
    var ponterRelX = e.clientX - OffsetLeft;
    filter_column.style.width = (ponterRelX) + 'px';
    filter_column.style.flexGrow = 0;
  });

  document.addEventListener("mouseup", function(e) {
    isHandlerDragging = false;
  })


</script>

<div class="center">
    <div class="header">
        <div>
          <!-- <h4 style="font-weight: bold;  padding-left: 10px; color: #999;  ">Trade History</h4> -->
            <h1 style="white-space: nowrap;">Trade History</h1>
        </div>
        <div class="info-bar">
            {#each info_bar_items as item}
            <div class="info-bar__item">
                <div>
                <p style='font-weight: bold;'>{item.title}</p>
                <p style='font-size: 1.1rem;'>{item.value}</p>
                </div>
            </div>
            {/each}
        </div>
    </div>
    <div class='main-content tradehistory'>
      <div class="tradehistory-filter">
        <Filters 
          {selectedTable}
          {getGenesisRows}
          {setAppliedRows}
          bind:excludeTest
          on:excludeTest={({detail}) =>{ dispatch('excludeTest', detail)}}
        />
      </div>
        <div id="resize" class="panel-resize"/>
        <div class="tradehistory-datatable">
        <HistoryTable 
          {selectedTable}
          {appliedRows}
          {setSelectedTable}
          bind:excludeTest
          on:excludeTest={({detail}) =>{ dispatch('excludeTest', detail)}}
        />
        </div>
    </div>
    <div class="foot-note" >{(`© 2024 PO Capital Markets Pty Ltd. All rights reserved.`).toUpperCase()}</div>
</div>

<style>
    .center {
        margin: auto;
        margin-top: 5px;
        /* display: flex; */
        width: 100%;
        height: calc(100vh - 200px);
     
    }
    .header {
        display: flex;
        align-items: center;
        gap: 2rem;
        padding: 1rem 2rem;
        z-index: 0;
        position: relative;
        height: 103px;
    }

    .info-bar {
        display: flex;
        width: 100%;
        gap: 1rem;
    }

    .info-bar__item {
        display: flex;
        padding: 10px;
        flex: 1 1 0px;
        background-color: var(--cds-layer);
    }

    .main-content {
      display: flex;
      width: 100%;
      /* padding: 10px; */
      overflow: hidden;
      flex-direction: row; 
      height: 100%;
      justify-content: left;

    }

    .tradehistory-filter{
  display: flex;
  /* flex: 1 1 auto;
  box-sizing: border-box; */
  margin-right: 5px;
  margin-left: 15px;
}

.tradehistory-datatable {
  display: flex;
  width: 100%;
  /* flex: 1 1 auto;
  box-sizing: border-box; */
  margin-right: 15px;
  overflow-y: auto;
    overflow-x: auto;
}
:global(.panel-resize) {
   width: 10px;
   background-color: (--cds-layer);
   cursor: ew-resize;
}
:global(.bx--pagination .bx--select-input) {
  line-height: 1;
}
.foot-note{
  width: 100%;
  height: 50px;
  padding: 20px;
  align-items: center;
  text-align: center;
  font-weight: 400;
  color: #999;
}
</style>