'use strict';
import "carbon-components-svelte/css/all.css";
import App from './App.svelte';

// Disable the browser's back button with an alert to the user.  To make this
// work the confirmation_message must be non-empty.  However, the browser will
// display its own text.

window.addEventListener("beforeunload", function (e) {
  const confirmation_message = 'Are you sure?';

  (e || window.event).returnValue = confirmation_message; // Gecko + IE
  return confirmation_message; // Gecko + Webkit, Safari, Chrome etc.
});

// Handles Inactivity Timeout
// Currently will log out user after 4 hours of inactivity
function idleLogout() {
  var t;
  window.onload = resetTimer;
  window.onmousemove = resetTimer;
  window.onmousedown = resetTimer;  // catches touchscreen presses as well      
  window.ontouchstart = resetTimer; // catches touchscreen swipes as well      
  window.ontouchmove = resetTimer;  // required by some devices 
  window.onclick = resetTimer;      // catches touchpad clicks as well
  window.onkeydown = resetTimer;   
  window.addEventListener('scroll', resetTimer, true);

  function forceRefresh() { // Logs out user
    window.location.reload();
  }

  function resetTimer() {
    clearTimeout(t);
    t = setTimeout(forceRefresh, 4 * 60 * 60 * 1000);  // time is in milliseconds
  }
}
idleLogout();

const app = new App({
  target: document.body
});

export default app;
