'use strict';

// Banks are largely unchanging structures.

import { writable, get } from 'svelte/store';
import traders from './traders';
import user from './user';
import brokers from './brokers';
import products from './products';
/**
 * @typedef {Object} bic
 * @property {number} id
 * @property {number} bank_id
 * @property {string} markitshortcode
 * @property {string} markitbiccode
 * @property {string} legalentity
 */
const bic = (function () {
  const { subscribe, set } = writable([]);
  let anonVals = {};
  let anonLet = 'A';

  const getBic = function (bic_id){
    return getAllBic().find(codeObj => codeObj.id == bic_id);
  };

  /**
   * Returns all of the bic code from bank ID.
   * @param {number} bank_id 
   * @returns {bic[]| undefined}
  */
  const getBankBics = function (bank_id) {
    // Get a bank bic code by its BankID.
    const bic = getAllBic();
    return bic.filter(b=> b.bank_id === bank_id);
  };
  const getAllBic = function () {
    const broker = brokers.get(user.get());
    if(broker.permission["Not Anonymous"]){
      return get(bic);
    }else{
      let biclist = structuredClone(get(bic));
      biclist.forEach((code) => {
        if (!anonVals[code.legalentity]){
          anonVals[code.legalentity] = anonLet + anonLet + anonLet;
          anonLet = getNextChar(anonLet);
        }
        code.legalentity = anonVals[code.legalentity];
      });
      return biclist;
    }
  };

  function getNextChar(char) {
    if (char === 'Z') {
      return 'A';
    }
  
    return String.fromCharCode(char.charCodeAt(0) + 1);
  }

  const findByBicCode = function (bic) {
    return getAllBic().find((codeObj) => codeObj.markitbiccode == bic);
  }

  const getMatchingBic = function (offer_trader_id, bid_trader_id, productId) {
    const bank_bid = traders.get(bid_trader_id).bank_id;
    const bank_offer = traders.get(offer_trader_id).bank_id;

    // Get all possible Bic code for Bank_offer.
    const bid_codes = getAllBic().filter(b=> b.bank_id === bank_bid);
    const offer_codes = getAllBic().filter(b=> b.bank_id === bank_offer);
    
    let bic_bid;
    let bic_offer;

    // Ensure bic codes can only be set once
    // so they are not overridden by lower priority rules.
    function set_bic_bid(code){
      if(!bic_bid) bic_bid = code; 
    }

    function set_bic_offer(code){
      if(!bic_offer) bic_offer = code; 
    }

    // separates DLC and non DLC codes
    function DCL_nonDCL (bic_codes) {
      let DCL;
      let Branch = [];
      let SpecialCases = [];
  
      for(let code of bic_codes){
        if (/DCL/gm.test(code.markitbiccode)) DCL = code;
        else Branch.push(code);
      }
  
      for(let idx in Branch){
        const code = Branch[idx];
        if(['BNPAFRPP', 'DEUTDEFF', 'DEUTGB2L', 'UBSWAU2SXXX'].includes(code.markitbiccode)){ // TODO add new special case bic codes here
          SpecialCases.push(code);
        }
      }
      Branch = Branch.filter((b) => !SpecialCases.includes(b.markitbiccode))
      return {DCL, Branch, SpecialCases};
    }

    // -------------- RULE 1 --------------- //
    // Rule: xccy products must use non DCL codes

    const Rule_XCCY = function() {
      if(products.isXccy(productId)) { 
        const bid_Branch = DCL_nonDCL(bid_codes).Branch;
        const offer_Branch = DCL_nonDCL(offer_codes).Branch;
        set_bic_bid( bid_Branch[0] );
        set_bic_offer( offer_Branch[0] );
      }
    };

    // -------------- RULE 2 --------------- //
    // Rule: Nomura have special cases. They may use DCL code when trading with other banks without a DCL code.

    function getNOMUCode(opposingBankId, NOMU_codes) {
      if([2, 5, 6, 7, 16, 17, 18, 19, 22, 26].includes(opposingBankId)) { //NIP
        const Branch = DCL_nonDCL(NOMU_codes).Branch;
        return Branch.find(code => /NOM/gm.test(code.markitbiccode));
      }
      return DCL_nonDCL(NOMU_codes).DCL;
    }

    const Rule_NOMU = function() {
      if(bank_bid == 3) {
        set_bic_bid( getNOMUCode(bank_offer, bid_codes) );
      } else if (bank_offer == 3) {
        set_bic_offer( getNOMUCode(bank_bid, offer_codes) );
      }
    };

    // -------------- RULE 3 --------------- //
    // Rule: Deutsch BIC code depends on trader location (Frankfurt or London)

    function getDBCode(trader_id, DB_codes){
      const SpecialCases = DCL_nonDCL(DB_codes).SpecialCases;

      let deutsche_ld_Traders = [77]; // FIXME Add all Deutsche Frankfurt traders once they are onboarded. Not Deutsche London
      if(deutsche_ld_Traders.includes(trader_id)){  
        return SpecialCases.find(code => /GB2L/gm.test(code.markitbiccode));
      }
      return SpecialCases.find(code => /FF/gm.test(code.markitbiccode)); // frankfurt assumed, if not London
    }

    const Rule_DEUT = function() {
      if(bank_bid == 25){
        set_bic_bid( getDBCode(bid_trader_id, bid_codes) );
      }
      else if(bank_offer == 25){
        set_bic_offer( getDBCode(offer_trader_id, offer_codes) );
      }
    };

    // -------------- RULE 4 --------------- //
    // Rule: If BNP and UBS have special BIC codes when trading together. 

    const Rule_BNP_UBS = function() { // 4 => BNP; 14 => UBS
      if(bank_bid == 4 && bank_offer == 14) {
        const bid_SpecialCases = DCL_nonDCL(bid_codes).SpecialCases;
        const offer_SpecialCases = DCL_nonDCL(offer_codes).SpecialCases;
        set_bic_bid( bid_SpecialCases.find(code => /FRPP/gm.test(code.markitbiccode)) );
        set_bic_offer( offer_SpecialCases.find(code => /SXXX/gm.test(code.markitbiccode)) );
      } 
      else if(bank_offer == 4 && bank_bid == 14){
        const bid_SpecialCases = DCL_nonDCL(bid_codes).SpecialCases;
        const offer_SpecialCases = DCL_nonDCL(offer_codes).SpecialCases;
        set_bic_bid( bid_SpecialCases.find(code => /SXXX/.test(code.markitbiccode)) );
        set_bic_offer( offer_SpecialCases.find(code => /FRPP/gm.test(code.markitbiccode)) );
      }
    };
    
    // -------------- RULE 5 --------------- //
    // Rule: With the exception of speical cases (including xccy rule), banks should always default to their DCL code.
    //        if they do not have a DCL code, they will default to their branch (xccy) code.

    const Rule_DCLMatch = function(){
      // const DCL_Bank_Matches = [1, 3, 8, 13, 15];
      const sortedBidCodes = DCL_nonDCL(bid_codes);
      const sortedOfferCodes = DCL_nonDCL(offer_codes);

      if(sortedBidCodes.DCL) set_bic_bid(sortedBidCodes.DCL);
      else set_bic_bid(sortedBidCodes.Branch[0]);

      if(sortedOfferCodes.DCL) set_bic_offer(sortedOfferCodes.DCL);
      else set_bic_offer(sortedOfferCodes.Branch[0]);
    };

    // In priority Order
    const ruleBase = {
      1: Rule_XCCY,
      2: Rule_NOMU,
      3: Rule_DEUT,
      4: Rule_BNP_UBS,
      5: Rule_DCLMatch,
    };

    for(let rule of Object.values(ruleBase)){ // move through rules until both bics are set. (the set bic functions ensure bics are only sert once)
      if(bic_bid && bic_offer) break;
      rule();
    }
    
    return {
      bic_bid,
      bic_offer
    };
  };


  return {
    subscribe,
    set,
    getBic, 
    getAllBic,
    getMatchingBic,
    getBankBics,
    findByBicCode,
  };
}());

export default bic;