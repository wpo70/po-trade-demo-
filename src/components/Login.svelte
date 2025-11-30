<script>
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
  Checkbox,
  ToastNotification,
  Loading
} from 'carbon-components-svelte';
import User from 'carbon-icons-svelte/lib/User.svelte';

import Validator from '../common/validator.js';
import websocket from '../common/websocket.js';
import config from "../../config.json";
import currency_state from '../stores/currency_state.js';

// Show failed login messages from the server.

let error_message = '';
let forgot_pass_error_message = '';
let loading = false;

// Open Modal for Forgot Password.
let open = false;

// Put the focus on username when showing the login form.

let input_username;
onMount(() => {
  input_username.focus();
});

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
  <title>Rate Edge OMS</title>
</svelte:head>

<Header>
  <div style="display:flex; align-items:center; margin-left:10px; gap:12px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="140" height="35">
      <defs>
        <linearGradient id="hdr-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#475569"/>
          <stop offset="100%" style="stop-color:#cbd5e1"/>
        </linearGradient>
      </defs>
      <g transform="translate(5, 8)">
        <path d="M 3 28 Q 12 25, 20 16 Q 28 8, 35 4" 
              fill="none" stroke="url(#hdr-grad)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="35" cy="4" r="3.5" fill="#ef4444"/>
        <line x1="3" y1="35" x2="35" y2="35" stroke="#475569" stroke-width="2"/>
      </g>
      <text x="50" y="32" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" 
            font-size="26" font-weight="600" letter-spacing="0.5">
        <tspan fill="#f1f5f9">Rate</tspan><tspan fill="#ef4444">Edge</tspan>
      </text>
    </svg>
    <code class="env-badge">DEMO</code>
  </div>
</Header>

<div id="login_wrapper">
  <div id="login_layout">
      <div id="login_container">
        <!-- Left column - Logo -->
        <div id="login_logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="280" height="105">
            <defs>
              <linearGradient id="curve-grad-dark" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#475569"/>
                <stop offset="100%" style="stop-color:#cbd5e1"/>
              </linearGradient>
            </defs>
            <g transform="translate(95, 12)">
              <path d="M 0 32 Q 35 28, 58 15 Q 80 2, 102 -5" 
                    fill="none" stroke="url(#curve-grad-dark)" stroke-width="3" stroke-linecap="round"/>
              <circle cx="102" cy="-5" r="5" fill="#ef4444"/>
            </g>
            <text x="160" y="72" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" 
                  font-size="40" font-weight="600" text-anchor="middle" letter-spacing="0.5">
              <tspan fill="#f1f5f9">Rate</tspan><tspan fill="#ef4444">Edge</tspan>
            </text>
            <line x1="52" y1="88" x2="268" y2="88" stroke="#475569" stroke-width="2.5"/>
          </svg>
          <div class="tagline">Order Management System</div>
        </div>

        <div class="divider"></div>

        <!-- Right column - Login Form -->
        <div id="login">
          <Tile>
            <div class="login-header">
              <User 
                style="margin-top:3px; color: #999; "
                size={20}
              />
              <h4 style="padding-bottom:5px; color: #999; font-weight: bold;">&nbsp; Login</h4>
            </div>

            <Form on:submit={(e) => {
                e.preventDefault();
                handleSubmit();
                // Needed to set AUD default whenever login back
                currency_state._set("AUD", false);
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
      </div>
      <!-- End of Login Container -->
      <div id="login_endNote">COPYRIGHT 2025 @ RATE EDGE PTY LTD. ALL RIGHTS RESERVED.</div>
  </div>
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

#login_logo {
  width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tagline {
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1px;
  margin-top: 8px;
}

.divider {
  width: 1px;
  height: 180px;
  background: linear-gradient(180deg, transparent 0%, #525252 20%, #525252 80%, transparent 100%);
  margin: 0 30px;
}

#login_container{
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width:100%;
  padding: 30px;
}
#login_endNote{
  width: 100%;
  height: 50px;
  padding: 20px;
  align-items: center;
  text-align: center;
  font-weight: 400;
  font-size: 11px;
  color: #666;
  letter-spacing: 0.5px;
}
#login_layout {
  display: flex;
  flex-direction: column;
  background-color: #262626;
  width: 680px;
  min-height: 320px;
  justify-content: center;
  align-items: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border-radius: 4px;
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
.env-badge {
  font-size: 10px;
  font-weight: 600;
  background: #1e3a5f;
  color: #94a3b8;
  padding: 3px 8px;
  border-radius: 3px;
  letter-spacing: 1px;
}
</style>
