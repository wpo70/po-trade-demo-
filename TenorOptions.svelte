
<script>
  import { Button, DatePicker, DatePickerInput, Dropdown, RadioButton, RadioButtonGroup, TextInput } from "carbon-components-svelte";
  import { addDays, addTenorToDate, convertDateToString, getEFPSPS_Dates, isTenor, roundUpToNearest, tenorToYear, toEFPSPSTenor, toRBATenor } from "../../../common/formatting";
  import { createEventDispatcher } from "svelte";
  import quotes from "../../../stores/quotes";
  import currency_state from "../../../stores/currency_state";
  import dailyfx from "../../../stores/fxrate";
  import products from "../../../stores/products";
  import CustomComboBox from "../../Utility/CustomComboBox.svelte";
  
  export let fields;
  export let rbaTenors;
  const dispatch = createEventDispatcher();
  let fx;
  let fxrate;

  let count = 0;
  let efpTenors = getEFPSPS_Dates().map(t => {return {id: count++, date: t.date, text: t.date.toDateString()}})
  let efpTenorId = efpTenors.findIndex(t => convertDateToString(t.date) == fields.start.str);
  let tenors1, tenors2;
  $: {
    if (fields.product == 20) {
      let index1 = fields.rba.rbaLeg1Index;
      let index2 = fields.rba.rbaLeg2Index;
      tenors1 = rbaTenors.filter(t => ((index2 == -1 || index2 == null) ? rbaTenors.length : fields.rba.rbaLeg2Index) > t.id);
      tenors2 = rbaTenors.filter(t => ((index1 == -1 || index1 == null) ? -1 : fields.rba.rbaLeg1Index) < t.id);
    } if (fields.product == 17 || fields.product == 27) {
      efpTenorId = efpTenors.findIndex(t => convertDateToString(t.date) == fields.start.str);
    }
  }

  $: {
    fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state);
    fxrate = fx?.override ? fx?.override : fx?.value ?? 1;
  }; 

  function changeTenor (e) {
    if (fields.product == 20) {
      let str = (1001 + fields.rba.rbaLeg1Index).toString();
      if (fields.rba.rbaLeg2Index >= 0 && fields.rba.secondLeg) {
        if (fields.rba.rbaLeg2Index <= fields.rba.rbaLeg1Index) fields.rba.rbaLeg2Index = fields.rba.rbaLeg1Index + 1;
        if (fields.rba.rbaLeg2Index >= rbaTenors.length) {fields.rba.rbaLeg2Index = -1;}
        else {str = str + " x " + (1001 + fields.rba.rbaLeg2Index);}
      }
      try{
        let yr = tenorToYear(str);
        fields.tenor.set(yr, toRBATenor(yr));
      } catch (e) {
        fields.tenor.invalid = true;
        fields.tenor.error_message=" Tenor input is invalid";
      }
    } else if (fields.product == 18) {
      if(fields.specific) {
        fields.fwd.reset();
        if (e?.detail?.dateStr && fields.start.str != e.detail.dateStr ) {
          fields.start.str = e.detail.dateStr;
        }
      }
      fields.tenor.set(
        ['3m', '6m'].includes(fields.tenor.str) ? tenorToYear(fields.tenor.str) : tenorToYear('3m'), 
        ['3m', '6m'].includes(fields.tenor.str) ? fields.tenor.str :'3m'
      );
    } else if ([17,27].includes(fields.product)) {
      fields.fwd.reset();
      fields.start.str = convertDateToString(efpTenors[efpTenorId]?.date);
      fields.tenor.set(tenorToYear('3m'), toEFPSPSTenor(fields.start.str));
    } else {
      try {
        let yr = tenorToYear(e.detail);
        fields.tenor.set(yr, e.detail); 
      } catch (e){
        fields.tenor.invalid = true;
        fields.tenor.error_message=" Tenor input is invalid";
      }
    }
    dispatch("setDefaultDv01");
    tenorSet(fields, true);
  }

  export function tenorSet (_fields = fields, useDv01 = false) {
    fields.dv01.hasPriority = useDv01;
    let s;
    let pid = products.nonFwd(_fields.product);
    if (pid === 5 || pid === 13 ) {
      s = 40;
    } else {
      s = 25;
    }
    if (_fields.tenor.value?.length == 3) s *= 2;

    let volume_mmp;
    let multiplier = _fields.dv01.value;
    if (products.isStir(_fields.product)) {
      volume_mmp = quotes.mmp(_fields.product, _fields.tenor.value, _fields?.fwd?.value) * multiplier; 
    } else if (useDv01 && multiplier) {
      volume_mmp = quotes.mmp(_fields.product, _fields.tenor.value, _fields?.fwd?.value) * multiplier / s;
    } else {
      volume_mmp = !isNaN(parseFloat(fields?.volume?.value)) ? fields?.volume?.value : quotes.mmp(_fields.product, _fields.tenor.value, _fields?.fwd?.value); 
    }
    if (fields.dv01_Currency != $currency_state) volume_mmp = volume_mmp / fxrate;
    _fields.volume.set(roundUpToNearest(volume_mmp, 2), roundUpToNearest(volume_mmp, 2));
    fields = _fields;
  }

  function setStartDate () {
    
    let date = addDays(new Date(), 1);
    // if fwd is set, set the spot date forward however much the fwd tenor is
    if(isTenor(fields.fwd.str)) {
      let fwdStartDate = addTenorToDate(fields.fwd.str, date);
      fields.start.str = fwdStartDate;
    } else {
      fields.start.str = convertDateToString(date);
    }
  } 
</script>

{#if fields.product == 20}
  <div class="container">
    {#if fields.opposingOrder}
      <TextInput 
        labelText="Tenor"
        readonly={true} 
        value={rbaTenors[fields.rba.rbaLeg1Index]?.text ?? ""}
      />
    {:else}
      {#key tenors1}
        <CustomComboBox
          size="sm"
          titleText="Tenor"
          items={tenors1}
          bind:selectedId={fields.rba.rbaLeg1Index}
          invalid={fields.rba.invalidRBA1}
          invalidText="Must Select A Tenor"
          disabled={fields.opposingOrder}
          on:select={changeTenor}
        />
      {/key}
    {/if}
    {#if fields.rba.secondLeg}
      <div style="text-align: center; align-self: end;">X</div>
      {#if fields.opposingOrder}
        <TextInput 
          labelText="Tenor"
          readonly={true} 
          value={rbaTenors[fields.rba.rbaLeg2Index]?.text ?? ""}
        />
      {:else}
        {#key tenors2}
          <CustomComboBox
            size="sm"
            titleText="Tenor"
            items={tenors2}
            bind:selectedId={fields.rba.rbaLeg2Index}
            invalid={fields.rba.invalidRBA2}
            invalidText="Must Select A Tenor"
            disabled={fields.opposingOrder}
            on:select={changeTenor}
          />
        {/key}
        <button class="clear-btn"
          on:click={() => {fields.rba.secondLeg = false; fields.rba.rbaLeg2Index = -1; changeTenor();}}>
          Remove Leg
        </button>
      {/if}
    {:else if !fields.opposingOrder}
      <Button style="padding: 5px 10px 5px 10px; min-height: fit-content; height: fit-content; align-self: end;" on:click={() => {fields.rba.secondLeg = true}}>ADD LEG</Button>
    {/if}
  </div>
{:else if products.isStir(fields.product)}
  <div class="centered_container my_radio">
    <RadioButtonGroup bind:selected={fields.specific} disabled={fields.product == 17 || fields.product == 27 || fields.opposingOrder}>
      <RadioButton labelText="Specific Date" value={true} on:change={()=>{fields.fwd.reset(); fields.isFWD = false;}}/>
      <RadioButton labelText="Forward Date" value={false} on:change={()=>{fields.start.reset(); fields.isFWD = true;}}/>
    </RadioButtonGroup>
  </div>

  <div style="height: 56px;">
    {#if [17,27].includes(fields.product) }
      <!-- START DATE -->
      <CustomComboBox
        size="sm"
        titleText="Tenor"
        items={efpTenors}
        bind:selectedId={efpTenorId}
        bind:invalid={fields.start.invalid}
        bind:invalidText={fields.start.error_message}
        disabled={fields.opposingOrder}
        on:select={changeTenor}
      />
    {:else}            
      <DatePicker
        value={fields.start.str}
        dateFormat="Y-m-d"
        datePickerType="single"
        required={true}
        disabled={!fields.specific || fields.opposingOrder}
        on:change={changeTenor}
        flatpickrProps={{ static: true }}
        minDate={convertDateToString(new Date())}>
        <!-- changing date picker to static means that it won't work in a
        modal, however it allows us to adjust where the calender opens -->
        <DatePickerInput
          labelText='Start Date'
          placeholder="yyyy-mm-dd"
          bind:invalid={fields.start.invalid}
          invalidText={fields.start.error_message}
          disabled={!fields.specific || fields.opposingOrder}
          pattern={'\\d{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])'} />
      </DatePicker>
    {/if}
  </div>
  
  <div class="container" style="height: 66px;">
    <div style="width: 50%; margin-top: -2px;">
      <!-- TENOR -->
      {#if fields.product == 18 && !fields.opposingOrder}
        <Dropdown 
          titleText="Tenor"
          items={[
            {id: "3m", text: "3m"},
            {id: "6m", text: "6m"},
          ]}
          on:select={changeTenor}
          bind:selectedId={fields.tenor.str}
          bind:dirty={fields.tenor.dirty}
          bind:invalid={fields.tenor.invalid}
        />
      {:else if [17,27].includes(fields.product) || fields.opposingOrder}
        <TextInput
          bind:value={fields.tenor.str}
          on:change={changeTenor}
          bind:dirty={fields.tenor.dirty}
          bind:invalid={fields.tenor.invalid}
          labelText="Tenor"
          invalidText="Tenor must be 1 to 3 numbers"
          readonly
        />
      {:else}
        <TextInput
          on:change={changeTenor}
          bind:value={fields.tenor.str}
          bind:dirty={fields.tenor.dirty}
          bind:invalid={fields.tenor.invalid}
          labelText="Tenor"
          invalidText="Tenor must be 1 to 3 numbers"
        />
      {/if}
    </div>
    <div style="width: 50%">
      <TextInput
        bind:value={fields.fwd.str}
        bind:dirty={fields.fwd.dirty}
        bind:invalid={fields.fwd.invalid}
        disabled={fields.specific || fields.product != 18}
        readonly={fields.opposingOrder && !(fields.specific || fields.product != 18)}
        labelText="Fwd"
        invalidText={fields.fwd.error_message}
        on:change={() => {fields.fwd.invalid = false; setStartDate()}}
      />
    </div>
  </div>
{:else}
  <div class="container">
    <TextInput 
      bind:value={fields.tenor.str}
      bind:dirty={fields.tenor.dirty}
      bind:invalid={fields.tenor.invalid} 
      on:input={changeTenor}
      labelText="Tenor"
      invalidText={fields.tenor.error_message}
      readonly={fields.opposingOrder} 
    />
    {#if fields.isFWD}
      <TextInput
        bind:value={fields.fwd.str}
        bind:dirty={fields.fwd.dirty}
        bind:invalid={fields.fwd.invalid}
        on:input={() => {fields.fwd.value = tenorToYear(fields.fwd.str)[0]; tenorSet(fields, true);}}
        labelText="Fwd"
        invalidText={fields.fwd.error_message}
        readonly={fields.opposingOrder} 
      />
    {/if}
  </div>
{/if}

<style>

  .container {
    display: flex;
    gap: 16px;
  }

  .clear-btn {
    background-color: transparent;
    background-repeat: no-repeat;
    border: none;
    cursor: pointer;
    overflow: hidden;
    outline: none;
    position: absolute;
    right: 10px;
    color: var(--cds-inverse-02);
    font-size: 12px;
  }
</style>