<script>
import {
  Select,
  SelectItem,
  TextInput,
  Button,
  Checkbox,
} from "carbon-components-svelte";
import CustomComboBox from "../Utility/CustomComboBox.svelte";
import CustomDatePicker from "../Utility/CustomDatePicker.svelte";

import { createEventDispatcher } from "svelte";

import Validator from "../../common/validator.js";
import traders from "../../stores/traders.js";
import brokers from "../../stores/brokers";
import user from "../../stores/user";

// fields on the form
export let fields = {
  buyer_id: undefined,
  seller_id: undefined,
  option_type: "Straddle",
  notional: new Validator(),
  strike_rate: new Validator(),
  expiry_date: new Validator(),
  breaks: new Validator(),
  thereafter: new Validator(),
  option_expiry: new Validator(),
  date: new Validator(),
  swap_term: new Validator(),
  swap_start_date: new Validator(),
  premium_date: new Validator(),
  premium_bp: new Validator(),
  swap_maturity_date: new Validator(),
  sef: undefined,
  settlement: undefined,
  spot_or_fwd: undefined,
  clearhouse: undefined,
};

export let defaultValues = () => '';

export let premium_bp_override = undefined;
export let premium_date_override = undefined;
export let swap_start_date_override = undefined;
export let expiry_date_override = undefined;
export let strike_rate_override = undefined;
export let buyerIsInvalid = false;
export let sellerIsInvalid = false;

$: if (fields.buyer_id ) buyerIsInvalid = false;
$: if (fields.seller_id) sellerIsInvalid = false;
// Permission
let traderApproved;
$: traderApproved = user.getPermission($brokers)["Approve Trades"]

// dispatched events
const dispatch = createEventDispatcher();
const handleUpdatedField = (field, val) => dispatch('input', { [field]: val });

// handler for the submit button on the form.
const handleSubmit = () => dispatch('submit');

let break_options = ["1D","6M","1Y","2Y","3Y","4Y","5Y","6Y","7Y","8Y","9Y","10Y","11Y","12Y","15Y","20Y","25Y","30Y"];
let thereafter_options = ["1D", "1M", "3M", "6M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "9Y", "10Y"];
let breaksNeeded;
$: breaksNeeded = (fields.breaks.str != "" || fields.thereafter.str != "");

</script>

<!-- FORM -->
<form on:submit|preventDefault={handleSubmit}>
  <div class="flex-center">
    <div class="column" style="border-right: 2px solid var(--cds-text-secondary); padding-right: 10px;">
      <!-- Trade Cell -->
      <div class="topCell">
        <div class="separator ">Trade</div>
        <!-- Buyer -->
        <div class="element">
          <p class="label">Buyer</p>
          <CustomComboBox
            invalid={buyerIsInvalid}
            invalidText="Please select Trader"
            items={
              $traders.map(trader => {
                return {
                  id: trader.trader_id,
                  text: traders.fullName(trader),
                  ...trader
                }
              })
            }
            itemToString={traders.fullName} 
            bind:selectedId={fields.buyer_id}
          />
        </div>
        <!-- Seller -->
        <div class="element">
          <p class="label">Seller</p>
          <CustomComboBox
            invalid={sellerIsInvalid}
            invalidText="Please select Trader"
            items={
              $traders.map(trader => {
                return {
                  id: trader.trader_id,
                  text: traders.fullName(trader),
                  ...trader
                }
              })
            }
            itemToString={traders.fullName} 
            bind:selectedId={fields.seller_id}
          />
        </div>
        <!-- Settlement -->
        <div class="element">
          <p class="label">Settlement</p>
          <Select
            bind:selected={fields.settlement}
            required>
            <SelectItem value="Cash"/>
            <SelectItem value="Physical"/>
          </Select>
        </div>
        <!-- Date -->
        <div class="element">
          <p class="label">Date</p>
          <CustomDatePicker
            bind:value={fields.date.str}
            bind:invalid={fields.date.invalid}
            invalid_text={fields.date.error_message}
            min_date='today'
            on:change={(e) => fields.date.str = e.detail.dateStr} />
        </div>
        <!-- SEF -->
        <div class="element" style="display:flex">
          <div  style="gap:10px; width:50%; display: flex; align-items: center;">
            <p class="label" style="width:70px;">SEF Trade</p>
            <Checkbox  bind:checked={fields.sef}/>
          </div>
          <div style="display:flex; gap:10px; width:50%; align-items: center; justify-content: flex-end;">
            <p class="label" style="width: 30px;">ASX</p>
            <input type="radio" bind:group={fields.clearhouse} value="ASX" name="clearhouse" required>
            <p class="label" style="width: 30px;">LCH</p>
            <input type="radio" bind:group={fields.clearhouse} value="LCH" name="clearhouse" required>
          </div>
        </div>
      </div>
      <!-- Option Cell -->
      <div class="bottomCell">
        <div class="separator ">Option</div>
        <!-- Option Expiry -->
        {#if $$slots.option_expiry}
          <slot name="option_expiry" />
        {:else}
          <div class="element">
            <p class="label">Option Expiry</p>
            <TextInput
              bind:value={fields.option_expiry.str}
              bind:invalid={fields.option_expiry.invalid}
              invalidText={fields.option_expiry.error_message}
              size="sm"
              on:input={() => handleUpdatedField('option_expiry', fields.option_expiry.str)}
              required />
          </div>
        {/if}
        <!-- Strike Rate -->
        <div class="element">
          <p class="label">Strike Rate</p>
          <TextInput
            value={fields.strike_rate.str}
            bind:invalid={fields.strike_rate.invalid}
            invalidText={fields.strike_rate.error_message}
            on:input={e => strike_rate_override = e.detail}
            class={strike_rate_override ? 'swaption-overriden' : ''}
            size="sm"
            required />
        </div>
        <!-- Option Type -->
        <div class="element">
          <p class="label">Option Type</p>
          <Select bind:selected={fields.option_type} required>
            <SelectItem value="Payers"/>
            <SelectItem value="Receivers"/>
            <SelectItem value="Straddle"/>
            <!-- <SelectItem value="Strangle"/> -->
          </Select>
        </div>
        <!-- Expiry Date -->
        <div class="element">
          <p class="label">Expiry Date</p>
          <CustomDatePicker
            statics={false}
            bind:value={fields.expiry_date.str}
            bind:invalid={fields.expiry_date.invalid}
            invalid_text={fields.expiry_date.error_message}
            min_date='today'
            inputClass={expiry_date_override ? 'swaption-overriden' : ''}
            on:change={(e) => {
              if(fields.expiry_date.str !== e.detail.dateStr) {
                expiry_date_override = e.detail.dateStr;
              }
            }}/>
        </div>
      </div>
    </div>
    <div class="column" style="border-left: 2px solid var(--cds-text-secondary); padding-left: 10px;">
      <!-- Swap Cell -->
      <div class="topCell">
        <div class="separator ">Swap</div>
        <!-- Notional -->
        <div class="element">
          <p class="label">Notional (Mill)</p>
          <TextInput
            bind:value={fields.notional.str}
            bind:invalid={fields.notional.invalid}
            invalidText={fields.notional.error_message}
            size="sm"
            required />
        </div>
        <!-- Swap Term -->
        <div class="element">
          <p class="label">Swap Term</p>
          <TextInput
            bind:value={fields.swap_term.str}
            bind:invalid={fields.swap_term.invalid}
            invalidText={fields.swap_term.error_message}
            size="sm"
            on:input={() => handleUpdatedField('swap_term', fields.swap_term.str)}
            required />
        </div>
        <!-- Swap Start Date -->
        <div class="element">
          <p class="label">Start Date</p>
          <CustomDatePicker
            statics={false}
            bind:value={fields.swap_start_date.str}
            bind:invalid={fields.swap_start_date.invalid}
            invalid_text={fields.swap_start_date.error_message}
            min_date='today'
            inputClass={swap_start_date_override ? 'swaption-overriden' : ''}
            on:change={(e) => {
              if(fields.swap_start_date.str !== e.detail.dateStr) {
                swap_start_date_override = e.detail.dateStr;
              }
            }}/>
        </div>
        <!-- Swap Maturity Date -->
        {#if $$slots.swap_maturity_date}
          <div class="element">
            <slot name="swap_maturity_date" />
          </div>
        {:else}
          <div class="element">
            <p class="label">Maturity Date</p>
            <TextInput
              bind:value={fields.swap_maturity_date.str}
              size="sm"
              readonly
              required />
          </div>
        {/if}
        <!-- Spot or Forward -->
        <div class="element" style="gap: 1rem; display:flex">
          <div style="width:50%; display: flex; justify-content: center;">
            <p class="label" style="width: 28px;">Spot</p>
            <input type="radio" bind:group={fields.spot_or_fwd} value="Spot" name="spot_or_fwd" required>
          </div>
          <div style="width:50%; display: flex; justify-content: center;">
            <p class="label" style="width: 50px;">Forward</p>
            <input type="radio" bind:group={fields.spot_or_fwd} value="Fwd" name="spot_or_fwd" required>
          </div>
        </div>
      </div>
      <!-- Premium -->
      <div class="bottomCell">
        <div class="separator ">Premium</div>
        <!-- Premium BP's -->
        <div class="element">
          <p class="label">Premium BP's</p>
          <TextInput
            value={fields.premium_bp.str}
            bind:invalid={fields.premium_bp.invalid}
            invalidText={fields.premium_bp.error_message}
            class={premium_bp_override ? 'swaption-overriden' : ''}
            on:input={e => premium_bp_override = e.detail}
            size="sm"
            required/>
        </div>
        <!-- Premium Date -->
        <div class="element">
          <p class="label">Premium Date</p>
          <CustomDatePicker
            statics={false}
            bind:value={fields.premium_date.str}
            bind:invalid={fields.premium_date.invalid}
            invalid_text={fields.premium_date.error_message}
            inputClass={premium_date_override ? 'swaption-overriden' : ''}
            min_date='today'
            on:change={(e) => {
              if(fields.premium_date.str !== e.detail.dateStr) {
                premium_date_override = e.detail.dateStr;
              }
            }}/>
        </div>
        <!-- Break Clause -->
        <div class="element">
          <p class="label">Break</p>
          <Select
            bind:selected={fields.breaks.str}
            required={breaksNeeded}>
            <SelectItem text="-" value="" hidden/>
            {#each break_options as option}
              <SelectItem value={option}/>
            {/each}
          </Select>
        </div>
        <!-- Thereafter -->
        <div class="element">
          <p class="label">Thereafter</p>
          <Select
            bind:selected={fields.thereafter.str}
            required={breaksNeeded}>
            <SelectItem text="-" value="" hidden/>
            {#each thereafter_options as option}
              <SelectItem value={option}/>
            {/each}
          </Select>
        </div>
      </div>
    </div>
  </div>
  <div class="submit-container">
    <Button kind="secondary" on:click={defaultValues} >Clear</Button>
    <Button type="submit" kind="primary" disabled={!traderApproved}>Submit</Button>
  </div>
</form>
<style>

.flex-center {
  padding-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.column {
  width: 50%;
  min-height: 600px;
  height: calc(100vh - 300px);
}

.topCell {
  height: 55%;
}

.bottomCell {
  height: 45%;
}

.element {
  display: flex;
  align-items: center;
  justify-content: center;
}

.topCell .element {
  height: 17%;
}

.bottomCell .element {
  height: 20.5%;
}

.label {
  color: white;
  font-size: small;
  width: 80px;
}

.submit-container {
  margin-top: 2rem;
  justify-content: center;
  display: flex;
  gap: 2rem 1rem;
}

.separator {
  margin-top: 10px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  text-align: center;
  width: 100%;
  font-weight: bold;
}

.separator::before,
.separator::after {
  content: '';
  flex: 1;
  margin-left: 25%;
  margin-right: 25%;
  border-bottom: 1px solid var(--cds-text-secondary);
}

.separator:not(:empty)::before {
  margin-right: .25em;
}

.separator:not(:empty)::after {
  margin-left: .25em;
}

:global(.element .bx--list-box__wrapper){
  width:100%;
}

:global(.swaption-overriden) {
  color: black;
  background-color: lemonchiffon;
}

</style>
