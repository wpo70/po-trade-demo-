<script>
    import { createEventDispatcher } from 'svelte'
    import { fade } from 'svelte/transition'
    import Warning from "carbon-icons-svelte/lib/Warning.svelte";
    import CheckmarkOutline from "carbon-icons-svelte/lib/CheckmarkOutline.svelte";
    import Information from "carbon-icons-svelte/lib/Information.svelte";
    import Close from "carbon-icons-svelte/lib/Close.svelte";

    const dispatch = createEventDispatcher()
  
    export let type = 'error'
    export let dismissible = true
  </script>

  <article class={type} role="alert" transition:fade>
    {#if type === 'success'}
      <CheckmarkOutline width="1.1em" />
    {:else if type === 'error'}
      <Warning width="1.1em" />
    {:else}
     <Information width="1.1em" />
    {/if}
  
    <div class="text">
      <slot />
    </div>
  
    {#if dismissible}
      <button class="close" on:click={() => dispatch('dismiss')}>
        <Close width="0.8em" />
      </button>
    {/if}
  </article>
  
  <style lang="postcss">
    article {
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.2rem;
      display: flex;
      align-items: center;
      margin: 0 auto 0.5rem auto;
      width: 20rem;
    }
    .error {
      background: IndianRed;
    }
    .success {
      background: MediumSeaGreen;
    }
    .info {
      background: SkyBlue;
    }
    .text {
      margin-left: 1rem;
    }
    button {
      color: white;
      background: transparent;
      border: 0 none;
      padding: 0;
      margin: 0 0 0 auto;
      line-height: 1;
      font-size: 1rem;
    }
  </style>