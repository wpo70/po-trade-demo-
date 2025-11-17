<script>
    import { 
        ComboBox,
        Accordion, 
        AccordionItem, 
        Button, 
        Row, 
        Column,
        Tile, 
        Grid 
    } from "carbon-components-svelte";
    import { createEventDispatcher } from 'svelte';
    import Close from "carbon-icons-svelte/lib/Close.svelte";
    
    export let data;
    export let card;

    let rate_1;
    let rate_2;
    let rate

    function shouldFilterItem(item, value) {
        if (!value) return true;
        return item.text.toLowerCase().includes(value.toLowerCase());}
    let dispatch = createEventDispatcher();    
    function handleClose () {
        
        dispatch('Close', card.id);
    }
    $: { 
        card.input1= card.input1? card.input1: "";
    }
    $:  card.input2= card.input2? card.input2: "";
    $:  rate_1 = card.input1 ? card.input1[4] : "";
    $:  rate_2 = card.input2 ? card.input2[4] : "";
    $:  rate = Math.abs(rate_2 - rate_1) !== 0 ? Math.abs(rate_2 - rate_1).toFixed(2): "";
</script>
<div class="card-fwds-close-btn"><Button icon={Close} iconDescription="Close" on:click={() =>handleClose()} kind="ghost" disabled={''} /></div>
<div class="card-wrap-fwds" >
    <Button>
        <ul>{card.input1[0]? card.input1[0]+" vs. ": ""}{card.input2[0]? card.input2[0]+":":""}</ul>
        <h1> {rate} </h1>
    </Button>
    <Accordion>
        <AccordionItem title="" >
            <Row noGutter>
                <Column>
                    <ComboBox
                    size="xl"
                    invalidText="Please select Tenor"
                    titleText="Tenor Mid Rate"
                    items={
                    data.map(d => { return {
                        id: d,
                        text: d[0],
                        ...d
                        }
                    })
                    }
                    {shouldFilterItem}
                    bind:selectedId={card.input1}
                    />
                </Column>
                
                <Column sm={1}>
                    <Button size="small" kind="ghost" style="color:#78a9ff; text-align: end;">{rate_1}</Button>
                </Column>
            </Row>
            <Row noGutter>
                <Column sm={3}>
                    <ComboBox
                    size="xl"
                    invalidText="Please select Tenor"
                    titleText="Tenor Mid Rate "
                    items={
                    data.map(d => { return {
                        id: d,
                        text: d[0],
                        ...d
                        }
                    })
                    }
                    {shouldFilterItem}
                    bind:selectedId={card.input2}
                    />
                </Column>
                <Column sm={1}>
                    <Button size="small" kind="ghost" style="color:#78a9ff; text-align: end;">{rate_2}</Button>
                </Column>
            </Row>
        </AccordionItem>
    </Accordion>

</div>
                        
<style>
    .card-fwds-close-btn{
        z-index: 100;
        top:0;
        right:0;
    }
    .card-wrap-fwds{
        position: relative;
        width: 330px;
        height: 250px;
        display: grid;
        text-align: left;
        box-sizing: border-box;
        
    }
</style>