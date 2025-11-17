<script>
  'use strict';
  
  import {
    Button,
    Form,
    MultiSelect,
    TextArea,
    TextInput
  } from "carbon-components-svelte";
  import { fade } from "svelte/transition";
  import { sendTransition } from "../../common/animations";
  import SendFilled from "carbon-icons-svelte/lib/SendFilled.svelte";
  import MailAll from "carbon-icons-svelte/lib/MailAll.svelte";

  import brokers from "../../stores/brokers";
  import websocket from "../../common/websocket";
  
  let all_recipients = brokers.generateRecipientsList();

  let fields = {};
  clearAll();

  let submitted = false;

  function clearAll() {
    fields.recipients = [];
    fields.subject = "";
    fields.subject_invalid = false;
    fields.body = "";
  }
  $: if (fields.recipients?.length) { fields.recipients_invalid = false; }


  function sendNotification() {
    // FIXME: If this becomes more than just a dev option, the fields (also check body) should be made dirty and then validated more carefully than the existing simple checks
    blurButton();
    if (!fields.recipients.length) { fields.recipients_invalid = true; }
    if (!fields.subject.length) { fields.subject_invalid = true; }
    if (fields.recipients_invalid || fields.subject_invalid) { return; }
    websocket.sendNotifications({ brokers:fields.recipients, subject:fields.subject, body:fields.body });
    visuallySend();

    async function visuallySend() {
      submitted = true;
      await new Promise(res => setTimeout(res, 1000));
      clearAll();
      submitted = false;
    }
  }

  function blurButton() {
    document.activeElement?.blur();
  }

</script>

<div class="notification_dispatch">
  {#if submitted}
    <div class="vis_send" in:fade={{duration:250}} out:fade={{duration:250}}>
      <div
        in:sendTransition={{delay:150, duration:300, inward:true}}
        out:sendTransition={{duration:300, inward:false}}
        style="display:flex; flex-direction:column; align-items:center; gap:10px;"
        >
        <MailAll size="42"/>
        <h4>Notification Sent</h4>
      </div>
    </div>
  {:else}
    <div class="notification_form_div" in:fade={{duration:175}} out:fade|local={{duration:175}}>
      <Form on:submit={(e) => {
          e.preventDefault();
          sendNotification();
        }}
        id="notification_form"
        style="margin:0;"
        >
        <div class="recipients_row">
          <MultiSelect 
            titleText="Recipients"
            label="Select notification recipients"
            placeholder="Filter notification recipients..."
            filterable
            items={all_recipients}
            bind:selectedIds={fields.recipients}
            invalid={fields.recipients_invalid}
            invalidText="At least one recipient must be selected from the list."
            style="width:100%"
            />
          <Button
            size="small"
            kind="tertiary"
            style="padding-right:12px; height:42px; margin-top:23px"
            on:click={() => {blurButton(); fields.recipients = brokers.generateRecipientsList().map(b => b.id);}}
            >
            Select All
          </Button>
        </div>
        <TextInput
          labelText="Notification Subject"
          bind:value={fields.subject}
          warn={fields.subject.length > 85}
          warnText="This is a long subject line. Consider shortening it and adding to the body."
          invalid={fields.subject_invalid}
          invalidText="Notifications require a subject line."
          on:focus={() => {fields.subject_invalid = false;}}
          placeholder="Enter a subject line for the notification..."
          />
        <TextArea
          labelText="Notification Body"
          placeholder="If required, enter the body text of the notification..."
          bind:value={fields.body}
          />
        <div style="display:flex; gap:1rem;">
          <Button kind="tertiary"on:click={() => { clearAll(); blurButton(); }}>Clear All</Button>
          <Button type="submit" icon={SendFilled}>Send Notification</Button>
        </div>
      </Form>
    </div>
  {/if}
</div>

<style>
  .notification_dispatch {
    position: relative;
    display: grid;
    min-height: 432px;
  }

  .notification_form_div {
    position:relative;
    top:0;
    left:0;
    margin: 1rem;
  }

  .vis_send {
    display:flex;
    justify-content:center;
    align-items:center;
    margin:1rem;
    position:absolute;
    top:0;
    left:0;
    height: 400px;
    width: calc(100% - 2rem);
    z-index:1;
  }

  :global(#notification_form > *:not(:last-child)) {
    padding-bottom: 2rem;
  }
  
  :global(#notification_form .bx--label) {
    font-size: var(--cds-label-02-font-size);
    color: var(--cds-text-01);
  }

  .recipients_row {
    display:flex;
    justify-content:space-between;
    gap:1rem;
  }

  /* ensures multiselect is full width (style restProps gets propagated too deep) */
  :global(.recipients_row > div) { 
    width: 100%;
  }
</style>