<script>
  import CustomComboBox from "../../CustomComboBox.svelte";
  import traders from "../../../stores/traders";

  export let fields;
  export let order_ft;

  let trader_selection = $traders;

  $: {
    if (order_ft?.trader_id && fields.opposingOrder) {
      let trader = traders.get(order_ft.trader_id);
      trader_selection = $traders.filter((t) => t.bank_id != trader.bank_id);
    }
  }

</script>

<CustomComboBox
  invalid={fields.trader.invalid}
  invalidText="Please select Trader"
  titleText="Trader"
  items={
    trader_selection.map(trader => {
      return {
        id: trader.trader_id,
        text: traders.fullName(trader),
        ...trader
      }
    })
  }
  bind:selectedId={fields.trader.id}
/>

<style>

</style>