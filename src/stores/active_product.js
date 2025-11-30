'use strict';

import { writable } from 'svelte/store';
const active_product = writable(0);
export default active_product;
