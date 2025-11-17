<script>
  import { ComposedModal, ModalBody, ModalHeader } from "carbon-components-svelte";
  import active_product, { main_content, view } from "../../stores/active_product";
  import { onDestroy } from "svelte";
  
  export let open;
  export let heading = "";
  export let style = "";

  let draggable_modal;
  let modalHeight = 0;
  let modalWidth = 0;
  
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let rem = parseInt(getComputedStyle(document.documentElement).fontSize);
  let topStart = 3.5*rem;

	let left = 0.5*vw - 450/2;
	let top = 0.25*vh;

	let moving = false;
  let relativeX = 0;
  let relativeY = 0;

	function onMouseDown (e) {
		moving = true;
    relativeX = e.clientX - left;
    relativeY = e.clientY - top;
	}

	function onMouseMove (e) {
    vw = window.innerWidth;
    vh = window.innerHeight;
    rem = parseInt(getComputedStyle(document.documentElement).fontSize);
    topStart = 3.5*rem;
    
    if (moving) {
      if (modalHeight == 0 && modalWidth == 0) {
        let child = draggable_modal.childNodes[0];
        modalHeight = child.clientHeight;
        modalWidth = child.clientWidth;
      }
			let newLeft = e.clientX - relativeX;
			let newTop = e.clientY - relativeY;

      if (newLeft < 0) {
        left = 0;
      } else if (newLeft + modalWidth > vw) {
        left = vw - modalWidth;
      } else {
        left = newLeft;
      }

      if (newTop < topStart) {
        top = topStart;
      } else if (newTop + modalHeight > vh) {
        top = (topStart + modalHeight) > vh ? topStart : (vh - modalHeight);
      } else {
        top = newTop;
      }
		}
	}

	function onMouseUp () {
		moving = false;
	}

  function checkPosition (e) {
    vw = window.innerWidth;
    vh = window.innerHeight;
    rem = parseInt(getComputedStyle(document.documentElement).fontSize);
    topStart = 3.5*rem;

    if (left + modalWidth > vw) {
      left = vw - modalWidth;
    }

    if (top + modalHeight > vh) {
      top = (topStart + modalHeight) > vh ? topStart : (vh - modalHeight);
    }
  }

  // make this modal the highest level modal, so it appears on top of the others
  function forceTop () {
    //Forces element to top of HTML hierarchy to solve stacking context issues when the page needs to be scrolled horizontally
    const dom = document.body.querySelectorAll('body>.draggable_modal');
    const dom_array = Array.from(dom);
    if(dom_array.at(-1) !== draggable_modal){
      document.body.appendChild(draggable_modal);
    }    
  }

  $: remove($view, $active_product, $main_content);

  function remove() {
    draggable_modal?.remove();
  }

  onDestroy(() => {
    remove();
  });

</script>
<div class={"draggable_modal " + ($$restProps.class ?? "")} bind:this={draggable_modal} on:click={forceTop}> 
  <ComposedModal
    style="left: {left}px; top: {top}px;"
    bind:open
    on:open={forceTop}
    selectorPrimaryFocus={null}
    on:open
    on:close
    on:submit
    on:click:button--secondary
    on:click:button--primary
    on:transitionend
    on:keydown
    on:click
    on:mouseover
    on:mouseenter
    on:mouseleave
    >
    <div {style}>
      <div class="draggable_component" on:mousedown={onMouseDown}>
        <ModalHeader title={heading}/>
      </div>
      <ModalBody>
        <slot name="body"/>
      </ModalBody>
      <slot name="footer"/>
    </div>
  </ComposedModal>
</div>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} on:resize={checkPosition}/>

<style>
	.draggable_component {
		user-select: none;
		cursor: move;
	}
  
  :global(.draggable_modal .bx--modal) {
    width: fit-content;
    height: fit-content;
    position: fixed;
    box-shadow: 3px 3px 20px 10px rgba(0,0,0,.8);
    z-index: 1000;
  }
  
  :global(.draggable_modal .bx--modal-container) {
    width: fit-content;
  }
</style>
