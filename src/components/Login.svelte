<script>
  import { onMount } from 'svelte';
  import websocket from '../common/websocket.js';
  import Validator from '../common/validator.js';
  import currency_state from '../stores/currency_state.js';

  const AUTH_API = 'https://rateedge-auth.azurewebsites.net/api/auth';

  let authStep = 'email';
  let emailVerified = false;
  let verifiedEmail = '';
  let error_message = '';
  let success_message = '';
  let loading = false;
  let authEmail = '';
  let otpCode = '';

  let username = new Validator();
  let password = new Validator();

  let input_email;
  let input_otp;
  let input_username;

  onMount(() => {
    const stored = sessionStorage.getItem('rateedge_email_verified');
    if (stored) {
      emailVerified = true;
      verifiedEmail = stored;
      authStep = 'login';
      setTimeout(() => input_username?.focus(), 100);
    } else {
      setTimeout(() => input_email?.focus(), 100);
    }
  });

  async function handleRequestOTP() {
    error_message = '';
    success_message = '';
    
    if (!authEmail || !authEmail.includes('@')) {
      error_message = 'Please enter a valid email address';
      return;
    }
    
    loading = true;
    
    try {
      const response = await fetch(`${AUTH_API}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, site: 'oms' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        authStep = 'otp';
        success_message = 'Verification code sent to your email';
        setTimeout(() => input_otp?.focus(), 100);
      } else if (data.error === 'access_pending') {
        error_message = 'Access request submitted. You will receive an email once approved (within 12 hours).';
      } else {
        error_message = data.message || 'Failed to send verification code';
      }
    } catch (err) {
      error_message = 'Network error. Please try again.';
    }
    
    loading = false;
  }

  async function handleVerifyOTP() {
    error_message = '';
    success_message = '';
    
    if (!otpCode || otpCode.length !== 6) {
      error_message = 'Please enter the 6-digit code';
      return;
    }
    
    loading = true;
    
    try {
      const response = await fetch(`${AUTH_API}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, site: 'oms', code: otpCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        emailVerified = true;
        verifiedEmail = authEmail;
        sessionStorage.setItem('rateedge_email_verified', authEmail);
        authStep = 'login';
        success_message = 'Email verified successfully';
        setTimeout(() => input_username?.focus(), 100);
      } else {
        error_message = data.message || 'Invalid or expired code';
      }
    } catch (err) {
      error_message = 'Network error. Please try again.';
    }
    
    loading = false;
  }

  function handleBackToEmail() {
    authStep = 'email';
    otpCode = '';
    error_message = '';
    success_message = '';
    setTimeout(() => input_email?.focus(), 100);
  }

  function handleSubmit() {
    error_message = '';
    success_message = '';
    
    username.dirty = true;
    password.dirty = true;
    
    if (!username.str || !password.str) {
      error_message = 'Username and password required';
      return;
    }

    loading = true;
    websocket
      .submitLogin({
        username: username.str,
        password: password.str,
      })
      .catch((err) => {
        error_message = err.message;
        loading = false;
      });
    
    currency_state._set("AUD", false);
  }

  function handleAdminLogin() {
    authStep = 'login';
    emailVerified = true;
    verifiedEmail = 'admin';
  }

  // Inline styles
  const pageStyle = "font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #020617; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;";
  
  const boxStyle = "background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid rgba(55, 65, 81, 0.5); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);";
  
  const logoStyle = "text-align: center; margin-bottom: 1.5rem;";
  
  const titleStyle = "color: #f9fafb; font-size: 1.25rem; font-weight: 600; text-align: center; margin-bottom: 0.5rem; margin-top: 0;";
  
  const subtitleStyle = "color: #9ca3af; font-size: 0.875rem; text-align: center; margin-bottom: 2rem;";
  
  const subtitleVerifiedStyle = "color: #86efac; font-size: 0.875rem; text-align: center; margin-bottom: 2rem;";
  
  const inputStyle = "width: 100%; padding: 0.875rem 1rem; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(55, 65, 81, 0.8); border-radius: 8px; color: #f9fafb; font-size: 1rem; margin-bottom: 1rem; outline: none; box-sizing: border-box;";
  
  const otpInputStyle = "width: 100%; padding: 0.875rem 1rem; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(55, 65, 81, 0.8); border-radius: 8px; color: #f9fafb; font-size: 1.5rem; margin-bottom: 1rem; outline: none; box-sizing: border-box; text-align: center; letter-spacing: 0.5rem;";
  
  const btnStyle = "width: 100%; padding: 0.875rem 1rem; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border: none; border-radius: 8px; color: white; font-size: 1rem; font-weight: 600; cursor: pointer;";
  
  const hintStyle = "color: #6b7280; font-size: 0.75rem; margin-top: -0.5rem; margin-bottom: 1rem;";
  
  const errorStyle = "background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 8px; padding: 0.75rem 1rem; color: #fca5a5; font-size: 0.875rem; margin-bottom: 1rem;";
  
  const successStyle = "background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 0.75rem 1rem; color: #86efac; font-size: 0.875rem; margin-bottom: 1rem;";
  
  const footerStyle = "text-align: center; margin-top: 1.5rem;";
  
  const linkStyle = "color: #9ca3af; text-decoration: none; font-size: 0.875rem; cursor: pointer; background: none; border: none;";
</script>

<svelte:head>
  <title>Sign In - RateEdge OMS</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div style={pageStyle}>
  <div style={boxStyle}>
    <div style={logoStyle}>
      <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 60px; width: auto;">
        <path d="M30 10 L50 30 L30 50 L10 30 Z" fill="#dc2626"/>
        <path d="M30 18 L42 30 L30 42 L18 30 Z" fill="#0f172a"/>
        <text x="60" y="38" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#f9fafb">RateEdge</text>
      </svg>
    </div>

    {#if authStep === 'email'}
      <h1 style={titleStyle}>Order Management System</h1>
      <p style={subtitleStyle}>Sign in with your email</p>
      
      {#if error_message}
        <div style={errorStyle}>{error_message}</div>
      {/if}
      {#if success_message}
        <div style={successStyle}>{success_message}</div>
      {/if}
      
      <form on:submit|preventDefault={handleRequestOTP}>
        <input 
          bind:this={input_email}
          bind:value={authEmail}
          type="email" 
          style={inputStyle}
          placeholder="Enter your email" 
          required
        >
        <p style={hintStyle}>We'll send you a verification code</p>
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Sending...' : 'Send Code'}
        </button>
      </form>
      
      <div style={footerStyle}>
        <button style={linkStyle} on:click={handleAdminLogin}>Admin login</button>
      </div>

    {:else if authStep === 'otp'}
      <h1 style={titleStyle}>Enter Verification Code</h1>
      <p style={subtitleStyle}>Code sent to {authEmail}</p>
      
      {#if error_message}
        <div style={errorStyle}>{error_message}</div>
      {/if}
      {#if success_message}
        <div style={successStyle}>{success_message}</div>
      {/if}
      
      <form on:submit|preventDefault={handleVerifyOTP}>
        <input 
          bind:this={input_otp}
          bind:value={otpCode}
          type="text" 
          style={otpInputStyle}
          placeholder="000000" 
          maxlength="6"
          required
        >
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
      
      <div style={footerStyle}>
        <button style={linkStyle} on:click={handleBackToEmail}>← Different email</button>
      </div>

    {:else}
      <h1 style={titleStyle}>Login</h1>
      <p style={subtitleVerifiedStyle}>✓ {verifiedEmail}</p>
      
      {#if error_message}
        <div style={errorStyle}>{error_message}</div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        <input 
          bind:this={input_username}
          bind:value={username.str}
          type="text" 
          style={inputStyle}
          placeholder="Username" 
          required
        >
        <input 
          bind:value={password.str}
          type="password" 
          style={inputStyle}
          placeholder="Password" 
          required
        >
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={footerStyle}>
        <button style={linkStyle} on:click={handleBackToEmail}>← Different email</button>
      </div>
    {/if}
  </div>
</div>
