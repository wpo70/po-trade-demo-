<script>
import {
  Form,
  TextInput,
  Button,
  ComboBox,
} from "carbon-components-svelte";

import Validator from "./../../common/validator";
import banks from "./../../stores/banks";
import websocket from "./../../common/websocket";
import traders from "./../../stores/traders";
import bank_divisions from "./../../stores/bank_divisions";
import DraggableModal from "../Utility/DraggableModal.svelte";

export let trader = undefined;
export let open;

let bankInvalid = false;
let bankDivInvalid = false;

let fields = {
  trader_id: 0,
  firstname: new Validator(),
  lastname: new Validator(),
  preferredname: new Validator(),
  bank: undefined,
  email: new Validator(),
  ov_trader_id: new Validator(),
  bbg_id: new Validator(),
  bank_div_id: undefined,
  futures_account: "",
}

$: if (trader) copyTraderToForm(trader);

$: fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
$: fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
$: fields.preferredname.invalid = fields.preferredname.isInvalid(Validator.scanRequiredText);
$: fields.bbg_id.invalid = fields.bbg_id.isInvalid(Validator.scanBBGID);

$: fields.ov_trader_id.invalid = fields.ov_trader_id.isInvalid(isOvTraderIdValid);
$: fields.email.invalid = fields.email.isInvalid(isEmailValid);

$: if (open && fields.trader_id !== 0) {
  if (typeof fields.bank !== 'undefined') bankInvalid =false; else bankInvalid = true;
  if (typeof fields.bank_div_id !== 'undefined') bankDivInvalid = false; else bankDivInvalid = true;
}

function isOvTraderIdValid(str) {
  // CONDITIONS: string must not be empty, and must be unique

  Validator.scanRequiredText(str);
  if(str.trim().includes(" ")){  
    fields.ov_trader_id.invalid = true;
    throw new Error("ID cannot contain spaces");
  }else{
    let ov_ids = $traders.map((trader) => trader.ov_trader_id);
  
    if (trader) {
      ov_ids = ov_ids.filter((e) => e !== trader.ov_trader_id);
    }
  
    return isUnique(str, ov_ids);
  }
}

function isEmailValid(str) {
  // CONDITIONS: string must not be empty, must be a valid email, and must be unique

  if (str) Validator.scanEmail(str);

  let emails = $traders.map((trader) => trader.email);

  if (trader) {
    emails = emails.filter((e) => e !== trader.email);
  }

  return isUnique(str, emails);
}

function isUnique(str, set) {
  if (set.includes(str)) {
    throw new Error('Field must be unique');
  }

  if(str === '') {
    return null;
  }

  return str;
}

function copyTraderToForm(trader) {
  if (!trader) {
    fields.trader_id = 0;
    fields.firstname.reset();
    fields.lastname.reset();
    fields.preferredname.reset();
    fields.bank = undefined;
    fields.email.reset();
    fields.ov_trader_id.reset();
    fields.bbg_id.reset();
    fields.bank_div_id = undefined;
    fields.futures_account = "";
    
    bankInvalid = false;
    bankDivInvalid = false;
  } else {

    fields.trader_id = trader.trader_id;
    fields.firstname.set(trader.firstname, trader.firstname);
    fields.lastname.set(trader.lastname, trader.lastname);
    fields.preferredname.set(trader.preferredname, trader.preferredname);
    fields.bank = banks.get(trader.bank_id);
    fields.email.set(trader.email, trader.email);
    fields.ov_trader_id.set(trader.ov_trader_id, trader.ov_trader_id);
    fields.bbg_id.set(trader.bbg_id, trader.bbg_id);
    fields.bank_div_id = bank_divisions.get(trader.bank_div_id);
    fields.futures_account = trader.futures_account;
  }

  fields = fields;
}

function handleSubmit(event) {
  event.preventDefault();

  fields.firstname.dirty = true;
  fields.lastname.dirty = true;
  fields.preferredname.dirty = true;
  fields.bbg_id.dirty = true;
  fields.ov_trader_id.dirty = true;
  fields.email.dirty = true;

  fields.firstname.str = fields.firstname.str.trim().split(' ').filter((f) => f != "").join(" ");
  fields.lastname.str = fields.lastname.str.trim().split(' ').filter((f) => f != "").join(" ");
  fields.preferredname.str = fields.preferredname.str.trim().split(' ').filter((f) => f != "").join(" ");
  fields.email.str = fields.email.str ? fields.email.str.trim().split(' ').filter((f) => f != "").join(" ") : null;
  fields.bbg_id.str = fields.bbg_id.str.trim().split(' ').filter((f) => f != "").join(" ");

  fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
  fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
  fields.preferredname.invalid = fields.preferredname.isInvalid(Validator.scanRequiredText);
  fields.bbg_id.invalid = fields.bbg_id.isInvalid(Validator.scanBBGID);

  fields.ov_trader_id.invalid = fields.ov_trader_id.isInvalid(isOvTraderIdValid);
  fields.email.invalid = fields.email.isInvalid(isEmailValid);

  // do not submit if any of the fields are invalid
  if (fields.firstname.invalid || fields.lastname.invalid ||
      fields.preferredname.invalid || fields.ov_trader_id.invalid ||
      fields.email.invalid || fields.bbg_id.invalid) {
    return;
  }

  if (typeof fields.bank === 'undefined') {
    return;
  }
  if (typeof fields.bank_div_id === 'undefined') {
    return;
  }
  if (typeof fields.bank === 'undefined') {
    bankInvalid =true; 
    return;
  }
  if (typeof fields.bank_div_id === 'undefined') {
    bankDivInvalid =true; 
    return;
  }
  // if any of the data was invalid, ignore the event

  let trader = {
    trader_id: fields.trader_id,
    firstname: fields.firstname.str,
    lastname: fields.lastname.str,
    preferredname: fields.preferredname.str,
    bank_id: fields.bank.bank_id,
    email: fields.email.str,
    ov_trader_id: fields.ov_trader_id.value,
    bbg_id: fields.bbg_id.value,
    bank_div_id: fields.bank_div_id.bank_division_id,
    futures_account: fields.futures_account,
  };

  websocket.submitTrader(trader);
  copyTraderToForm(null);
  open = false;
}

function shouldFilterItem(item, value) {
  if (!value) return true;
  return item.text.toLowerCase().includes(value.toLowerCase());
}

</script>

<div class="trade_form">
  <DraggableModal
  on:close={() => copyTraderToForm(undefined)} 
  bind:open 
  heading="Trader Form">
  <svelte:fragment slot="body">
    <Form on:submit={handleSubmit}>
      <div class="grid" on:keypress|stopPropagation>
        <div class="md-grid-item">
          <ComboBox
          titleText="Bank"
          items={
            $banks.map(bank => {
              return {
                id: bank,
                text: bank.bank,
                ...bank
              }
            })
          }
          bind:selectedId={fields.bank}
          invalid={bankInvalid}
          invalidText='Bank must be selected'
          {shouldFilterItem}
          />
        </div>
        <div class="md-grid-item">
          <ComboBox
          titleText="Bank Division"
          items={
            $bank_divisions.map(bank_div => {
              return {
                id: bank_div,
                text: bank_div.name,
                ...bank_div
              }
            })
          }
          bind:selectedId={fields.bank_div_id}
          invalid={bankDivInvalid}
          invalidText='Bank Division must be selected'
          {shouldFilterItem}
        />
        
      </div>
      <div class="sm-grid-item" on:keypress|stopPropagation>
        <TextInput
          bind:value={fields.firstname.str}
          bind:dirty={fields.firstname.dirty}
          bind:invalid={fields.firstname.invalid}
          labelText="First Name"
          invalidText={fields.firstname.error_message}
        />
      </div>
      <div class="sm-grid-item" on:keypress|stopPropagation>
        <TextInput
          bind:value={fields.lastname.str}
          bind:dirty={fields.lastname.dirty}
          bind:invalid={fields.lastname.invalid}
          labelText="Last Name"
          invalidText={fields.lastname.error_message}
        />
      </div>
      <div class="sm-grid-item" on:keypress|stopPropagation>
        <TextInput
        bind:value={fields.preferredname.str}
          bind:dirty={fields.preferredname.dirty}
          bind:invalid={fields.preferredname.invalid}
          labelText="Preferred Name"
          invalidText={fields.preferredname.error_message}
        />
      </div>
      <div class="md-grid-item" on:keypress|stopPropagation>
        <TextInput
          bind:value={fields.email.str}
          bind:dirty={fields.email.dirty}
          bind:invalid={fields.email.invalid}
          labelText="Email"
          invalidText={fields.email.error_message}
        />
      </div>
      <div class="md-grid-item" on:keypress|stopPropagation>
        <TextInput
          bind:value={fields.futures_account}
          labelText="Futures Account"
        />
      </div>
      <div class="md-grid-item" on:keypress|stopPropagation>
        <TextInput
          bind:value={fields.ov_trader_id.str}
          bind:dirty={fields.ov_trader_id.dirty}
          bind:invalid={fields.ov_trader_id.invalid}
          labelText="Oneview Trader Id"
          invalidText={fields.ov_trader_id.error_message}
          />
        </div>
        <div class="md-grid-item" on:keypress|stopPropagation>
          <TextInput
          bind:value={fields.bbg_id.str}
          bind:dirty={fields.bbg_id.dirty}
          bind:invalid={fields.bbg_id.invalid}
          labelText="Bloomberg Id"
          invalidText={fields.bbg_id.error_message}
        />
      </div>

      </div>
      <Button type="submit" kind={'primary'}>
        {fields.trader_id === 0 ? 'Add trader' : 'Update trader'}
      </Button>
    </Form>
  </svelte:fragment>
</DraggableModal> 
</div>

<style>
  
  .grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-gap: 2rem;
  margin-bottom: 25px;
}

/* .lg-grid-item {
  grid-column: span 6;
} */

.sm-grid-item {
  grid-column: span 2;

}

.md-grid-item {
  grid-column: span 3;
}

:global(.trade_form .bx--modal-container){
  width: 1000px;
}

</style>
