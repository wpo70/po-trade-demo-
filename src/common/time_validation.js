'use strict';

export let server_time;
export let current_time;

export function validateTime() {
  server_time = new Date(getServerTime()).getTime();
  current_time = new Date().getTime();
  if(current_time > server_time) return current_time - server_time > 300000;
  return server_time - current_time > 300000;
}

function getServerTime() {
  const xmlHttp = new XMLHttpRequest();
  xmlHttp.open('HEAD', window.location.href.toString(), false);
  xmlHttp.setRequestHeader('Content-Type', 'text/html');
  xmlHttp.send('');
  return xmlHttp.getResponseHeader('Date');
}