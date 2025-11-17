<script>
  /**
   * @event {{ index: Integer; value: any }} change
   */
  import CaretLeft from "carbon-icons-svelte/lib/CaretLeft.svelte";
  import { createEventDispatcher } from "svelte";
  
  const dispatch = createEventDispatcher();

  /** Obtain a reference to the option cycler element */
  export let ref = null;

  /**
   *  The list to cycle through
   *  @type {Array}
   */
  export let option_list = [];

  /** The index position of the selected item in the option_list */
  export let index = 0;

  /** The value/item that is currently selected. ie. value = option_list[index] */
  export let value = undefined;

  /** Specify an item from the given option list to use as the initial value. Uses the first indexed value if unspecified. */
  export let initial_value = undefined;

  /**
   * Set the size of the option cycler. Uses the deafult size if unspecified.
   * @type {"sm" | "xl"}
   */
  export let size = undefined;

  /** The width value for the <h6> tag which contains the item text. Uses all of the available width if unspecified. */
  export let display_width = null;

  /** String css style list for style which are applied to the <h6> element */
  export let text_style = "";

  /** The function used to format the display text for the selected item */
  export let textFormatter = (val) => {
    return val + "";
  }

  /* Note: restProps are passed to the highest level div */

  if (initial_value) {
    let ret = option_list.findIndex(f => f == initial_value);
    index = ret != -1 ? ret : 0;
  }
  value = option_list[index];

  function cycle(increment) {
    index += increment;
    if (index < 0) { index = option_list.length - 1; }
    else if (index > option_list.length - 1) { index = 0; }
    value = option_list[index];
    dispatch("change", {index, value});
  }
</script>

<div
  bind:this={ref}
  class={"option_cycler " + ($$restProps.class ?? "")}
  class:cycler_full_width={!display_width}
  class:cycler_sm={size === "sm"}
  class:cycler_xl={size === "xl"}
  {...$$restProps}
  >
  
  <button class="arrow_btn" class:arrow_btn_sm={size === "sm"} on:click={() => cycle(-1)}><CaretLeft size=24 style="vertical-align: sub;"/></button>
  <h6 class="text_display" style="--text-width:{display_width ?? "max-content"}; {text_style}">{textFormatter(value)}</h6>
  <button class="arrow_btn" class:arrow_btn_sm={size === "sm"} on:click={() => cycle(1)}><CaretLeft size=24 style="vertical-align: sub; transform: rotate(180deg);"/></button>
</div>

<style>
  .option_cycler {
    display: flex;
    gap: 10px;
    align-items: center;
    height: 2.5rem;
  }
  .cycler_full_width {
    justify-content: space-between;
  }
  .cycler_sm {
    height: 2rem;
  }
  .cycler_xl {
    height: 3rem;
  }
  .arrow_btn {
    background-color: var(--cds-ui-01, #262626);
    color: var(--cds-text-02, #525252);
    width: 2rem;
    height: 2rem;
    border-style: groove;
    padding: 0;
    cursor: pointer;
    &:hover {
      background-color: var(--cds-hover-ui);
    }
    &:active {
      background-color: var(--cds-active-01);
    }
  }
  .arrow_btn_sm {
    width: fit-content;
    height: fit-content;
  }
  .text_display {
    align-self: center;
    width: var(--text-width);
    text-align: center;
  }
</style>

