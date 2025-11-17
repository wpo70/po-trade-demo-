<script>
import { Theme } from 'carbon-components-svelte'

import PageHeading from './components/PageHeading.svelte';
import Login from './components/Login.svelte';
import TempChangePassword from './components/TempChangePassword.svelte';
import user from './stores/user.js';

let theme = "g100";

</script>

<Theme bind:theme persist persistKey="__carbon-theme" />

{#if $user.tempLogin} 
  <TempChangePassword/>
{:else if $user.isLoggedIn}
  <PageHeading />
{:else}
  <Login />
{/if}
