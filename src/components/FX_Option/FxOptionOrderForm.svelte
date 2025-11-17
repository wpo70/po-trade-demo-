<script>

  import { Button } from "carbon-components-svelte";
  import AutoComplete from "simple-svelte-autocomplete";
  import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
  import { onMount } from "svelte";

  export let buy = undefined;
  export let base_currency = '';
  export let term_currency = '';

  const directions = ["Buy", "Sell"];

  const tenors = ["1d","2d","3d","4d","5d","1w","2w","3w","1m","2m","3m","4m","5m","6m","7m","8m","9m","10m","11m","1y","15m","18m","21m","2y","30m","3y","4y","5y",];

  const option_types = ["Put", "Call"];

  let fields = {
    direction: '',
    base_currency: '',
    term_currency: '',
    end_tenor: '',
    notional: '',
    strike: '',
    option_type: ''
  };

  const defaultValues = () => {
    if(buy !== undefined) {
      fields.direction = buy ? "Buy" : "Sell";
    } else {
      fields.direction = '';
    }
    fields.base_currency = base_currency;
    fields.term_currency = term_currency;
    fields.end_tenor = '';
    fields.notional = '';
    fields.strike = '';
    fields.option_type = '';
  };

  onMount(defaultValues);

  const handleSubmit = (event) => {
    defaultValues();
  };

</script>

<div class="container">
  <AutoComplete
    items={directions}
    bind:selectedItem={fields.direction}
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Direction" hideArrow/>

  <AutoComplete
    bind:selectedItem={fields.base_currency}
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Base Currency" hideArrow/>

  <AutoComplete
    bind:selectedItem={fields.term_currency}
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Term Currency" hideArrow/>

  <AutoComplete
    bind:selectedItem={fields.end_tenor}
    items={tenors}
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="End Tenor" hideArrow/>

  <AutoComplete
    bind:selectedItem={fields.notional}
    noResultsText = "Eg. 123m"
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Notional" hideArrow/>

  <AutoComplete
    bind:selectedItem={fields.strike}
    noResultsText = "Eg. 145"
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Strike" hideArrow/>

  <AutoComplete
    items={option_types}
    bind:selectedItem={fields.option_type}
    className="fx-option__input"
    inputClassName="fx-option__input-inner"
    placeholder="Option Type" hideArrow/>

  <Button kind="ghost"
    style="min-height: 1rem; min-width: 1rem;"
    icon={ChevronRight}
    iconDescription="Submit"
    on:click={handleSubmit}
    tooltipPosition="right"/>
</div>

<style>

.container {
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 10px;
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  height: fit-content;
}

:global(.fx-option__input) {
  padding: 5px;
  flex: 1;
  height: calc(24px + 10px) !important;
  font-size: var(--cds-label-02-font-size);
  min-width: 0 !important;
  width: 110px;
}

:global(.fx-option__input-inner) {
  background-color: var(--cds-layer);
  color: var(--cds-text-secondary);
  border: 0;
  height: 24px
}

:global(.fx-option__input:not(:first-child)) {
  border-left: 1px solid var(--cds-text-secondary);
}

</style>
