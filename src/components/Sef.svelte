<script>
  // Does the clearing house and sef as a togglable button, in the future might need a select if more clearing house.
  // import { SelectItem, Select } from "carbon-components-svelte";
  import { ButtonSet, Button, SelectItem, Select } from "carbon-components-svelte";
  import bank_divisions from "../stores/bank_divisions";
  export let ticket;
  export let disabled = false;
  
  let sefBool = getSef();
  let CHBool = getCH();

  $: ticket.sef = sefBool;
  $: ticket.clearhouse = CHBool ? "ASX" : "LCH";

  function getSef() {
    let sef_offer = bank_divisions.get(ticket.offer_bank_division_id).sef;
    let sef_bid = bank_divisions.get(ticket.bid_bank_division_id).sef;
    if (sef_bid === true || sef_offer === true) {
      return true;
    } else {
      return false;
    }
  }
  function getCH() {
    let CH_offer = bank_divisions.get(ticket.offer_bank_division_id).clearhouse;
    let CH_bid = bank_divisions.get(ticket.bid_bank_division_id).clearhouse;
    if (CH_bid === "ASX" && CH_offer === "ASX") {
      return true;
    } else {
      return false;
    }
  }
</script>

<ButtonSet>
  <Select
    class="sef"
    selected={sefBool}
    disabled={disabled}
    on:update={(e) => sefBool = !sefBool}
  >
    <SelectItem value={true} text="ON SEF" />
    <SelectItem value={false} text="OFF SEF" />
  </Select>

  <Select
    class="sef"
    selected={CHBool}
    disabled={disabled}
    on:update={(e) => CHBool = !CHBool}
  >
    <SelectItem value={true} text="ASX" />
    <SelectItem value={false} text="LCH" />
  </Select>
</ButtonSet>

<style>
:global(.sef select.bx--select-input) {
  height: 24px;
  align-self: baseline;
  background-color: #525252;
  width: fit-content;
}
:global(.sef .bx--label) {
  margin-bottom: 0;
}


</style>