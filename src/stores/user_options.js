"use strict";

import { writable } from "svelte/store";

/* 

  A simple wrapper for the localStorage API.

  Get user options using $user_options.${option}.

  Add options the same way.

  EG: say you wanted to add an option called "theme",

  To get the current theme value you would call $user_options.theme
  To update the current theme you would $user_options.theme = 'new theme'

*/

const user_options = (function () {
  // get the already set options on load, if no options are set then set the store to an empty object
  const { subscribe, set } = writable(
    JSON.parse(localStorage.getItem("userOptions")) || {}
  );

  // update localstorage whenever a new option is set
  subscribe((val) => {
    localStorage.setItem("userOptions", JSON.stringify(val));
  });

  return {
    subscribe,
    set,
  };
})();

export default user_options;
