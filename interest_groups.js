'use strict';

// Interest Groups are largely unchanging structures.

import { writable, get } from 'svelte/store';
import brokers from './brokers.js';
import user from './user.js';

const interest_groups = (function () {
  let anonVals = {};
  let anonLet = 'A';
  const { subscribe, set } = writable([]);

  const getInterestGroup = function (bank_id) {
    // Get an interest group name of the given bank id.

    const arr = get(interest_groups);
    const interest_group = arr.find(ig => ig.bank_division_id === bank_id);
    return interest_group.name;
  };

  const getAllInterestGroups = function () {
    const broker = brokers.get(user.get());

    // Checks if user is allowed to view this data, if not replaces the bank division name with "XXX"
    if (broker.permission["Not Anonymous"]){
      return get(interest_groups);
    }else{
      let iglist = structuredClone(get(interest_groups));
      iglist.forEach((group) => {
        if (!anonVals[group.name]){
          anonVals[group.name] = anonLet + anonLet + anonLet;
          anonLet = getNextChar(anonLet);
        }
        group.name = anonVals[group.name];
      });
      return iglist;
    }
    // return [null, 'Unauthorised to access bank divisions.'];
  };

  function getNextChar(char) {
    if (char === 'Z') {
      return 'A';
    }
  
    return String.fromCharCode(char.charCodeAt(0) + 1);
  }

  return {
    subscribe,
    set,
    get: getInterestGroup,
    getAllInterestGroups,
  };
}());

export default interest_groups;
