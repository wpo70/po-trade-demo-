<script>
  import { TextInput } from "carbon-components-svelte";

  export let fields;

</script>


{#if fields.offer_selector !== 'two'}
  <TextInput
    bind:value={fields.price.str}
    bind:dirty={fields.price.dirty}
    bind:invalid={fields.price.invalid}
    labelText={fields.interest ? "Price (optional)" : "Price"}
    invalidText={fields.price.error_message}
    readonly={fields.opposingOrder} 
  />
{:else}
  <div class="two_way_container">
    <TextInput
      bind:value={fields.offer_price.str}
      bind:dirty={fields.offer_price.dirty}
      bind:invalid={fields.offer_price.invalid}
      labelText={fields.interest ? "Offer Price (optional)" : "Offer Price"}
      invalidText={fields.offer_price.error_message}
    />
    <TextInput
      bind:value={fields.bid_price.str}
      bind:dirty={fields.bid_price.dirty}
      bind:invalid={fields.bid_price.invalid}
      labelText={fields.interest ? "Bid Price (optional)" : "Bid Price"}
      invalidText={fields.bid_price.error_message}
    />
  </div>
{/if}


<style>

.two_way_container {
  display: flex;
  gap: 16px;
}

</style>