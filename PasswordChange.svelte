<script>
import { Form, PasswordInput, Button, Tooltip, UnorderedList, ListItem } from 'carbon-components-svelte';

import Validator from '../../common/validator.js';
import websocket from '../../common/websocket.js';

import user from '../../stores/user.js';

// Error message for password change

let error_message = '';
let np_error_message = '';
let npr_error_message = '';

let success_message = '';

// Validators for password changing functionality

let current_password = new Validator();
let new_password = new Validator();
let new_password_repeat = new Validator();

// Reactively assess validity of password data as it is being entered.
// new_password and new_password_repeat must be equal

$: current_password.invalid = current_password.isInvalid(Validator.scanRequiredText);
$: new_password.invalid = new_password.isInvalid(Validator.scanNewPassword);
$: new_password_repeat.invalid = new_password_repeat.isInvalid(Validator.scanNewPassword);

function changePassword() {
  current_password.dirty = true;
  new_password.dirty = true;
  new_password_repeat.dirty = true;

  current_password.invalid = current_password.isInvalid(Validator.scanRequiredText);
  new_password.invalid = new_password.isInvalid(Validator.scanNewPassword);
  new_password_repeat.invalid = new_password_repeat.isInvalid(Validator.scanNewPassword);

  if ((current_password.invalid || new_password.invalid || new_password_repeat.invalid) && !user.getPermission()["Developer Override"]) {
    np_error_message = new_password.invalid ? new_password.error_message : '';
    npr_error_message = new_password_repeat.invalid ? new_password_repeat.error_message : '';
    return;
  }

  if (new_password.str !== new_password_repeat.str) {
    error_message = 'New passwords must match';
    return;
  }

  let credentials = {
    broker_id: $user.broker_id, 
    current_p: current_password.str, 
    new_p: new_password.str,
    new_p_repeat: new_password_repeat.str
  };

  websocket
    .submitPasswordChange(credentials)
    .then(() => {
      // If password change successful, clear password fields and notify success

      current_password.reset();
      new_password.reset();
      new_password_repeat.reset();

      // this forces svelte to update the bindings associated with these objects
      current_password = current_password;
      new_password = new_password;
      new_password_repeat = new_password_repeat;

      success_message = 'Password successfully changed';
      error_message = '';
    })
    .catch(err => {
      error_message = err.message;
    });
}
</script>
<Form on:submit={(e) => {
    e.preventDefault();
    changePassword();
  }}
>
  {#if error_message !== ''}
    <div class="change-password-error">
      {error_message}
    </div>
  {:else if success_message !== ''}
    <div class="change-password-success">
      {success_message}
    </div>
  {/if}

  <PasswordInput
    bind:value={current_password.str}
    bind:dirty={current_password.dirty}
    bind:invalid={current_password.invalid}
    tooltipAlignment="start"
    tooltipPosition="left"
    hideLabel
    labelText="Current Password" 
    placeholder="Current Password" 
    invalidText="Required Field"
  />

  <Tooltip class="vols_breakdown vols_breakdown_caret" triggerText="Password Requirements">
    <p>Passwords must:</p>
    <div style:padding='10px'>
      <UnorderedList>
        <ListItem>be at least 8 characters long</ListItem>
        <ListItem>contain one lowercase letter</ListItem>
        <ListItem>contain one uppercase letter</ListItem>
        <ListItem>contain one digit</ListItem>
        <ListItem>contain one special character (!"#$%&'()*+,-./:;=?@\\[\]^_`~)</ListItem>
      </UnorderedList>
    </div>
  </Tooltip>

  <PasswordInput
    bind:value={new_password.str}
    bind:dirty={new_password.dirty}
    bind:invalid={new_password.invalid}
    tooltipAlignment="start"
    tooltipPosition="left"
    hideLabel
    labelText="New Password" 
    placeholder="New password"
    invalidText={np_error_message}
  />

  <PasswordInput
    bind:value={new_password_repeat.str}
    bind:dirty={new_password_repeat.dirty}
    bind:invalid={new_password_repeat.invalid}
    tooltipAlignment="start"
    tooltipPosition="left"
    hideLabel
    labelText="Repeat New Password" 
    placeholder="New password again"
    invalidText={npr_error_message}
  />

  <Button type="reset" kind="secondary">
    Cancel
  </Button>

  <Button type="submit">
    Submit
  </Button>
</Form>

<style>
.change-password-error {
  color: #da1e28;
}

.change-password-success {
  color: var(--cds-support-success-inverse);
}

:global(.bx--list__item) {
  color: inherit;
}
</style>
