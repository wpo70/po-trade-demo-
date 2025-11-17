<script>
    import { addDays } from "../../common/formatting";

    export let data = [];
    export let copyData = null;
    
    let selected = [-1, -1];

    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let spot = addDays(today, 1);

    function handleClick(x, y){
        if (data[x][y] == null) return;

        selected = [x, y];
        
        copyData = {
            fixed_payer_id: undefined,
            floating_payer_id: undefined,
            notional: "",
            rate: data[x][y],
            start_date: spot,
            expiry_date: data[x][15],
            term: data[x][13] + "m",
            spread_start_date: spot,
            spread_expiry_date: data[y-1][15],
            spread_term: data[y-1][13] + "m",
            sef: false,
            rba: false,
            clearhouse: 'LCH',
        };
    }
    
    function toDateString(date) {
        let datestrings = date.toString().split(" ");
        return datestrings[2] + " " + datestrings[1] + " " + datestrings[3].slice(2);
    }
</script>

<div class="spread-tenor">
    <table>
        <thead>
            <tr>
                <th></th>
                <th colspan=12>Tenor</th>
                <th></th>
                <th colspan=3>Spot</th>
            </tr>
            <tr>
                <th>Start</th>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
                <th>6</th>
                <th>7</th>
                <th>8</th>
                <th>9</th>
                <th>10</th>
                <th>11</th>
                <th>12</th>
                <th>Months </th>
                <th>Outright</th>
                <th>Exp Date</th>
                <th>No. Days</th>
            </tr>
        </thead>
        <tbody>
            {#each data as row, i}
                <tr>
                    <td class="header">{row[0] == null? "   ":row[0]}</td>
                    <td on:click={() => handleClick(i, 1)} style = {selected[0] == i && selected[1] == 1 ? "border: 2px solid white;" : ""}>{row[1] == null? "   ":row[1]}</td>
                    <td on:click={() => handleClick(i, 2)} style = {selected[0] == i && selected[1] == 2 ? "border: 2px solid white;" : ""}>{row[2] == null? "   ":row[2]}</td>
                    <td on:click={() => handleClick(i, 3)} style = {selected[0] == i && selected[1] == 3 ? "border: 2px solid white;" : ""}>{row[3] == null? "   ":row[3]}</td>
                    <td on:click={() => handleClick(i, 4)} style = {selected[0] == i && selected[1] == 4 ? "border: 2px solid white;" : ""}>{row[4] == null? "   ":row[4]}</td>
                    <td on:click={() => handleClick(i, 5)} style = {selected[0] == i && selected[1] == 5 ? "border: 2px solid white;" : ""}>{row[5] == null? "   ":row[5]}</td>
                    <td on:click={() => handleClick(i, 6)} style = {selected[0] == i && selected[1] == 6 ? "border: 2px solid white;" : ""}>{row[6] == null? "   ":row[6]}</td>
                    <td on:click={() => handleClick(i, 7)} style = {selected[0] == i && selected[1] == 7 ? "border: 2px solid white;" : ""}>{row[7] == null? "   ":row[7]}</td>
                    <td on:click={() => handleClick(i, 8)} style = {selected[0] == i && selected[1] == 8 ? "border: 2px solid white;" : ""}>{row[8] == null? "   ":row[8]}</td>
                    <td on:click={() => handleClick(i, 9)} style = {selected[0] == i && selected[1] == 9 ? "border: 2px solid white;" : ""}>{row[9] == null? "   ":row[9]}</td>
                    <td on:click={() => handleClick(i, 10)} style = {selected[0] == i && selected[1] == 10 ? "border: 2px solid white;" : ""}>{row[10] == null? "   ":row[10]}</td>
                    <td on:click={() => handleClick(i, 11)} style = {selected[0] == i && selected[1] == 11 ? "border: 2px solid white;" : ""}>{row[11] == null? "   ":row[11]}</td>
                    <td on:click={() => handleClick(i, 12)} style = {selected[0] == i && selected[1] == 12 ? "border: 2px solid white;" : ""}>{row[12] == null? "   ":row[12]}</td>
                    <td class="header">{row[13] == null? "   ":row[13]}</td>
                    <td style= {selected[1]-1 == i || selected[0] == i ? "border: 2px solid white;" : ""}>{row[14] == null? "   ":row[14]}</td>
                    <td style= {selected[1]-1 == i || selected[0] == i ? "border: 2px solid white;" : ""}>{row[15] == null? "   ":toDateString(row[15])}</td>
                    <td style= {selected[1]-1 == i || selected[0] == i ? "border: 2px solid white;" : ""}>{row[16] == null? "   ":row[16]}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    :global(div.spread-tenor thead tr, div.spread-tenor tbody tr:nth-child(even)) {
    background: var(--cds-ui-02);
    }

    :global(div.spread-tenor) {
    border-collapse: collapse;
    margin-right: 5px;
    }

    :global(div.spread-tenor th, div.spread-tenor td) {
    border: 1px solid var(--cds-ui-04);
    padding: 5px;
    white-space: nowrap;
    }
    /* :global(div.spread-tenor table td){
        text-align: center;
    }
    :global(div.spread-tenor table th){
        background-color:dimgray;
    } */
    .spread-tenor .header {
          color:#78a9ff;
    } 
    .spread-tenor {
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