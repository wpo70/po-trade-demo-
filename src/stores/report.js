'use strict';

import { writable, get } from 'svelte/store';

const report = (function () {
  const { subscribe, set, update } = writable([]);

  const getEODEmails = function (bank_id,type) {

    if (bank_id === 0) {
      return;
    }

    const arr = get(report);
    if ( type=='eod' ) {
      return arr.filter(b => b.bank_id == bank_id && b.eod_report == true)?.map(i=>i.email);
    } else if ( type=='eom' ) {
      return arr.filter(b => b.bank_id == bank_id && b.eom_report == true)?.map(i=>i.email);
    } else {
      return [];
    }
  };
  
  const addReportEmail = function (report) {
    // adds a trader to the store
    update(store => {
      store.push(report[0]);
      return store;
    });
  };
  const updateReportEmail = function (report) {
    // updates a trader in the store

    let updatedReportEmail;

    update(store => {

      let idx = store.findIndex((t) => t.id === report[0].id);

      if (idx !== -1) {
        store[idx] = report[0];
        updatedReportEmail = report[0];
      }

      return store;
    });
    return updatedReportEmail;
  };

  const removeReportEmails = function (report_email_ids) {
    // deletes from the store

    let deleted_report_emails= [];

    update(store => {
      report_email_ids.forEach((report_email_id) => {
        let idx = store.findIndex((t) => t.id === report_email_id);

        if (idx !== -1) {
          deleted_report_emails.push(store[idx]);
          store.splice(idx, 1);
        }
      });

      return store;
    });
    return deleted_report_emails;
  };
  return {
    subscribe,
    set,
    get: getEODEmails,
    removeReportEmails,
    addReportEmail,
    updateReportEmail
  };
}());

export default report;