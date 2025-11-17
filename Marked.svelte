<script>
import traders from '../stores/traders';
import ocos from '../stores/ocos';

export let mark = false;
export let interest = false;
export let oco = false;
export let order_ = null;

const bank_id = traders.get(order_?.trader_id)?.bank_id;
const prod_id = order_?.product_id;
let colour;

$: refreshOCO($ocos, order_);
function refreshOCO() {
  if (bank_id && prod_id) {
    oco = ocos.isOCO(bank_id, prod_id);
    colour = bank_id ? $ocos[bank_id].colour : "inherit";
  }
}

</script>

{#if mark}
  <mark style="--oco-color: {colour}" class="order" class:oco>
    <slot />
  </mark>
{:else if interest}
  <mark class="interest">
    <slot />
  </mark>
{:else}
  <mark style="--oco-color: {colour}" class:oco>
    <slot />
  </mark>
{/if}

<style>
mark {
  background-color: rgba(0, 0, 0, 0);
  color: inherit;
  padding-left: 2px;
  padding-right: 2px;
}
.order {
  background-color: var(--cds-tag-color-green); 
  color: var(--cds-text-inverse);
}
.interest {
  background-color: var(--cds-inverse-02);
  color: var(--cds-text-inverse);
}
.oco {
  background-color: var(--oco-color);
  border: 2px solid var(--cds-inverse-02);
  color: #f4f4f4;
}
</style>
