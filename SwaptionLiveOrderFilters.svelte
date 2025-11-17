<script>
  import { onMount } from "svelte";
  import { Modal, Tag, TextInput, Tile } from "carbon-components-svelte";

  import Validator from "../../common/validator";
  import { tenorToYear } from "../../common/formatting";

  import user_options from "../../stores/user_options";
  import swaption_filters from "../../stores/swaption_filters";

  export let open;

  let swapTermField = new Validator();
  let optionExpiryField = new Validator();

  onMount(() => {
    if ($user_options.swaptionSwapTenors === undefined) {
      $user_options.swaptionSwapTenors = $swaption_filters.swap_tenor.all;
    }

    if ($user_options.swaptionOptionTenors === undefined) {
      $user_options.swaptionOptionTenors = $swaption_filters.option_tenor.all;
    }
  });

  const handleSwapTermSubmit = (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    swapTermField.dirty = true;

    if (swapTermField.isInvalid(Validator.scanTenorShape)) {
      swapTermField.reset();
      return;
    }

    // if there is no alphabetic character at the end of the tenor, we
    // can assume its a year tenor
    if (!swapTermField.value.slice(-1).match(/[a-z]/i)) {
      swapTermField.value = swapTermField.value + "y";
    }

    $user_options.swaptionSwapTenors = addTenor(
      $user_options.swaptionSwapTenors,
      swapTermField.value
    );

    swaption_filters.addAllTenor(swapTermField.value, undefined);

    swapTermField.reset();
    swapTermField = swapTermField;
  };

  const handleOptionExpirySubmit = (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    optionExpiryField.dirty = true;

    if (optionExpiryField.isInvalid(Validator.scanTenorShape)) {
      optionExpiryField.reset();
      return;
    }

    // if there is no alphabetic character at the end of the tenor, we
    // can assume its a year tenor
    if (!optionExpiryField.value.slice(-1).match(/[a-z]/i)) {
      optionExpiryField.value = optionExpiryField.value + "y";
    }

    $user_options.swaptionOptionTenors = addTenor(
      $user_options.swaptionOptionTenors,
      optionExpiryField.value
    );

    swaption_filters.addAllTenor(undefined, optionExpiryField.value);

    optionExpiryField.reset();
    optionExpiryField = optionExpiryField;
  };

  const addTenor = (arr, tenor) => {
    if (Array.isArray(arr)) {
      // add the tenor and ensure there are no duplicates
      arr = Array.from(new Set([...arr, tenor]));

      // sort the added tenors
      arr.sort((a, b) => tenorToYear(a) - tenorToYear(b));
    } else {
      arr = [tenor];
    }

    return arr;
  };

  const removeTenor = (arr, tenor) => {
    return arr.filter((el) => el !== tenor);
  };
</script>

<Modal bind:open size="sm" passiveModal modalHeading="Filters">
  <h4>Swap Term</h4>

  <TextInput
    bind:value={swapTermField.str}
    on:keyup={handleSwapTermSubmit}
    placeholder="Enter a tenor"
  />

  <Tile>
    <h6>Filters:</h6>
    {#each $swaption_filters.swap_tenor.all as swapTerm}
      {#if $user_options.swaptionSwapTenors && $user_options.swaptionSwapTenors.includes(swapTerm)}
        <Tag
          filter
          type={$swaption_filters.swap_tenor.priced.includes(swapTerm)
            ? "green"
            : "grey"}
          on:close={() => {
            $user_options.swaptionSwapTenors = removeTenor(
              $user_options.swaptionSwapTenors,
              swapTerm
            );
          }}
        >
          {swapTerm}
        </Tag>
      {:else}
        <Tag
          interactive
          type={$swaption_filters.swap_tenor.priced.includes(swapTerm)
            ? "green"
            : "red"}
          on:click={() => {
            $user_options.swaptionSwapTenors = addTenor(
              $user_options.swaptionSwapTenors,
              swapTerm
            );
          }}
        >
          {swapTerm}
        </Tag>
      {/if}
    {/each}
  </Tile>

  <h4>Option Expiry</h4>

  <TextInput
    bind:value={optionExpiryField.str}
    on:keyup={handleOptionExpirySubmit}
    placeholder="Enter a tenor"
  />

  <Tile>
    <h6>Filters:</h6>

    {#each $swaption_filters.option_tenor.all as optionExpiry}
      {#if $user_options.swaptionOptionTenors && $user_options.swaptionOptionTenors.includes(optionExpiry)}
        <Tag
          filter
          on:close={() => {
            $user_options.swaptionOptionTenors = removeTenor(
              $user_options.swaptionOptionTenors,
              optionExpiry
            );
          }}
        >
          {optionExpiry}
        </Tag>
      {:else}
        <Tag
          interactive
          type={$swaption_filters.option_tenor.priced.includes(optionExpiry)
            ? "green"
            : "red"}
          on:click={() => {
            $user_options.swaptionOptionTenors = addTenor(
              $user_options.swaptionOptionTenors,
              optionExpiry
            );
          }}
        >
          {optionExpiry}
        </Tag>
      {/if}
    {/each}
  </Tile>
</Modal>

<style>
</style>
