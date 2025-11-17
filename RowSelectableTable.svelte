<script>
  import { createEventDispatcher } from "svelte";

  export let x_labels;
  export let rows;
  export let color_fn = (val, x) => "";
  export let background_color_fn = (val, x) => "";
  export let aria_label= (val, x) => "";

  export let title = undefined;
  export let description = undefined;

  export let selectable = false;
  export let selected_row = null;

  export let y_scroll = 0;

  let table_container_ref;
  let table_ref;

  $: scrollTable(y_scroll);

  const dispatch = createEventDispatcher();

  const scrollTable = (value) => {
    if (!table_ref || !table_container_ref) {
      return;
    }
    table_container_ref.scrollTop = value;
  };

  const handleScroll = (event) => (y_scroll = event.target.scrollTop);

  const handleClick = (row) => {
    if (selected_row === row) {
      selected_row = null;
      return;
    }

    selected_row = row;
    dispatch("click", { row: row });
  };

</script>

<div class="selectable-table">
  {#if title || description}
    <div class="header" style="display: flex;">
      <table width="100%">
        <tr height="50px">
          <td style="vertical-align: middle;">
            {#if title}
              <h4 class:bx--data-table-header__title={true}>
                <strong>{title}</strong>
              </h4>
            {/if}
            {#if description}
              <p class:bx--data-table-header__description={true}>
                {description}
              </p>
            {/if}
          </td>

          {#if $$slots.button}
            <td style="text-align:right;">
              <slot name="button" />
            </td>
          {/if}
        </tr>
      </table>
    </div>
  {/if}

  <div
    class="table-container"
    bind:this={table_container_ref}
    on:scroll={handleScroll}
  >
  <div class="table-scroll">
    <table bind:this={table_ref}>
      <tr>
        {#each x_labels as x}
          <th aria-label={aria_label("",x)} style="padding-top:5px; padding-bottom:5px; padding-left: 5px; padding-right:5px;  white-space: nowrap; position: sticky; top: 0;}">{x}</th>
        {/each}
      </tr>

      {#each rows as row, row_idx}
        <tr
          tabindex={selectable ? "-1" : ""}
          on:click={() => handleClick(row_idx)}
          on:keydown={() => handleClick(row_idx)}
        >
          {#each x_labels as x, cell_idx}
            <td
              style:color={color_fn(row, x)}
              style:background-color={background_color_fn(row, x)}
              aria-label={aria_label(row,x)}
            >
              <div class="inner-table-cell">
                <!-- Border -->
                <!--
                  NOTE: ended up using absolutely positioned divs to handle
                  the borders, as there were issues involving:
                    - border (was expanding the row by 2px every time it was clicked)
                    - outline (would be hidden under the sticky header row)
                    - box shadow (was appearing under td background color even after
                                  changing z-index on firefox)
                -->
                {#if row_idx === selected_row}
                  <div class="border-top"/>
                  <div class="border-bottom"/>
                  {#if cell_idx === x_labels.length - 1}
                    <div class="border-right"/>
                  {:else if cell_idx === 0}
                    <div class="border-left"/>
                  {/if}
                {/if}

                <!-- Cell value -->
                {row[x]}
              </div>
            </td>
          {/each}
        </tr>
      {/each}
    </table>
  </div>
  </div>
</div>

<style>
  td {
    height: 100%;
  }

  th {
    font-weight: bold;
    background-color: var(--cds-ui-03);
    position: sticky;
    top: 0;
  }

  .table-container table {
    /* table-layout: fixed; */
    width: 100%;
    height: 100%;
    cursor: pointer;

  }
  .table-scroll table {
    height: 100%;
  }

  td[aria-label = "sticky-col-swaption"] div.inner-table-cell:has(div.border-bottom){
    border: var(--cds-hover-primary-text) solid 2px;
    color: var(--cds-link-01,  #0f62fe); 
    font-weight: bold;
    display: block;
    box-shadow: 5px 10px 8px #888888;
  }
  td[aria-label = "sticky-col-swaption"] div.inner-table-cell:has(div.border-bottom):before {
    content: "⮞" ;
    background-size: 20px 20px;
    position:absolute;
    width:20px;
    height:20px;
    margin-left:-75px;
  }
  .inner-table-cell:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  .selectable-table {
    border: 1px solid var(--cds-text-secondary);
    overflow-y: scroll;
    overflow-x: auto;
    height: 100%;
    border-collapse: collapse;
  }

  tr:hover .inner-table-cell {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .inner-table-cell {
    white-space: nowrap;
    padding-left: 12px; 
    padding-right:12px;
    padding-top:5px; 
    padding-bottom:5px;
    text-align: center;
    overflow: hidden;
    width: 100%;
    height: 100%;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none;
  }
  /* td[aria-label="yes"] { */
  :global(td[aria-label = "sticky-col-swaption"], th[aria-label = "sticky-col-swaption"]) {
  position: -webkit-sticky;
  position: sticky;
  left: 0px;
  background-color: inherit;
  z-index: 100;
  background-color: var(--cds-ui-03);
  }
 
  .header {
    font-size: large;
    font-weight: bold;
    padding-top: 5px;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
</style>
