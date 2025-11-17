<script>
  import { createEventDispatcher } from "svelte";

  import { crossfade } from "svelte/transition";
  import { expoInOut } from "svelte/easing";
  import { TooltipDefinition } from "carbon-components-svelte";

  /**
   * @typedef CellData
   * @type {object}
   * @property {string | string[]} value
   * @property {string} [tooltip]
   * @property {string} [id] uniquely identifies the cell in the case that there are 2 values in the cell
   */

  /**
   * @typedef Cells
   * @type {Record<string, Record<string, CellData>>}
   */

  /** @type {string[]} */
  export let y_labels;

  /** @type {string[]} */
  export let x_labels;

  /** @type {Cells} */
  export let cells;

  export let color_fn = (val, x, y) => "";
  export let background_color_fn = (val, x, y) => "";

  /** @type {string | undefined} */
  export let title = undefined;

  /** @type {string | undefined} */
  export let description = undefined;

  export let selectable = false;

  /** @type {string | undefined} */
  export let selected_x = null;

  /** @type {string | undefined} */
  export let selected_y = null;

  /** @type {string | undefined} */
  export let selected_id = null;

  export let y_scroll = 0;

  let table_container_ref;
  let table_ref;

  /** @type { x: string, y: string, id: number }  */
  let hovered_cell;

  $: scrollTable(y_scroll);

  const dispatch = createEventDispatcher();

  const [send, receive] = crossfade({
    duration: (d) => Math.sqrt(d * 200),

    fallback(node, params) {
      const style = getComputedStyle(node);
      const transform = style.transform === "none" ? "" : style.transform;

      return {
        duration: transform === "" ? 150 : 600,
        easing: expoInOut,
        css: (t) => `
          transform: ${transform} scale(${t});
          opacity: ${t}
        `,
      };
    },
  });

  const scrollTable = (value) => {
    if (!table_ref || !table_container_ref) {
      return;
    }
    table_container_ref.scrollTop = value;
  };

  const handleScroll = (event) => (y_scroll = event.target.scrollTop);

  const handleClick = (x, y, id) => {
    if (selected_x === x && selected_y === y) {
      if (id == undefined) {
        selected_x = null;
        selected_y = null;
        dispatch("click", { x: null, y: null });
        return;
      } else if (selected_id === id) {
        selected_x = null;
        selected_y = null;
        selected_id = null;
        dispatch("click", { x: null, y: null });
        return;
      }
    }
    selected_x = x;
    selected_y = y;
    if (id) selected_id = id;
    dispatch("click", { x: x, y: y, id: id });
  };

  const handleHover = (event, x, y, id) => {
    const dispatchedEvent = {
      x: x,
      y: y,
      id: id,
      mouse: event,
    };
    hovered_cell = dispatchedEvent;
    dispatch("hover", dispatchedEvent);
  };
</script>

<div class="cell-selectable-table">
  {#if title || description}
    <div class="header" style="display: flex;">
      <table width="100%">
        <tr height="40px">
          <td style="vertical-align: middle;">
            {#if title}
              <h5 class:bx--data-table-header__title={true}>
                <strong>{title}</strong>
              </h5>
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
    <table bind:this={table_ref} style="border-bottom: 1px solid var(--cds-text-secondary); padding-top: 2px; padding-bottom:4px;">
      <tr>
        <th />
        {#each x_labels as x}
          <th colspan="2">{x}</th>
        {/each}
      </tr>
      {#each y_labels as y, y_idx}
        <tr>
          <th>{y}</th>
          {#each x_labels as x, x_idx}
            {#if cells[x]?.[y]}
              {#if Array.isArray(cells[x][y])}
                {#each cells[x][y] as cell}
                  <td
                    tabindex="-1"
                    style:color={color_fn(cell.value, x, y, 0)}
                    style:background-color={background_color_fn(cell, x, y)}
                    on:click={() => handleClick(x, y, cell.id)}
                    on:keydown={() => handleClick(x, y, cell.id)}
                    on:mouseover={(e) => handleHover(e, x, y, cell.id)}
                    on:focus={(e) => handleHover(e, x, y, cell.id)}
                  >
                    <div class="inner-table-cell">
                      {#if cell.tooltip}
                      <div>
                        <TooltipDefinition
                          align={x_idx === 0
                            ? "start"
                            : x_idx === x_labels.length - 1
                            ? "end"
                            : "center"}
                          direction={y_idx === y_labels.length - 1
                            ? "top"
                            : "bottom"}
                         
                          open={hovered_cell?.x === x && hovered_cell?.y === y && hovered_cell?.id === cell.id}
                        >
                      
                          {cell.value}
                        <span slot="tooltip" style="color: blue;  z-index:999; background-color: inherit;  opacity: 1;   position: relative">
                           {cell.tooltip}
                        </span>
                        </TooltipDefinition>
                      </div>
                      {:else}
                        {cell.value}
                      {/if}
                      {#if selectable && selected_x === x && selected_y === y && selected_id === cell.id}
                        <div
                          class="selected"
                          in:receive={{ key: 1 }}
                          out:send={{ key: 1 }}
                        />
                      {/if}
                    </div>
                  </td>
                {/each}
              {:else}
                <td
                  colspan="2"
                  tabindex="-1"
                  style:color={color_fn(cells[x][y].value, x, y)}
                  style:background-color={background_color_fn(
                    cells[x][y].value,
                    x,
                    y
                  )}
                  on:click={() => handleClick(x, y)}
                  on:keydown={() => handleClick(x, y)}
                  on:mouseover={(e) => handleHover(e, x, y)}
                  on:focus={(e) => handleHover(e, x, y)}
                >
                  <div class="inner-table-cell">
                    {cells[x][y].value}
                    {#if selectable && selected_x === x && selected_y === y}
                      <div
                        class="selected"
                        in:receive={{ key: 1 }}
                        out:send={{ key: 1 }}
                      />
                    {/if}
                  </div>
                </td>
              {/if}
            {:else}
              <td
                colspan="2"
                style:color={color_fn(null, x, y)}
                style:background-color={background_color_fn(null, x, y)}
                on:mouseover={(e) => handleHover(e, x, y)}
                on:focus={(e) => handleHover(e, x, y)}
              >
                <div class="inner-table-cell" />
              </td>
            {/if}
          {/each}
        </tr>
      {/each}
    </table>
  </div>
</div>

<style>
  .cell-selectable-table {
    display: flex;
    flex-flow: column;
    height: 100%;
  }

  .selected {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    outline: var(--cds-hover-primary-text) solid 2px;
  }

  th {
    font-weight: bold;
    background-color: var(--cds-ui-03);
    position: sticky;
    top: 0;
    z-index: 15;
  }
  th,td {
    padding: 2px;
    padding-left: 3px;
    padding-right: 3px;
    white-space: nowrap;
  }
  .table-container {
    width: 100%;
    height: 100%;
    overflow: scroll;
    overflow-x: auto;
    overflow-y: auto;
    flex: 1 1 auto;
    border: 2px solid var(--cds-text-secondary);
  }

  table {
    /* table-layout: fixed; */
    width: 100%;
    height: 100%;
  }

  .table-container td,
  th {
    vertical-align: middle;
    text-align: center;
  }

  .inner-table-cell {
    position: relative;
    width: 100%;
    height: 100%;
    -webkit-user-select: none; /* Safari */
    -ms-user-select: none; /* IE 10 and IE 11 */
    user-select: none;
    padding: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .inner-table-cell:hover {
    background-color: rgba(255, 255, 255, 0.2);
    color: var(--cds-link-01, #0f62fe);
  }

  .header {
    flex: 0 1 auto;
    font-size: large;
    font-weight: bold;
    padding-top: 5px;
  }
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
</style>
