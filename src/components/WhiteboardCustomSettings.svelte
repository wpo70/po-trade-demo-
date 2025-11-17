<script>
  'use strict;'

  import { createEventDispatcher, tick } from "svelte";
  
  import { Button, Checkbox, Modal, Tag, TextInput, TooltipDefinition, InlineLoading } from "carbon-components-svelte";
  import CustomComboBox from "./Utility/CustomComboBox.svelte";
  import WhiteboardAddTenorModal from "./WhiteboardAddTenorModal.svelte";
  import Edit from "carbon-icons-svelte/lib/Edit.svelte";
  import Send from "carbon-icons-svelte/lib/Send.svelte";
  import Information from "carbon-icons-svelte/lib/Information.svelte";
  import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
  import AddLarge from "carbon-icons-svelte/lib/AddLarge.svelte";

  import { genericToTenor, shapeToStr } from "../common/formatting.js";
  import custom_whiteboards, { selected_custom_wb } from "../stores/custom_whiteboards";
  import prices from "../stores/prices";
  import products from "../stores/products";
  import currency_state from "../stores/currency_state";
  import brokers from "../stores/brokers";

  const dispatch = createEventDispatcher();

  export let open;
  export let selected;
  export let leftmost;
  export let rightmost;
  
  let custom_wb_form = undefined;
  let openConfDel = false;
  let editName = false;
  let invalid_blueprint = false;
  let awaiting_save = null;
  let reorder_lockout = false;
  let share = {recipient: undefined, invalid: false, sel_id: undefined};
  let share_btn;
  let add_tenor = null;

  $: if (selected === null) {
    selected = {
      name:"New Custom Board",
      prices_blueprint:[[{product_id:undefined, shape:undefined, tenors:[]}]],
      indicators:[],
      lives_only:false, 
      show_ticker:false,
    }
  }

  function validateSave() {
    if (invalid_blueprint) { return false; }
    let found = [];
    let dupes = false;
    selected.prices_blueprint.forEach(col => {
      col.forEach(block => {
        if (block.product_id == undefined || block.shape == undefined) {
          dupes = true;
          block.inv_text = "Please make a selection or remove this block/column to save.";
          return;
        }
        if (-1 !== found.findIndex(find => (find.product_id === block.product_id && find.shape === block.shape))) {
          dupes = true;
          block.dupe = true;
          block.inv_text = "This is a duplicate block. Please ensure every block across all columns is unique.";
          return;
        }
        found.push({product_id: block.product_id, shape: block.shape});
        delete block.dupe;
        delete block.inv_text;
        block = block;
      });
    });
    selected.prices_blueprint = selected.prices_blueprint;
    if (dupes) {
      invalid_blueprint = true;
      return false;
    }
    let f_prods = found.map(block => block.product_id);
    selected.indicators = selected.indicators.filter(indi => f_prods.includes(indi));
    return true;
  }

  function handleSaveWB() {
    if (!validateSave()) { return; }
    let resp = custom_whiteboards.addUpdateWB(structuredClone(selected));
    if (resp === false) {
      console.error("An error occurred while saving the whiteboard settings.");
    } else if (resp) {
      finishSaveWB();
    } else {
      awaiting_save = $selected_custom_wb.board_id;
    }
  }
  
  $: if (awaiting_save !== null && awaiting_save != $selected_custom_wb.board_id) { finishSaveWB(); } // When db returns new board with id, store will be updated and the save process can be finished
  function finishSaveWB() {    
    open = false;
    awaiting_save = null;
  }

  function handleDelete() {
    custom_whiteboards.deleteWB(selected);
    openConfDel = false;
    open = false;
  }

  async function handleShare() {
    document.activeElement.blur();
    if (!share.recipient) {
      share.invalid = true;
    } else {
      if (!validateSave()) {
        share_btn.animate([
            {backgroundPosition:"100% 0, 0% 100%, 0 0, 100% 100%, 0 0", color:'var(--cds-danger)', '--grad_col':'var(--cds-support-error)'},
            {color:'var(--cds-danger)', '--grad_col':'var(--cds-support-error)'}
          ],{duration: 450, iterations: 3});
        await tick();
        custom_wb_form.querySelector('.is_invalid')?.scrollIntoView({behavior:"smooth", block:"center"});
        return;
      }
      selected_custom_wb.share(structuredClone(share.recipient), structuredClone(selected));
      share_btn.animate([{backgroundPosition:"100% 0, 0% 100%, 0 0, 100% 100%, 0 0"}],{duration: 450, iterations: 3});
      share_btn.lastElementChild.animate([
          { transform:'translate(0rem, 0)', color:"var(--cds-icon-primary)", easing: "ease-in-out" },
          { transform:'translate(-0.6rem, 0) scaleY(1.1)', offset:0.15, easing: "ease-in-out" },
          { transform:'translate(-0.6rem, 0) scaleY(1.2)', color:"var(--cds-icon-primary)", offset:0.2, easing: "ease-in-out" },
          { transform:'translate(-0.6rem, 0) rotate(-40deg) scaleY(0.85)', opacity:"1", offset:0.3, easing: "ease-in-out" },
          { transform:'translate(0.9rem, -2.2rem) rotate(-40deg) scaleY(0.75)', offset:0.8, easing: "ease-in-out" },
          { transform:'translate(0.9rem, -2.2rem) rotate(-40deg) scaleY(1)', opacity:"0", offset:0.9 },
          { transform:'translate(0, 0.1rem)', opacity:"0", offset:0.91 },
          { transform:'translate(0, 0)', opacity:"1", color:"inherit", easing: "ease-in-out" }
        ], {duration: 1300,iterations: 1});
      await new Promise(res => setTimeout(res, 1200));
      share = {recipient: undefined, invalid: false, sel_id: undefined};
    }
  }
  
  async function reorderTab(dir) {
    dispatch("shift_tab", {dir});
    // Associated query should not be called too regularly. Can handle as low as 200, but seems unnecessary to be that fast
    reorder_lockout = true;
    await new Promise(res => setTimeout(res, 750));
    reorder_lockout = false;
  }

  function addCol() {
    selected.prices_blueprint = selected.prices_blueprint.concat([[{product_id:undefined, shape:undefined, tenors:[]}]]);
  }

  function removeCol(col_idx) {
    if (selected.prices_blueprint.length > 1) {
      selected.prices_blueprint.splice(col_idx, 1);
      selected = selected;
    }
  }

  async function reorderCol(col_idx, relative) {
    [selected.prices_blueprint[col_idx], selected.prices_blueprint[col_idx+relative]] = [selected.prices_blueprint[col_idx+relative], selected.prices_blueprint[col_idx]];
    await tick();
    custom_wb_form.querySelector(`div[col_idx='${col_idx+relative}']`)?.scrollIntoView({behavior:"smooth", block:"center"});
  }
  
  function addBlock(col_idx) {
    selected.prices_blueprint[col_idx] = selected.prices_blueprint[col_idx].concat([{product_id:undefined, shape:undefined, tenors:[]}]);
  }
  
  function removeBlock(col_idx, block_idx) {
    if (selected.prices_blueprint[col_idx].length > 1) {
      selected.prices_blueprint[col_idx].splice(block_idx, 1);
      selected = selected;
    }
  }

  function handleTenorAdd(e) {
    if (add_tenor.tenors.length) {
      let { years, fwd } = e.detail;
      add_tenor.tenors = add_tenor.tenors.concat(genericToTenor({product_id: add_tenor.product_id, years, fwd}), true);
    }
  }

  function handleArrayIncl(array, obj) {
    if (array.includes(obj)) {
      return array.filter(f => f != obj);
    } else {
      array.push(obj);
      return array;
    }
  }

  function getShapeList(prod) {
    if (!prod || prod < 1) {
      return [];
    } else if (products.isFwd(prod)) {
      return [{id:0, shape:0, text:"Outright (FWD)"}];
    } else if (prod == 18) {
      let ret = [];
      for (let f = 0, idx = 0; f < 25 && idx < 50; f++) {
        let str = f + "x";
        ret.push({id:idx++, shape:f, text:str+(f+3)});
        ret.push({id:idx++, shape:f+25, text:str+(f+6)});
      }
      return ret;
    } else {
      return $prices[prod].map((sh, si) => sh.length || si == 0 ? {id:si, shape:si, text:shapeToStr(si)} : null).filter(f => f != null);
    }
  }
</script>

<Modal
  bind:open
  id="custom_wb_settings_modal"
  modalHeading="{selected?.id ? "Edit" : "Add"} Custom Whiteboard"
  preventCloseOnClickOutside
  primaryButtonText="Confirm"
  primaryButtonIcon={!awaiting_save ? undefined : InlineLoading}
  secondaryButtons={[{text: selected?.board_id == undefined ? null : "Delete Whiteboard"}, {text: "Cancel"}].filter(f => f.text != null)}
  on:click:button--secondary={({ detail:{text} }) => {
    if (text === "Delete Whiteboard") { openConfDel = true; }
    if (text === "Cancel") { open = false; }
  }}
  on:close={async () => {
    add_tenor = null;
    await new Promise(res => setTimeout(res, 300));
    dispatch("close");
    invalid_blueprint = false;
    share = {recipient: undefined, invalid: false, sel_id: undefined};
  }}
  on:submit={(e) => {
    e.preventDefault();
    handleSaveWB();
  }}

  >
  <div id="custom_wb_form" bind:this={custom_wb_form} on:keypress|stopPropagation>
    {#if selected}
      <div class="form_section">
        <h5>Board Options</h5>
        <div class="board_options">
          <h6 style="grid-row:1; grid-column:1;">Name:</h6>
          {#if editName}
            <div style="grid-row:1; grid-column:2;">
              <TextInput
                id="custom_wb_name_input" hideLabel size="sm"
                autofocus autocomplete="off"
                bind:value={selected.name} 
                on:blur={() => {editName = false;}} 
                on:keydown={(e) => {if (e.key == "Enter") { editName = false; e.stopPropagation(); }}}
                />
            </div>
          {:else}
            <div class="name_field" on:click={() => {editName = true;}}>
              <p style="padding:5px 1rem 5px 8px;">{selected.name}</p>
              <Edit size={19} style="transition: color 125ms cubic-bezier(0.2, 0, 0.38, 0.9);"/>
            </div>
          {/if}
          <h6 style="grid-row:2; grid-column:1; line-height:1.5;">Include&nbsp;Futures Ticker&nbsp;Bar:</h6>
          <Checkbox hideLabel bind:checked={selected.show_ticker} style="grid-row:2; grid-column:2; margin-bottom:0;"/>
          <h6 style="grid-row:3; grid-column:1; line-height:1.5;">Show&nbsp;Live Tenors&nbsp;Only:</h6>
          <Checkbox hideLabel bind:checked={selected.lives_only} style="grid-row:3; grid-column:2; margin-bottom:0;"/>
          {#if selected.board_id}
            <h6 style="grid-row:1; grid-column:3;">Reorder Tab:</h6>
            <div style="grid-row:1; grid-column:4; margin-bottom:0; display:flex; justify-content:space-between;">
              <button class="bx--btn bx--btn--sm bx--btn--ghost reorder_btn tab_reorder_btn" disabled={leftmost || reorder_lockout} on:click={()=>{reorderTab(-1)}}>
                <ChevronUp style="transform:rotate(270deg)"/>
              </button>
              <button class="bx--btn bx--btn--sm bx--btn--ghost reorder_btn tab_reorder_btn" disabled={rightmost || reorder_lockout} on:click={()=>{reorderTab(1)}}>
                <ChevronUp style="transform:rotate(90deg)"/>
              </button>
            </div>
            <h6 style="grid-row:2; grid-column:3;">Share Board:</h6>
            <div style="grid-row:2; grid-column:4; z-index:1;">
              <CustomComboBox
                size="sm"
                items={brokers.generateRecipientsList()}
                bind:selectedId={share.sel_id}
                invalid={share.invalid}
                invalidText={"Please select a broker you would like to share this whiteboard with."}
                on:select={({detail:{selectedItem}}) => {share.invalid = false; share.recipient = selectedItem.broker;}}
                />
            </div>
            <button
              bind:this={share_btn}
              class="bx--btn bx--btn--sm bx--btn--tertiary share_btn"
              disabled={!share.sel_id}
              on:click={handleShare}
              >
              Share&nbsp;<Send/>
            </button>
          {/if}
        </div>
      </div>
      <div class="form_section">
        <h5>Board Layout</h5>
        <div id="prices_blueprint">
          {#each selected.prices_blueprint as col, col_idx}
            <div class="col" {col_idx} on:click={() => {invalid_blueprint = false;}}>
              <button class="bx--btn bx--btn--sm bx--btn--ghost group_title strike_btn" class:no_strike={selected.prices_blueprint.length < 2} style="margin-bottom:0;" on:click={()=>{removeCol(col_idx)}}>
                <h6 class="group_title_strike">Column</h6>
              </button>
              <button class="bx--btn bx--btn--sm bx--btn--ghost reorder_btn" disabled={col_idx == 0} on:click={()=>{reorderCol(col_idx, -1)}}>
                <ChevronUp/>
              </button>
              <button class="bx--btn bx--btn--sm bx--btn--ghost reorder_btn" disabled={col_idx == selected.prices_blueprint.length-1} on:click={()=>{reorderCol(col_idx, 1)}}>
                <ChevronUp style="transform:rotate(180deg)"/>
              </button>
              {#each col as block, block_idx ((block.product_id||0)*10 + (block.shape||0) + block_idx*0.1)}
                <div class="block">
                  <button class="bx--btn bx--btn--sm bx--btn--ghost group_title strike_btn" class:no_strike={col.length < 2} on:click={()=>{removeBlock(col_idx, block_idx)}}>
                    <h6 class="group_title_strike">Block</h6>
                  </button>
                  <div class="block_details">
                    <div class="block_details_option" style="grid-column:1;">
                      <CustomComboBox
                        titleText="Product"
                        size="sm"
                        items={$products.filter(p => p.currency_code == $currency_state).map(p => {return {id:p.product_id, text:p.product}})}
                        bind:selectedId={block.product_id}
                        on:select={() => {block.tenors = []; block.shape = undefined;}}
                        invalid={invalid_blueprint && (block.product_id == undefined || block.dupe)}
                        />
                    </div>
                    <div class="block_details_option" style="grid-column:2;">
                      <CustomComboBox
                        titleText="Shape"
                        size="sm"
                        items={getShapeList(block.product_id||0)}
                        disabled={!block.product_id}
                        initialSelectedId={block.shape == undefined ? undefined : getShapeList(block.product_id).find(f => f.shape === block.shape)?.id}
                        on:select={({detail:{selectedItem}}) => {block.shape = selectedItem.shape; block.tenors = []; block.nonpersists = false;}}
                        invalid={block.product_id && invalid_blueprint && (block.shape == undefined || block.dupe)}
                        />
                    </div>
                    <div class="block_details_option" style="grid-column:3; justify-self:right;">
                      <button
                        class="bx--btn bx--btn--secondary" class:cyan_btn={selected.indicators.includes(products.nonFwd(block.product_id))}
                        style="padding:10px; min-height:2.5rem;"
                        disabled={!block.product_id || block.shape == undefined}
                        on:click={() => {selected.indicators = handleArrayIncl(selected.indicators, products.nonFwd(block.product_id));}}
                      >
                        Include in Indicators
                      </button>
                    </div>
                    <span class="error_text" class:is_invalid={invalid_blueprint && (block.product_id == undefined || block.shape == undefined || block.dupe)}>{block.inv_text}</span>
                    <div class="block_details_tags" on:click={() => {if (!block.tenors.length) { block.nonpersists = false; }}}>
                      {#if !block.product_id || block.shape == undefined}
                        Please select a product and shape 
                      {:else}
                        <TooltipDefinition
                          direction="top"
                          align="start"
                          style="margin-bottom: 5px;"
                          >
                          Tenors<Information style="margin-left:0.25rem; margin-bottom:2px;"/>
                          <span slot="tooltip">
                            {"Click on the tenors to choose which are included in the block."}<br/><br/>
                            {"If no tenors are selected, the block will include all tenors, including dynamic tenors."}<br/><br/>
                            {"Dynamic tenors - or non-default tenors - are the tenors which are shown in the whiteboard only when they have an order."}
                            {#if block.product_id == 18}
                              <br/><br/>
                              {"As SPS has specific dates, selecting specfic tenors will also cause this block to follow them. "}
                              {"That is, when the month rolls over, the forward will be reduced so that the selected date is still visible."}
                            {:else if [17, 20].includes(block.product_id)}
                              <br/><br/>
                              {"As this is a product with specific dates, narrowed selections will be displayed until these dates are no longer valid."}
                              {"After this point, the block will reset to show all tenors (as though none were selected)."}
                            {/if}
                          </span>
                        </TooltipDefinition><br/>
                        {#each $prices[block.product_id][block.shape]?.filter(pg => pg.persist).map(pg => pg.tenor) ?? [] as tenor}
                          <Tag
                            interactive
                            type={block.tenors.includes(tenor) ? "cyan" : "gray"}
                            on:click={() => {block.tenors = handleArrayIncl(block.tenors, tenor);}}
                          >{tenor}</Tag>
                        {/each}
                        {#if !products.isStir(block.product_id)}
                          <Tag
                            interactive
                            disabled={!block.tenors.length}
                            type={block.nonpersists ? "cyan" : "gray"}
                            on:click={() => {block.nonpersists = !block.nonpersists}}
                          >Dynamic Tenors</Tag>
                          <Tag
                            interactive
                            type={"gray"}
                            style="line-height: 0;"
                            on:click={() => {add_tenor = block;}}
                          ><AddLarge/></Tag>
                        {/if}
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
              {#if col.length < 6}
                <div class="block">
                  <button class="bx--btn bx--btn--sm bx--btn--ghost group_title" on:click={()=>{addBlock(col_idx)}}>
                    <h6 style="font-weight:500;">Add Block</h6>
                  </button>
                </div>
              {/if}
            </div>
          {/each}
          <div class="col">
            <button class="bx--btn bx--btn--sm bx--btn--ghost group_title" on:click={addCol}>
              <h6>Add Column</h6>
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<Modal
  danger
  id="delete_wb_modal"
  size="sm"
  bind:open={openConfDel}
  modalHeading="Delete Custom Whiteboard?"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  on:click:button--secondary={() => {openConfDel = false;}}
  on:submit={handleDelete}
  >
  <p>{selected?.name} will be deleted permanently. This action cannot be undone.</p>
</Modal>

<WhiteboardAddTenorModal open={!!add_tenor} product_id={add_tenor?.product_id} global_add={false} force_tenor_length={add_tenor?.shape+1} on:added={handleTenorAdd}/>


<style>
  :global(#custom_wb_settings_modal .bx--modal-footer--three-button button:first-child) {
    margin-right: auto;
    background-color: var(--cds-danger-01, #da1e28);
    color: var(--cds-text-04, #ffffff);
    &:hover {
      background-color: var(--cds-hover-danger, #b81921);
    }
  }
  .form_section {
    margin: 0 2rem 0.75rem;
  }
  .form_section h5:first-of-type {
    margin-left: -2rem;
    font-weight: 400;
    margin: 0rem 0 0.25rem -2rem;
  }
  .board_options {
    margin: 0.5rem 0 0.25rem;
    display: grid;
    align-items: center;
    grid-template-columns: minmax(min-content, 22%) 6fr minmax(max-content, 11%) 5fr;
    gap: 0.5rem 2.5rem;
  }
  .name_field {
    grid-row: 1;
    grid-column: 2;
    display: flex;
    align-items: center;
    margin-right: auto;
    margin-left: -5px;
    color: var(--cds-text-02);
    transition: color 125ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:hover {
      color: var(--cds-text-primary) !important;
    }
  }
  :global(.name_field:not(:hover) svg) {
    color:var(--cds-ui-01);
  }
  .share_btn {
    --share_bg: inherit;
    --grad_col: white;
    grid-row: 3;
    grid-column: 4;
    padding-right: 12px;
    border: none;
    background: linear-gradient(to left, var(--grad_col) 33.33%, var(--cds-ui-01) 40%, var(--cds-ui-01) 50%, var(--grad_col) 66.66%) 0 0 repeat-x,
      linear-gradient(to right, var(--grad_col) 33.33%, var(--cds-ui-01) 40%, var(--cds-ui-01) 50%, var(--grad_col) 66.66%) 100% 100%  repeat-x,
      linear-gradient(to top, var(--grad_col) 33.33%, var(--cds-ui-01) 40%, var(--cds-ui-01) 50%, var(--grad_col) 66.66%) 0 100% repeat-y,
      linear-gradient(to bottom, var(--grad_col) 33.33%, var(--cds-ui-01) 40%, var(--cds-ui-01) 50%, var(--grad_col) 66.66%) 100% 0 repeat-y;
    background-size: 300% 1px, 300% 1px, 1px 300%, 1px 300%;
    background-color: var(--share_bg);
	  transition: background-image 1300ms linear, all 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
    &:disabled {
      cursor: default;
      background-color: inherit;
      --grad_col: var(--cds-disabled-02);
      background-size: 300% 1px, 300% 1px, 1px 300%, 1px 300%;
    }
    &:hover {
      --share_bg: var(--cds-background-inverse);
    }
  }
  .col {
    background-color: var(--cds-ui-02);
    border: 1px solid var(--cds-border-strong);
    margin-bottom: -1px;
  }
  .block {
    margin: 0 2rem;
    &:not(:last-child) {
      border-bottom: 1px solid var(--cds-border-subtle-selected);
    }
  }
  .block_details {
    margin: 0.25rem 0 0.5rem 2rem;
    display: grid;
    grid-template-columns: 35% 35% auto;
    gap: 10px 15px;
  }
  .block_details_option {
    grid-row: 1;
    align-self: end;
    & .bx--form-requirement {
      display: none;
    }
  }
  .cyan_btn {
    background-color: var(--cds-tag-background-cyan);
    color: var(--cds-tag-color-cyan);
    &:hover {
      background-color: var(--cds-tag-hover-cyan);
    }
  }
  .error_text {
    grid-row: 2;
    grid-column: 1/4;
    font-size: var(--cds-caption-01-font-size, 0.75rem);
    font-weight: var(--cds-caption-01-font-weight, 400);
    line-height: var(--cds-caption-01-line-height, 1.33333);
    letter-spacing: var(--cds-caption-01-letter-spacing, 0.32px);
    color: var(--cds-text-error);
    display: none;
    &.is_invalid {
      margin-bottom: 5px;
      display: block;
    }
  }
  .block_details_tags {
    grid-row: 3;
    grid-column: 1/4;
    margin: 0 0 10px;
    &>button {
      margin-left: 0;
    }
    & .bx--tooltip__trigger {
      color: var(--cds-text-02);
    }
    & .bx--assistive-text {
      max-width: 25rem;
    }
  }
  .group_title {
    cursor: pointer;
    color:var(--cds-text-primary);
    padding:3px 7px;
    margin: 5px;
  }
  .group_title_strike {
    width: max-content;
    background-image: linear-gradient(currentColor, currentColor);
    background-repeat: no-repeat;
    background-position: center left;
    background-size: var(--strike) 2px;
    transition: background-size 250ms cubic-bezier(0.55, 0.1, 0.45, 0.9);
  }
  .strike_btn {
    --strike: 0%;
    &.no_strike:hover {
      --strike: 0%;
      cursor: default;
      background-color: var(--cds-ui-02);
    }
    &:hover {
      --strike: 100%;
    }
  }
  .reorder_btn {
    cursor: pointer;
    color: var(--cds-text-primary);
    padding: 0px 13px;
    margin: 5px 5px 0px;
    &:disabled {
      cursor: default;
      color: var(--cds-disabled-02);
    }
    &:nth-child(2){
      margin-right: 0px;
    }
    &:last-of-type{
      margin-left: 0px;
    }
  }
  .tab_reorder_btn {
    margin: 0px;
    padding: 1px 5px;
    width: 45%;
    justify-content: center;
    &:not(:disabled) {
      border: 1px solid var(--cds-interactive-03);
    }
  }
  #prices_blueprint button {
    border: none;
    box-shadow: none;
  }

  :global(#custom_wb_settings_modal.bx--modal){
    z-index:500;
  }
</style>
