'use strict';
import { writable, get } from 'svelte/store';
import banks from './banks';
import products from './products';
import preferences from './preferences';
import websocket from '../common/websocket';

/*
*   Layout of store is store[bank_id]{colour, ocos:[prod_id] = oco_bool}
*/

const ocos = (
  function () {
    const { subscribe, set, update } = writable([]);      
  
    const init = async function (init_data) {
      let store = [];
      init_data.forEach(o => {
        store[o.bank_id] = {
          colour: o.oco_colour,
          ocos: o.ocos
        }
      });
      set(store);
    };
  
    /** Returns bool (or null if error occurs) as to whether given bank and prod is marked as OCO */
    const isOCO = function (bank_id, prod) {
      if (!bank_id || !prod) {
        console.log("Invalid values passed to isOCO");
        return null;
      }
      const oco_groups = get(ocos)[bank_id]?.ocos
      if (!oco_groups) {
        console.error("Could not find OCO groups for bank with id: ", bank_id, ". Failed to validate whether product with id ", prod, " is OCOed.");
        return null;
      }
      return oco_groups[prod];
    };

    /** This function is used internally and also updates other instances (calls the websocket) */
    const setOCO = function (bank_id, prod, val) {
      if (bank_id) {
        update(store => {
          const oco_groups = store[bank_id]?.ocos;
          if (!oco_groups) {
            console.error("Could not find OCO groups for bank with id: ", bank_id, ". Failed to update OCO value.");
            return;
          }
          oco_groups[prod] = val;
          websocket.modifyOCO({bank_id, ocos:oco_groups});
          return store;
        });
      }
    };

    /** N.B. This functions clears all ocos irrespective of the active product */
    const removeAllOCO = function () {
      websocket.clearAllOCOs();
    };

    /** This function is called by the websocket to apply the data it has been given from another instance */
    const modifyOCO = function (json) {
      let {bank_id, ocos} = json;
      update(store => {
        store[bank_id].ocos = ocos;
        return store;
      });
    };

    /** Function is called by websocket to apply data set in another instance */
    const setOCOColour = function (bank_id, colour) {
      if (bank_id) {
        update(store => {
          store[bank_id].colour = colour;
          return store;
        });
      }
    };

    /** Currently unused - left here as it may be useful in future */
    const getOCOsColourGroups = function () {
      const ret = {};
      for (let [bank_id, obj] of get(ocos).entries()) {
        if (ret.hasOwnProperty(o.colour)) {
          ret[obj.colour].push(bank_id);
        } else {
          ret[obj.colour] = [bank_id];
        }
      }
      return ret;
    };

    return {
      subscribe,
      init,
      setOCO,
      isOCO,
      setOCOColour,
      removeAllOCO,
      modifyOCO,
      getOCOsColourGroups,
    };
  } ());
    
export default ocos;