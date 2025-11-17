'use strict';

import { backInOut, cubicInOut } from 'svelte/easing';

/* Svelte Transition Animations */

export function sendTransition(node, { duration, inward }) {
  return {
    duration, // in ms
    inward, // bool to invert direction
    css: (t) => {
      const eased = cubicInOut(t);
      return `transform: translate(${(inward ? -75 + eased*75 : (1-eased)*75)}px);`;
    }
  };
};

/* Web API Element Animations */
// the following consts are designed to be used -> dom_element.animate(const, {anim params});

export function spin(dir = 1) {
  // dir: 1 (or unspecified) for clockwise, -1 for a'wise
  return [
    {transform:`scale(0.6) rotate(${-720*dir}deg)`, easing:"cubic-bezier(0.6,-0.5,0.4,1.5)"},
    {transform:`scale(1) rotate(0deg)`, easing:"cubic-bezier(0.6,-0.5,0.4,1.5)"}
  ];
};

export function blink() {
  return [
    {transform:"scale(1)", backgroundColor:"red", easing:"cubic-bezier(1, 0, 0.55, 1)"},
    {transform:"scale(1.42)", backgroundColor:"rgb(255, 225, 225)", easing:"cubic-bezier(1, 0, 0.55, 1)"},
    {transform:"scale(1)", backgroundColor:"red", easing:"cubic-bezier(1, 0, 0.55, 1)"}
  ];
};

export function shake() {
  return [
    {transform:"rotate(-35deg)", offset:0.25, easing:"ease-in-out"},
    {transform:"rotate(33deg)", offset:0.375, easing:"ease-in-out"},
    {transform:"rotate(-31deg)", offset:0.5, easing:"ease-in-out"},
    {transform:"rotate(30deg)", offset:0.625, easing:"ease-in-out"},
    {transform:"rotate(-29deg)", offset:0.75, easing:"ease-in-out"}
  ];
};