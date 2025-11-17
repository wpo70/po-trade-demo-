<script>
// Import components
import {
  DataTable,
  Button,
  Toolbar,
  ToolbarBatchActions,
  ToolbarSearch,
  ToolbarContent,
  Modal,
  Form,
  ComboBox,
  TextInput,
  Checkbox,
  Pagination 
} from 'carbon-components-svelte';
import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';
import Edit from 'carbon-icons-svelte/lib/Edit.svelte';
import Add from "carbon-icons-svelte/lib/Add.svelte";

// Import stores
import report from '../../stores/report';
import banks from '../../stores/banks';

import websocket from '../../common/websocket';
import Validator from '../../common/validator';
import DraggableModal from '../Utility/DraggableModal.svelte';

// eod eom email
let email_selection =[];
let email_selection_id = [];
let email_rows =[];
let email_delete_rows =[];
let filteredRowIds = [];
let is_update_open = false;
let is_delete_open = false;
let bankInvalid = false;
let page = 1;
let pageSize = 3;

// Update email 
let fields = {
  id: 0,
  bank_id: undefined,
  email:new Validator(),
  eod_report: false,
  eom_report: false,
}

$: email_rows = $report.map((r, i) => {
  return {
    id: r.id,
    bank_id: banks.get(r.bank_id).bank,
    email: r.email,
    eod_report: r.eod_report,
    eom_report: r.eom_report
  }}
);
$: email_delete_rows = email_selection_id.length != 0 ? $report
    .filter((i) => email_selection_id
    .includes(i.id)).map((r, i) => {
    return {
      id: r.id,
      bank_id: banks.get(r.bank_id).bank,
      email: r.email,
      eod_report: r.eod_report,
      eom_report: r.eom_report
    }}) : [];
$: fields.email.invalid = fields.email.isInvalid(Validator.scanEmail);
$: if (fields.bank_id) bankInvalid =false;

function shouldFilterItem(item, value) {
  if (!value) return true;
  return item.text?.toLowerCase().includes(value.toLowerCase());
}
function shouldFilterBank(item, value) {
  if (!value) return true;
  return item.bank_id?.toLowerCase().includes(value.toLowerCase());
}
function copyToForm(report) {
  if (!report) {
    fields.id = 0;
    fields.bank_id = undefined;
    fields.email.reset();
    fields.eod_report = false;
    fields.eom_report = false;
    email_selection =[];
    email_selection_id = [];
  } else {
    fields.id = report.id;
    fields.bank_id = report.bank_id;
    fields.email.set(report.email, report.email);
    fields.eod_report = report.eod_report;
    fields.eom_report = report.eom_report;
  }

  fields = fields;
}
$: if (email_selection.length == 1) copyToForm(email_selection[0]);

function updateSelectedEmail() {
  if (email_selection_id.length !== 0) {
    email_selection = $report.filter( i => email_selection_id.includes(i.id));
  }
}
function handleSubmit (event) {
 
  event.preventDefault();

  fields.email.dirty = true;
  fields.email.str = fields.email.str ? fields.email.str.trim().split(' ').filter((f) => f != "").join(" ") : null;
  fields.email.invalid = fields.email.isInvalid(Validator.scanEmail);

  // do not submit if any of the fields are invalid
  if (fields.email.invalid) {
    return;
  }

  if (typeof fields.bank_id === 'undefined') {
    return;
  }
  
  if (!fields.bank_id) {
    bankInvalid =true; 
    return;
  }
  // if any of the data was invalid, ignore the event

  let report = {
    bank_id: fields.bank_id,
    email: fields.email.str,
    id: fields.id,
    eod_report: fields.eod_report,
    eom_report: fields.eom_report
  };
 
  websocket.updateReportEmail(report);
  copyToForm(null);
  is_update_open = false;
}

function handleDelete (event) {
 
 event.preventDefault();
 if (email_selection_id.length !== 0) {
 websocket.deleteReportEmail(email_selection_id);
 copyToForm(null);
 is_delete_open = false;
 }
}

</script>
    <div style="position:relative;">
      <!-- <h5>Traders Management</h5> -->
      <div style="position: absolute; top:10px; right:10px; cursor: pointer; z-index:10">
        <Button
          kind="tertiary"
          icon={Add}
          on:click={() => is_update_open = !is_update_open}
          style={''}>
          New Email
        </Button>
      </div>
    </div>
    <DataTable
        title="Report Emails"
        description="Emails registered for End-Of-Date| End-Of-Month report"
        useStaticWidth={false}
        stickyHeader
        sortable
        selectable
        batchSelection
        zebra
        size="short"
        headers={[
        {key: 'bank_id', value: 'Bank'},
        {key: 'email', value: 'Email Address'},
        {key: 'eod_report', value: 'EOD'},
        {key: 'eom_report', value: 'EOM'},
        ]}
        {pageSize}
        {page}
        rows={email_rows}
        bind:selectedRowIds={email_selection_id}>
        <Toolbar>
          <ToolbarBatchActions on:cancel={(e) => { e.preventDefault(); email_selection_id = [];}}>
            <!-- DELETE BUTTON -->
            <Button
              icon={TrashCan}
              on:click={() => {updateSelectedEmail(); is_delete_open=!is_delete_open}}
              kind="danger"
              disabled={''}>
              Remove email
            </Button>
    
            <!-- UPDATE BUTTON -->
            <Button
              icon={Edit}
              on:click={() => {updateSelectedEmail(); is_update_open = !is_update_open}}
              kind="secondary"
              disabled={email_selection_id.length > 1}>
              Update email
            </Button>
    
          </ToolbarBatchActions>
          <ToolbarContent>
            <ToolbarSearch 
            persistent    
            shouldFilterRows={shouldFilterBank}
            bind:filteredRowIds/>
          </ToolbarContent>
        </Toolbar>
    </DataTable>
    <Pagination totalItems={email_rows.length} bind:pageSize bind:page />
    <!-- svelte-ignore missing-declaration -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!------------ Update modal ---------------->
    <div class="email_update_form">
      <DraggableModal
      on:close={() => copyToForm(undefined)} 
      bind:open={is_update_open} 
      heading="Email Update"
      >
        <svelte:fragment slot="body">
          <div class="modal_email-btn"style="border: 1px solid #cbcaca; padding: 1rem;">
            <Form on:submit={handleSubmit}>
              <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; "on:keypress|stopPropagation>
                <div style="display: flex; flex-direction: row; gap: 1rem;">
                  <ComboBox
                    titleText="Bank"
                    items={
                      $banks.map(bank => {
                        return {
                          id: bank.bank_id,
                          text: bank.bank,
                          ...bank
                        }
                      })
                    }
                    bind:selectedId={fields.bank_id}
                    invalid={bankInvalid}
                    invalidText='Bank must be selected'
                    {shouldFilterItem}
                  />
                  <!-- </div>
                  <div class="md-grid-item" on:keypress|stopPropagation> -->
                  <TextInput
                    bind:value={fields.email.str}
                    bind:dirty={fields.email.dirty}
                    bind:invalid={fields.email.invalid}
                    invalidText={fields.email.error_message}
                    labelText="Email Address"
                  />
                </div>
                
                <div  on:keypress|stopPropagation>
                  <Checkbox
                  bind:checked={fields.eod_report}
                  labelText="End-Of-Date Report"
                      />
                </div>
                
                <div on:keypress|stopPropagation>
                  <Checkbox
                      bind:checked={fields.eom_report}
                      labelText="End-Of-Month Report"
                    />
                  </div>
                </div>
                <div style="width:100%">
                  <Button type="submit" kind={'primary'} size="default" >
                    {fields.id === 0 ? 'Add Email' : 'Update Email'}
                  </Button>
              </div>
            </Form>
          </div>
        </svelte:fragment>
      </DraggableModal>
    </div>
    
      <!------------ Delete modal ---------------->
    <Modal 
      danger
      size="sx"
      preventCloseOnClickOutside
      bind:open={is_delete_open} 
      primaryButtonText="Delete"
      secondaryButtonText="Cancel"
      on:click:button--primary={handleDelete}
      on:click:button--secondary={() => (is_delete_open = false)}
      modalHeading="Delete Email Report">
      <div  style="border: 1px solid #aaaaaa; padding: 1rem;">
        <Form >
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1rem; ">
          <p>Please confirm to remove following report emails: </p>
          <DataTable
          zebra
          stickyHeader
          size="short"
          headers={[
            {key: 'bank_id', value: 'Bank'},
            {key: 'email', value: 'Email Address'},
            {key: 'eod_report', value: 'EOD'},
            {key: 'eom_report', value: 'EOM'},
          ]}
          rows={email_delete_rows}
          />
          </div>
        </Form>
      </div>
    </Modal>
<style>
:global(.modal_email-btn button.bx--btn) {
  width: 100%;
  max-width: 100%;
  justify-content: center;
}
:global(.modal_email-btn  .bx--list-box--expanded .bx--list-box__menu) {
  max-height: 160px;
}

:global(.email_update_form .bx--modal-container){
  width: 800px;
}
</style>