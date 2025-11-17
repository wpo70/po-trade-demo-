<script>
  import { ComboBox } from 'carbon-components-svelte';

  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  export let ref;

  export let listRef;

  export let styleBtn = "";

  export let styleList = "";

  // the default selection is applied when the search box is empty and on:blur is called.
  export let defaultSelectedId = undefined; // the item auto selected when the field is cleared.
  
  export let initialSelectedId = undefined; // the item auto selected onMount. Takes precedence over default for initalisation value. Will only be applied if selectedId is undefined
  
  export let items = [];
  
  export let selectedId = undefined;
  
  export let selectedItem = undefined;
  
  export let scroll_cycling = true;

  let dropDowns;
  let id;
  let open;
  let focused = false;
  let value = selectedItem?.text;

  let spanRef;

  $: if (id == undefined && selectedId != undefined && !focused) { // Handle pass through selectedId changing (eg checkbox sel on orders and autofill contents in order form) once already mounted
    resetDropDowns();
    selectedItem = dropDowns.find(f => f.orig_id == selectedId);
  }
  
  $: if (selectedId == undefined || selectedItem == undefined) { clear(); }

  onMount(() => {
    if (items.length == 1) {
      selectedId = items[0].id;
      selectedItem = items[0];
      handle_select({detail:{selectedItem, selectedId}});
    } else {
      if (selectedId == undefined) {
        selectedId = initialSelectedId ?? defaultSelectedId ?? undefined;
      }
      resetDropDowns();
    }
    ref.style.cssText = styleBtn;
    spanRef.firstElementChild.firstElementChild.style["margin-bottom"] = "0.375rem"; // Height fix to make cb line up with other input correctly
    if (scroll_cycling) { ref.parentElement.addEventListener('mousewheel', scrollChangeItem); }
  });

  function scrollChangeItem(e) {
    e.preventDefault();
    e.stopPropagation();
    const {wheelDelta} = e;
    if (id == undefined && wheelDelta < 0) { // handle_select called reactively through ComboBox - it reacts to the bound id changing
      id = 0;
    } else if (wheelDelta < 0 && id < dropDowns.length-1) {
      ++id;
    } else if (wheelDelta > 0 && id > 0) {
      --id;
    }
  }

  function resetDropDowns() {
    dropDowns = structuredClone(items);
    reIndex_dropDowns();
  }
  
  function comboFilter(event){
    const searchValue = value.toLowerCase().trim();

    if(searchValue == ''){
      dropDowns = structuredClone(items);
      clear();
    } else {
      // apply filtering
      dropDowns = structuredClone(items.filter(option => option.text.toLowerCase().includes(searchValue)));
    }
    reIndex_dropDowns();
  }

  function reIndex_dropDowns() {
    //re-index the dropDown items
    for (const [idx, item] of dropDowns.entries()){
      dropDowns[idx].orig_id = item.orig_id ?? item.id;
      dropDowns[idx].id = idx;
      if (item.text == selectedItem?.text || dropDowns[idx].orig_id == selectedId) {
        id = idx;
        if (!value?.length) { value = item.text; }
      }
    }
  }

  function handle_onBlur(event) {
    focused = false;
    if (value == '' && defaultSelectedId != undefined){
      resetDropDowns();
      id = dropDowns.findIndex(f => f.orig_id == defaultSelectedId);
    } else {
      value = selectedItem?.text ?? "";
    }
    dispatch('blur', event.detail);
  }

  function handle_select(event){
    selectedItem = event.detail.selectedItem;
    selectedId = selectedItem.orig_id;
    value = selectedItem.text;
    dispatch('select', {selectedItem, selectedId});
  }

  function handle_clear(event){
    open = true;
    clear();
    value = "";
    dispatch('clear', event.detail);
  }

  function clear() {
    selectedId = undefined;
    selectedItem = undefined;
    id = undefined;
  }

  function handle_click() {
    if (listRef && styleList.length) { // Needs to be called every time the listbox opens as it is destroyed rather than being hidden when it is 'closed'
      listRef.style.cssText = styleList;
    }
    resetDropDowns();
    value = '';
    open = true;
  }
</script>

<span
bind:this={spanRef}
  on:click={handle_click}
  on:input={comboFilter}
  style="width:100%"
>
  <ComboBox
    bind:ref
    bind:listRef
    on:blur={handle_onBlur}
    on:select={handle_select}
    on:clear={handle_clear}
    on:keydown
    on:keyup
    on:focus={() => {focused = true;}}
    on:focus
    on:paste
    on:scroll
    bind:value
    bind:open
    bind:selectedId={id}
    bind:items={dropDowns}
    {...$$restProps}
  />
</span>