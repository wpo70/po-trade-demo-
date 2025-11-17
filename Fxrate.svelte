<script>
import { toPrice } from '../common/formatting';
import websocket from '../common/websocket.js';
export let fxrate;

/***FX RATE***/
function handleFXBlur() {
  handleOverride(fxrate, this);
}

function handleFXKeyDown(event) {
  handleKeyDown(event, this, fxrate); 
}
function handleFXKeyPress(event) {
  // amount of decimal places currently
  let dp = event.target.textContent.split('.')[1]?.length;
  // the current index of the decimal place
  let dpIdx = event.target.textContent.indexOf('.');

  // the indexes of the start and end of the currently selected text
  let selectionStartIdx = event.view.getSelection().anchorOffset;
  let selectionEndIdx = event.view.getSelection().focusOffset;

  if (event.key && !isCharNumber(event.key)) {
    // if the event is not a number, prevent the event from happening
    event.preventDefault();
  } else if (dp !== undefined && 
            (selectionStartIdx > dpIdx) &&
            (dp >= 4) && 
            (selectionStartIdx === selectionEndIdx)) {
    // if the event would add more than 4 decimal places, prevent it from happening 
    event.preventDefault();
  } 
}
// returns true if the given character is between 0-9 OR is '.' or '+'or '-'
function isCharNumber(c) {
  return (c >= '0' && c <= '9') || (c === '.' || c === '+' || c === '-');
}
function submitOverride(fx, text) {
  var ovr = parseFloat(text);

  if (isNaN(ovr) || text == toPrice(fx.value)) {
    ovr = null;
  }
  console.log(ovr, fx, fxrate);
  // Add the dynamic update on indicator
  fxrate = fx;
  // Send to websocket to update the database
  websocket.overrideFX(fx.security, ovr);
}

function handleOverride(fx, source) {
  // submit the override to the server
  submitOverride(fx, source.textContent);
  // if the text field was set to empty, update the text field to contain the current indicator value
  if (source.textContent === '') {
    source.textContent = toPrice(fx.override === null ? fx.value : fx.override);
  }
}
function handleKeyDown(event, source, fx) {
  // keycode 13 is enter, 27 is esc
  if (event.keyCode === 13 || event.keyCode === 27) {
    // handle the override and prevent the keystroke from being registered in the text box
    handleOverride(fx, source); 
    event.preventDefault();
  } 
}
</script>
<tr>
    <td>
      {fxrate.security.substring(0,3)}
    </td>
    <td
      contenteditable="true"
      class:overridden={fxrate.override !== null}
      class:stale={fxrate.is_stale}
      on:blur={handleFXBlur}
      on:keydown={handleFXKeyDown}
      on:keypress={handleFXKeyPress}
      >{@html toPrice( fxrate.override === null ? fxrate.value : fxrate.override)}</td>
   </tr>
<style>
    
:global(table.fx .stale) {
  color: grey;
}
:global(table.fx .overridden) {
  color: black;
  background-color: lemonchiffon;
}
</style>