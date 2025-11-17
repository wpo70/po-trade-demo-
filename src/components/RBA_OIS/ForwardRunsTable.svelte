<script>
  import { addTenorToDays, isTenor, addDays } from "../../common/formatting";
  import active_product from "../../stores/active_product";
  import TrashCanSvelte from "carbon-icons-svelte/lib/TrashCan.svelte";
  import calc_inputs from "../../stores/calc_inputs";
  import websocket from "../../common/websocket";
  import { getRateForDates } from "../../common/pricing_models";
  import user from "../../stores/user";
  import brokers from '../../stores/brokers.js';
  
  export let copyData = null;

  $:permission = user.getPermission($brokers);

  let rows = [];
  let selectedRow = -1;
  let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  let spot = addDays(today, 1);
  
  let allInputs = calc_inputs.getByProduct($active_product);
  if (allInputs) { 
    let inputs = allInputs.filter((i) => i.inputs[0].length != 24);
    for (let i of inputs){
      let t1 = i.inputs[0];
      let t2 = i.inputs[1];
      let d1 = addTenorToDays(t1, spot);
      let d2 = addTenorToDays(t2, d1);
      let daycount = Math.round((d2.getTime() - d1.getTime()) / (1000*60*60*24));
      let mid, dv01;
      [mid, dv01] = getRateForDates(d1, d2, true);
      rows.push({id: i.calculation_id, values: [t1, t2, d1, d2, daycount, mid, dv01.toFixed(7)]});
    }
  }

  function handleClick(i, row){
    selectedRow = i;
    if (!row.values[3]) return;
    copyData = {
      fixed_payer_id: undefined,
      floating_payer_id: undefined,
      notional: "",
      rate: row.values[5],
      expiry_date: row.values[3],
      term: row.values[1],
      start_date: row.values[2],
      sef: false,
      rba: false,
      clearhouse: "LCH",
    };
  }

async function updateFields(row, index, event) {
  rows[row].values[index] = event.srcElement.innerText;
  if (isTenor(rows[row].values[0]) && isTenor(rows[row].values[1])) {
    rows[row].values[2] = addTenorToDays(rows[row].values[0], spot);
    rows[row].values[3] = addTenorToDays(rows[row].values[1], rows[row].values[2]);

    let daycount = Math.round((rows[row].values[3].getTime() - rows[row].values[2].getTime()) / (1000*60*60*24));
    rows[row].values[4] = daycount;
    
    let mid, dv01;
    [mid, dv01] = getRateForDates(rows[row].values[0], rows[row].values[1], true);
    rows[row].values[5] = mid;
    rows[row].values[6] = dv01.toFixed(7);

    if (rows[row].id == 0){
      websocket.addCalcInput([{product_id: $active_product, inputs: [rows[row].values[0], rows[row].values[1]]}]);
      await new Promise(res => setTimeout(res, 100));

      rows[row].id = calc_inputs.getRecentId($active_product);
    } else {
      websocket.updateCalcInput([{calculation_id: rows[row].id, product_id: $active_product, inputs: [rows[row].values[0], rows[row].values[1]]}]);
    }
  } else {
    rows[row].values[2] = null;
    rows[row].values[3] = null;
    rows[row].values[4] = null;
    rows[row].values[5] = null;
    rows[row].values[6] = null;
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

<div class="fwd-run">
  <table>
    <thead>
      <tr>
        <th>Start </th>
        <th>Tenor</th>
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
      <tr style="border: {selectedRow == i? "2px solid white" : "none"};">
        {#if permission["View Only"]}
           <td contenteditable="false" on:input={(e) => updateFields(i, 0, e)} bind:textContent={row.values[0]}/>
           <td contenteditable="false" on:input={(e) => updateFields(i, 1, e)} bind:textContent={row.values[1]}/>   
        {:else}
          <td contenteditable="true" on:input={(e) => updateFields(i, 0, e)} bind:textContent={row.values[0]}/>
          <td contenteditable="true" on:input={(e) => updateFields(i, 1, e)} bind:textContent={row.values[1]}/>
        {/if}
          <td on:click={() => selectedRow = -1}>{row.values[2] == null? "   ":row.values[2].toString().split(" 00")[0]}</td>
          <td on:click={() => selectedRow = -1}>{row.values[3] == null? "   ":row.values[3].toString().split(" 00")[0]}</td>
          <td on:click={() => selectedRow = -1}>{row.values[4] == null? "   ":row.values[4]}</td>
          <td on:click={() => selectedRow = -1} class="highlight">{row.values[5] == null? "   ":row.values[5]}</td>
          <td on:click={() => selectedRow = -1}>{row.values[6] == null? "   ":row.values[6]}</td>
          <td on:click={() => {if(!permission["View Only"]){handleDelete(row); selectedRow = -1;}}}><TrashCanSvelte style={permission["View Only"] ? "color: grey" : "color: white"}/></td>
      </tr>
      {:else}
        <tr on:click={() => handleClick(i, row)} style="border: {selectedRow == i? "2px solid white" : "none"};">
         <td>{row.values[0] == '' || row.values[0] == null? "   ":row.values[0]}</td>
         <td>{row.values[1] == '' || row.values[1] == null? "   ":row.values[1]}</td>
         <td>{row.values[2] == null? "   ":row.values[2].toString().split(" 00")[0]}</td>
         <td>{row.values[3] == null? "   ":row.values[3].toString().split(" 00")[0]}</td>
         <td>{row.values[4] == null? "   ":row.values[4]}</td>
         <td class="highlight">{row.values[5] == null? "  ":row.values[5]}</td>
         <td>{row.values[6] == null? "   ":row.values[6]}</td>
         <td on:click={() => {if(!permission["View Only"]){handleDelete(row); selectedRow = -1;}}}><TrashCanSvelte style={permission["View Only"] ? "color: grey" : "color: white"}/></td>
        </tr>
       {/if}  
     {/each}
     <tr><td on:click={() => {if(!permission["View Only"]){rows.push({id: 0, values: []}); rows = rows; selectedRow = rows.length-1;}}} colspan="8" style="text-align: center;{permission["View Only"] ? "color: grey" : "color: white"}">Add</td></tr> 
    </tbody>
  </table>
</div>

<style>
  :global(div.fwd-run thead tr, div.fwd-run tbody tr:nth-child(even)) {
  background: var(--cds-ui-02);
  }

  :global(div.fwd-run) {
  border-collapse: collapse;
  margin-right: 5px;
  }

  :global(div.fwd-run th, div.fwd-run td) {
  border: 1px solid var(--cds-ui-04);
  padding: 5px;
  white-space: nowrap;
  }
  /* :global(div.fwd-run table td){
    text-align: center;
  }
  :global(div.fwd-run table th){
    background-color:dimgray;
  } */
  .fwd-run .highlight {
     color:#78a9ff;
  } 
  .fwd-run {
    background-color: #262626;
    /* padding: 10px auto; */
    overflow-y: auto;
    overflow-x: auto;
    height: 100%;
    width: 100%;
  }

::-webkit-scrollbar {
 width: 10px;
 height: 10px;
}
</style>