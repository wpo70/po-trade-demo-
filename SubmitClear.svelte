<script>
  import { Button } from "carbon-components-svelte";
  import { createEventDispatcher } from 'svelte';
  import { getReference } from "../../../common/calculations";
  import { timestampToISODate } from "../../../common/formatting";
  import brokers from "../../../stores/brokers";
  import user from "../../../stores/user";
  import products from "../../../stores/products";
  import Validator from "../../../common/validator";
  import websocket from "../../../common/websocket";

  export let fields;
  export let selected;
  export let rbaTenors;

  const dispatch = createEventDispatcher();

  let permission;
  let errors = {}; // Pretty sure this isnt used
  
  $: permission = user.getPermission($brokers);

  function handleSubmit() {
    // Make sure a valid tenor was chosen.
    fields.tenor.setProd(fields.product);
    fields.tenor.dirty = true;
    fields.tenor.invalid = fields.tenor.isInvalid(Validator.scanTenor);

    if (fields.isFWD) {
      fields.fwd.setProd(fields.product);
      fields.fwd.dirty = true;
      fields.fwd.invalid = fields.fwd.isInvalid(Validator.scanFwd);
    }

    if (fields.specific) {
      fields.start.dirty = true;
      fields.start.invalid = fields.start.isInvalid(Validator.scanDate);
    }

    if (fields.isFWD && !fields.fwd.invalid && !fields.tenor.invalid && fields.fwd.value + fields.tenor.value[0] > 30) {
      fields.fwd.invalid = true;
      fields.fwd.error_message = "Combined tenor cannot exceed 30yrs";
    }
    
    // Ignore the submit event if invalid.
    if (fields.tenor.invalid || fields.isFWD && fields.fwd.invalid || (fields.start.invalid && fields.product != 20)) return;
      
    if(!fields.interest) {
      if(fields.offer_selector !== 'two'){
        fields.price.dirty = true;
        fields.price.invalid = fields.price.isInvalid(Validator.scanPrice);
      } else {
        fields.bid_price.dirty = true;
        fields.bid_price.invalid = fields.bid_price.isInvalid(Validator.scanPrice);
        fields.offer_price.dirty = true;
        fields.offer_price.invalid = fields.offer_price.isInvalid(Validator.scanPrice);
      }
      
      // If is order validate price and volume.
      // If any of the data has not been edited it will be clean only because it is not dirty.
      // Apply the checks without checking they are dirty as well.  Doing so also creates the
      // values from the strings.  Submitting implicitly make all fields dirty.
      fields.tenor.dirty = true;
      fields.volume.dirty = true;
      if (!parseFloat(fields.volume.str)) {dispatch("setDefaultDv01"); dispatch("tenorSet");};
      fields.volume.invalid = fields.volume.isInvalid(Validator.scanVolume);
    } else {
      if(fields.offer_selector !== 'two'){
        if(fields.price.str?.length > 0){
          fields.price.dirty = true;
          fields.price.invalid = fields.price.isInvalid(Validator.scanPrice);
        } else {
          fields.price.dirty = true;
          fields.price.value = null;
          fields.price.invalid = false;
        }
      }
      else {
        if(fields.bid_price.str?.length > 0) {
          fields.bid_price.dirty = true;
          fields.bid_price.invalid = fields.bid_price.isInvalid(Validator.scanPrice);
        } else {
          fields.bid_price.dirty = true;
          fields.bid_price.value = null;
          fields.bid_price.invalid = false;
        }
        if(fields.offer_price.str?.length > 0){
          fields.offer_price.dirty = true;
          fields.offer_price.invalid = fields.offer_price.isInvalid(Validator.scanPrice);
        } else {
          fields.offer_price.dirty = true;
          fields.offer_price.value = null;
          fields.offer_price.invalid = false;
        }
      }
    }

    if (fields.rba.rbaLeg1Index == -1) fields.rba.invalidRBA1 = true;
    else fields.rba.invalidRBA1 = false;
    if (fields.rba.rbaLeg2Index == -1 && fields.rba.secondleg) fields.rba.invalidRBA2 = true;
    else fields.rba.invalidRBA2 = false;
    fields.dv01.invalid = fields.dv01.value == 0;
    // If any of the data is invalid, ignore the submit event.
    let p20 = fields.product == 20;
    if (fields.offer_selector !== 'two') {
      if ((fields.tenor.invalid && !p20) || (fields.rba.invalidRBA1 || (fields.rba.invalidRBA2 && fields.rba.secondLeg)) && p20 || fields.price.invalid
        || (!fields.interest && fields.volume.invalid) || !fields.product) return;
    } else {
      if ((fields.tenor.invalid && !p20) || (fields.rba.invalidRBA1 || (fields.rba.invalidRBA2 && fields.rba.secondLeg)) && p20 || fields.offer_price.invalid
        || fields.bid_price.invalid || (!fields.interest && fields.volume.invalid) || !fields.product) return;
    }
    // Make sure a trader was chosen.
    if (typeof fields.trader.id === 'undefined') {
      errors.trader = 'A trader must be selected';
      fields.trader.invalid = true;
      return;
    }
    
    // If the volume is negative convert the value to minimum market parcel.
    let ap = fields.product;
    let vol = fields.volume.value <= 0 ? fields.volume_mmp : fields.volume.value;
    // ensure the volume is positive before submitting an order
    if(!fields.interest && (isNaN(vol) || vol == null || vol <= 0)) {
      return;
    }
    // Make an order object. Make two if order is two way.
    
    let orders = [];
    if (fields.offer_selector !== 'two') {
      let price = fields.price.value == null ? null : ((ap == 1 || ap == 3 || ap == 20) && fields.tenor.value.length != 1) ? fields.price.value/100 : fields.price.value;
      let start = (ap == 20 ? timestampToISODate(rbaTenors[fields.tenor.value[0] - 1001].start_date) : fields.start.str ? timestampToISODate(new Date(fields.start.str)) : null)
      orders.push({
        order_id: fields.order_id,
        product_id: ap,
        bid: fields.offer_selector === 'offer' ? false : true,
        firm: fields.interest ? false : fields.firm,
        years: fields.tenor.value,
        price: price,
        volume: fields.interest ? 0 : vol,
        broker_id: $user.broker_id,
        trader_id: fields.trader.id,
        currency_code: products.currency(ap),
        eoi: fields.interest,
        fwd: fields.isFWD ? fields.fwd.value : null,
        start_date: fields.isFWD ? null : start,
        reference: getReference(fields.tenor.value, fields.product, fields.start_date, fields.fwd?.value),
      });
    } else {
      // Construct the offer order
      let bid_price = fields.bid_price.value == null ? null : (ap == 1 || ap == 3 || ap == 20) && fields.tenor.value.length != 1 ? fields.bid_price.value/100 : fields.bid_price.value;
      let offer_price = fields.offer_price.value == null ? null : (ap == 1 || ap == 3 || ap == 20) && fields.tenor.value.length != 1 ? fields.offer_price.value/100 : fields.offer_price.value;
      let start = (ap == 20 ? timestampToISODate(rbaTenors[fields.tenor.value[0] - 1001].start_date) : fields.start.str ? timestampToISODate(new Date(fields.start.str)) : null)
      orders.push({
        order_id: selected?.hasOwnProperty('order_id') ? selected.order_id : 0,
        product_id: ap,
        bid: selected?.hasOwnProperty('bid') ? selected.bid : false,
        firm: fields.interest ? false : fields.firm,
        years: fields.tenor.value,
        price: selected?.bid ? bid_price : offer_price,
        volume: fields.interest ? 0 : vol,
        broker_id: $user.broker_id,
        trader_id: fields.trader.id,
        currency_code: products.currency(ap),
        eoi: fields.interest,
        fwd: fields.isFWD ? fields.fwd.value : null,
        start_date: fields.isFWD ? null : start,
        reference: getReference(fields.tenor.value, fields.product, fields.start_date, fields.fwd?.value),
      });
      // Construct the bid order
      orders.push({
        order_id: 0,
        product_id: ap,
        bid: selected?.hasOwnProperty('bid') ? !selected.bid : true,
        firm: fields.interest ? false : fields.firm,
        years: fields.tenor.value,
        price: selected?.bid ? offer_price : bid_price,
        volume: fields.interest ? 0 : vol,
        broker_id: $user.broker_id,
        trader_id: fields.trader.id,
        currency_code: products.currency(ap),
        eoi: fields.interest,
        fwd: fields.isFWD ? fields.fwd.value : null,
        start_date: fields.isFWD ? null : start,
        reference: getReference(fields.tenor.value, fields.product, fields.start_date, fields.fwd?.value)
      });
    }
    // Submit the order(s). 
    for (let order of orders) {
      if (order.order_id != 0) order.time_placed = new Date();
      if (selected?.eoi && !fields.interest){
        // converting interest to order
        websocket.submitOrder(order, false);
      } else {
        websocket.submitOrder(order, true);
      }
    }
    dispatch('order_updated', {order: orders[0]});
    dispatch('defaultFields');
    document.activeElement.blur();
  }

</script>

<div class="container">
  <div class="form_component">
    {#if selected && selected.type != "indicator"} <!-- if selected is not a quote/indiciator -->
      {#if selected?.eoi}
        <Button 
          disabled={permission["View Only"] || !permission["Not Anonymous"]} 
          kind={fields.interest ? 'danger' : 'primary'}
          on:click={handleSubmit}
          >
          {fields.interest ? 'Amend Interest' : 'Convert To Order'}
        </Button>
      {:else} <!-- if it is not an interest it is an order -->
        <Button 
          disabled={permission["View Only"] || !permission["Not Anonymous"]}
          kind={fields.order_id === 0 ? 'primary' : 'danger'}
          on:click={handleSubmit}
          >
          {fields.order_id === 0 ? 'Submit Order' : 'Amend Order'}
        </Button>
      {/if}
    {:else}
      <Button 
        disabled={permission["View Only"] || !permission["Not Anonymous"]}
        kind='primary'
        on:click={handleSubmit}
        >
        {fields.interest ? 'Submit Interest' : 'Submit'}
      </Button>
    {/if}
  </div>
  {#if !fields.opposingOrder}
    <!-- Reset button -->
    <div class="form_component">
      <Button kind="tertiary" on:click={() => {dispatch('reset'); dispatch('defaultFields');}}>Reset </Button>
    </div>
  {/if}
</div>

<style>
.container {
  display: flex;
  gap: 16px;
}
.form_component {
  width: calc(50% - 8px);
}
:global(.form_component .bx--btn) {
  width: 100%
}

</style>