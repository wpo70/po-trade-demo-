<script>

    // Import columns
    import SpotRatesTable from "./SpotRatesTable.svelte";
    import RbaRunsTable from "./RBARunsTable.svelte";
    import OddDatesTable from "./OddDatesTable.svelte";
    import SpreadsTenorTable from "./SpreadsTenorTable.svelte";
    import SwapTenorTable from "./SwapTenorTable.svelte";
    import ForwardRunsTable from "./ForwardRunsTable.svelte";
    import RbaOisHistoryTable from "./RBA_OIS_HistoryTable.svelte";
    import RBA_OIS_TradeForm from "./RBA_OIS_TradeForm.svelte";
    import OrderForm from "../OrderForm/OrderForm.svelte";

    import { Button } from "carbon-components-svelte";
    import OrderTable from "../OrderTable.svelte";
    import { getRbaRuns, getSpotRates, getSpreadTenors, getSwapTenors } from "../../common/rba_handler";
    import quotes from "../../stores/quotes";
    import ticker from "../../stores/ticker";
    import data_collection_settings from "../../stores/data_collection_settings";

    let spotRates;
    let spreadsTenor;
    let rbaRuns;
    let swapTenor;
    let swapTenorHeaders = [];
    let selection = [];
    let items = [];
    export let active_orders;

    let copyData;

    let activeTabValue = 0;

    const handleClick = tabValue => () => (activeTabValue = tabValue);

    const isItemRBASpot = (item) => item.label === "Rba Runs and Spot Dates";

    // Prefilled Data
    // $: active_orders = $orders[$active_product];
    $: refreshData($quotes, $ticker, $data_collection_settings);

    function refreshData () {
        spotRates = getSpotRates();
        rbaRuns = getRbaRuns();
        spreadsTenor = getSpreadTenors();
        [swapTenor, swapTenorHeaders] = getSwapTenors();
        items = [
            {
                label: "Live Orders",
                component: OrderTable
            },
            {
                label: "Rba Runs and Spot Dates"
            },
            {
                label: "Odd Dates",
                component: OddDatesTable
            },
            {
                label: "Spread Tenors",
                component: SpreadsTenorTable,
                data: spreadsTenor
            },
            {
                label: "Swap Tenors",
                component: SwapTenorTable,
                data: [swapTenor, swapTenorHeaders]
            },
            {
                label: "Forward Runs",
                component: ForwardRunsTable
            },
        ];
    }


    let selectedForm = "live";

    // Selection is an array of all selected orders.
    // Selected is the most recently selected order.
    let selected;
    $: selected = selection.length === 0 ? (copyData ? copyData : null) : selection[selection.length - 1];
    function resetSelection() {
        selection = [];
        copyData = null;
        selected = null;
    }

</script>

<div class="rba_ois">

    <div class="body" >

        <div class="rba-ois-column" style="flex-grow: 1; background-color: #161616">

            <div class="component" style="min-height: 65%; flex-grow: 1; padding-top:10px; margin-bottom: 5px;  overflow-y: hidden;">
                <ul>
                    {#each items as item, idx}
                        <li class={activeTabValue === idx ? 'active' : ''}>
                            <span on:click={handleClick(idx)}>{item.label}</span>
                        </li>
                    {/each}
                </ul>

                {#each items as item, idx}
                    {#if activeTabValue == idx}
                        {#if isItemRBASpot(item)}
                            <div class="box">
                                <div style="display: flex;">
                                    <div><RbaRunsTable data={rbaRuns} bind:copyData/></div>
                                    <div style="width: 20px;"></div>
                                    <div><SpotRatesTable data={spotRates} bind:copyData/></div>
                                </div>
                            </div>
                        {:else if idx == 0}
                            <div class="box" style="justify-content: center; display: block;">
                                <svelte:component this={item.component} {active_orders} bind:selection/>
                                {#if active_orders.length === 0}
                                    <h3 style="text-align: center; padding-top: 20px;">There are no RBA OIS orders</h3>
                                {/if}
                            </div>
                        {:else if item.data == null}
                            <div class="box">
                                <svelte:component this={item.component} bind:copyData/>
                            </div>
                        {:else}
                            <div class="box">
                                <svelte:component this={item.component} data={item.data} bind:copyData/>
                            </div>
                        {/if}
                    {/if}
                {/each}
            </div>

            <!-- Recent Trade Table -->
            <div class="component" style="max-height: 35vw; overflow-y: hidden;">
                <RbaOisHistoryTable bind:copyData/>
            </div>
        </div>

        <!-- Order FORM -->
        <div class="rba-ois-column" style="min-width: fit-content; display: flex; flex-direction: column;background-color: #161616"> 
            <h4 id="static-order-title" >Order Form</h4>
            <div id="static-order-content" style="width: fit-content; background-color: var(--cds-layer); padding-top: 10px; margin-top: 7px; height: -webkit-fill-available; ">
                <div class="btn">
                    <Button  kind={selectedForm == "trade" ? "tertiary" : "primary"} on:click={() => {selectedForm = "live";}}>New Order</Button>
                    <Button  kind={selectedForm == "live" ? "tertiary" : "primary"} on:click={() => {selectedForm = "trade";}}>New Trade</Button>
                </div>
                <div class="component" style="height: fit-content; padding: 0 2rem 2rem 2rem;">
                    {#if selectedForm == "live"}
                        <!-- <div style="height: 20px;"/> -->
                        <OrderForm 
                            selected={selected} 
                            on:reset={resetSelection}
                            on:order_updated={resetSelection}/>
                    {:else}
                        <RBA_OIS_TradeForm
                            rba_dates={swapTenorHeaders}
                            rba_runs={rbaRuns}
                            bind:copied={copyData}/>
                    {/if}
                </div>
            </div>
        </div>
    <!-- End Order FORM -->
    </div>
</div>

<style>

.rba_ois {
    width: 100vw;
    height: calc(100vh - 105px);
}

/* Container for flexboxes */
.body {
    display: flex;
    gap: 10px;
    height: 100%;
}

.component {
    background-color: var(--cds-layer);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    height: 100%;

}

.rba-ois-column {
    display: flex;
    flex-flow: column;
    overflow-y: auto;
    background-color: var(--cds-layer);
    height: 100%;
    min-height: 600px;
  
}
.rba-ois-column #static-order-title {
    display:flex; 
    justify-content: center; 
    padding-top: 15px; 
    padding-bottom: 10px;
    background-color: var(--cds-layer);
}
.rba-ois-column #static-order-content .btn {
    display: flex;
    gap: 5px;
    padding-bottom: 20px; 
    padding-left: 2rem; 
    padding-right: 2rem;
}
:global(.rba-ois-column #static-order-content .btn .bx--btn) {
    border-radius: 5px;
}
.box {
    /* margin-bottom: 10px; */
    display: flex;
    /* padding: 20px; */
    border: 2px solid var(--cds-text-secondary);
    border-top: 0;
    height: 90%;
    overflow: auto;
    }
ul {
    display: flex;
    flex-wrap: wrap;
    padding-left: 0;
    margin-bottom: 0;
    list-style: none;
    border-bottom: 2px solid var(--cds-text-secondary);
}
li {
    margin-bottom: -1px;
}

span {
    border: 1px solid transparent;
    border-top-left-radius: 0.25rem;
    border-top-right-radius: 0.25rem;
    display: block;
    padding: 0.5rem 1rem;
    cursor: pointer;
}

span:hover {
    border-color: #e9ecef #e9ecef #dee2e6;
}

li.active > span {
    color: #495057;
    background-color: #fff;
    border-color: #dee2e6 #dee2e6 #fff;
}
:global(.btn .bx--btn--primary) {
    width: 50%;
    background-color: #ffffff;
    color: #495057;
    font-weight: 700;
    text-align: center;
    min-height: fit-content;
    height: 35px;
}
:global(.btn .bx--btn--tertiary) {
    width: 50%;
    background-color: #262626;
    color: #f4f4f4;
    font-weight: 700;
    border: 2px #ffffff;
    cursor: pointer;
    text-align: center;
    min-height: fit-content;
    height: 35px;
}
</style>
