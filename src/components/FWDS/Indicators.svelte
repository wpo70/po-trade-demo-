<script>
    export let data;
</script>

<div class="fwds-indicators">
    <table>
        <thead>
            <tr>
                <th></th>
                <th>Bid</th>
                <th>Ask</th>
                <th>Mid</th>
                <th>High</th>
                <th>Low</th>
            </tr>
        </thead>
        <tbody>
            {#each data as row}
                <tr>
                    <td class="header">{row[0] == null? "   ":row[0]}</td>
                    <td>{row[1] == null? "   ":row[1]}</td>
                    <td>{row[2] == null? "   ":row[2]}</td>
                    <td>{row[3] == null? "   ":row[3]}</td>
                    <td>{row[4] == null? "   ":row[4]}</td>
                    <td>{row[5] == null? "   ":row[5]}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>

    .fwds-indicators {
        background-color: #262626;
    }
    :global(div.fwds-indicators thead tr, div.fwds-indicators tbody tr:nth-child(even)) {
    background: var(--cds-ui-02);
    }

    :global(div.fwds-indicators) {
    border-collapse: collapse;
    margin-right: 5px;
    }

    :global(div.fwds-indicators th, div.fwds-indicators td) {
    border: 1px solid var(--cds-ui-04);
    padding: 5px;
    }
</style>