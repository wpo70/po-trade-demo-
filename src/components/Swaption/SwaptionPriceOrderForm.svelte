<script>
  import {
    TextInput,
    FormGroup,
    RadioButtonGroup,
    RadioButton,
    Checkbox,
    Select,
    SelectItem,
    ComboBox
  } from "carbon-components-svelte";

  import TraderCombobox from "../TraderCombobox.svelte";

  import { toPrice, toTenor, toVolumeString } from "../../common/formatting";
  import Validator from "../../common/validator";
  import websocket from "../../common/websocket";
  import user from "../../stores/user";
  import traders from "../../stores/traders";
  import swaption_quotes from "../../stores/swaption_quotes";

  const Direction = Object.freeze({
    OFFER: 'offer',
    BID: 'bid'
  });

  let fields = {
    order_id: 0,
    trader: undefined,
    direction: Direction.BID,
    firm: true,
    option_type: 'Straddle',
    swap_term: new Validator(),
    option_expiry: new Validator(),
    premium: new Validator(),
    volume: new Validator(),
  };

  let traderInvalid = false;

  /**
   * Copies an order to the order form. If a nullish value is passed in,
   * reset the form.
   * @param {import("../../common/swaption_price").SwaptionOrder | undefined} order
   */
  export const copyOrderToForm = (order) => {
    if(order == null) {

      fields.order_id = 0;
      fields.trader = undefined;
      fields.direction = Direction.BID;
      fields.firm = true;
      fields.option_type = 'Straddle';
      fields.swap_term.reset();
      fields.option_expiry.reset();
      fields.premium.reset();
      fields.volume.reset();

    } else {

      fields.order_id = order.order_id;
      fields.trader = order.trader_id ? traders.get(order.trader_id) : undefined;
      fields.direction = order.bid ? Direction.BID : Direction.OFFER;
      fields.firm = order.firm;
      fields.option_type = order.option_type;
      fields.swap_term.set(order.swap_term, toTenor(order.swap_term));
      fields.option_expiry.set(order.option_expiry, toTenor(order.option_expiry));
      fields.premium.set(order.premium, toPrice(order.premium));
      fields.volume.set(order.volume, order.volume);

    }
  };

   /**
    * Validates and submits an order to POTrade.
    * @returns {boolean} true if order is successfully submitted, false if it is not
    */
  export const submit = () => {

    fields.swap_term.dirty = true;
    fields.option_expiry.dirty = true;
    fields.premium.dirty = true;
    fields.volume.dirty = true;

    traderInvalid = false;
    fields.swap_term.invalid = fields.swap_term.isInvalid(Validator.scanTenorShape);
    fields.option_expiry.invalid = fields.option_expiry.isInvalid(Validator.scanTenorShape);
    fields.premium.invalid = fields.premium.isInvalid(Validator.scanPrice);
    fields.volume.invalid = fields.volume.isInvalid(Validator.scanVolume);

    if (fields.swap_term.invalid || fields.option_expiry.invalid || fields.premium.invalid || fields.volume.invalid) {
      return false;
    }

    if (fields.trader == undefined) {
      traderInvalid = true;
      return false;
    }

    if(!/[a-z]/i.test(fields.swap_term.value.split(-1))) {
      fields.swap_term.value = fields.swap_term.value + 'y';
    }

    if(!/[a-z]/i.test(fields.option_expiry.value.split(-1))) {
      fields.option_expiry.value = fields.option_expiry.value + 'y';
    }

    if(fields.volume.value === -1) {
      fields.volume.value = swaption_quotes.getBBSW(fields.swap_term.value, fields.option_expiry.value)?.mmp;

      if (fields.volume.value == undefined) {
        fields.volume.invalid = true;
        return false;
      }
    }

    websocket.submitSwaptionOrder({
      order_id: fields.order_id,
      trader_id: fields.trader.trader_id,
      bid: fields.direction === Direction.BID,
      option_type: fields.option_type,
      volume: fields.volume.value,
      premium: fields.premium.value,
      swap_term: fields.swap_term.value,
      option_expiry: fields.option_expiry.value,
      firm: fields.firm,
      broker_id: $user.broker_id
    });

    copyOrderToForm(null);
    return true;
  };
  function shouldFilterItem(item, value) {
  if (!value) return true;
  return item.text.toLowerCase().includes(value.toLowerCase());
}
</script>

<div>
  <form on:keypress|stopPropagation>
    <FormGroup>
      <!-- trader -->
      <ComboBox
      invalid={traderInvalid}
      invalidText="Please select Trader"
      titleText="Trader"
      items={
        $traders.map(trader => {
          return {
            id: trader,
            text: traders.fullName(trader),
            ...trader
          }
        })
      }
      itemToString={traders.fullName} 
      bind:selectedId={fields.trader}
      {shouldFilterItem}
    />
    </FormGroup>
    <FormGroup>
      <!-- side -->
      <RadioButtonGroup bind:selected={fields.direction}>
        <RadioButton labelText="Bid" value={Direction.BID}/>
        <RadioButton labelText="Offer" value={Direction.OFFER}/>
      </RadioButtonGroup>
    </FormGroup>
    <FormGroup>
      <!-- firm -->
      <Checkbox labelText="Firm" bind:checked={fields.firm}/>
    </FormGroup>
    <FormGroup>
      <!-- option type -->
      <Select bind:selected={fields.option_type} labelText="Option Type">
        <SelectItem value="Straddle"/>
        <SelectItem value="Payers"/>
        <SelectItem value="Receivers"/>
      </Select>
    </FormGroup>
    <FormGroup style="display: flex; gap: 1rem;">
      <div style="width: 50%;">
        <!-- optionExpiry -->
        <TextInput
          bind:value={fields.option_expiry.str}
          bind:invalid={fields.option_expiry.invalid}
          invalidText={fields.option_expiry.error_message}
          labelText="Option Expiry"/>
      </div>
      <div style="width: 50%;">
        <!-- swapTerm -->
        <TextInput
          bind:value={fields.swap_term.str}
          bind:invalid={fields.swap_term.invalid}
          invalidText={fields.swap_term.error_message}
          labelText="Swap Term"/>
      </div>
    </FormGroup>
    <FormGroup>
      <!-- premiumbp -->
      <TextInput
        bind:value={fields.premium.str}
        bind:invalid={fields.premium.invalid}
        invalidText={fields.premium.error_message}
        labelText="Premium Bp"/>
    </FormGroup>
    <FormGroup>
      <!-- volume -->
      <TextInput
        bind:value={fields.volume.str}
        bind:invalid={fields.volume.invalid}
        invalidText={fields.volume.error_message}
        labelText="Volume"/>
    </FormGroup>
  </form>
</div>

<style></style>
