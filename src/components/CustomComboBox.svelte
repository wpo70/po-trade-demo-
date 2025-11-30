<script>
  import { ComboBox } from 'carbon-components-svelte';

  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  // the default selection is applied when the search box is empty and on:blur is called.
  export let defaultSelectedId = undefined; // the item auto selected when the field is cleared.
  // if(typeof defaultSelectedId != 'number'){ defaultSelectedId = undefined; }
  
  export let initialSelectedId = undefined; // the item auto selected onMount. If initial is undefined default should also be undefined.
  // if(typeof initialSelectedId != 'number'){ initialSelectedId = undefined; }
  
  export let items = [];  // genesis
  let dropDowns = structuredClone(items);

  export let selectedId = undefined;

  if (typeof selectedId == "undefined") selectedId = (initialSelectedId > -1) ? initialSelectedId : defaultSelectedId;
  let selectedItem = items[initialSelectedId];
  let value = selectedItem?.text;
  let open;

  onMount(() => { if (items.length == 1) { selectedId = items[0].id; selectedItem = items[0]; handle_select({detail:{selectedItem, selectedId}}); } });
  
  function comboFilter(event){
    const searchValue = value.toLowerCase().trim();

    if(searchValue == ''){
      dropDowns = structuredClone(items);
      reIndex_dropDowns();
      selectedId = undefined;
      selectedItem = undefined;
    } else {
      // apply filtering
      dropDowns = structuredClone(items.filter(option => option.text.toLowerCase().includes(searchValue)));
      // reIndex_dropDowns();
    }
  }

  function reIndex_dropDowns() {
    //re-index the dropDown items
    for(const [idx, item] of dropDowns.entries()){
      dropDowns[idx].id = idx;
      if(item.text == selectedItem?.text) {
        selectedId = idx;
        updateSelectedItem();
      }
    }
  }

  function handle_onBlur(event) {
    if(value == '' && defaultSelectedId != undefined){
      reIndex_dropDowns();
      selectedId = defaultSelectedId;
      updateSelectedItem();
    } else {
      value = selectedItem?.text;
    }
    dispatch('blur', event.detail);
  }

  function handle_select(event){
    value = selectedItem?.text;
    dispatch('select', event.detail);
  }

  function handle_clear(event){
    open = true;
    dispatch('clear', event.detail);
  }

  function updateSelectedItem() {
    if(selectedId == undefined && defaultSelectedId != undefined) {
      reIndex_dropDowns();
    }
  }

  function handle_click(event) {
    value = '';
    dropDowns = structuredClone(items);
    open = true;
  }
</script>

<span 
  on:click={handle_click}

  on:input={comboFilter}
  style="width:100%"
>
  <ComboBox
    on:blur={handle_onBlur}
    on:select={handle_select}
    on:clear={handle_clear}
    on:keydown
    on:keyup
    on:focus
    on:paste
    on:scroll
    bind:value
    bind:open
    bind:selectedId
    bind:items={dropDowns}
    {...$$restProps}
  />
</span>