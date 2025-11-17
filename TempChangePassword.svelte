<script>
    import { Form, PasswordInput, Button, Tooltip, UnorderedList, ListItem } from 'carbon-components-svelte';
    
    import Validator from '../common/validator.js';
    import websocket from '../common/websocket.js';
    
    import user from '../stores/user.js';
    
    // Error message for password change
    
    let error_message = '';
    let np_error_message = '';
    let npr_error_message = '';
    
    let success_message = '';
    
    // Validators for password changing functionality
    
    let new_password = new Validator();
    let new_password_repeat = new Validator();
    
    // Reactively assess validity of password data as it is being entered.
    // new_password and new_password_repeat must be equal
    
    $: new_password.invalid = new_password.isInvalid(Validator.scanNewPassword);
    $: new_password_repeat.invalid = new_password_repeat.isInvalid(Validator.scanNewPassword);
    
    function changePassword() {
      new_password.dirty = true;
      new_password_repeat.dirty = true;
    
      new_password.invalid = new_password.isInvalid(Validator.scanNewPassword);
      new_password_repeat.invalid = new_password_repeat.isInvalid(Validator.scanNewPassword);
    
      if ( new_password.invalid || new_password_repeat.invalid) {
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
        new_p: new_password.str,
      };
    
      websocket
        .submitTemporaryPasswordChange(credentials)
        .then(() => {
          // If password change successful, clear password fields and notify success
          new_password.reset();
          new_password_repeat.reset();

          success_message = 'Password successfully changed';
          error_message = '';
        })
        .catch(err => {
          error_message = err.message;
        });
      // Have to login again after reseting password
      user.logout();
      websocket.handlerLogout();
    }

    </script>
    <Form style="width: 600px; margin: 100px 100px;" 
        on:submit={(e) => {
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
    
      <Tooltip triggerText="Password Requirements">
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
    