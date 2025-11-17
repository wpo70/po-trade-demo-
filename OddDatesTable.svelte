<script>
    import { addDays } from '../../common/formatting';
    import CustomDatePicker from '../Utility/CustomDatePicker.svelte';
    import { isBusinessDay } from '../../common/formatting';
    import calc_inputs from '../../stores/calc_inputs';
    import websocket from '../../common/websocket';
    import TrashCanSvelte from 'carbon-icons-svelte/lib/TrashCan.svelte';
    import active_product from '../../stores/active_product';
    import { getRateForDates } from '../../common/pricing_models';
    import user from '../../stores/user';
    import brokers from '../../stores/brokers.js';

    export let copyData = null;

    let rows = [];
    let selectedRow = -1;
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let spot = addDays(today, 1);
    $:permission = user.getPermission($brokers);

    let allInputs = calc_inputs.getByProduct($active_product);
    if (allInputs) { 
        let inputs = allInputs.filter((i) => i.inputs[0].length == 24);
        for (let i of inputs){
            let d1 = new Date(i.inputs[0]);
            let d2 = new Date(i.inputs[1]);
            let daycount = Math.round((d2.getTime() - d1.getTime()) / (1000*60*60*24));
            let mid, dv01;
            [mid, dv01] = getRateForDates(d1, d2, true);
            rows.push({id: i.calculation_id, values: [d1, d2, daycount, mid, dv01.toFixed(7)]});
        }
    }


    function handleClick(i, row){
        selectedRow = i;
        if (!row.values[3]) return;
        copyData = {
            fixed_payer_id: undefined,  
            floating_payer_id: undefined,
            notional: "",
            rate: row.values[3],
            expiry_date: row.values[1],
            term: row.values[2] + "D",
            start_date: row.values[0],
            sef: false,
            rba: false,
            clearhouse: "LCH",
        };
    }

    async function updateFields(row, index, event) {
        if (!event.detail.selectedDates[0]) return;
        rows[row].values[index] = event.detail.selectedDates[0];
        if (!isBusinessDay(rows[row].values[index])) {
            rows[row].values[index] = addDays(rows[row].values[index], 1);
        }
        if (rows[row].values[0] && rows[row].values[1]) {
            let daycount = Math.round((rows[row].values[1].getTime() - rows[row].values[0].getTime()) / (1000*60*60*24));
            rows[row].values[2] = daycount;
            
            let mid, dv01;
            [mid, dv01] = getRateForDates(rows[row].values[0], rows[row].values[1], true);
            rows[row].values[3] = mid;
            rows[row].values[4] = dv01.toFixed(7);

            if (rows[row].id == 0){
                websocket.addCalcInput([{product_id: $active_product, inputs: [rows[row].values[0], rows[row].values[1]]}]);
                await new Promise(res => setTimeout(res, 100));
                rows[row].id = calc_inputs.getRecentId($active_product);
            } else {
                websocket.updateCalcInput([{calculation_id: rows[row].id, product_id: $active_product, inputs: [rows[row].values[0], rows[row].values[1]]}]);
            }
        }
    }

    function handleDelete (row) {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].id == row.id){
                rows.splice(i, 1);
                break;
            }
        }
        websocket.deleteCalcInput([row.id]);
        calc_inputs.remove(row.id, $active_product);
    }
</script>

<div class="odd-table">
    <table>
        <thead>
            <tr>
                <th>Start</th>
                <th>Maturity</th>
                <th>Day Count</th>
                <th>Mid OIS</th>
                <th>DV01</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            {#each rows as row, i}
                {#if selectedRow == i}
                    <tr style="border: {selectedRow == i? "2px solid white" : "none"}; height: 20px;">
                        <td><CustomDatePicker disabled={permission["View Only"]} value={row.values[0]} min_date={spot} on:change={(e) => {updateFields(i, 0, e)}}/></td>
                        <td><CustomDatePicker disabled={permission["View Only"]} value={row.values[1]} min_date={row.values[1] == '' || row.values[1] == null ? spot : row.values[1]} on:change={(e) => updateFields(i, 1, e)}/></td>
                        <td on:click={() => selectedRow = -1}>{row.values[2] == null? "   ":row.values[2]}</td>
                        <td on:click={() => selectedRow = -1} class="highlight">{row.values[3] == null? "   ":row.values[3]}</td>
                        <td on:click={() => selectedRow = -1}>{row.values[4] == null? "   ":row.values[4]}</td>
                        <td on:click={() => {if(!permission["View Only"]){handleDelete(row); selectedRow = -1;}}}><TrashCanSvelte style={permission["View Only"] ? "color: grey" : "color: white"}/></td>
                    </tr>
                {:else}
                    <tr on:click={() => handleClick(i, row)} style="border: {selectedRow == i? "2px solid white" : "none"}; height: 20px;">
                        <td>{row.values[0] == null? "   ":row.values[0].toString().split(" 00")[0]}</td>
                        <td>{row.values[1] == null? "   ":row.values[1].toString().split(" 00")[0]}</td>
                        <td>{row.values[2] == null? "   ":row.values[2]}</td>
                        <td class="highlight">{row.values[3] == null? "   ":row.values[3]}</td>
                        <td>{row.values[4] == null? "   ":row.values[4]}</td>
                        <td on:click={() => {if(!permission["View Only"]){handleDelete(row); selectedRow = -1;}}}><TrashCanSvelte style={permission["View Only"] ? "color: grey" : "color: white"}/></td>
                    </tr>
                {/if}
            {/each}
            <tr><td on:click={() => {if(!permission["View Only"]){rows.push({id: 0, values: []}); rows = rows; selectedRow = rows.length-1;}}} colspan="6" style="text-align: center; {permission["View Only"] ? "color: grey" : "color: white"}">Add</td></tr>
        </tbody>
    </table>
</div>

<style>
    :global(div.odd-table thead tr, div.odd-table tbody tr:nth-child(even)) {
    background: var(--cds-ui-02);
    }

    :global(div.odd-table) {
    border-collapse: collapse;
    margin-right: 5px;
    }

    :global(div.odd-table th, div.odd-table td) {
    border: 1px solid var(--cds-ui-04);
    padding: 5px;
    white-space: nowrap;
    }
    /* :global(div.odd-table table) {
        border-color: grey;
    }
    :global(div.odd-table table td){
        text-align: center;
    }
    :global(div.odd-table table th){
        background-color:dimgray;
    } */
    .odd-table .highlight {
         color:#78a9ff;
    } 
    .odd-table {
        background-color: #262626;
        padding: 10px auto;
        overflow-y: auto;
        overflow-x: auto;
    }

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
</style>