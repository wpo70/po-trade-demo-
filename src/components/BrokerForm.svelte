<script>
  import {
    Form,
    TextInput,
    Button,
    NumberInput,
  } from "carbon-components-svelte";
  import Validator from "../common/validator";
  import websocket from "../common/websocket";
  import brokers from "../stores/brokers";
  import user from "../stores/user";
  import { createEventDispatcher } from "svelte";
  import DraggableModal from "./Utility/DraggableModal.svelte";
  
  export let defaults = undefined;
  export let broker = undefined;
  export let open;
  
  const dispatch = createEventDispatcher();
  let currentuser;
  let error_message = "";
  $: {let b = $brokers; currentuser = brokers.get(user.get());}
  
  let fields = {
    broker_id: 0,
    firstname: new Validator(),
    lastname: new Validator(),
    username: new Validator(),
    accesslevel: new Validator(),
    email: new Validator(),
  };

  $: if (broker) copyBrokerToForm(broker);

  $: fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
  $: fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
  $: fields.accesslevel.error_message = "Max number is 999";
  $: fields.username.invalid = fields.username.isInvalid(isUsernameValid);
  $: fields.email.invalid = fields.email.isInvalid(isEmailValid);

  function copyBrokerToForm(broker) {
    if (!broker) {
      fields.broker_id = 0;
      fields.firstname.reset();
      fields.lastname.reset();
      fields.username.reset();
      fields.accesslevel.reset();
      fields.email.reset();
    } else {
      fields.broker_id = broker.broker_id;
      fields.firstname.set(broker.firstname, broker.firstname);
      fields.lastname.set(broker.lastname, broker.lastname);
      fields.username.set(broker.username, broker.username);
      fields.accesslevel.set(broker.accesslevel, broker.accesslevel);
      fields.email.set(broker.email, broker.email);
    }
    
    fields = fields;
  }
  let permissions;
  function defaultPermission() {
    let accesslevel = fields.accesslevel.value;
    if(accesslevel === 999){
      permissions = defaults[defaults.length - 1];
    }else if(accesslevel > defaults.length - 2){
      permissions = defaults[defaults.length - 2];
    }else {
      permissions = defaults[accesslevel - 1];
    }
    return permissions;
  }
  function isEmailValid(str) {
    // CONDITIONS: string must not be empty, must be a valid email, and must be unique
    if (str) Validator.scanEmail(str);

    let emails = $brokers.filter((b) => b.active).map((broker) => broker.email);
    if (broker) {
      emails = emails.filter((e) => e !== broker.email);
    }
    return isUnique(str, emails);
  }

  function isUsernameValid(str) {
    Validator.scanRequiredText(str);

    let users = $brokers.map((broker) => broker.username);
    if (broker) {
      users = users.filter((e) => e !== broker.username);
    }
    return isUnique(str, users);
  }

  function isUnique(str, set) {
    if (set.includes(str)) {
      throw new Error("Already Taken");
    }

    if (str === "") {
      return null;
    }

    return str;
  }
  function handleSubmit(event) {
    event.preventDefault();

    fields.firstname.dirty = true;
    fields.lastname.dirty = true;
    fields.username.dirty = true;
    fields.accesslevel.dirty = true;
    fields.email.dirty = true;

    fields.firstname.str = fields.firstname.str.trim().split(' ').filter((f) => f != "").join(" ");
    fields.lastname.str = fields.lastname.str.trim().split(' ').filter((f) => f != "").join(" ");

    fields.firstname.invalid = fields.firstname.isInvalid(Validator.scanRequiredText);
    fields.lastname.invalid = fields.lastname.isInvalid(Validator.scanRequiredText);
    fields.accesslevel.invalid = fields.accesslevel.isInvalid(Validator.scanRequiredText);
    fields.username.invalid = fields.username.isInvalid(isUsernameValid);
    fields.email.invalid = fields.email.isInvalid(isEmailValid);

    // do not submit if any of the fields are invalid
    if (
      fields.firstname.invalid ||
      fields.lastname.invalid ||
      fields.username.invalid ||
      fields.email.invalid ||
      fields.accesslevel.invalid
    ) {
      return;
    }

    // if any of the data was invalid, ignore the event
    if(fields.broker_id === 0) defaultPermission();
    let broker = {
      broker_id: fields.broker_id,
      firstname: fields.firstname.value,
      lastname: fields.lastname.value,
      username: fields.username.value,
      accesslevel: fields.accesslevel.value,
      email: fields.email.value,
      permission: permissions
    };
    if(currentuser.accesslevel > broker.accesslevel || currentuser.accesslevel === 999){
      websocket.submitBroker(broker);
      copyBrokerToForm(null);
      open = false;
      dispatch("updated");
      error_message="";
    }else{
      error_message = "Cannot exceed your access level";
    }
  }
</script>

<div class= "broker_form">
  <DraggableModal
    on:close={() => copyBrokerToForm(undefined)}
    bind:open 
    heading="Broker Form"
  >
    <svelte:fragment slot="body">
      <Form on:submit={handleSubmit}>
        {#if error_message}
          <div style="color:red">
            <p>{error_message}</p>
          </div>
        {/if}
        <div class="grid">
          <div class="sm-grid-item" on:keypress|stopPropagation>
            <TextInput
              bind:value={fields.firstname.str}
              bind:dirty={fields.firstname.dirty}
              bind:invalid={fields.firstname.invalid}
              labelText="First Name"
              invalidText={fields.firstname.error_message}
              required
              />
          </div>
          <div class="sm-grid-item" on:keypress|stopPropagation>
            <TextInput
              bind:value={fields.lastname.str}
              bind:dirty={fields.lastname.dirty}
              bind:invalid={fields.lastname.invalid}
              labelText="Last Name"
              invalidText={fields.lastname.error_message}
              required
            />
          </div>
          <div class="sm-grid-item"  on:keypress|stopPropagation>
            <NumberInput
              bind:value={fields.accesslevel.str}
              bind:dirty={fields.accesslevel.dirty}
              bind:invalid={fields.accesslevel.invalid}
              label="Access Level"
              invalidText={fields.accesslevel.error_message}
              required
              min={1}
              max={999}
            />              
          </div>
          {#if fields.broker_id === 0}
            <div class="lg-grid-item"  on:keypress|stopPropagation>
              <TextInput
                bind:value={fields.username.str}
                bind:dirty={fields.username.dirty}
                bind:invalid={fields.username.invalid}
                labelText="Username"
                invalidText={fields.username.error_message}
                required
              />
            </div>
          {/if}
          <div class="lg-grid-item"  on:keypress|stopPropagation>
            <TextInput
              type="email"
              bind:value={fields.email.str}
              bind:dirty={fields.email.dirty}
              bind:invalid={fields.email.invalid}
              labelText="Email"
              invalidText={fields.email.error_message}
              required
            />
          </div>
        </div>
        <Button type="submit" kind={"primary"}>
          {fields.broker_id === 0 ? "Add Broker" : "Update Broker"}
        </Button>
      </Form>
    </svelte:fragment>
  </DraggableModal>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-gap: 2rem;
    margin-bottom: 25px;
  }

  .lg-grid-item {
    grid-column: span 6;
  }

  .sm-grid-item {
    grid-column: span 2;
  }

:global(.broker_form .bx--modal-container){
  width: 1000px;
}
</style>
