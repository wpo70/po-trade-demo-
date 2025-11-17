<script>
    import { addTenorToDays } from "../../common/formatting";

    export let data = [];
    export let copyData = null;

    let values = data[0];
    let headers = data[1];
    
    let selected = [-1, -1];

    function handleClick(x, y){

        if (values[x][y] == null) return;

        selected = [x, y];
        
        copyData = {
            fixed_payer_id: undefined,
            floating_payer_id: undefined,
            notional: "",
            rate: values[x][y],
            start_date: convertStringToDate(values[x][15]),
            expiry_date: addTenorToDays(values[x][16] + "d", convertStringToDate(values[x][15])),
            term: values[x][16] + "d",
            spread_start_date: convertStringToDate(values[y-1][15]),
            spread_expiry_date: addTenorToDays(values[y-1][16] + "d", convertStringToDate(values[y-1][15])),
            spread_term: values[y-1][16] + "d",
            sef: false,
            rba: true,
            clearhouse: 'LCH'
        };
    }

    const convertStringToDate = (str) => {
        if(!str) {
            return '';
        }

        let months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
                    Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};

        str = str.split(" ");
        let date = new Date(parseInt("20"+str[2]), months[str[1]], parseInt(str[0]));
        return date;
    }
</script>

<div class="swap-tenor">
    <table>
        <thead>
            <tr>
                <th></th>
                <th colspan=12>Tenor</th>
                <th></th>
                <th colspan=3>RBA</th>
            </tr>
            <tr>
                <th>Start </th>
                {#each headers as header}
                    <th>
                        {header}
                    </th>
                {/each}
                <th>Months </th>
                <th>Outright</th>
                <th>Date</th>
                <th>No. Days</th>
            </tr>
        </thead>
        <tbody>
            {#each values as row, i}
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
                    <td style= {selected[1]-1 == i || selected[0] == i ? "border: 2px solid white;" : ""}>{row[15] == null? "   ":row[15]}</td>
                    <td style= {selected[1]-1 == i || selected[0] == i ? "border: 2px solid white;" : ""}>{row[16] == null? "   ":row[16]}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    :global(div.swap-tenor thead tr, div.swap-tenor tbody tr:nth-child(even)) {
    background: var(--cds-ui-02);
    }

    :global(div.swap-tenor) {
    border-collapse: collapse;
    /* margin-right: 5px; */
    }

    :global(div.swap-tenor th, div.swap-tenor td) {
    border: 1px solid var(--cds-ui-04);
    padding-top: 5px;
    padding-bottom: 5px;
    padding-left: 1px;
    padding-right: 1px;
    white-space: nowrap;
    }
    /* :global(div.swap-tenor table td){
        text-align: center;
    }
    :global(div.swap-tenor table th){
        background-color:dimgray;
    }*/
    .swap-tenor .header{
         color:#78a9ff;
    } 
    .swap-tenor {
        background-color: #262626;
        padding: 10px auto;
        width: 100%;
        overflow-y: auto;
        overflow-x: auto;
    }

    ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
    }
</style>