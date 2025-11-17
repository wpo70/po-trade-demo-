<script>

  import { Button, Select, SelectItem } from "carbon-components-svelte";
  import { onMount } from "svelte";
  import FxOptionCurrency from "./FxOptionCurrency.svelte";

  const currencies = ["USD", "JPY", "AUD", "EUR", "GBP"];

  let selected_currency = [];

  let selected_base_currency;
  let selected_term_currency;
  let id = 1;

  selected_base_currency = currencies[0];
  selected_term_currency = currencies[0];

  const handleClose = (id) => {
    selected_currency = selected_currency.filter(curr => curr.id !== id);
  };

  const addCurrency = (base, term) => {
    for (let currency of selected_currency){
      if (currency.base_currency === base && currency.term_currency === term){
        return;
      }
    }
    if(base && term) {
      selected_currency.push({
        base_currency: base,
        term_currency: term,
        id: id++
      });
      selected_currency = selected_currency;
    }
  };

  onMount(() => {
    addCurrency('USD', 'JPY');
    addCurrency('USD', 'EUR');
    addCurrency('USD', 'GBP');
  });

</script>

<div class="fx-option">
  <div class="fx-option__header">
    <Select
      bind:selected={selected_base_currency}
      labelText="Base Currency">
      {#each currencies as curr}
        <SelectItem value={curr}/>
      {/each}
    </Select>

    <Select
      bind:selected={selected_term_currency}
      labelText="Term Currency">
      {#each currencies as curr}
        <SelectItem value={curr}/>
      {/each}
    </Select>

    <Button
      style="margin-bottom: -8px;"
      on:click={() => addCurrency(selected_base_currency, selected_term_currency)}>
      Add
    </Button>
  </div>

  <div class="fx-option__main-content">
    {#each selected_currency as curr (curr.id)}
      <FxOptionCurrency
        base_currency={curr.base_currency}
        term_currency={curr.term_currency}
        on:close={() => handleClose(curr.id)}/>
    {/each}
  </div>
</div>


<style>

.fx-option {
  padding: 20px;
}

.fx-option__main-content {
  display: grid;
  grid-auto-flow: 2 1;
  gap: 1rem;
  width: 100%;
  grid-template-columns: repeat(2, 1fr);
}

.fx-option__header {
  display: flex;
  padding: 20px;
  background-color: var(--cds-layer);
  justify-content: center;
  align-items: center;
  width: 500px;
  margin-bottom: 20px;
}

</style>


