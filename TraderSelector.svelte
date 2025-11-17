<script>
  import CustomComboBox from "../../Utility/CustomComboBox.svelte";
  import traders from "../../../stores/traders";
  import preferences from "../../../stores/preferences";
  import brokers from "../../../stores/brokers";
  import user from "../../../stores/user";
  export let fields;
  export let order_ft;

  let currentuser = brokers.get(user.get());
  $: current_broker = $preferences.find((pref) => pref.broker_id == currentuser.broker_id);
  $: favourite_traders = current_broker.trader_favourites;

  function sortTraders() {
    let trader_arr = [];
    trader_arr = traders.getSortedTraders();
    if (order_ft?.trader_id && fields.opposingOrder) {
      let trader = traders.get(order_ft.trader_id);
      trader_arr = trader_arr.filter((t) => t.bank_id != trader.bank_id);
    }
    return trader_arr.map((trader) => {
      return {
        id: trader.trader_id,
        text: trader.name_with_bank,
        ...trader
      }
    });
  }
</script>

{#key favourite_traders, $traders}
  <CustomComboBox
    invalid={fields.trader.invalid}
    invalidText="Please select Trader"
    titleText="Trader"
    items={sortTraders()}
    bind:selectedId={fields.trader.id}
  />
{/key}

<style>

</style>