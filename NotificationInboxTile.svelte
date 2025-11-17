<script>
  import { afterUpdate } from "svelte";

  import { ExpandableTile } from "carbon-components-svelte"; // Aspects of this elements (such as its classes) are being used by this element
  import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";

  export let expandable = true;
  export let inbox_width;
  
  $: adjustForWidthChange(inbox_width);
  function adjustForWidthChange() {
    tileMaxHeight = 0;
  }
  
  let refTile = null;
  let refAbove = null;
  let refBelow = null;
  
  let expanded = false;
  let tileHeight = 0;
  let tileMaxHeight = 0;
  let tilePadding = 0;

  afterUpdate(() => {
    if (tileHeight === 0) {
      tileHeight = refAbove.getBoundingClientRect().height;
    }
    if (tileMaxHeight === 0) {
      tileMaxHeight = tileHeight + refBelow.getBoundingClientRect().height + 1;
    }

    const style = getComputedStyle(refTile);

    tilePadding =
      parseInt(style.getPropertyValue("padding-top"), 10) +
      parseInt(style.getPropertyValue("padding-bottom"), 10);
  });

  function handleClick() {
    if (expandable) { expanded = !expanded; }
  }
</script>

<div
  bind:this={refTile}
  class="tile"
  class:bx--tile="{true}"
  class:bx--tile--expandable="{expandable}"
  class:tile_expanded="{expandable && expanded}"
  {...$$restProps}
  style="{expanded ? `${$$restProps.style}; max-height: ${tileMaxHeight + tilePadding}px` : `${$$restProps.style}; max-height: ${tileHeight + tilePadding}px`}"
  on:click
  on:click={handleClick}
>
  <div>
    <div bind:this={refAbove} style="width:100%; height:100%;">
      <span style="display:block;">
        <slot name="above" />
      </span>
    </div>
    {#if expandable}
      <div class="chevron">
        <ChevronDown/>
      </div>
    {/if}
    <div bind:this={refBelow} style="width:100%; height:100%;">
      <span class="tile_below">
        <slot name="below" />
      </span>
    </div>
  </div>
</div>

<style>
  .tile {
    width: 100%;
    transition: max-height 150ms cubic-bezier(0.2, 0, 0.38, 0.9) !important;
  }

  .tile_below {
    display: block;
    opacity: 0;
    transition: opacity 150ms cubic-bezier(0.2, 0, 0.38, 0.9), visibility 160ms step-end;
    visibility: hidden;
  }

  .tile_expanded .tile_below {
    opacity: 1;
    transition: opacity 150ms cubic-bezier(0.2, 0, 0.38, 0.9), visibility 160ms step-start;
    visibility: inherit;
  }

  .chevron {
    position:absolute;
    right:1rem;
    bottom:1rem;
    height:1rem;
    display:flex;
    align-items:flex-end; 
    background: rgba(0,0,0,0);
    transition: 150ms cubic-bezier(0.2, 0, 0.38, 0.9);
  }
  .tile_expanded .chevron {
    transform: rotate(180deg);
  }
</style>