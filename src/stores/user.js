'use strict';

// The user who is logged in.
// import brokers from './brokers';   See comment below
import { writable, get } from 'svelte/store';
import { main_content } from './active_product';

const user = (function () {
  const { subscribe, set } = writable({ isLoggedIn: false });

  const my_set = function (u) {
    if (u.temporary_password && u.temporary_password.password == "temporary_confirmed" && u.temporary_password.timestamp == new Date(3).toISOString()) {
      u.tempLogin = true;
    } else {
      u.isLoggedIn = true;
    }
    set(u);
    if (u.isLoggedIn) main_content.canView();
  };
  
  const logout = function () {
    set({ isLoggedIn: false });
  };

  const getId = function () {
    return get(user).broker_id;
  };

  const getPermission = function (){
    return get(user).permission; // See comment below from b670056. This revert is temporary. The store change listed below will be handled for the next version
    /*
    return brokers.get(getId()).permission;
    // This has a circular reference, but has been done so that the permissions actively update
    // Could be resolved by updating the user store when the brokers store is updated, but ignoring the warning is the easier option for now given the time investment required for said change
    */
  };
  return {
    subscribe,
    set: my_set,
    logout,
    get: getId,
    getPermission,
  };
}());

export default user;
