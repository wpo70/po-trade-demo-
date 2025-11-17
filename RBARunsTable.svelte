<script>
    import active_product from "../../stores/active_product";
    import quotes from "../../stores/quotes";
    import user from "../../stores/user";
    import brokers from '../../stores/brokers.js';
    import websocket from "../../common/websocket";
    import currency_state from '../../stores/currency_state.js';
    import { addDays, addMonths, toPrice } from '../../common/formatting.js';

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
        copyData = {
            fixed_payer_id: undefined,
            floating_payer_id: undefined,
            notional: "",
            rate: row[3] == null ? row[2] : row[3],
            expiry_date: convertStringToDate(row[1]),
            term: row[4] + "d",
            start_date: convertStringToDate(row[0]),
            sef: false,
            rba: true,
            clearhouse: "LCH",
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

            let months = {Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11};
            let startMonth = months[row[0].split(' ')[1]];
            let startYear = parseInt(row[0].split(' ')[2]) + 2000;
            let today = new Date();
            let date = new Date();
            let rbaCount = 1;
            date.setDate(1);
            if (date.getMonth() != 0){
                let tueFound = false;
                while (!tueFound) {
                    if (date.getDay() == 2){
                        tueFound = true;
                        break;
                    }
                    date = addDays(date, 1); 
                }
                date = addDays(date, 1); 
                if (date < today) {
                    date = addMonths(date, 1);
                }
                date.setDate(1);
            } else {
                date = addMonths(date, 1);
            }
            while (date.getMonth() != startMonth || date.getFullYear() != startYear) {
                date = addMonths(date, 1);
                if (date.getMonth() == 0){
                    date = addMonths(date, 1);
                }
                rbaCount++;
            }

            let quote = quotes.get($active_product, (1000 + rbaCount));
            handleOverride(quote, event.srcElement); 
            event.preventDefault();
            row[3] = event.srcElement.innerText == '' ? '' : event.srcElement.innerText;
            copyData.rate = event.srcElement.innerText == '' ? row[2] : event.srcElement.innerText;
        } 
    }
</script>

<div class="rba-run rba-run-wrap">
    <table>
        <thead>
            <tr>
                <th>Start</th>
                <th>Maturity</th>
                <th>Mid OIS</th>
                <th>Overwrite</th>
                <th>Day Count</th>
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
                    <td>{row[4] == null? "   ":row[4]}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .rba-run-wrap {
        background-color: #262626;
        padding: 10px auto;
    }

    :global(div.rba-run thead tr, div.rba-run tbody tr:nth-child(even)) {
        background: var(--cds-ui-02);
    }

    :global(div.rba-run) {
        border-collapse: collapse;
        margin-right: 5px;
        overflow-y: auto;
        overflow-x: auto;
    }

    :global(div.rba-run th, div.rba-run td) {
        border: 1px solid var(--cds-ui-04);
        padding: 5px;
    white-space: nowrap;
    }
    /* :global(div.rba-run table td){
        text-align: center;
    }
    :global(div.rba-run table th){
        background-color:dimgray;
    } */
    .rba-run .highlight {
        color:#78a9ff
    } 

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
</style>