'use strict';

import { addDays, addTenorToDays, toTenor, addMonths } from "./formatting";
import quotes from "../stores/quotes";
import { getRateForDates } from "./pricing_models";
import { get } from "svelte/store";
import data_collection_settings from "../stores/data_collection_settings";

let quoteslist;
let rbaRuns = [];
let spotRates = [];
let swapTenors = [];
let swapTenorHeaders = [];
let spreadTenors = [];

export function toDateString(date) {
    let datestrings = date.toString().split(" ");
    return datestrings[2] + " " + datestrings[1] + " " + datestrings[3].slice(2);
}

export function findRbaDates() {
    // SAFETY CHECK: Return empty object if quotes not initialized yet
    if (!quotes || typeof quotes.getRbaDates !== 'function') {
        console.warn('quotes.getRbaDates not available yet, returning empty dates');
        return {};
    }
    
    // New 2024 rba Dates
    let rba2024 = quotes.getRbaDates();
    
    // SAFETY CHECK: If no RBA dates loaded yet, return empty
    if (!rba2024 || !Array.isArray(rba2024) || rba2024.length === 0) {
        console.warn('No RBA dates available yet');
        return {};
    }
    
    rba2024 = rba2024
        .map( d => !isNaN(new Date(d.start_date)) ? new Date(d.start_date):"TBA")
        .sort((a,b) => a-b);

    let rba2024_index = 0;
    
    let result = {};
    
    let today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 1; i <= 13; i++){
        while ( today >= rba2024[rba2024_index] ) {
            rba2024_index ++;
        } 
        result[i] = rba2024[rba2024_index];
        rba2024_index ++;
    }
    return result;
}

function initSpotRates(){
    quoteslist = get(quotes)[20];
    if (!quoteslist) {
        spotRates = [];
        return;
    }
    let rates = [];
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let spot = addDays(today, 1);
    for (let q of quoteslist){
        let tenor = toTenor([q.year]);
        if (q.year < 1000){
            let rate = [];
            let date = addTenorToDays(tenor, tenor == '1d' ? today : spot);
            if (q.year <= 2) {
                rate[0] = toDateString(date);
                rate[1] = tenor == '1d' ? 'ON' : tenor.toUpperCase();
                rate[2] = quotes.mid(20, [q.year]).toFixed(4);
                rate[3] = q.override;
                rates.push(rate);
            }
        }
    }
    spotRates = rates;
}

function initRbaRuns(){
    quoteslist = get(quotes)[20];
    if (!quoteslist) {
        rbaRuns = [];
        return;
    }
    let runs = [];
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let spot = addDays(today, 1);
    let rbas = findRbaDates();
    for (let q of quoteslist){
        if (q.year > 1000){
            let index = q.year - 1000;
            if (!rbas[index] || !rbas[index + 1]) {
                continue; // Skip if RBA dates not available
            }
            let run = [];
            let d1 = rbas[index];
            d1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
            let d2 = rbas[index + 1];
            d2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
            run[0] = toDateString(d1);
            run[1] = toDateString(d2);
            run[2] = get(data_collection_settings).calcOIS ? getRateForDates(d1, d2) : q.mid.toFixed(4);
            run[3] = q.override;
            run[4] = Math.round((d2.getTime() - d1.getTime()) / (1000*60*60*24));
            runs.push(run);
        }
    }
    rbaRuns = runs;
}

function initSpreadTenors () {
    let rates = [];
    let today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let spot = addDays(today, 1);
    for (let i = 0; i < 12; i++) {
        rates[i] = getRateForDates(spot, addMonths(spot, i+1));
    }
    let spreads = [];
    for (let i = 1; i <= 12; i++) {
        let spread = [];
        spread[0] = i;
        for (let j = 1; j <= 12; j++) {
            if (j <= i) { 
                spread[j] = null;
            } else {
                spread[j] = (rates[j-1] - rates[i-1]).toFixed(4);
            }
        }
        let date = addMonths(spot, i);
        spread[13] = i;
        spread[14] = rates[i-1].toFixed(4);
        spread[15] = date;
        spread[16] = Math.round((date.getTime() - spot.getTime()) / (1000*60*60*24));
        spreads.push(spread);
    }
    spreadTenors = spreads;
}

function initSwapTenors (rbaRuns) {
    let _swapTenorHeaders = [];
    let rates = [];
    for (let i = 0; i < 12; i++) {
        if (rbaRuns[i]) {
            rates[i] = rbaRuns[i][2];
        }
    }
    let spreads = [];
    for (let i = 1; i <= 12; i++) {
        if (!rbaRuns[i-1]) continue;
        let spread = [];
        _swapTenorHeaders[i-1] = rbaRuns[i-1][0];
        spread[0] = rbaRuns[i-1][0];
        for (let j = 1; j <= 12; j++) {
            if (j <= i) { 
                spread[j] = null;
            } else {
                spread[j] = (rates[j-1] - rates[i-1]).toFixed(4);
            }
        }
        spread[13] = i;
        spread[14] = rates[i-1];
        spread[15] = rbaRuns[i-1][0];
        spread[16] = rbaRuns[i-1][4];
        spreads.push(spread);
    }
    swapTenors = spreads;
    swapTenorHeaders = _swapTenorHeaders;
}

export function getSpotRates () {
    if (spotRates.length == 0) initSpotRates();
    return spotRates;
}

export function getRbaRuns () {
    if (rbaRuns.length == 0) initRbaRuns();
    return rbaRuns;
}

export function getSwapTenors () {
    if (swapTenors.length == 0) initSwapTenors(getRbaRuns());
    return [swapTenors, swapTenorHeaders];
}

export function getSpreadTenors () {
    if (spreadTenors.length == 0) initSpreadTenors();
    return spreadTenors;
}

export function clearAll () {
    spotRates = [];
    rbaRuns = [];
    swapTenors = [];
    swapTenorHeaders = [];
    spreadTenors = [];
}

export function rbaToYear (tenor) {
    if (rbaRuns.length == 0) {
        initRbaRuns();
    }
    
    if (rbaRuns.length == 0) {
        console.warn('rbaToYear: rbaRuns is empty, cannot convert tenor:', tenor);
        return null;
    }
    
    for (let i = 0; i < rbaRuns.length; i++) {
        if (!rbaRuns[i] || !rbaRuns[i][0]) continue;
        let parts = rbaRuns[i][0].split(" ");
        if (parts.length >= 3 && (parts[1]+parts[2]).toLowerCase() == tenor.toLowerCase()) {
            return (1001 + i);
        }
    }
    
    // Log available tenors to help debug
    let available = rbaRuns.map((r, i) => {
        if (r && r[0]) {
            let p = r[0].split(" ");
            return p.length >= 3 ? (p[1]+p[2]).toLowerCase() : null;
        }
        return null;
    }).filter(t => t);
    console.warn(`rbaToYear: tenor "${tenor}" not found. Available: ${available.join(', ')}`);
    
    return null;
}
