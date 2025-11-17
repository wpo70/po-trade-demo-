<script>
  /**
   *  @event click
   */

  /** Obtain a reference to the pulltab element */
  export let ref = null;

  /** 
   *  Specify the direction of the tab 
   *  @type {"left" | "top" | "right" | "bottom"}
   */
  export let direction = "left";

  let tab;

  function anim() {
    const m = "margin" + direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase();
    tab.animate([
      {[m]:"-4px", easing:"cubic-bezier(0.3 ,-0.7, 0.1, 0.8)"},
      {[m]:"-1px", easing:"cubic-bezier(0.2, 0, 0.38, 0.9)"},
      {[m]:"-4px"}
    ], {duration:400});
  }

</script>

<div
  bind:this={ref}
  class:pulltab={true}
  class:pulltab-vertical={direction == "left" || direction == "right"}
  class:pulltab-horizontal={direction == "top" || direction == "bottom"}
  on:click
  {...$$restProps}
  >
  <div
    bind:this={tab}
    class="{direction}"
    on:mouseenter={anim}
    >
    <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_rect)">
        <path d="M0 0H24C29.6005 0 32.4008 0 34.5399 1.08993C36.4215 2.04867 37.9513 3.57847 38.9101 5.46009C40 7.59921 40 10.3995 40 16V44C40 49.6005 40 52.4008 38.9101 54.5399C37.9513 56.4215 36.4215 57.9513 34.5399 58.9101C32.4008 60 29.6005 60 24 60H0V0Z" fill="var(--cds-ui-01)"/>
      </g>
      <g filter="url(#filter1_line1)">
        <rect x="10" y="8" width="2" height="45" rx="1" fill="var(--cds-text-05)"/>
      </g>
      <g filter="url(#filter2_line2)">
        <rect x="20" y="8" width="2" height="45" rx="1" fill="var(--cds-text-05)"/>
      </g>
      <g filter="url(#filter3_line3)">
        <rect x="30" y="8" width="2" height="45" rx="1" fill="var(--cds-text-05)"/>
      </g>
      <defs>
        <filter id="filter0_rect" x="0" y="0" width="40" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect1_innerShadow_5_18"/>
          <feOffset/>
          <feGaussianBlur stdDeviation="4.5"/>
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow_5_18"/>
        </filter>
        <filter id="filter1_line1" x="9" y="6.5" width="6" height="49" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="0.5" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_5_18"/>
          <feOffset dx="1" dy="0.5"/>
          <feGaussianBlur stdDeviation="0.75"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_5_18"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_5_18" result="shape"/>
        </filter>
        <filter id="filter2_line2" x="19" y="6.5" width="6" height="49" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="0.5" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_5_18"/>
          <feOffset dx="1" dy="0.5"/>
          <feGaussianBlur stdDeviation="0.75"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_5_18"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_5_18" result="shape"/>
        </filter>
        <filter id="filter3_line3" x="29" y="6.5" width="6" height="49" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feMorphology radius="0.5" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_5_18"/>
          <feOffset dx="1" dy="0.5"/>
          <feGaussianBlur stdDeviation="0.75"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_5_18"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_5_18" result="shape"/>
        </filter>
      </defs>
    </svg>
  </div>
</div>


<style>
  .pulltab-vertical {
    width: 40px;
    cursor: pointer;
    & .left {
      margin-left: -4px;
      transform: rotate(0deg);
    }
    & .right {
      margin-right: -4px;
      transform: scale(-1, 1);
    }
  }
  .pulltab-horizontal {
    width: 60px;
    cursor: pointer;
    & .top {
      margin-top: -4px;
      transform: rotate(90deg);
    }
    & .bottom {
      margin-bottom: -4px;
      transform: rotate(90deg) scale(-1,1);
    }
  }

</style>