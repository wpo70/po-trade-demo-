<script>
    import { Tile } from "carbon-components-svelte";
    import CalculatorCheck from "carbon-icons-svelte/lib/CalculatorCheck.svelte";
    export let isMenuOpen;
    export let selectedCal;
</script>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
 
<div>
    <Tile>
        <section style="display:flex;flex-wrap: wrap; margin:0; padding:0; list-style: none;text-align:center;gap:10px; align-items: center; white-space: nowrap">
            {#each ["Brokerage Calculator", "Volume Calculator", "Foreign Exchange", "Equities Calculator", "Futures Calculator","Mids Calculator"] as title, i }
                <div class="cal-item-button" on:click={() => {isMenuOpen=false; selectedCal = i}}> 
                    <CalculatorCheck size={40}/>
                    <div style="margin-top: 20px!important; font-size:medium; font-weight: 400px;">{title}</div>
                </div>
            {/each}
        </section>
    </Tile>
</div>

<style>
.cal-item-button {
    width:48%; 
    height:150px;  
    text-align: center; 
    display: flex; 
    flex-direction: column; 
    -webkit-box-align:center; 
    align-items: center; 
    justify-content: space-around; 
    padding: 20px;
    border: 1px solid rgb(65,65,65);
}
.cal-item-button:hover{
    opacity: 50%;
    cursor: pointer; 
}

:global(.wrapper-calculator .bx--copy-btn) {
    height: auto
}


</style>