<script>
  import prices from '../stores/prices';
  import PriceRow from './PriceRow.svelte';
  import { onMount, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  // If a price group is not supplied, only the legend will be displayed.
  export let price_group = null;
  export let prod_name = null;
  export let broad_tenor = undefined;
  export let specific = false;
  export let highlight = false;
  export let other_classes = "";
  export let exp = false;
  
  let init = false;
  export let lib = false;

  onMount(() => {
    if (lib) { initWhiteboardFormat(); }
  });

  // Format price table containers on first load. If this is last in block, once mounted, call the format
  async function initWhiteboardFormat() {
    if (init) {
      dispatch("expand");
      return;
    }
    init = true;
    await new Promise(res => setTimeout(res, 0));
    dispatch("expand");
  }

  let tenor = null;
  if (!broad_tenor && price_group && price_group.product_id == 18 && !specific) {
    let fwdTenor;
    if (price_group.fwd != null) {
      fwdTenor = price_group.fwd * 12;
    } else {
      let today = new Date();
      let date = new Date(price_group.start_date);
      fwdTenor = date.getMonth() - today.getMonth();
      fwdTenor += (date.getFullYear() - today.getFullYear())*12;
    }
    
    tenor = fwdTenor + "x" + (price_group.years[0] == 0.25 ? fwdTenor + 3 : fwdTenor + 6);
  }

  let max_rows = [];
  let size = 3;

  $: checkSize(price_group);
  function checkSize() {
    if (price_group != null){
      size = price_group.bids.length > price_group.offers.length ? price_group.bids.length : price_group.offers.length;
      if (size > 3){
        max_rows = new Array(size-3);
        for (let i = 3; i < size; i++){
          max_rows[i-3] = i;
        }
      }
    }
  }

  const rows = [0, 1, 2];
  let expand = checkSize() || (exp && !!max_rows.length);
  // Handles Expansion of price tables which contain 4 or more offer or bids
  async function expandTable(e){
    if (price_group.product_id == 18 && broad_tenor && size > 3 || price_group.product_id != 18 && size > 3){
      expand = !expand;
      if (expand) await new Promise(res => setTimeout(res, 20));
      dispatch('expand', {colapsed: !expand, table: table});
      price_group.expanded = expand;
      prices.expandPriceGroup(price_group);
    } else if (price_group.product_id == 18) {
      let fwdTenor;
      if (price_group.fwd != null) {
        fwdTenor = price_group.fwd * 12;
      } else {
        let today = new Date();
        let date = new Date(price_group.start_date);
        fwdTenor = date.getMonth() - today.getMonth();
        fwdTenor += (date.getFullYear() - today.getFullYear())*12;
      }
      let dispatchTenor = fwdTenor + "x" + (price_group.years[0] == 0.25 ? fwdTenor + 3 : fwdTenor + 6);
      dispatch('details', {price_group: price_group, broadTenor: dispatchTenor});
    }
  }

  // This will forward on an event.  It adds a table prarameter to the event to help with positioning the dialog that Whiteboard will create.
  let table;
  function showLegs(event) {
    dispatch('show_legs', {
      price: event.detail,
      table: table,
    });
  }
  
  $: if (lib) checkLastCol();
  async function checkLastCol() {
    await new Promise(res => setTimeout(res, 1));
    if (table !== null) {
      dispatch("lastPrice", {table});
    }
  }
</script>

{#if price_group === null}
  <!-- No price group was given, so show a table heading. -->

  <table>
    <colgroup>
      <col class="name" />
      <col class="number" />
      <col class="tenor-plus" />
      <col class="number" />
      <col class="name" />
    </colgroup>

    <thead>
      <tr>
        <th style="width: 131px;" colspan="2">Offer</th>
        <th style="font-weight: 900;" pt_header={prod_name ? prod_name : (broad_tenor ? broad_tenor : "")}>{prod_name ? prod_name : (broad_tenor ? broad_tenor : "")}</th>
        <th style="width: 131px;"  colspan="2">Bid</th>
      </tr>
    </thead>
  </table>
{:else}
  <!-- A price group was given so show it. -->

  <table class="pricetable {other_classes}" pt_pg-ref={`${price_group.product_id}_${price_group.tenor}`} bind:this={table} on:mouseenter>
    <colgroup>
      <col class="name" />
      <col class="number" />
      <col class="tenor" />
      <col class="number" />
      <col class="name" />
    </colgroup>

    <tbody class="pg">
      {#each rows as row (row)}
        <PriceRow on:show_legs={showLegs} on:showFutRef on:expand={expandTable} {price_group} {row} {size} {highlight} {tenor}/>
      {/each}
      {#if expand}
        {#each max_rows as row (row)}
          <PriceRow on:show_legs={showLegs} on:showFutRef on:expand={expandTable} {price_group} {row} {size}/>
        {/each}
      {/if}
    </tbody>
  </table>
{/if}

<style>
table {
  text-align: center;
  border: solid 1px lightgrey;
  table-layout: auto;
  min-width: 403px;
  max-width: 100%;
}
.name {
  min-width: 77px;
}
.number {
  min-width: 79px;
}
.tenor {
  min-width: 64px;
}
/* The number-plus width is the .number width plus 0.3em. */
.tenor-plus {
  min-width: 64px;
}
</style>