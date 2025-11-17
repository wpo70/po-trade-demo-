'use strict';

// This function cause an element to flash briefly.  It is used to indicate an
// element has changed value.

// See https://svelte.dev/examples#immutable-data for more details of how to do this.

export default function flash (element) {
  requestAnimationFrame(() => {
    element.style.transition = 'none';
    element.style.color = 'rgba(255,62,0,1)';
    element.style.backgroundColor = 'rgba(255,62,0,0.2)';

    setTimeout(() => {
      element.style.transition = 'color 1s, background 1s';
      element.style.color = '';
      element.style.backgroundColor = '';
    });
  });
}
