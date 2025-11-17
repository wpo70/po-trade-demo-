'use strict';

const Winston = require('winston');
const { combine, printf } = Winston.format;

// Create a file name using the start time of the server

const DATE_STR = fileDateString(new Date());
const FILENAME = 'serverlogs_' + DATE_STR;
const FILEPATH = `./logs/${FILENAME}.log`;

// Create a format that logs will be displayed in

const my_format = printf(({ level, message }) => {
  return `[${new Date().toLocaleString('en-AU', { hour12: false })}] ${level}: ${message}`;
});

// Create a logger that simultaneously logs to the console and to a logfile

module.exports.logger = Winston.createLogger({
  level: 'info',
  format: combine(
    Winston.format.splat(),
    my_format
  ),
  transports: [
    new (Winston.transports.Console)({}),
    new (Winston.transports.File)({
      filename: FILEPATH
    })
  ]
});

function fileDateString(date) {
  // Construct the time string

  let time_str = date.toLocaleTimeString('en-AU', { hour12: false });
  time_str = time_str.replace(/:/g, '-'); // Replace ':' with '-' (':' not allowed in windows file names)

  // Construct the date string

  let date_str = date.toLocaleDateString('en-AU', { hour12: false });
  let date_arr = date_str.split('/');
  let day = date_arr[0];
  let month = date_arr[1];
  let year = date_arr[2];

  // Return the datetime string

  return `${year}-${month}-${day}T${time_str}`;
}
