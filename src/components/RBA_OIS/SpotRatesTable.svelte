<script>
    import { addDays, tenorToYear, toPrice } from '../../common/formatting.js';
    import websocket from '../../common/websocket.js';
    import user from '../../stores/user.js';
    import active_product from '../../stores/active_product.js';
    import currency_state from '../../stores/currency_state.js';
    import quotes from '../../stores/quotes.js';
    import brokers from '../../stores/brokers.js';

    export let data = [];
    export let copyData = null;
    let selectedRow = -1;
    $:permission = user.getPermission($brokers);

    const convertStringToDate = (str) => {
        if(!str) {
            return '';
        }

        let months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
                    Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};

        str = str.split(" ");
        let date = new Date(parseInt("20"+str[2]), months[str[1]], parseInt(str[0]));
        return date;
    };

    function handleClick(i, row){
        selectedRow = i;
        let today = new Date();
        let spot = addDays(today, 1);
        copyData = {
            fixed_payer_id: undefined,
            floating_payer_id: undefined,
            notional: "",
            rate: row[3] == null ? row[2] : row[3],
            expiry_date: convertStringToDate(row[0]),
            term: row[1],
            start_date: row[1] == 'ON' ? today : spot,
            sef: false,
            rba: false,
            clearhouse: 'LCH',
        };
    }

    function handleOverride(row, source) {
        // submit the override to the server
        submitOverride(row, source.innerText);
    }

    function submitOverride(ind, text) {
        var ovr = parseFloat(text);

        if (isNaN(ovr) || text === toPrice(ind.mid)) {
            ovr = null;
        }
        websocket.overrideQuote(ind, ovr, $currency_state);
    }
    
    // returns true if the given character is between 0-9 OR is '.' or '+'or '-'
    function isCharNumber(c) {
        return (c >= '0' && c <= '9') || (c === '.' || c === '+' || c === '-');
    }

    function handleKeyPress(event) {
        // amount of decimal places currently
        let dp = event.target.textContent.split('.')[1]?.length;
        // the current index of the decimal place
        let dpIdx = event.target.textContent.indexOf('.');

        // the indexes of the start and end of the currently selected text
        let selectionStartIdx = event.view.getSelection().anchorOffset;
        let selectionEndIdx = event.view.getSelection().focusOffset;

        if (event.key && !isCharNumber(event.key)) {
            // if the event is not a number, prevent the event from happening
            event.preventDefault();
        } else if (dp !== undefined && 
                    (selectionStartIdx > dpIdx) &&
                    (dp >= 4) && 
                    (selectionStartIdx === selectionEndIdx)) {
            // if the event would add more than 4 decimal places, prevent it from happening 
            event.preventDefault();
        } 
    }

    function handleKeyDown(row, event) {
        // keycode 13 is enter, 27 is esc
        if (event.keyCode === 13 || event.keyCode === 27) {
            // handle the override and prevent the keystroke from being registered in the text box
            let quote = quotes.get($active_product, tenorToYear(row[1])[0]);
            handleOverride(quote, event.srcElement); 
            event.preventDefault();
            row[3] = event.srcElement.innerText == '' ? '' : event.srcElement.innerText;
            copyData.rate = event.srcElement.innerText == '' ? row[2] : event.srcElement.innerText;
        } 
    }
</script>

<div class="spot-rates">

    <table>
        <thead>
            <tr>
                <th>Maturity</th>
                <th>Tenor</th>
                <th>Spot</th>
                <th>Overwrite</th>
            </tr>
        </thead>
        <tbody>
            {#each data as row, i}
                <tr on:click={() => handleClick(i, row)} style="border: {selectedRow == i? "2px solid white" : "none"};">
                    <td>{row[0] == null? "   ":row[0]}</td>
                    <td>{row[1] == null? "   ":row[1]}</td>
                    <td class="highlight">{row[2] == null? "   ":row[2]}</td>
                    {#if !permission["View Only"]}
                    <td contenteditable="true" on:keydown={(e) => handleKeyDown(row, e)} on:keypress={handleKeyPress}>{row[3] == null? "   ":row[3]}</td>
                    {:else}
                    <td contenteditable="false" on:keydown={(e) => handleKeyDown(row, e)} on:keypress={handleKeyPress}>{row[3] == null? "   ":row[3]}</td>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    :global(div.spot-rates thead tr, div.spot-rates tbody tr:nth-child(even)) {
    background: var(--cds-ui-02);
    }

    :global(div.spot-rates) {
    border-collapse: collapse;
    margin-right: 5px;
    }

    :global(div.spot-rates th, div.spot-rates td) {
    border: 1px solid var(--cds-ui-04);
    padding: 5px;
    white-space: nowrap;
    }
    /* :global(div.spot-rates table td){
        text-align: center;
    }
    :global(div.spot-rates table th){
        background-color:dimgray;
    }
    */
    .spot-rates .highlight {
        color:#78a9ff;
    } 
    .spot-rates {
        background-color: #262626;
        width: 100%;
        overflow-y: auto;
        overflow-x: auto;

    }
    :global(div.spot-rates table) {
        margin-bottom: 5px;
    }

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
</style>