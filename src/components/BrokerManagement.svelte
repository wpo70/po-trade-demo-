<script>
import { Button, Theme } from 'carbon-components-svelte';

import Add from "carbon-icons-svelte/lib/Add.svelte";

import { createEventDispatcher } from "svelte";

import BrokersTable from './BrokersTable.svelte';
import BrokerForm from './BrokerForm.svelte';
import PermissionTable from './PermissionTable.svelte';

const dispatch = createEventDispatcher();

let theme;
let selection;

let permissionDefaults = [{ 
        //access level 1
        "Trader Management": false,
        "Broker Management": false,
        "Not Anonymous": false,
        "Approve Trades": false,
        "Edit Global Preferences": false,
        "Developer Override": false,
        "View Only": true
      },{
        //access level 2
        "Trader Management": false,
        "Broker Management": false,
        "Not Anonymous": true,
        "Approve Trades": true,
        "Edit Global Preferences": true,
        "Developer Override": false,
        "View Only": false
      },
      {
        //access level 3
        "Trader Management": true,
        "Broker Management": true,
        "Not Anonymous": true,
        "Approve Trades": true,
        "Edit Global Preferences": true,
        "Developer Override": false,
        "View Only": false
      },
      {
        //access level 999
        "Trader Management": true,
        "Broker Management": true,
        "Not Anonymous": true,
        "Approve Trades": true,
        "Edit Global Preferences": true,
        "Developer Override": true,
        "View Only": false
      }
  ];

let is_form_open = false;

function close() { dispatch('close'); }

function handleThemeChange(event) { theme = event.detail; }

</script>

<svelte:window on:themeChange={handleThemeChange} />

<Theme bind:theme persist persistKey='__carbon-theme'/>

<!-- HEADER -->

<div class="header">
  
  <Button
  kind="ghost"
    on:click={close}>
    &#60; Back
  </Button>
</div>

<!-- MAIN CONTENT -->

<div class="main-content">

  <!-- BROKER TABLE -->
  <div class="broker-container">

    <div style:display={'flex'}>
      <h3>Brokers</h3>
      <Button
        kind="tertiary"
        icon={Add}
        on:click={() => is_form_open = !is_form_open}
        style={'margin-left: auto;'}>
        New Broker
      </Button>
    </div>
    <BrokersTable bind:selection={selection}/>
  
  </div>
  
  <PermissionTable defaults={permissionDefaults} bind:selection={selection}/>
</div>

<BrokerForm defaults={permissionDefaults} bind:open={is_form_open}/>

<style>

.main-content {
  display: flex;
  grid-gap: 1rem;
  padding: 0 2rem;
}
.broker-container {
  flex-grow: 2;
  padding: 30px;
  background-color: var(--cds-layer);
}

.header {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 2rem;
}
</style>
