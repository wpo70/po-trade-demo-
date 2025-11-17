<script>
  import traders from "../stores/traders";
  import { ComboBox } from "carbon-components-svelte";

  export let invalid;
  export let selectedId;
  export let labelText = "Trader";

  const shouldFilterItem = (item, value) => {
    if (!value) return true;
    return item.text.toLowerCase().includes(value.toLowerCase());
  }

</script>
/**
*FIXME: this component is not completed and needed to be fixed before implementation.
*/
<ComboBox
  {invalid}
  invalidText="Please select a Trader"
  titleText={labelText}
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
  bind:selectedId={selectedId}
  {shouldFilterItem}
/>
