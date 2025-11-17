<script>
  import { createEventDispatcher, onMount } from 'svelte';

  import { Modal, NumberInput, Tag, TextInput, Button } from 'carbon-components-svelte';
  import { ContentSwitcher, Switch } from "carbon-components-svelte";
  import OptionCycler from './Utility/OptionCycler.svelte';
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import AddAlt from "carbon-icons-svelte/lib/AddAlt.svelte";

  import Validator from '../common/validator';
  import { addWhiteboardTenor, addWhiteboardGlobal } from '../common/pref_handler';
  import { getEFPSPS_Dates, shapeToStr, tenorToYear } from "../common/formatting.js";
  import { getRbaRuns } from '../common/rba_handler';
  import products from '../stores/products';
  import user from '../stores/user';
  import brokers from '../stores/brokers.js';
  import DraggableModal from './Utility/DraggableModal.svelte';
  import active_product from '../stores/active_product';
  

  const dispatch = createEventDispatcher();

  export let product_id;
  export let open = false;
  export let global_add = true;
  export let force_tenor_length = 0;
  export let sps_period = null;

  let isFWD;
  let spread_rba = false;
  
  $: permission = user.getPermission($brokers);
  $: global_tenor_change = global_add && permission?.["Edit Global Preferences"];
  $: selectedIndex = !global_tenor_change ? 1 : 0; 

  // $: console.log(product_id);
  
  // For all normal products
  let tenor_to_add = new Validator(product_id);
  let fwd_to_add = new Validator(product_id);

  // For STIR SPS
  let sps_to_add = {period:"3m", fwd:null};

  // For specific dates (RBA OIS, EFP SPS, etc)
  let specific_tenor_to_add = [];
  let spread_tenor_invalid = false;

  function onOpen() {
    isFWD = products.isFwd(product_id);
    tenor_to_add.setProd(product_id);
    if (isFWD) { fwd_to_add.setProd(product_id); }
    spread_rba = product_id == 20 && force_tenor_length == 2;
    if (sps_period) { sps_to_add.period = sps_period + "m"; }
  }

  function tenorList(id = product_id) {
    switch (id) {
      case 17: case 27:
        return getEFPSPS_Dates().map((v, idx) => {
          return {id:idx, text:v.tenor, value:1001+idx}
        });
      case 20:
        return getRbaRuns().map((v, idx) => {return {id:idx, text:v[5], value:1001+idx} });
      default:
        return [];
    }
  }

  function handleAddTenor() {
    if (product_id == 18) {
      const fwd = sps_to_add.fwd/12;
      const period = (+sps_to_add.period.slice(0,1))/12;
      const valid = !!products.getValidSPS().find(f => f[0] === fwd && f[1] === period);
      if (!valid) { return; }
      global_tenor_change ?
        addWhiteboardGlobal(18, period, fwd):
        addWhiteboardTenor(18, period, fwd);
      dispatch("added", {years: period, fwd});
    } else if (products.isStir(product_id) || product_id == 20) {
      if (!specific_tenor_to_add[0] || spread_rba && !specific_tenor_to_add[1]) { spread_tenor_invalid = true; return; }
      global_tenor_change ?
        addWhiteboardGlobal(product_id, specific_tenor_to_add):
        addWhiteboardTenor(product_id, specific_tenor_to_add);
      dispatch("added", {years: specific_tenor_to_add});
    } else {
      tenor_to_add.dirty = true;
      tenor_to_add.setProd(product_id);
      tenor_to_add.invalid = tenor_to_add.isInvalid(Validator.scanTenor);
      if (force_tenor_length && tenor_to_add.value && tenor_to_add.value.length != force_tenor_length) {
        tenor_to_add.invalid = true;
        tenor_to_add.error_message = "Wrong shape. Expected: " + shapeToStr(force_tenor_length-1);
      }
      if (isFWD) {
        fwd_to_add.dirty = true;
        fwd_to_add.setProd(product_id);
        fwd_to_add.invalid = fwd_to_add.isInvalid(Validator.scanFwd);
        if (fwd_to_add.value + tenor_to_add.value?.[0] > 30) {
          fwd_to_add.invalid = true;
          fwd_to_add.error_message = "Combined tenor cannot exceed 30yrs";
        }
      }
      if (tenor_to_add.invalid || isFWD && fwd_to_add.invalid) {
        return;
      }
      global_tenor_change ?
        addWhiteboardGlobal(product_id, tenor_to_add.value, fwd_to_add.value):
        addWhiteboardTenor(product_id, tenor_to_add.value, fwd_to_add.value);
      dispatch("added", {years: tenor_to_add.value, fwd: fwd_to_add.value});
    }
    open = false;
    resetFields();
  }

  function resetFields() {
    tenor_to_add.dirty = true;
    tenor_to_add.reset();
    fwd_to_add.dirty = true;
    fwd_to_add.reset();
    sps_to_add = {period:"3m", fwd:null};
    specific_tenor_to_add = [];
    spread_rba = false;
  }

  $:closeform($active_product);

  function closeform(){
    open = false; 
  }
</script>

<DraggableModal
  bind:open
  heading={`Add ${products.name(product_id)} Tenor to the Whiteboard`}
  style="width: 575px;"
  on:open={onOpen}
  on:submit={() => {handleAddTenor();}}
  on:close={async () => {await new Promise(res => setTimeout(res, 500)); resetFields();}}
>
  <div id="add_tenor_body" slot="body">
    <ContentSwitcher bind:selectedIndex style="margin: 10px 0px;">
      <Switch disabled={!global_add || !permission["Edit Global Preferences"]} on:click={() => {global_tenor_change = true;}}>
        <div style="display: flex; align-items: center;">
          <AddAlt style="margin-right: 0.5rem;" /> Global
        </div>
      </Switch>
      <Switch on:click={() => {global_tenor_change = false;}}>
        <div style="display: flex; align-items: center;">
          <Add style="margin-right: 0.5rem;" /> Personal
        </div>
      </Switch>
    </ContentSwitcher>
    {#if product_id == 18}
      <div class="fields_grid" style="grid-template-columns:160px 260px;" on:keypress|stopPropagation>
        <h5 style="text-align:right">Period:</h5>
        <OptionCycler option_list={["3m", "6m"]} bind:value={sps_to_add.period} initial_value={sps_period+"m"}/>
        {#if product_id == 18}
          <h5 style="text-align:right">Forward (m):</h5>
          <NumberInput hideLabel allowEmpty bind:value={sps_to_add.fwd} min={0} max={24} invalidText="Invalid forward. Value must be between 0 and 24 months."/>
        {/if}
      </div>
    {:else if products.isStir(product_id) || product_id == 20}
      <div class="fields_grid" style="gap:5px 25px; grid-template-columns:1fr 25px 1fr;">
        <div class="tag_list" class:tag_list_spread={spread_rba} style="grid-row:1; grid-column:1/{spread_rba ? '2' : '4'}">
          {#each tenorList(product_id) as tenor, i}
            <Tag
              interactive
              type={spread_tenor_invalid && !specific_tenor_to_add[0] ? "red" : specific_tenor_to_add[0] === tenor.value ? "cyan" : "gray"}
              disabled={spread_rba && i == tenorList().length-1}
              on:click={() => {
                specific_tenor_to_add[0] = (specific_tenor_to_add[0] == tenor.value) ? null : tenor.value;
                if (spread_rba) { specific_tenor_to_add[1] = null; }
                spread_tenor_invalid = false;
              }}
            >{tenor.text}</Tag>
          {/each}
        </div>
        {#if spread_rba}
          <h3 style="grid-column:2; grid-row:1/auto; text-align:center; font-weight:200;">X</h3>
          <div class="tag_list tag_list_spread" style="grid-row:1; grid-column:3;">
            {#each tenorList(product_id) as tenor}
              <Tag
                interactive
                disabled={!specific_tenor_to_add[0] || tenor.value <= specific_tenor_to_add[0]}
                type={spread_tenor_invalid ? "red" : specific_tenor_to_add[1] === tenor.value ? "cyan" : "gray"}
                on:click={() => {
                  specific_tenor_to_add[1] = (specific_tenor_to_add[1] == tenor.value) ? null : tenor.value;
                  spread_tenor_invalid = false;
                }}
              >{tenor.text}</Tag>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <div class="fields_grid" style="grid-template-columns:150px auto; {isFWD ? "margin-bottom:0px;" : ""}" on:keypress|stopPropagation>
        <h5 style="text-align:right">Tenor to be added:</h5>
        <TextInput
          placeholder="Enter the tenor you would like to add to the defaults" 
          bind:value={tenor_to_add.str}
          bind:dirty={tenor_to_add.dirty}
          bind:invalid={tenor_to_add.invalid}
          invalidText={tenor_to_add.error_message}
          />
        {#if isFWD}
          <h5 style="text-align:right">Fwd:</h5>
          <TextInput
            placeholder="Enter the associated forward for the tenor"
            bind:value={fwd_to_add.str}
            bind:dirty={fwd_to_add.dirty}
            bind:invalid={fwd_to_add.invalid}
            invalidText={fwd_to_add.error_message}
            />
        {/if}
      </div>
    {/if}
  </div>
  <div id="add_tenor_footer" slot="footer">
    <Button on:click={handleAddTenor}>
      {global_tenor_change ? "Add Tenor For Everyone" : "Add Tenor"}
    </Button>
  </div>
</DraggableModal>

<style>
  .fields_grid {
    margin: 25px 0 14px;
    display: grid;
    gap: 25px;
    align-items: center;
  }
  .tag_list {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: left;
    & button:first-child {
      margin-left: 0px;
    }
  }
  .tag_list_spread {
    justify-content: center;
    & button {
      margin: 4px 2px;
    }
  }
  :global(#add_tenor_body .bx--content-switcher-btn:disabled) {
    border-color: var(--cds-disabled-02);
  }
  :global(#add_tenor_footer .bx--btn){
    width: -webkit-fill-available;
    max-width: none !important;
  }
  :global(#add_tenor_modal .bx--list-box__menu) {
    max-height: 3.3rem;
  }
  :global(.bx--number input:not([data-invalid])) {
    outline: none !important;
  }
  :global(.bx--number__control-btn.up-icon::after) {
    background-color: rgba(0,0,0,0) !important;
  }
  :global(.bx--number .bx--number__controls button) {
    outline: none !important;
    border: none;
    height: 90%;
  }
  :global(.bx--number .bx--number__rule-divider) {
    background-color: var(--cds-border-strong) !important;
  }
  :global(.bx--number__control-btn::before, .bx--number__control-btn:hover::before, .bx--number__control-btn::after, .bx--number__control-btn:hover::after) {
    background-color: rgba(0,0,0,0);
  }
  :global(#bx--modal-body--add_tenor_modal) {
    margin-bottom: 5px;
  }
</style>

