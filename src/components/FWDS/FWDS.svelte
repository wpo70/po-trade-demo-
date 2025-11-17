<script>
import { Tile, Grid, Row, Column, Button } from 'carbon-components-svelte';
import Add from "carbon-icons-svelte/lib/Add.svelte";

/* Import components */
import Indicators from "./Indicators.svelte";
import FwdsCard from "./FwdsCard.svelte";

let indicators;
let card =[{ id: 1, input1: null, input2: null},{ id: 2, input1: null, input2: null},{ id: 3, input1: null, input2: null}];

let addCard;
function handleAddCard () {
    addCard();
}

indicators = [
    ["O/N",0.081,0.337,0.209,0.16,0.25],
    ["TOM NEXT",0.398,0.402,0.4,0.402,0.306],
    ["SPOT NEXT",0.587,0.613,0.6,0.624,0.407],
    ["1 WEEK",1.35,1.45,1.4,1.38,1.41],
    ["2 WEEK",2.68,2.76,2.72,2.73,2.68],
    ["3 WEEK",3.84,3.94,3.89,3.93,3.86],
    ["1M",6.47,6.67,6.57,6.87,6.11],
    ["2M",15.99,16.24,16.115,16.12,15.96],
    ["3M",24.8,25.3,25.05,25.46,24.7],
    ["4M",32.74,33.14,32.94,33.09,31.92],
    ["5M",40.95,41.7,41.325,41.53,41.01],
    ["6M",48.74,49.49,49.115,49.21,48.84],
    ["7M",56.42,57.66,57.04,57.53,56.59],
    ["8M",63.18,64.91,64.045,64.41,63.81],
    ["9M",69.6,71.1,70.35,70.75,70.16],
    ["10M",75.01,76.77,75.89,77.69,76.42],
    ["11M",80.88,82.81,81.845,83.01,81.6],
    ["1Y",86.1,88.1,87.1,88.49,85.75],
    ["15M",98.14,101.57,99.855,99.79,98.77],
    ["18M",104.11,108.92,106.515,106.33,103.99],
    ["21M",105.11,111.21,108.16,107.35,108.01],
    ["2Y",103.2,110.43,106.815,107.65,100],
    ["30M",92.45,109.46,100.955,92.73,108.42],
    ["3Y",76,92,84,77,87],
    ["4Y",-135.69,234.29,49.3,4.48,66.95],
    ["5Y",-53.35,6.65,-23.35,-53.35,4.17]
];

</script>

<div class="fwds">
<Grid condensed noGutter>
    <Row>
        <div class="fwds-i">
        <Column>                
            <Tile>
                <div class="indicator-header">
                    <div  style="grid-column-end: span 2;"><h4 style="margin-bottom: 10px; font-weight:normal"> Indicators</h4></div>
                    <div style="text-align: right"><Button iconDescription="Create New Calculator" icon={Add} on:click={() => handleAddCard()}/></div>
                </div>
                <Button kind="tertiary" style="color:#78a9ff; margin-bottom: 10px;">Spot Rate &nbsp <u>0.6603</u></Button>

                <h5 style="margin-bottom: 10px; font-weight:normal">Forwards Rate</h5>
                
                <Indicators data = {indicators}/>
                
            </Tile>
        </Column>
        </div>
        
        <div class="fwd-card-wrap">
            <FwdsCard data={indicators} bind:card={card} bind:addCard={addCard}/>
        </div> 
        </Row>
    </Grid>
</div>

<style>
.fwds-i {
    padding-left: 10px;
    margin-right: 10px auto;
    padding-right: 10px auto;
    gap: 1rem;
 
}
.indicator-header {
    display: grid;
    grid-template-columns: auto auto auto;
}

.fwd-card-wrap {
    padding-left: 10px;
    gap: 2rem;
    }   


</style>