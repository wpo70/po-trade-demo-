<script>

  import {
    StructuredList,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
    Select,
    SelectItem,
    TextInput,
  } from "carbon-components-svelte";

  import { isTenor, timestampToYearDate } from "../../common/formatting.js";

  import traders from "../../stores/traders";
  import bank_divisions from "../../stores/bank_divisions";
  import bic from '../../stores/bic';

  import { onMount } from "svelte";

  export let values;
  export let fixed_bank_division = null;
  export let floating_bank_division = null;

  export let bic_bid;
  export let bic_offer;

  export let submitted = false;

  let fixed_payer;
  let floating_payer;

  export let defaults = null;
  export let key;

  export let confirm_checked = false;
  export let isValidBrokerages = false;

  onMount (() => {
    fixed_bank_division = bank_divisions.getBankDivisions(traders.get((values[1] ? values[1] : values[0]).fixed_payer_id).bank_id)[0].bank_division_id;
    floating_bank_division = bank_divisions.getBankDivisions(traders.get((values[1] ? values[1] : values[0]).floating_payer_id).bank_id)[0].bank_division_id;
  });

  $: key ??= 0;
  // Force brokerage fields to contain only valid characters in a valid format
  $: {
    let replace = parseFloat(values[key].bid_brokerage?.toString().match(/\d*\.?\d*/));
    values[key].bid_brokerage = values[key].bid_brokerage && ![".", "0"].includes(values[key].bid_brokerage.toString().at(-1))
      ? replace || replace === 0 ? replace : null // mid ternary handles parseF(null) returning NaN
      : values[key].bid_brokerage;
  } 
  $: {
    let replace = parseFloat(values[key].offer_brokerage?.toString().match(/\d*\.?\d*/));
    values[key].offer_brokerage = values[key].offer_brokerage && ![".", "0"].includes(values[key].offer_brokerage.toString().at(-1))
      ? replace || replace === 0 ? replace : null // mid ternary handles parseF(null) returning NaN
      : values[key].offer_brokerage;
  }

  $: isValidBrokerages = (!!values[key].bid_brokerage || values[key].bid_brokerage === 0) && values[key].bid_brokerage.toString().at(-1) != "." 
                      && (!!values[key].offer_brokerage || values[key].offer_brokerage === 0) && values[key].offer_brokerage.toString().at(-1) != ".";

  if (values[1]){
    fixed_payer = traders.get(values[1].fixed_payer_id);
    floating_payer = traders.get(values[1].floating_payer_id);
  } else {
    fixed_payer = traders.get(values[0].fixed_payer_id);
    floating_payer = traders.get(values[0].floating_payer_id);
  }

  function bic_handler(newBicId, bid_or_offer) {
    const bid = (bid_or_offer == 'bid' ? true : (bid_or_offer == 'offer' ? false : null));
    if(bid == null) return;
    const bicObj = bic.getBic(newBicId);
    if (bid)
      bic_bid = bicObj;
    else
      bic_offer = bicObj;
  }

</script>


<div style="display: flex; flex-direction: row; spacing: 10px">
  <div class="separator"><h5>Payer</h5></div>
  <div class="separator"><h5>Receiver</h5></div>
</div>
<StructuredList style="margin-bottom: 0;">
  <StructuredListBody>
    {#if !submitted && !confirm_checked}
    <StructuredListRow style="width:100%">
      <StructuredListCell head style="width:20%">{traders.fullName(fixed_payer)}</StructuredListCell>
      <StructuredListCell style="width:30%">
          <Select bind:selected={fixed_bank_division}>
            {#each bank_divisions.getBankDivisions(fixed_payer.bank_id) as div}
              <SelectItem value={div.bank_division_id} text={div.name}/>
            {/each}
          </Select>
        </StructuredListCell>
      <StructuredListCell head style="width:20%">{traders.fullName(floating_payer)}</StructuredListCell>
      <StructuredListCell style="width:30%">
          <Select bind:selected={floating_bank_division}>
            {#each bank_divisions.getBankDivisions(floating_payer.bank_id) as div}
              <SelectItem value={div.bank_division_id} text={div.name}/>
            {/each}
          </Select>
        </StructuredListCell>
    </StructuredListRow>
    <StructuredListRow>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
          <Select 
            selected={bic_bid.id} 
            on:update={e => bic_handler(e.detail, 'bid')}>
            {#each bic.getBankBics(bic_bid.bank_id) as bank_bic}
              <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
            {/each}
          </Select>
        </StructuredListCell>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
          <Select 
            selected={bic_offer.id} 
            on:update={e => bic_handler(e.detail, 'offer')}>
            {#each bic.getBankBics(bic_offer.bank_id) as bank_bic}
              <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
            {/each}
          </Select>
        </StructuredListCell>
    </StructuredListRow>
    {/if}

    {#if submitted}
      <StructuredListRow>
        <StructuredListCell head>{traders.fullName(traders.get(values[0].fixed_payer_id))}</StructuredListCell>
        <StructuredListCell>{bank_divisions.get(fixed_bank_division).name}</StructuredListCell>
        <StructuredListCell head>{traders.fullName(traders.get(values[0].floating_payer_id))}</StructuredListCell>
        <StructuredListCell>{bank_divisions.get(floating_bank_division).name}</StructuredListCell>
      </StructuredListRow>
    {/if}

    {#if values[1]}

      {#if confirm_checked}
      <StructuredListRow style="width:100%">
        <StructuredListCell head style="width:20%">{traders.fullName(traders.get(values[1].fixed_payer_id))}</StructuredListCell>
        <StructuredListCell style="width:30%">
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(fixed_bank_division).name}/></div>
        </StructuredListCell>
        <StructuredListCell head style="width:20%">{traders.fullName(traders.get(values[1].floating_payer_id))}</StructuredListCell>
        <StructuredListCell style="width:30%">
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(floating_bank_division).name}/></div>
        </StructuredListCell>
      </StructuredListRow>
      <StructuredListRow style="width:100%">
        <StructuredListCell head style="width:20%">Bic</StructuredListCell>
        <StructuredListCell style="width:30%">
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_bid.legalentity}/></div>
        </StructuredListCell>
        <StructuredListCell head style="width:20%">Bic</StructuredListCell>
        <StructuredListCell style="width:30%">
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_offer.legalentity}/></div>
        </StructuredListCell>
      </StructuredListRow>
      {/if}

      <StructuredListRow>
        <StructuredListCell/>
        <StructuredListCell/>
        <StructuredListCell head><p class="heading">Leg 1</p></StructuredListCell>
        <StructuredListCell/>
        <StructuredListCell/>
      </StructuredListRow>

      <StructuredListRow>
        <StructuredListCell head>Start Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[0].start_date) ?? ''}</StructuredListCell>
        <StructuredListCell head>Expiry Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[0].expiry_date) ?? ''}</StructuredListCell>
      </StructuredListRow>

      <StructuredListRow>
        <StructuredListCell head>Term</StructuredListCell>
        <StructuredListCell>{values[0].term ?? ''}</StructuredListCell>
        <StructuredListCell head>Rate</StructuredListCell>
        <StructuredListCell>{values[0].rate ?? ''}</StructuredListCell>
      </StructuredListRow>

      {#if isTenor(values[0].breaks)}
        <StructuredListRow>
          <StructuredListCell head>Breaks</StructuredListCell>
          <StructuredListCell>{values[0].breaks ?? ''}</StructuredListCell>
          <StructuredListCell head>Thereafter</StructuredListCell>
          <StructuredListCell>{values[0].thereafter?? ''}</StructuredListCell>
        </StructuredListRow>
      {/if}

      <StructuredListRow>
        <StructuredListCell/>
        <StructuredListCell/>
        <StructuredListCell head><p class="heading">Leg 2</p></StructuredListCell>
        <StructuredListCell/>
        <StructuredListCell/>
      </StructuredListRow>

      <StructuredListRow>
        <StructuredListCell head>Start Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[1].start_date) ?? ''}</StructuredListCell>
        <StructuredListCell head>Expiry Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[1].expiry_date) ?? ''}</StructuredListCell>
      </StructuredListRow>

      <StructuredListRow>
        <StructuredListCell head>Term</StructuredListCell>
        <StructuredListCell>{values[1].term ?? ''}</StructuredListCell>
        <StructuredListCell head>Rate</StructuredListCell>
        <StructuredListCell>{values[1].rate ?? ''}</StructuredListCell>
      </StructuredListRow>

      {#if isTenor(values[1].breaks)}
        <StructuredListRow>
          <StructuredListCell head>Breaks</StructuredListCell>
          <StructuredListCell>{values[1].breaks}</StructuredListCell>
          <StructuredListCell head>Thereafter</StructuredListCell>
          <StructuredListCell>{values[1].thereafter}</StructuredListCell>
        </StructuredListRow>
      {/if}
      
      <StructuredListRow>
        <StructuredListCell/>
        <StructuredListCell/>
        <StructuredListCell head><p class="heading">Details</p></StructuredListCell>
        <StructuredListCell/>
        <StructuredListCell/>
      </StructuredListRow>
      
    {:else}

      {#if confirm_checked}
      <StructuredListRow>
        <StructuredListCell head>{traders.fullName(traders.get(values[0].fixed_payer_id))}</StructuredListCell>
        <StructuredListCell>
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(fixed_bank_division).name}/></div>
        </StructuredListCell>
        <StructuredListCell head>{traders.fullName(traders.get(values[0].floating_payer_id))}</StructuredListCell>
        <StructuredListCell>
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(floating_bank_division).name}/></div>
        </StructuredListCell>
      </StructuredListRow>
      <StructuredListRow>
        <StructuredListCell head>Bic</StructuredListCell>
        <StructuredListCell>
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_bid.legalentity}/></div>
        </StructuredListCell>
        <StructuredListCell head>Bic</StructuredListCell>
        <StructuredListCell>
          <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_offer.legalentity}/></div>
        </StructuredListCell>
      </StructuredListRow>
      {/if}
  
      <StructuredListRow>
        <StructuredListCell head>Start Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[0].start_date) ?? ''}</StructuredListCell>
        <StructuredListCell head>Expiry Date</StructuredListCell>
        <StructuredListCell>{timestampToYearDate(values[0].expiry_date) ?? ''}</StructuredListCell>
      </StructuredListRow>

      <StructuredListRow>
        <StructuredListCell head>Term</StructuredListCell>
        <StructuredListCell>{values[0].term ?? ''}</StructuredListCell>
        <StructuredListCell head>Rate</StructuredListCell>
        <StructuredListCell>{values[0].rate ?? ''}</StructuredListCell>
      </StructuredListRow>

        {#if isTenor(values[0].breaks)}
          <StructuredListRow>
            <StructuredListCell head>Breaks</StructuredListCell>
            <StructuredListCell>{values[0].breaks}</StructuredListCell>
            <StructuredListCell head>Thereafter</StructuredListCell>
            <StructuredListCell>{values[0].thereafter}</StructuredListCell>
          </StructuredListRow>
        {/if}

    {/if}
    
    <StructuredListRow>
      <StructuredListCell head>Notional</StructuredListCell>
      <StructuredListCell>{(values[0].notional * 1000000).toLocaleString() ?? ''}</StructuredListCell>
      <StructuredListCell head>Product</StructuredListCell>
      <StructuredListCell>{values[0].rba?"RBA OIS":"OIS"}</StructuredListCell>
    </StructuredListRow>
    
    
    <StructuredListRow>
      <StructuredListCell head>SEF</StructuredListCell>
      <StructuredListCell>{values[0].sef?"ON":"OFF"}</StructuredListCell>
      <StructuredListCell head>Clearing House</StructuredListCell>
      <StructuredListCell>{values[0].clearhouse}</StructuredListCell>
    </StructuredListRow>
    
    {#if submitted}
    <StructuredListRow>
      <StructuredListCell head>Payer Brokerage</StructuredListCell>
      <StructuredListCell>{values[0].bid_brokerage ?? ''}</StructuredListCell>
      <StructuredListCell head>Receiver Brokerage</StructuredListCell>
      <StructuredListCell>{values[0].offer_brokerage ?? ''} </StructuredListCell>
    </StructuredListRow>
    {:else}
    <StructuredListRow style="width:100%">
      <StructuredListCell head style="width:20%">Payer Brokerage</StructuredListCell>
      <StructuredListCell style="width:30%">
        <div class="ticket_textinput">
          <TextInput 
          size="sm" 
          readonly={confirm_checked}
          placeholder="Deselect Textfield to Reset" 
            bind:value={values[key].bid_brokerage} 
            on:blur={e => {values[key].bid_brokerage = values[key].bid_brokerage || values[key].bid_brokerage === 0 ? +values[key].bid_brokerage : defaults.bid}}
            />
          </div>
      </StructuredListCell>
      <StructuredListCell head style="width:20%">Receiver Brokerage</StructuredListCell>     
      <StructuredListCell style="width:30%">
        <div class="ticket_textinput">
          <TextInput 
            size="sm" 
            readonly={confirm_checked}
            placeholder="Deselect Textfield to Reset" 
            bind:value={values[key].offer_brokerage} 
            on:blur={e => {values[key].offer_brokerage = values[key].offer_brokerage || values[key].offer_brokerage === 0 ? +values[key].offer_brokerage : defaults.offer}}
            />
        </div>
      </StructuredListCell>
    </StructuredListRow>
    {/if}
  </StructuredListBody>
</StructuredList>

<style>
  .ticket_textinput {
    width: 15rem;
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
</style>
