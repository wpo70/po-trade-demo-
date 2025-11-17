<script>
  import { createEventDispatcher } from 'svelte';
  
  import WhiteboardAddTenorModal from './WhiteboardAddTenorModal.svelte';
  import QuickOrderForm from './QuickOrderForm.svelte';

  import { ContextMenu, ContextMenuDivider, ContextMenuOption } from 'carbon-components-svelte';
  import RowInsert from "carbon-icons-svelte/lib/RowInsert.svelte";
  import RowDelete from "carbon-icons-svelte/lib/RowDelete.svelte";
  import Subtract from "carbon-icons-svelte/lib/Subtract.svelte";
  import SubtractAlt from "carbon-icons-svelte/lib/SubtractAlt.svelte";
  import DocumentAdd from "carbon-icons-svelte/lib/DocumentAdd.svelte";
  import ChartDualYAxis from "carbon-icons-svelte/lib/ChartDualYAxis.svelte";
  import Star from "carbon-icons-svelte/lib/Star.svelte";
  import StarFilled from "carbon-icons-svelte/lib/StarFilled.svelte";

  import { removeWhiteboardTenor, removeWhiteboardGlobal, removeFavourite, addFavourite } from '../common/pref_handler';
  import { efpspsToDate, getEFPSPS_Thursday } from '../common/formatting';

  import preferences from '../stores/preferences';
  import active_product from '../stores/active_product';

  import products from '../stores/products';
  import user from '../stores/user';
  import brokers from '../stores/brokers.js';

  const dispatch = createEventDispatcher();

  // This block of code ensures that the values of the ctx menu do not change when the mouse hovers over another cell while it is open
    // (pg and cc change when hovering over another price table)
  export let pg = {};
  export let cc = [];
  let ctx_pos = { x: undefined, y: undefined };
  $: updateVars(ctx_pos);
  function updateVars() {
    price_group = pg ??= price_group;
    centre_cells = cc ??= centre_cells;
    specific_sps = !!centre_cells[0]?.closest(".sps");
  }

  let price_group = {};
  let centre_cells = [];
  let specific_sps = false;
  let ctx_open = false;
  let ref;
  export let ctx_id = null;
  export let target_cells = [];

  $: has_order = centre_cells[0]?.previousElementSibling.hasChildNodes()
      || centre_cells[0]?.nextElementSibling.hasChildNodes()
      || price_group.product_id == 18 && centre_cells[0]?.classList.contains("expandable");
  $: is_favourite = $active_product != 18 && price_group?.product_id && price_group.years ? preferences.isFavourite(price_group.product_id, price_group.years, price_group.fwd) : false;
  
  $: permission = user.getPermission($brokers);
  $: global_tenor_change = permission?.["Edit Global Preferences"];
  let at_modal_open = false;
  
  let quick_order_form;
  let selected = null;

  let adding_order = false;
  let timeout;
  const triggerOfferBid = () => {adding_order = true};
  const untriggerOfferBid = () => {adding_order = false};

  function quickOrder(bid) {
    selected = {};
    let t_text = centre_cells[0].firstChild.data;
    selected.years = price_group.years;
    selected.price = price_group.mid_point;
    selected.order_id = 0;
    selected.product_id = price_group.product_id;
    selected.firm = true;
    selected.canExpressInterest = true;
    selected.bid = bid;
    if (price_group.product_id === 17) {  // EFP SPS
      let d = efpspsToDate(t_text);
      selected.start_date = getEFPSPS_Thursday(d.getMonth()+1, d.getFullYear());
    } else if (price_group.product_id === 27) {  // EFP SPS
      let d = efpspsToDate(t_text);
      selected.start_date = getEFPSPS_Thursday(d.getMonth()+1, d.getFullYear());
    } else if (price_group.product_id === 18) {   // IRS SPS
      if (t_text.includes("/")) {
        selected.start_date = new Date(price_group.tenor);
      } else {
        selected.fwd = price_group.fwd;
      }
      if (isNaN(selected.price)) { selected.price = 0; }
    } else if (products.isFwd(price_group.product_id)) {   // FWD IRS
      selected.fwd = price_group.fwd;
    } else {  // Other whiteboard products
      delete selected.order_id;
    }
    quick_order_form.open();
  }
</script>

<!-- CARBON CONTEXT MENU -->
<ContextMenu
  id={ctx_id}
  name="priceTableCtxMenu"
  target={target_cells} 
  bind:open={ctx_open}
  bind:x={ctx_pos.x}
  bind:y={ctx_pos.y}
  bind:ref
  on:open={() => {
      if (ref.getBoundingClientRect().right > window.innerWidth - 220) {
        let flyouts = ref.querySelectorAll("ul[data-level='2']");
        flyouts.forEach(f => {
          f.style.left = (ref.getBoundingClientRect().left - f.getBoundingClientRect().width) + "px";
        });
      }
    }}
  > 
  {#if !adding_order}
    <ContextMenuOption
      icon={DocumentAdd}
      id="add_order"
      indented
      labelText="Add Order"
      disabled={permission["View Only"]}
      on:mouseenter={() => {if(!permission["View Only"]){timeout = setTimeout(triggerOfferBid, 200)}}}
      on:mouseleave={() => clearTimeout(timeout)}
      on:click={() => {quickOrder(false);}}
    />
  {:else}
    <div style="display: flex;" class="bid_offer_buttons" on:mouseleave={() => timeout = setTimeout(untriggerOfferBid, 300)}>
      <ContextMenuOption
        style="width: 50%;"
        id="Offer"
        labelText="Offer"
        on:click={() => {quickOrder(false);}}
      />
      <ContextMenuOption
        style="width: 50%; border-left: 1px solid #525252;"
        id="Bid"
        labelText="Bid"
        on:click={() => {quickOrder(true);}}
      />
    </div>
  {/if}
  {#if ![17, 18, 27].includes(price_group.product_id)}
    <ContextMenuDivider/>
    {#if is_favourite}
      <ContextMenuOption
        id="remove_favourite"
        indented
        icon={StarFilled}
        labelText="Unfavourite Tenor"
        on:click={() => {removeFavourite(price_group.product_id, price_group.years, price_group.fwd); dispatch("changed");}}
        />
    {:else}
      <ContextMenuOption
        id="add_favourite"
        indented
        icon={Star}
        labelText="Favourite Tenor"
        on:click={() => {addFavourite(price_group.product_id, price_group.years, price_group.fwd); dispatch("changed");}}
        />
    {/if}
  {/if}
  <ContextMenuDivider/>
  <ContextMenuOption
    id="price_history"
    indented
    icon={ChartDualYAxis}
    disabled={!permission["Edit Global Preferences"]}
    labelText="Price History"
    on:click={() => dispatch("get_history", {price_group})}
  />
  {#if $active_product != -1 && price_group.product_id != 18 || price_group.product_id == 18 && !specific_sps}
    <ContextMenuDivider/>
    <ContextMenuOption
      indented
      icon={RowInsert}
      labelText="Add Default Tenor"
      on:click={() => {global_tenor_change = permission["Edit Global Preferences"]; at_modal_open = true;}}
      >
    </ContextMenuOption>
    {#if !has_order}
      <ContextMenuOption
        indented
        icon={RowDelete}
        labelText={`Remove '${centre_cells[0]?.firstChild.data}'`}
        >
        <ContextMenuOption
          id="remove_tenor"
          indented
          icon={Subtract}
          kind="danger"
          labelText="Just Me"
          on:click={(e) => {removeWhiteboardTenor(price_group.product_id, price_group.years, price_group.fwd); dispatch("changed");}} 
          />
        <ContextMenuOption
          id="remove_global_tenor"
          indented
          icon={SubtractAlt}
          kind="danger"
          disabled={!permission["Edit Global Preferences"]}
          labelText="Everyone"
          on:click={() => {removeWhiteboardGlobal(price_group.product_id, price_group.years, price_group.fwd); dispatch("changed");}}
          />
      </ContextMenuOption>
    {:else}
      <ContextMenuOption indented disabled icon={RowDelete} labelText="Cannot Remove Tenor with Order"/>
    {/if}
  {/if}
</ContextMenu>

<!-- QUICK ORDER MODAL -->
<QuickOrderForm bind:qorder={quick_order_form} on:server_error={() => {console.log("Server error occurred with quick order.");}} {selected} />

<!-- ADD TENOR MODAL -->
<WhiteboardAddTenorModal
  bind:open={at_modal_open}
  product_id={price_group.product_id}
  sps_period={price_group.product_id == 18 && price_group.years[0]*12}
  on:added={() => {dispatch("changed");}}
/>

<style>
  :global(.bid_offer_buttons .bx--menu-option__info) {
    margin-left: 0;
  }
  :global(.bid_offer_buttons .bx--menu-option__label) {
    text-align: center;
  }
</style>
