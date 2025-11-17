<script>
import { Column, Tile, Row } from "carbon-components-svelte";
import FwdsCaclculator from "./FwdsCaclculator.svelte";

export let card;
export let data;

let id = card.length + 1;

let promise;
export const addCard =() => {promise = handleAddCard(); };

async function handleAddCard () {
    card.push({ id: id++, input1: null, input2: null});
    return true;
};
function handleClose (event) {
    card = card.filter(i => i.id !== event.detail);
}
</script>
{#await promise }
<p></p>
{:then res}
    <div class="c-wrap">
        {#each card as c (c.id)}
            <Column>
                <Tile>
                    <FwdsCaclculator data ={data} card={c} on:Close={handleClose}/>
                </Tile>
            </Column>
        {/each}
    </div>
{/await}
<style>
.c-wrap{
    display: grid;
    grid-template: 330px / auto auto auto;
    grid-gap: 10px;
    position: absolute;
    left: 430px;
    }
</style>
