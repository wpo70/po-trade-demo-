<script>
    export let format;
    /** list of bank_id had eod report */
    export let  bank_had_report;
    /** list of email adress usr had chosen for eod report*/
    export let report_email_selected = [];
    /** Specific Bank ID user had chosen to send eod report*/
    export let bankReport = null;
    export let recipient;
    export let distribution;

    import { FormGroup, RadioButtonGroup, RadioButton, Button, SelectableTile, Tile, TileGroup } from "carbon-components-svelte";
    import banks from "../../stores/banks";
    import report from "../../stores/report";

    import Email from "carbon-icons-svelte/lib/Email.svelte";
    import Send from "carbon-icons-svelte/lib/Send.svelte";

    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    const name_of_report = (type) => {
        return type =="eod"? "End-Of-Date": (type =="eom"? "End-Of-Month": "");
      }
    function emailHandle ( email, type ) {
      //push
      if (type) report_email_selected.push(email)
      //remove
      if (!type) report_email_selected.splice(report_email_selected.indexOf(email), 1)
      dispatch('report_email_selected', {report_email_selected}) 
    } 
</script>
<div style="display: flex; gap:5px; flex-direction: column;">
   <!-- Had EOD|EOM report -->
   {#if bank_had_report.size !== 0 }
     
    <!-- List of Bank had EOD|EOM report -->
      <FormGroup>
       <RadioButtonGroup 
          bind:selected={bankReport}
          on:change={({detail}) => { dispatch('bankReportChosen', {detail}) }} 
          legendText={`Banks Had ${name_of_report(format)}`} id="bankReport">
         
          {#each bank_had_report as b}
              <RadioButton labelText={banks.get(b).bank} value={b} />
          {/each}
       </RadioButtonGroup>
     </FormGroup>
     
     <!-- List of Email address per bank chosen -->
     <FormGroup>
       {#if bankReport && report.get(bankReport, format)?.length !== 0}
       
         <div role="group" aria-label = "selectable tiles">
           <TileGroup >
           {#each report.get(bankReport, format) as e, i}
             <SelectableTile 
                light selected value={e} id={e}
                on:select={({detail}) => emailHandle ( detail, true )} 
                on:deselect={({detail}) => emailHandle ( detail, false )}
             ><Email /> &nbsp; {e}</SelectableTile>
           {/each}
         </TileGroup>
         </div>
       
       {:else if bankReport && report.get(bankReport, format) == 0}
       <div class="noReport_note">
         <Tile light>
           There's no email address for {banks.get(bankReport).bank}'s {name_of_report(format)} report . Please update on Trader Management Page.
         </Tile>
        </div>
       {/if}
     </FormGroup>

      <!-- Button: copy List of Email address per bank chosen to Email form -->
      {#if distribution == 'email' && bankReport && report.get(bankReport, format)?.length !== 0}
          <FormGroup><hr></FormGroup>
          <div style="width: 70%" >
            <Button kind='tertiary' on:click={() => recipient.str = [...new Set(report_email_selected)].toString().replaceAll(',',' ')}>
              Set to Email &nbsp; <Send />
            </Button>
          </div> 
      {/if}

    <!-- No EOD||EOM report -->
   {:else if bank_had_report.size == 0 }
   <div class="noReport_note">
     <Tile light>
       There's no {name_of_report(format)} report {format =="eod"? "today":""}.
     </Tile>
    </div>
   {/if}
</div>

<style>

:global(.report_details #bankReport.bx--form-item fieldset.bx--radio-button-group ){
  width: 100%;
  flex-wrap: wrap;
}
:global(.report_details .time_setting .bx--accordion__content ) {
  margin-left: 0;
  margin-right: 0;
  padding-bottom: var(--cds-spacing-03, 0.5rem);;
}
  
@media (min-width: 640px){
  :global(.time_setting .bx--accordion__content) {
    padding-right: 20px;
    margin-right: 0;
  }
}
@media (min-width: 480px) {
    :global(.time_setting .bx--accordion__content ) {
    padding-right: 20px;
    margin-right: 0;
  }
}
:global(.report_details .bx--radio-button-group ) {
    margin-top: 0;
  }
</style>