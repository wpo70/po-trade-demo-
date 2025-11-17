<script>

import { Accordion, AccordionItem, Checkbox } from "carbon-components-svelte";
import banks from "./../../stores/banks";

export let selected_filters;

export const clear_filters = () => {
  filters.forEach((filter) => {
    filter.selected = [];
  });

  filters = filters;
};

$: selected_filters =  parseSelectedFilters(filters);

// parse the filters into an object with the following shape:
// table being filtered: {
//    row being filtered: [possible values of row]
// }
function parseSelectedFilters(filters) {
  let map = new Map();
  filters.forEach((filter) => {
    if(map.has(filter.table)) {

      let r = map.get(filter.table);
      r[filter.field] = filter.selected;

    } else {
      map.set(filter.table, { [filter.field]: filter.selected });
    }
  });
  return Object.fromEntries(map.entries());
}

export let filters = [
  {
    name: 'Bank',
    field: 'bank',
    table: 'trader',
    values: $banks.map((bank) => {
      return {
        label: bank.bank,
        value: bank.bank
      };
    }),
    selected: []
  },
  {
    name: 'Has Email',
    field: 'email',
    table: 'trader',
    values: [
      {
        label: 'Yes',
        value: true
      },
      {
        label: 'No',
        value: false
      }
    ],
    selected: []
  }
];

</script>

<Accordion>
  {#each filters as filter}
    <AccordionItem title={filter.name}>
      {#each filter.values as val}
        <Checkbox bind:group={filter.selected} labelText={val.label} value={val.value}/>
      {/each}
    </AccordionItem>
  {/each}
</Accordion>

<style>

</style>
