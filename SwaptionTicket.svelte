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

  import { timestampToYearDate } from "../../common/formatting.js";

  import { getSwaptionBrokerageCap } from "../../common/brokerages.js";

  import traders from "../../stores/traders";
  import bank_divisions from "../../stores/bank_divisions";
  import bic from '../../stores/bic';
  import { onMount } from "svelte";

  export let values;

  export let buyer_bank_division = bank_divisions.getBankDivisions(values.buyer.bank_id)[0].bank_division_id;
  export let seller_bank_division = bank_divisions.getBankDivisions(values.seller.bank_id)[0].bank_division_id;

  export let bic_buyer;
  export let bic_seller;

  export let submitted = false;

  export let confirm_checked = false;
  export let isValidBrokerages = false;

  export let buy_bkge_default = 0;
  export let sell_bkge_default = 0;

  // Force brokerage fields to contain only valid characters in a valid format
  $: {
    let replace = parseFloat(values.buyer_brokerage?.toString().match(/\d*\.?\d*/));
    values.buyer_brokerage = values.buyer_brokerage && ![".", "0"].includes(values.buyer_brokerage.toString().at(-1))
      ? replace || replace === 0 ? replace : null // mid ternary handles parseF(null) returning NaN
      : values.buyer_brokerage;
  }
  $: {
    let replace = parseFloat(values.seller_brokerage?.toString().match(/\d*\.?\d*/));
    values.seller_brokerage = values.seller_brokerage && ![".", "0"].includes(values.seller_brokerage.toString().at(-1))
      ? replace || replace === 0 ? replace : null // mid ternary handles parseF(null) returning NaN
      : values.seller_brokerage;
  }

  $: isValidBrokerages = (!!values.buyer_brokerage || values.buyer_brokerage === 0) && values.buyer_brokerage.toString().at(-1) != "." 
                      && (!!values.seller_brokerage || values.seller_brokerage === 0) && values.seller_brokerage.toString().at(-1) != ".";


  function bic_handler(newBicId, buyer_or_seller) {
    const bid = (buyer_or_seller == 'buyer' ? true : (buyer_or_seller == 'seller' ? false : null));
    if(bid == null) return;
    const bicObj = bic.getBic(newBicId);
    if (bid)
      bic_buyer = bicObj;
    else
      bic_seller = bicObj;
  }
</script>


<div style="display: flex; flex-direction: row; spacing: 10px">
  <div class="separator"><h5>Buyer</h5></div>
  <div class="separator"><h5>Seller</h5></div>
</div>
<StructuredList style="margin-bottom: 0;">
  <StructuredListBody>

    {#if !submitted && !confirm_checked}
    <StructuredListRow>
      <StructuredListCell head>{traders.fullName(values.buyer)}</StructuredListCell>
      <StructuredListCell>
        <Select bind:selected={buyer_bank_division}>
          {#each bank_divisions.getBankDivisions(values.buyer.bank_id) as div}
            <SelectItem value={div.bank_division_id} text={div.name}/>
          {/each}
        </Select>
      </StructuredListCell>
      <StructuredListCell head>{traders.fullName(values.seller)}</StructuredListCell>
      <StructuredListCell>
        <Select bind:selected={seller_bank_division}>
          {#each bank_divisions.getBankDivisions(values.seller.bank_id) as div}
            <SelectItem value={div.bank_division_id} text={div.name}/>
          {/each}
        </Select>
      </StructuredListCell>
    </StructuredListRow>
    <StructuredListRow>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
        <Select 
          selected={bic_buyer.id} 
          on:update={e => bic_handler(e.detail, 'buyer')}>
          {#each bic.getBankBics(bic_buyer.bank_id) as bank_bic}
            <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
          {/each}
        </Select>
      </StructuredListCell>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
        <Select 
          selected={bic_seller.id} 
          on:update={e => bic_handler(e.detail, 'seller')}>
          {#each bic.getBankBics(bic_seller.bank_id) as bank_bic}
            <SelectItem value={bank_bic.id} text={bank_bic.legalentity}/>
          {/each}
        </Select>
      </StructuredListCell>
    </StructuredListRow>
    {/if}

    {#if submitted}
    <StructuredListRow>
      <StructuredListCell head>{traders.fullName(traders.get(values.buyer_id))}</StructuredListCell>
      <StructuredListCell>{bank_divisions.get(buyer_bank_division).name}</StructuredListCell>
      <StructuredListCell head>{traders.fullName(traders.get(values.seller_id))}</StructuredListCell>
      <StructuredListCell>{bank_divisions.get(seller_bank_division).name}</StructuredListCell>
    </StructuredListRow>
    {/if}

    {#if confirm_checked}
    <StructuredListRow>
      <StructuredListCell head>{traders.fullName(values.buyer)}</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(buyer_bank_division).name}/></div>
      </StructuredListCell>
      <StructuredListCell head>{traders.fullName(values.seller)}</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput"><TextInput size="sm" readonly value={bank_divisions.get(seller_bank_division).name}/></div>
      </StructuredListCell>
    </StructuredListRow>
    <StructuredListRow>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_buyer.legalentity}/></div>
      </StructuredListCell>
      <StructuredListCell head>Bic</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput"><TextInput size="sm" readonly value={bic_seller.legalentity}/></div>
      </StructuredListCell>
    </StructuredListRow>
    {/if}

    <StructuredListRow>
      <StructuredListCell head>Option Type</StructuredListCell>
      <StructuredListCell>{values.option_type ?? ''}</StructuredListCell>
      <StructuredListCell head>Date</StructuredListCell>
      <StructuredListCell>{timestampToYearDate(values.date) ?? ''}</StructuredListCell>
    </StructuredListRow>

    <StructuredListRow>
      <StructuredListCell head>Notional</StructuredListCell>
      <StructuredListCell>{(values.notional * 1000000).toLocaleString() ?? ''}</StructuredListCell>
      <StructuredListCell head>Strike Rate</StructuredListCell>
      <StructuredListCell>{values.strike_rate ?? ''}</StructuredListCell>
    </StructuredListRow>

    <StructuredListRow>
      <StructuredListCell head>Option Expiry</StructuredListCell>
      <StructuredListCell>{values.option_expiry ?? ''}</StructuredListCell>
      <StructuredListCell head>Swap Term</StructuredListCell>
      <StructuredListCell>{values.swap_term ?? ''}</StructuredListCell>
    </StructuredListRow>


    <StructuredListRow>
      <StructuredListCell head>Swap Start Date</StructuredListCell>
      <StructuredListCell>{timestampToYearDate(values.swap_start_date) ?? ''}</StructuredListCell>
      <StructuredListCell head>Premium Date</StructuredListCell>
      <StructuredListCell>{timestampToYearDate(values.premium_date) ?? ''}</StructuredListCell>
    </StructuredListRow>

    <StructuredListRow>
      <StructuredListCell head>Expiry Date</StructuredListCell>
      <StructuredListCell>{timestampToYearDate(values.expiry_date) ?? ''}</StructuredListCell>
      <StructuredListCell head>Premium BP</StructuredListCell>
      <StructuredListCell>{values.premium_bp ?? ''}</StructuredListCell>
    </StructuredListRow>

    <StructuredListRow>
      <StructuredListCell head>Settlement</StructuredListCell>
      <StructuredListCell>{values.settlement ?? ''}</StructuredListCell>
      <StructuredListCell head>Swap Maturity Date</StructuredListCell>
      {#if values.swap_maturity_date instanceof Date}
        <StructuredListCell>{timestampToYearDate(values.swap_maturity_date) ?? ''}</StructuredListCell>
      {:else}
        <StructuredListCell>{values.swap_maturity_date ?? ''}</StructuredListCell>
      {/if}
    </StructuredListRow>

    <StructuredListRow>
      <StructuredListCell head>Spot or Fwd</StructuredListCell>
      <StructuredListCell>{values.spot_or_fwd ?? ''}</StructuredListCell>
      <StructuredListCell head>SEF</StructuredListCell>
      <StructuredListCell>{values.sef?"ON":"OFF"}</StructuredListCell>
    </StructuredListRow>

    {#if submitted}
    <StructuredListRow>
      <StructuredListCell head>Buyer Brokerage</StructuredListCell>
      <StructuredListCell>{values.buyer_brokerage ?? ''}</StructuredListCell>
      <StructuredListCell head>Seller Brokerage</StructuredListCell>
      <StructuredListCell>{values.seller_brokerage ?? ''} </StructuredListCell>
    </StructuredListRow>
    {:else}
    <StructuredListRow>
      <StructuredListCell head>Buyer Brokerage</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput">
          <TextInput 
          size="sm" 
          readonly={confirm_checked}
          placeholder="Deselect Textfield to Reset" 
          bind:value={values.buyer_brokerage}
          on:blur={e => {values.buyer_brokerage = values.buyer_brokerage || values.buyer_brokerage === 0 ? +values.buyer_brokerage : buy_bkge_default}}
          warn={!submitted && getSwaptionBrokerageCap(values.buyer.bank_id) !== -1 && values.buyer_brokerage > getSwaptionBrokerageCap(values.buyer.bank_id)}
          warnText="Brokerage exceeds agreed cap"
          />
        </div>
      </StructuredListCell>
      <StructuredListCell head>Seller Brokerage</StructuredListCell>
      <StructuredListCell>
        <div class="ticket_textinput">
          <TextInput 
          size="sm" 
          readonly={confirm_checked}
          placeholder="Deselect Textfield to Reset" 
          bind:value={values.seller_brokerage} 
          on:blur={e => {values.seller_brokerage = values.seller_brokerage || values.seller_brokerage === 0 ? +values.seller_brokerage : sell_bkge_default}}
          warn={!submitted && getSwaptionBrokerageCap(values.seller.bank_id) !== -1 && values.seller_brokerage > getSwaptionBrokerageCap(values.seller.bank_id)}
          warnText="Brokerage exceeds agreed cap"
          />
        </div>
      </StructuredListCell>
    </StructuredListRow>
    {/if}

    {#if values.thereafter && values.breaks}
    <StructuredListRow>
      <StructuredListCell head>Break Clause</StructuredListCell>
      <StructuredListCell>{values.breaks ?? ''}</StructuredListCell>
      <StructuredListCell head>Thereafter</StructuredListCell>
      <StructuredListCell>{values.thereafter ?? ''}</StructuredListCell>
    </StructuredListRow>
    {/if}
      
    <StructuredListRow>
      <StructuredListCell head>Clearing House</StructuredListCell>
      <StructuredListCell>{values.clearhouse ?? ''}</StructuredListCell>
    </StructuredListRow>
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
