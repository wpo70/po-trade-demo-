<script>
  // A simple wrapper for the DatePicker provided by carbon-components-svelte
  // Creates a date picker in the format of YYYY-mm-dd

  import {
    DatePicker,
    DatePickerInput
  } from 'carbon-components-svelte';
  import { createEventDispatcher } from "svelte";

  export let value = '';
  export let invalid = '';
  export let label = '';
  export let invalid_text = '';
  export let kind = 'single';
  export let position = 'auto';
  export let inputClass = '';
  export let style = '';
  export let min_date = '';
  export let required = false;
  export let disabled = false;
  export let statics = true;

  const dispatch = createEventDispatcher();

  // regex for YYYY-mm-dd or YYYY-m-d validation
  // source: https://stackoverflow.com/a/22061879
  const pattern = '\\d{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])';

</script>

<DatePicker
  value={value}
  dateFormat="Y-m-d"
  style={style}
  datePickerType={kind}
  required={required}
  disabled={disabled}
  on:change={(e) => dispatch('change', e.detail)}
  flatpickrProps={{ static: statics, position: position }}
  minDate={min_date}>
  <!-- changing date picker to static means that it won't work in a
  modal, however it allows us to adjust where the calender opens -->

  <DatePickerInput
    labelText={label}
    size="sm"
    placeholder="yyyy-mm-dd"
    bind:invalid
    invalidText={invalid_text}
    class={inputClass}
    {disabled}
    {pattern} />

</DatePicker>

<style>

  :global(.bx--date-picker__input) {
    height: 32px;
    width: 100% !important;
  }

  :global(.bx--date-picker, .bx--date-picker-container, .bx--date-picker-input__wrapper, .flatpickr-wrapper){
    width: 100%;
  }

:global(.flatpickr-calendar.open) {
  background-color: var(--cds-ui-01, white) !important;

}

</style>
