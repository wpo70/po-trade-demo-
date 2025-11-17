<script>
// Import components

import {
  DataTable,
  Toolbar,
  ToolbarContent,
  ToolbarSearch,
  Pagination
} from 'carbon-components-svelte';

// Import stores

import banks from './../../stores/banks.js';
import brokerages from './../../stores/brokerages.js';
import { round } from './../../common/formatting.js';

let rows;

$: {
  rows = $banks.map(bank => {
        let bkge = $brokerages.find(b => b.bank_id === bank.bank_id);

        return {
          id: bank.bank_id,
          name: bank.bank,
          low_fee: bkge?.low_fee ?  bkge?.low_fee : "-",
          high_fee: bkge?.high_fee ? bkge?.high_fee : "-",
          trade_count: bkge?.trade_count? bkge?.trade_count : "-",
          monthly_brokerage_sum: round(bkge?.monthly_brokerage_sum + bkge?.swaption_monthly_brokerage_sum, 2)? round(bkge?.monthly_brokerage_sum + bkge?.swaption_monthly_brokerage_sum, 2) : "-"
        }
      });
}

let pageSize = 5;
let page = 1;

</script>


<DataTable
  useStaticWidth={false}
  stickyHeader
  sortable
  zebra
  size="short"
  headers={[
    {key: 'name', value: 'Bank'},
    {key: 'low_fee', value: 'Low Fee'},
    {key: 'high_fee', value: 'High Fee'},
    {key: 'trade_count', value: 'Trade Count'},
    {key: 'monthly_brokerage_sum', value: 'Monthly Total'}
  ]}
  {pageSize}
  {page}
  {rows}>

  <Toolbar>
    <ToolbarContent>
      <ToolbarSearch shouldFilterRows persistent/>
    </ToolbarContent>
  </Toolbar>
</DataTable>

<Pagination
  bind:pageSize
  bind:page
  totalItems={rows.length}
  pageSizeInputDisabled='false'
/>

<style>

</style>
