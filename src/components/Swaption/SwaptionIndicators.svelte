<script>
  import { FileUploaderButton, Button, Modal } from "carbon-components-svelte";
  import Upload from "carbon-icons-svelte/lib/Upload.svelte";

  import CellSelectableTable from "../CellSelectableTable.svelte";

  import user from "../../stores/user";
  import brokers from '../../stores/brokers.js';
  import swaption_quotes from "../../stores/swaption_quotes";

  import { excelToJSON, parseTable } from "../../common/excel_parser.js";
  import { toTenor, isTenor, tenorToYear } from "../../common/formatting.js";
  import websocket from "../../common/websocket";

  export let selected_x;
  export let selected_y;

  $:permission = user.getPermission($brokers);

  // the maximum and minimum strike (used to calculate the colour gradient)
  let min_strike;
  let max_strike;

  // table data
  let x_labels = [];
  let y_labels = [];
  let prem_cells = {};
  let strike_cells = {};

  let table_scroll = 0;

  // variables relating to the preview upload tables (shown in the upload modal)
  let is_preview_open = false;

  let preview_x_labels = [];
  let preview_y_labels = [];
  let preview_prem_cells = {};
  let preview_strike_cells = {};

  let preview_min;
  let preview_max;

  let preview_err_message = "";

  // any files that are currently in the FileUploaderButton
  let files = [];
  let new_quotes;

  $: {
    ({
      x_labels,
      y_labels,
      strike_cells,
      prem_cells,
      min: min_strike,
      max: max_strike,
    } = formatSwaptionQuotes($swaption_quotes.bbsw));
  }

  const handleTableDataUpdate = async () => {
    preview_err_message = "";

    let sheet = await excelToJSON(files[0]);

    // check that only 1 sheet was passed in
    let data = Object.values(sheet);
    if (data.length !== 1) {
      preview_err_message = "excel file passed in has more than 1 sheet";
      return;
    }

    // get the data of the sheet
    data = data[0];

    // get the keys of the sheet & initialize an empty array to put table data into
    let keys = Object.keys(data);
    let tables = [];

    // extract table data into tables array
    makeTableArray(tables, data, keys);

    // this assumes the strike table is the top table,
    // and premium table is the bottom table
    let strike_table = tables[0];
    let premium_table = tables[1];

    // join the tables into an object
    let joined_obj = joinTablesIntoObject(strike_table, premium_table);

    // convert the joined object to an array of objects we can pass to the server
    new_quotes = convertToSwaptionQuotes(joined_obj);

    ({
      x_labels: preview_x_labels,
      y_labels: preview_y_labels,
      prem_cells: preview_prem_cells,
      strike_cells: preview_strike_cells,
      min: preview_min,
      max: preview_max,
    } = formatSwaptionQuotes(new_quotes));
  };

  const handleConfirm = () => {
    if (new_quotes) {
      websocket.updateSwaptionQuotes(new_quotes);
      resetModal();
    }
  };

  const resetModal = () => {
    is_preview_open = false;
    files = [];
    preview_x_labels = [];
    preview_y_labels = [];
    preview_prem_cells = {};
    preview_strike_cells = {};
    preview_min = undefined;
    preview_max = undefined;
    preview_err_message = "";
    new_quotes = undefined;
  };

  /**
   * Formats swaption quote data from the quote store into a format that can be read by the SwaptionQuoteTable component.
   *
   * @param data
   * @returns {{ x_labels: Array<string>, y_labels: Array<string>, prem_cells: object, strike_cells: object }}
   */
  const formatSwaptionQuotes = (data) => {
    // get all the x and y years for the quotes
    let x_years = new Set();
    let y_years = new Set();

    let prem_data = {};
    let strike_data = {};
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    for (let cell of data) {
      let x = toTenor(cell.swap_year);
      let y = toTenor(cell.option_year);

      x_years.add(cell.swap_year);
      y_years.add(cell.option_year);

      if (cell.premium) {
        if (prem_data[x] == null) {
          prem_data[x] = {};
        }

        prem_data[x][y] = { value: cell.premium.toFixed(2) };
      }

      if (cell.strike) {
        if (strike_data[x] == null) {
          strike_data[x] = {};
        }

        strike_data[x][y] = { value: cell.strike.toFixed(4) };

        if (cell.strike < min) {
          min = cell.strike;
        }
        if (cell.strike > max) {
          max = cell.strike;
        }
      }
    }

    const sort_fn = (a, b) => a - b;

    let x_years_arr = Array.from(x_years).sort(sort_fn);
    let y_years_arr = Array.from(y_years).sort(sort_fn);

    let x_lbls = x_years_arr.map((x) => toTenor(x));
    let y_lbls = y_years_arr.map((y) => toTenor(y));

    return {
      x_labels: x_lbls,
      y_labels: y_lbls,
      prem_cells: prem_data,
      strike_cells: strike_data,
      min: min,
      max: max,
    };
  };

  /**
   * Calculates the colour of a single strike rate cell.
   *
   * @param {number} val - value of the strike rate cell
   * @returns {string} a css colour value
   */
  function strikeRateGradient(val, min, max) {
    let weight = (1 - (val - min) / (max - min)) * 120;

    const saturation = 100;
    const lumosity = 65;

    return `hsl(${weight}, ${saturation}%, ${lumosity}%)`;
  }

  /**
   * Joins strike table data & premium table data into an object, that can be referenced as so:
   * Obj[x][y].strike OR Obj[x][y].premium
   *
   * @param {Array<import("../common/excel_parser.js").CellData>} strike_table
   * @param {Array<import("../common/excel_parser.js").CellData>} premium_table
   * @returns {{x: { y: { premium: number, strike: number } }}}
   */
  const joinTablesIntoObject = (strike_table, premium_table) => {
    let joined_obj = {};

    const add_cell = (cell, fieldname) => {
      let x = cell.x;
      let y = cell.y;
      let val = cell.value;

      if (joined_obj[x] == null) {
        joined_obj[x] = {};
      }

      if (joined_obj[x][y] == null) {
        joined_obj[x][y] = {};
      }

      joined_obj[x][y][fieldname] = val;
    };

    strike_table.forEach((cell) => {
      add_cell(cell, "strike");
    });

    premium_table.forEach((cell) => {
      add_cell(cell, "premium");
    });

    return joined_obj;
  };

  /**
   * Converts a joined object (created using {@link joinTablesIntoObject}) into
   * swaption quotes that can be passed to the server.
   *
   * @param {{x: { y: { premium: number, strike: number } }}} joined_obj
   * @returns {Array<{ swap_year: number, option_year: number, strike: number, premium: number }} swaption quote data
   */
  const convertToSwaptionQuotes = (joined_obj) => {
    let swaption_quotes = [];

    let x_values = Object.keys(joined_obj);

    x_values.forEach((x) => {
      let y_values = Object.keys(joined_obj[x]);

      y_values.forEach((y) => {
        swaption_quotes.push({
          swap_year: tenorToYear(x)[0],
          option_year: tenorToYear(y)[0],
          strike: joined_obj[x][y].strike,
          premium: joined_obj[x][y].premium,
        });
      });
    });

    return swaption_quotes;
  };

  /**
   * Parse each table in a given excel sheet and push it into the passed in array
   *
   * @param {Array<Array<import("../common/excel_parser.js").CellData>>} arr
   * - the array each table will be pushed to
   * @param {Object} data
   * @param {Array<string>} keys
   */
  const makeTableArray = (arr, data, keys) => {
    if (!keys || !Array.isArray(keys) || keys.length <= 0) {
      return;
    }

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];

      // check the key is a tenor
      if (data[key].v && isTenor(data[key].v)) {
        // since this key points to an tenor, assume this is the first heading on
        // the x axis. parse the rest of the data as a table
        let { data: d, leftover } = parseTable({
          keys: keys.slice(i),
          current_key: key,
          data: data,
        });

        // add the parsed table data into an array
        arr.push(d);
        // recursively call the function again with the leftovers of the
        // parseTable function incase there is another table in the dataset
        return makeTableArray(arr, data, leftover);
      }
    }
  };
</script>

<Modal
  class="swaption--upload-confirm-modal"
  bind:open={is_preview_open}
  primaryButtonText="Confirm"
  modalHeading="Update swaption data"
  on:click:button--primary={handleConfirm}
  on:close={resetModal}
>
  <h5 style="margin: 10px 0;">Upload File</h5>

  <div style="display: flex; align-items: center;">
    <FileUploaderButton
      labelText="Update table data"
      bind:files
      on:change={handleTableDataUpdate}
    />

    {#if preview_err_message}
      <p style="margin-left: auto; color: red;">Error: {preview_err_message}</p>
    {/if}
  </div>

  <h5 style="margin-top: 10px;">Preview</h5>

  <CellSelectableTable
    title={"ATM FWD Premium (Straddle)"}
    x_labels={preview_x_labels}
    y_labels={preview_y_labels}
    color_fn={(_, __, y) =>
      ["1m", "1y", "5y", "10y"].includes(y) ? "var(--cds-danger)" : ""}
    cells={preview_prem_cells}
  />

  <CellSelectableTable
    title={"ATM FWD Swap Yield"}
    x_labels={preview_x_labels}
    y_labels={preview_y_labels}
    color_fn={() => "black"}
    background_color_fn={(value) =>
      strikeRateGradient(value, preview_min, preview_max)}
    cells={preview_strike_cells}
  />
</Modal>

<div class="swaption-indicators">
  <div class="table-container">
    <CellSelectableTable
      title={"ATM FWD Premium (Straddle)"}
      {y_labels}
      {x_labels}
      selectable
      bind:selected_x
      bind:selected_y
      bind:y_scroll={table_scroll}
      color_fn={(_, __, y) =>
        ["1m", "1y", "5y", "10y"].includes(y) ? "red" : ""}
      background_color_fn={(_, x, y) => {
        if (["1m", "1y", "5y", "10y"].includes(y)) {
          return "var(--cds-highlight)";
        }

        if (["1y", "3y", "5y", "10y", "20y", "30y"].includes(x)) {
          return "var(--cds-ui-03)";
        }
      }}
      cells={prem_cells}
    >
      <div slot="button" style="height: 36px; max-height: 36px;">
        <Button
          disabled={permission["View Only"]}
          size="small"
          style="padding: 9px 17px;"
          kind="ghost"
          icon={Upload}
          iconDescription="Upload excel data"
          on:click={() => (is_preview_open = true)}
        />
      </div>
    </CellSelectableTable>
  </div>

  <div class="table-container">
    <CellSelectableTable
      title={"ATM FWD Swap Yield"}
      {y_labels}
      {x_labels}
      selectable
      bind:selected_x
      bind:selected_y
      bind:y_scroll={table_scroll}
      color_fn={() => "black"}
      background_color_fn={(value) =>
        strikeRateGradient(value, min_strike, max_strike)}
      cells={strike_cells}
    />
  </div>
</div>

<style>
  .swaption-indicators {
    height: calc(100% - 2.5rem);
  }

  .table-container {
    display: flex;
    flex-direction: column;
    height: 50%;
  }
</style>
