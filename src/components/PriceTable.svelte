<script>
  import prices from '../stores/prices';
  import PriceRow from './PriceRow.svelte';
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import DraggableModal from './Utility/DraggableModal.svelte';
  import { SelectableTile, TextArea } from "carbon-components-svelte";
  import Copy from "carbon-icons-svelte/lib/Copy.svelte";
  import Undo from "carbon-icons-svelte/lib/Undo.svelte";
  import { round } from '../common/formatting';
  import active_product from '../stores/active_product';
  import products from '../stores/products';

  const dispatch = createEventDispatcher();
  // If a price group is not supplied, only the legend will be displayed.
  export let price_group = null;
  export let prod_name = null;
  export let broad_tenor = undefined;
  export let specific = false;
  export let highlight = false;
  export let other_classes = "";
  export let allShapesPrices = [];
  export let price_list = [];
  export let allNames = [];

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
  let expand = checkSize() || (price_group?.expanded && !!max_rows.length);
  // Handles Expansion of price tables which contain 4 or more offer or bids
  async function expandTable(e){
    if (price_group.product_id == 18 && broad_tenor && size > 3 || price_group.product_id != 18 && size > 3){
      expand = !expand;
      if (expand) await new Promise(res => setTimeout(res, 20));
      dispatch('expand', {collapsed: !expand, table: table});
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
      dispatch('specificSPS', {price_group: price_group, broadTenor: dispatchTenor});
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
  
  let openPriceModal = false;
  let text = "", new_text = "", init_text = "";
  let titles = [];
  let text_products = [];
  let i;
  
  async function setText(p_name, p_id) {
    await tick();
    text = init_text;
    new_text = `\n${p_name}\n`;
    let stir_empty = false;
    
    for (const idx in allShapesPrices) {
      const priceIdx = allShapesPrices[idx];
      const is_percentage = (products.isPercentageProd(p_id) && priceIdx.years.length > 1);
      const nextShape = (
        (($active_product === 18 || p_id === 18) && priceIdx.years[0] < 1 && allShapesPrices[idx - 1]?.years[0] !== priceIdx.years[0]) ||
        (allShapesPrices[idx - 1]?.shape !== priceIdx.shape));
        
      if(nextShape && !new_text.endsWith('\n\n')){
        new_text += nextShape ? `\n` : ``;
      }

      //More STIR Handling, product_id 18 just has a product name SPS for both 3M and 6M
      if(priceIdx.product_id == 18){ 
        if(!new_text.includes(`3M`) && !stir_empty){
          new_text = `\nSPS 3M\n\n`;
        } else if(!new_text.includes(`6M`) && nextShape){
            if(new_text.trim() == 'SPS 3M'){
              new_text = '';
              stir_empty = true;
            } 
            new_text += `SPS 6M\n\n`;
          }
      }
      let new_line = `${priceIdx.tenor}: ${generateNewLine(priceIdx.offers, is_percentage)}/ ${generateNewLine(priceIdx.bids, is_percentage)}\n`;
      if(new_line.includes(`${priceIdx.tenor}: - / - `)){
        new_line = '';
      } 
      new_text += new_line;
    }

    if(new_text.trim() == p_name) {
      new_text = `\n${p_name}\n\nNo bids/offers to display\n`;
    }
    
    if(p_id == 18){
      if(new_text.endsWith('SPS 6M\n\n')){
        new_text = new_text.replace('SPS 6M', '');
      }
      let n = new_text.replace(/\s+/g, '');
      if(n == ''){
        new_text = `\nSPS 3M/6M\n\nNo bids/offers to display\n`;
      } 
    }

    deleteProduct(p_name);   
    init_text = text; 
    i++;
  }


  function generateNewLine(order, is_percentage){
    let txt = '- ';
    for(const a of order){
      if(a.firm == true && !(new Date(a.time_placed) < new Date().setHours(0, 0, 0, 0)) && !a.eoi){
        if(txt != '- ') continue;
        txt = ((is_percentage) ? `${round(a.price*100, 5)} ` : `${round(a.price, 5)} `);
        if(a.links.length > 1) txt = `${txt.trim()}* `;
      }
    }
    return txt;
  }

  function deleteProduct(p_name) {
    const p_idx = titles.indexOf(p_name);
    const t_idx = text_products.indexOf(new_text);

    if (t_idx !== -1 && p_idx !== -1) {
      text_products.splice(t_idx, 1);
      titles.splice(p_idx, 1);
      text = text_products.join('');
      text = text.replace(/\s*$/, '');
      text = text.trim().replace(/undefined/g, '');

      if (text.length === 0) {
        text = `\n\nNo products selected\n`;
        text = text.replace(/\s*$/, '\n\n');
      }
    } else {
      text_products[i] = new_text;
      if (text.trim() === `No products selected`) {
        text = text_products[i];
      } else {
        text = text.replace(/\s*$/, '\n');
        text += text_products[i];
      }
      titles.push(p_name);
      text = text.replace(/^\s*/, '');
      text = text.replace(/\s*$/, '');
    }
  }

  function dispatchProductData() { 
    if(price_list.length == 0) return;

    //Handles setup of STIR products
    const p_id = price_list[0]?.[0]?.product_id ?? price_list[0].product_id;
    const title = products.name(p_id)
    dispatch('selectedProdId', {
      selected: p_id, 
      product_name: title
    });
    titles.length = 0, i = 0, text_products.length = 0, text = "", init_text = "";
    setText(title, p_id);
  }

  function handleProductClick(p_name, p_product_id) {
    dispatch('selectedProdId', {
      selected: p_product_id
    });
    setText(p_name, p_product_id);
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
      <tr class="price-modal" title="Double Click Opens Live Prices" on:dblclick={() => (dispatchProductData(), openPriceModal = true)}>
        <th style="width: 131px;" colspan="2">Offer</th>
        <th style="font-weight: 900;" pt_header={prod_name ? prod_name : (broad_tenor ? broad_tenor : "")}>{prod_name ? prod_name : (broad_tenor ? broad_tenor : "")}</th>
        <th style="width: 131px;"  colspan="2">Bid</th>
      </tr>
    </thead>
  </table>
{:else}
  <!-- A price group was given so show it. -->

  <table
    class="pricetable {other_classes}"
    pt_pg-ref={`${price_group.product_id}_${specific ? broad_tenor.split('x').reduce((a, b) => b - a)+"M_" : ""}${tenor ? tenor : price_group.tenor}`}
    bind:this={table}
    on:mouseenter
    >
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

<DraggableModal class="live-price-modal" style="width:462px" bind:open={openPriceModal} heading={"Live Prices"} >
  <svelte:fragment slot="body">
    <div style="display: flex; flex-direction: row;" on:keypress|stopPropagation>
      <TextArea rows={text.split('\n').length < 22 ? text.split('\n').length  < 5 ? 5 : text.split('\n').length : 22} cols={26} bind:value={text} spellcheck={false} style="flex: 1;" on:scroll={(e) => e.preventDefault()}/>
        <div class="clipboard-buttons" style="display: flex; justify-content: space-evenly; flex-direction: column; margin-right:-16px">
          <button class="clipboard-button" on:click={() => {text = init_text}}>
            <Undo style="vertical-align: top"/>
          </button>
          <button class="clipboard-button" on:click={()=> {navigator.clipboard.writeText(text)}}>
            <Copy style="vertical-align: top"/>
          </button>
        </div>
    </div>
    <div role="group" aria-label="selectable tiles" class="product-selector" style="display: flex; flex-wrap:wrap; gap:8px; margin-top:12px">
      {#key text, titles}
        {#if allNames.length > 1}
          {#each allNames as p_names}
            <SelectableTile class="selectable-button" selected={titles.indexOf(p_names.name) !== -1} on:click={handleProductClick(p_names.name, p_names.product_id)}>{p_names.name}</SelectableTile>
          {/each}
        {/if}
      {/key}
    </div>
  </svelte:fragment>
</DraggableModal>

<style>
table {
  text-align: center;
  border: solid 1px lightgrey;
  table-layout: auto;
  min-width: 403px;
  max-width: 100%;
  user-select: none;
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

.price-modal:hover {
  cursor: pointer;
  background-color: var(--cds-hover-ui);
}

.clipboard-buttons > * {
  width: 48px !important;
  height: 48px !important;
}

:global(.selectable-button) {
  min-height: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  width: auto !important;
}

:global(.selectable-button > .bx--tile__checkmark) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  right: 8px !important;
  top: 3px !important;
}

:global(.selectable-button > .bx--tile-content){
  padding-left: 10px;
}

:global(.live-price-modal .bx--modal-content) {
  margin-bottom: 12px !important;
  padding-top: 0px !important;
  padding-left: 12px !important;
}

.clipboard-button:hover{
    background-color: var(--cds-hover-ui);
  }
.clipboard-button:active {
  background-color: var(--cds-active-01);
}
.clipboard-button{
  cursor: pointer;
  background: none;
  color: var(--cds-icon-01, #161616);
  border: none;
  width: 40px;
  height: 40px;
}

</style>