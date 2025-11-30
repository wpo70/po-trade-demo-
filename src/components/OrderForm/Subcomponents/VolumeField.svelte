<script>
  import { createEventDispatcher } from "svelte";
  import { TextInput, Tooltip } from "carbon-components-svelte";
  import { round, toTenor, toVolume } from "../../../common/formatting";
  import ExpandCategories from "carbon-icons-svelte/lib/ExpandCategories.svelte";
  import products from "../../../stores/products";
  import quotes from "../../../stores/quotes";
  import currency_state from "../../../stores/currency_state";
  import dailyfx from "../../../stores/fxrate";
  import Validator from "../../../common/validator";
  import { flyWingVolFromBody, spreadVol } from "../../../common/calculations";

  export let fields;
  export let rbaTenors;
  const dispatch = createEventDispatcher();

  let tooltipOpen;
  let volarr, vol_breakdown_error;
  let fx, fxrate;

  $: {
    fx = $dailyfx.find((i) => i.security.substring(0,3) == $currency_state.currency);
    if (fx) fxrate = fx.override ? fx.override : fx.value;
  }; 

  function volumeArray () {
    document.activeElement.blur();
    volarr = [];
    let s;
    fields.tenor.dirty = true;
    fields.tenor.invalid = fields.tenor.isInvalid(Validator.scanTenor);
    if (fields.tenor.invalid) {
      return vol_breakdown_error = "Please enter a valid tenor.";
    }
    if (fields.product === 5 || fields.product === 13 ) {
      s = 40;
    } else {
      s = 25;
    }
    if (fields.dv01_Currency == 'USD') {s = s*fxrate;}
    let multiplier = fields.dv01.str;
    
    let years = fields.tenor.value;
    let mainVol;
    switch (years.length){
      case 1:
        mainVol = toVolume(quotes.mmp(fields.product, years) * multiplier/s);
        volarr.push(mainVol);
        break;
      case 2:
        mainVol = toVolume(quotes.mmp(fields.product, years) * multiplier/s);
        volarr.push(spreadVol(fields.product, years[1], years[0], mainVol));
        volarr.push(mainVol);
        break;
      case 3:
        mainVol = toVolume((quotes.mmp(fields.product, years) * multiplier/s)/2);
        volarr.push(flyWingVolFromBody(fields.product, years[1], years[0], mainVol));
        volarr.push(mainVol);
        volarr.push(flyWingVolFromBody(fields.product, years[1], years[2], mainVol));
        break;
    }
    for (let i in volarr) {volarr[i] = toVolume(volarr[i]);}
  }

  function handleVolChange (e) {
    fields.volume.str = e.detail;
    if (e.detail == '' || !fields.tenor.str) {
      dispatch("setDefaultDv01");
      return;
    }
    let vol = parseFloat(e.detail);
    if (fields.dv01_Currency == 'USD') vol = (vol * fxrate);
    fields.dv01.str = quotes.getDV01FromVol(fields.product, fields.tenor.value, vol);
  }

  function setMMP() {
    if (fields.tenor.value) {
      let volume_mmp = quotes.mmp(fields.product, fields.tenor.value) * fields.dv01.str; 
      fields.volume.str = round(volume_mmp*2, 0)/2;
    }
  }

</script>

{#if !fields.interest}
  <div class="container">
      <!-- TODO confirm the invalid works for this field-->
    <TextInput
      value={isNaN(fields.volume.str) ? '' : fields.volume.str}
      invalid={fields.volume.invalid}
      on:input={handleVolChange}
      labelText={`Volume from ${fields.dv01_Currency == 'USD' ? 'USD' : products.currency(fields.product)} DV01`}
      invalidText={fields.volume.error_message}
    />

    {#if products.isStir(fields.product)}
      <TextInput 
        labelText="Multiplier" 
        bind:value={fields.dv01.str} 
        on:change={setMMP}/>
    {:else if !fields.isFWD && fields.tenor.str}
      <div style="align-self: end;">
        <Tooltip
          id="vol_breakdown"
          class="vols_breakdown vols_breakdown_caret vols_breakdown_shown" 
          bind:open={tooltipOpen} 
          on:open={volumeArray} 
          on:close={() => {document.activeElement.blur(); volarr = [];}}
          align="end" 
          hideIcon={!fields.tenor.str}
        >
          <div slot="icon" style="padding:2px 5px"><ExpandCategories size={24} /></div>
          {#if fields.product != 20}
            {#each volarr as v, i}
              <p><strong style="padding-right:0.5em">{toTenor(fields.tenor.value[i])}:</strong>{v}</p>
            {:else}
              <p>{vol_breakdown_error}</p>
            {/each}
          {:else}
            {#if rbaTenors[fields.rba.rbaLeg1Index]}
              <p><strong>{rbaTenors[fields.rba.rbaLeg1Index].text}:</strong> {volarr[0]}</p>
              {#if fields.rba.secondLeg && rbaTenors[fields.rba.rbaLeg2Index] != null}
                <p><strong>{rbaTenors[fields.rba.rbaLeg2Index].text}:</strong> {volarr[1]}</p>
              {/if}  
            {:else}
              <p>{vol_breakdown_error}</p>
            {/if}
          {/if}
        </Tooltip>
      </div>
    {/if}
  </div>
{/if}

<style>

.container {
  display: flex;
  gap: 16px;
}
p {
  padding-right: 0px !important;
  white-space: nowrap;
}
:global(.vols_breakdown .bx--tooltip) {
  min-width: 9rem;
  max-width: fit-content;
  margin-top: 20px;
  background-color: var(--cds-ui-02);
  color: var(--cds-text-primary);
}
:global(.vols_breakdown_caret .bx--tooltip .bx--tooltip__caret){
  border-bottom: 0.4296875rem solid var(--cds-ui-02);
}
:global(.vols_breakdown_shown .bx--tooltip--shown ){
  left: -47px;
  margin-top: 2px !important;
}
</style>