'use strict';

import * as XLSX from 'xlsx';

/**
 * The data for a single cell of a table
 *
 * @typedef   {Object} CellData
 * @property  {string} x
 * @property  {string} y
 * @property  {number} value
 */

/**
 * Parses an excel sheet into a javascript object using XLSX.
 *
 * @param   {File} file
 * @returns {Promise<Object<string, Object>>}
 */
export async function excelToJSON(file) {
  let result = await new Promise((resolve) => {
    let fileReader = new FileReader();
    fileReader.readAsBinaryString(file);
    fileReader.onload = (event) => {
      let data = event.target.result;
      let workbook = XLSX.read(data , { type: 'binary' });

      resolve(workbook.Sheets);
    };
  });

  return result;
}

/**
 * Convert table data passed in from an excel sheet to an array of objects
 *
 * NOTE: this function assumes that there are only tables stacked ontop of
 * eachother (on the y axis).
 *
 * @param   {{keys: Array<string>, current_key: string, data: object }} args
 * @returns {{data: Array<CellData>, leftover: Array<string>}}
 */
export function parseTable(args) {

  // unpack the args passed in
  let {keys, current_key, data} = args;

  let result = [];

  let x_headings = [];
  let i = 0;
  let current_row = current_key.slice(1);

  // get all the x headings
  while(current_key.slice(1) === current_row) {
    x_headings.push(data[current_key].v);
    current_key = keys[++i];
  }

  // at this point, we will be looking through the actual cells of the table
  let previous_row = current_key.slice(1);
  let x_idx;

  // continue looping through the rows until there is at least 1 empty cell between them
  while(parseInt(current_key.slice(1)) - parseInt(previous_row) <= 1) {

    // get the y heading of this row and move the current_key forward to actual
    // cell data
    let y_heading = data[current_key];
    current_key = keys[++i];

    // update the previous row, and set the x index to 0
    previous_row = current_key.slice(1);
    x_idx = 0;

    // continue looping through until current_key is pointing to another row
    while(current_key.slice(1) === previous_row) {
      if(typeof data[current_key].v !== 'number') {
        current_key = keys[++i];
        continue;
      }

      // push the cell data to an array
      result.push({
        x: x_headings[x_idx++].trim(),
        y: y_heading.v.trim(),
        value: data[current_key].v
      });

      // point towards the next key
      current_key = keys[++i];
    }
  }

  // return the data, and the leftover keys (which could be another table)
  return {
    data: result,
    leftover: keys.slice(i)
  };
}

