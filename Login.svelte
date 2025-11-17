<script>
import config from '../../config.json'
import { onMount } from 'svelte';

import { 
  Header,
  Tile,
  Form,
  FormGroup,
  TextInput,
  PasswordInput,
  Button,
  ButtonSet,
  ComposedModal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  ToastNotification,
  Loading
} from 'carbon-components-svelte';
import User from 'carbon-icons-svelte/lib/User.svelte';

import Validator from '../common/validator.js';
import websocket from '../common/websocket.js';
import { timestampToDateTime } from '../common/formatting.js';
import { validateTime, server_time, current_time } from '../common/time_validation.js';

// Show failed login messages from the server.

let error_message = '';
let forgot_pass_error_message = '';
let loading = false;
let msg = false;
let count = 0;
// Open Modal for Forgot Password.
let open = false;


// Put the focus on username when showing the login form.

let input_username;
onMount(() => {
  input_username?.focus();
  validateTime();
});

function timer(){
  if(!count == 0) return;
    count = 15;
    const timer = setInterval(() => {
      if (--count < 1) clearInterval(timer);
    }, 1000);
}

function handleRefresh(){
  timer();
  if(!validateTime()) window.location.reload();
  msg = true;
}

// These are the form fields for placing an order.

let username = new Validator();
let password = new Validator();
let email = new Validator();

// Toast notification
let notification = null;
let shouldShowToast = false;

function resetNotification() {
  notification = null;
}

// Reactively assess the validity of the data as it is being entered.
// The invalid field must appear on the left side of the assignment
// for Svelte to recognise it has changed.

$: username.invalid = username.isInvalid(Validator.scanRequiredText);
$: password.invalid = password.isInvalid(Validator.scanRequiredText);
$: email.invalid = email.isInvalid(Validator.scanEmail);

function handleForgetPassword(){
  email.dirty = true;
  email.invalid = email.isInvalid(Validator.scanEmail);
  
  if (email.invalid) return;
  
  websocket
  .submitForgotPassword({
    userEmail: email.value,
  })
  .catch((err) => {
    forgot_pass_error_message = err.message; // No error is being caught
  });
  open = true;
  shouldShowToast = true;
  open = false;
  notification = {
    kind: 'success',
    title: 'Forgot Password',
    message: 'If this account exist, you will receive an email at: ' + email.value
  }
  email.reset();
}

function handleSubmit() {
  error_message = "";

  // If any of the data has not been edited it will be clean only because it is not dirty.
  // Apply the checks without checking they are dirty as well.  Doing so also creates the
  // values from the strings.  Submitting implicitly make all fields dirty.

  username.dirty = true;
  password.dirty = true;
  username.invalid = username.isInvalid(Validator.scanRequiredText);
  password.invalid = password.isInvalid(Validator.scanRequiredText);

  // If any of the data is invalid, ignore the submit event.

  if (username.invalid || password.invalid) return;

  // User AJAX to login.  The submitLogin function will handle the response.  If an error occurs handle it here.

  loading = true;
  websocket
    .submitLogin({
      username: username.value,
      password: password.value,
    })
    .catch((err) => {
      error_message = err.message;
      loading = false;
    });
  loadTimeout();
}

async function loadTimeout() {
  await new Promise(res => setTimeout(res, 10000));
  if (loading && document.querySelector("#login")) {
    error_message = "Log in is still being attempted but is taking longer than expected.\nPerhaps check your network connection and refresh the page to try again."
  }
}
</script>
  <!-- FORGOT PASSWORD MODAL -->
  <ComposedModal
    bind:open
    preventCloseOnClickOutside
    on:submit={handleForgetPassword}>
    <ModalHeader title="Forgot Password"/>

    <ModalBody>
      <!-- Unused Error Message -->
      {#if forgot_pass_error_message !== ''}
      <div class="login-error">
        {forgot_pass_error_message}
      </div>
      {/if}
      <!-- -------------------- -->
      <div style="margin: 10px;">
        <TextInput
          bind:value={email.str}
          bind:dirty={email.dirty}
          bind:invalid={email.invalid}
          labelText="Email"
          invalidText="Invalid Email"
          required
        />
      </div>
    </ModalBody>

    <ModalFooter primaryButtonDisabled={email.value === ''} primaryButtonText="Confirm"/>
  </ComposedModal>


<svelte:head>
  <title>PO Trade</title>
</svelte:head>

<Header>
  <h5 style="margin-left:-11.5px; color:#ffffff;">PO Trade<code class="version">{(config.env).toUpperCase()}</code></h5>
</Header>
<div id="login_wrapper">
  {#if !validateTime()}
    <div id="login_layout">
        <div id="login_container">
          <!-- Left column -->
          <div id="login">
            <Tile>
              <div class="login-header">
                <User 
                  style="margin-top:3px;"
                  size={20}
                />
                <h4 style="padding-bottom:5px; margin-left:0.5rem; font-weight:bold;">Login</h4>
              </div>
              <Form on:submit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <FormGroup>
                  <TextInput
                    bind:ref={input_username}
                    bind:value={username.str}
                    bind:dirty={username.dirty}
                    bind:invalid={username.invalid}
                    labelText="Username"
                    invalidText="Required"
                  />
                  <PasswordInput
                    bind:value={password.str}
                    bind:dirty={password.dirty}
                    bind:invalid={password.invalid}
                    labelText="Password"
                    invalidText="Required"
                  />
                </FormGroup>
                
                <div class="login-error">
                  {error_message}
                </div>

                <ButtonSet stacked>
                  <Button type="submit" style="cursor:pointer">
                    Login
                    {#if loading}
                      <Loading small withOverlay={true} style="position:absolute; padding-right:1rem; justify-content:end"/>
                    {/if}
                  </Button>
                  {#if error_message !== ''}
                  <Button kind="ghost" size="small" on:click={() => open = true}>Forgot Password?</Button>
                  {/if}
                </ButtonSet>
              </Form>
            </Tile>
          </div>
          <div style="width:2px; height:170px; background-color: #999;margin-left: 20px;margin-right:20px;"></div>
          <!-- Right column -->
          <div id="login_description">
                <img  src="https://i.ibb.co/yVXMYzm/LOGO76X.png" alt="LOGO" 
                border="0" style=" border-radius: 3.5px; 
                border: 0; display: block; outline: none; 
                text-decoration: none; height: 100px; font-size: 50px;" width="200px"/>
          </div>
        </div>
        <!-- End of Login Container -->
        <div id="login_endNote" style="font-size: 90%">{`Copyright 2024 @ PO Capital Markets Pty Ltd. All rights reserved.`.toUpperCase()}</div>
    </div>
    {:else}
      <div class="time_error">
        <div class="error_header">
          <h1>
            ERROR: DATE/TIME IS INCORRECT
          </h1>
        </div>
        <div class="error_body">
          <p> Your PC says the time is {timestampToDateTime(current_time)}<br/>
              The actual time is {timestampToDateTime(server_time)}<br/>
              <a target="_blank" href="ms-settings:dateandtime?activationSource=SMC-IA-4026213">Ensure time is set automatically</a><br/>
          </p>
          <Button class="refresh_login_button" kind="secondary" on:click={handleRefresh}>
            {#if !msg}
              Refresh Application
            {:else}
              {#if count > 0}
                Please try again in {count} seconds
              {:else}
                Please try refresh now
              {/if}
            {/if}
          </Button>
        </div>
      </div>
    {/if}
</div>
<div class="notification"
style="position: fixed; bottom: 30px;">
{#if notification !== null && shouldShowToast}
  <ToastNotification
    kind={notification.kind}
    title={notification.title}
    subtitle={notification.message}
    caption={new Date().toLocaleString()}
    timeout=20000
    on:close={resetNotification}
  />
{/if}
</div>


<style>

#login {
  width: 220px;
  align-self: stretch;
}
:global(#login .bx--text-input-wrapper) { margin-top: 0.5rem; } 
:global(#login .bx--password-input-wrapper) { margin-top: 0.75rem; }
#login_description {
  width: 250px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  display: flex;

}
#login_container{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width:100%;
  padding: 20px;
}
#login_endNote{
  width: 100%;
  height: 50px;
  padding: 20px;
  align-items: center;
  text-align: center;
  font-weight: 400;
  color: #999;
}
#login_layout {
  display: flex;
  flex-direction: column;
  background-color: var(--cds-ui-01);
  width: 600px;
  min-height: 400px;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
}
#login_wrapper {
  position: fixed;
  width: 100vw;
  height: 100vh;
  align-items: center;
  justify-content: center;
  top:0;
  left: 0;
  display: flex;
}
.login-header {
  display: flex;
}
.login-error {
  color: #da1e28;
  margin-top: -1.5rem;
  min-height: 1em;
  &:not(:empty) {
    padding: 0.5rem 0 1.2rem;
  }
}
.notification {
  position: relative;
  z-index: 100;
}
.version {
  font-size: 70%;
  padding-left: 0.5rem;
}

.time_error {
  display: flex;
  flex-direction: column;
  background-color: #262626;
  width: 600px;
  min-height: 400px;
  align-items:center;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);

}

.error_header, .error_body {
  width: 100%;
  display:flex;
  justify-content: center;
  text-align:center
}


.error_header h1 {
  color: #da1e28;
  font-size: 34px;
  padding-top: 12px;
  font-weight:400;
}

.error_body p{
  font-size: 18px;
  padding-bottom:48px;
}

.error_body {
  flex-grow: 1;
  display:flex;
  flex-direction:column;
  position:relative;
  justify-content: center;
}

:global(.error_body .refresh_login_button) {
  position:absolute;
  bottom: 0;
  text-align:center;
  width: 100%;
  max-width:100%;
}
</style>
