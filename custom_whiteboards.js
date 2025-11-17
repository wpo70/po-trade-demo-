'use strict';

import { writable, get } from "svelte/store";

import currency_state from "./currency_state";
import websocket from "../common/websocket";
import prices from "./prices";
import { addToast } from "./toast";
import products from "./products";

/* Item (element of array) Structure Example:  
{
  id:3,
  name:"Test_EFP",
  prices_blueprint:[[{product_id:2, shape:0, tenors:[], nonpersists:false}, {product_id:2, shape:1, tenors:['3 x 10'], nonpersists:true}]],
  indicators:[2],
  lives_only:true,
  show_ticker:true,
  filters:{} // Obj is same structure as filters store
}
*/

const custom_whiteboards = (
  function () {
    const { subscribe, set, update } = writable([]);

    const init = function (init) {
      let boards = init.map(wb => {
        delete wb.broker_id;
        return checkRollbacks(wb);
      });
      set([{board_id:-1, name:"Live Orders", show_ticker:true, lives_only:true}].concat(boards));
      selected_custom_wb.set(getWBFromId(+sessionStorage.getItem("selected_cwb_id")));
    };

    /** Used to check if a rollback is needed in the blueprint, for those products and shapes that require it.
     *  Ie. if a user has selected SPS 2x5 with specific tenors and the month rolls over, this should be changed to a 1x4 so the refined tenor list can remain.
     *  In this scenario, the 2x5 will not be changed if no tenors are selected. If 0 fwd is reached, the block should be deleted, (likewise column if it is the only block in it).
     */
    const checkRollbacks = function (wb) {
      function tenorCheck(block, shape_tenors) {
        let {product_id, shape, tenors} = block;
        let stir6 = shape >= 25;
        while (!tenors.some(t => shape_tenors?.includes(t))) {
          if (!shape_tenors || --shape < 0 || stir6 && shape < 25) {
            return null;
          }
          shape_tenors = get(prices)[product_id][shape]?.map(pg => pg.tenor);
        }
        return {...block, shape};
      }

      let bp = wb.prices_blueprint.map(col => {
        return col.map(block => {
          if (products.isRollingProd(block.product_id) && block.tenors.length) {
            let shape_tenors = get(prices)[block.product_id][block.shape]?.map(pg => pg.tenor);
            if (block.product_id == 18) {
              return tenorCheck(block, shape_tenors);
            } else if (!block.tenors.some(t => shape_tenors?.includes(t))) {
              return {...block, tenors:[]};
            }
          }
          return block;
        }).filter(f => f != null);
      }).filter(f => f.length);
      if (JSON.stringify(wb.prices_blueprint) != JSON.stringify(bp)) {
        if (bp.length) { wb = {...wb, prices_blueprint:bp}; }
        else { wb = {...wb, prices_blueprint:[[{product_id:undefined, shape:undefined, tenors:[]}]], indicators:[]}; }
        console.info(`Refined tenors in a block of custom whiteboard '${wb.name}' did not match. Associated shape has been rolled back.`);
        websocket.addUpdateCustomWB(wb, "update");
      }
      return wb;
    };

    const getAllWBs = function () {
      return get(custom_whiteboards).filter(f => f.board_id === -1 || f.currency == get(currency_state));
    };

    const getWBFromId = function (board_id) {
      const boards = getAllWBs();
      const ret = boards.find(f => f.board_id == board_id);
      return board_id && ret ? ret : boards[0];
    };

    const addUpdateWB = function (wb) {
      if (!wb || typeof wb != "object") {
        return false;
      }
      let type = "update"
      let idx;
      update(store => {
        idx = store.findIndex(search => search.board_id == wb.board_id);
        if (wb.board_id > 0 && idx !== -1) {
          store.splice(idx, 1, wb);
        } else { 
          type = "add";
          wb.currency = get(currency_state);
        }
        return store;
      });
      websocket.addUpdateCustomWB(wb, type);
      if (type == "update") {
        selected_custom_wb.set(get(custom_whiteboards)[idx]);
        return true;
      }
    };

    const receiveNewWB = function (ws_response) {
      if (!ws_response) {
        selected_custom_wb.set(get(selected_custom_wb).board_id === -1 ? getAllWBs().at(-1) : getAllWBs()[0]);
        addToast ({
          message: "An error occurred while adding your custom whiteboard. Please try again later.",
          type: "error",
          dismissible: true,
          timeout: 2500,
        });
        return;
      }
      importWB(ws_response);
      selected_custom_wb.set(getAllWBs().at(-1));
    };

    const deleteWB = function (wb) {
      if (typeof wb != "number") {
        wb = wb?.board_id;
      }
      if (typeof wb != "number") {
        return false;
      }
      let subset_sel = getAllWBs().findIndex(search => search.board_id == wb);
      update(store => {
        let idx = store.findIndex(search => search.board_id == wb);
        store.splice(idx, 1);
        return store;
      });
      let wbs = getAllWBs();
      selected_custom_wb.set(wbs[Math.min(subset_sel, wbs.length-1)]);
      websocket.deleteCustomWB(wb);
      return true;
    };

    const importWB = function (wb) {
      update(store => {
        store.push(wb);
        return store;
      });
    };

    const swapWBs = function (id1, id2) {
      if (id1 <= 0 || id2 <= 0) { return false; }
      let idx1, idx2;
      update(store => {
        store.forEach((wb, idx) => {
          if (wb.board_id == id1) { idx1 = idx; }
          if (wb.board_id == id2) { idx2 = idx; }
        });
        if (idx1 && idx2) {
          [store[idx1].board_id, store[idx2].board_id] = [id2, id1];
          [store[idx1], store[idx2]] = [store[idx2], store[idx1]];
        }
        return store;
      });
      if (idx1 && idx2) {
        websocket.swapCustomWBs(id1, id2);
        return true;
      }
    };

    const setToLive = function () {
      selected_custom_wb.set(get(custom_whiteboards)[0]);
    };

    const setToCustom = function (id) {
      let sel = get(selected_custom_wb);
      if (sel.board_id === -1 || sel.currency != get(currency_state)) {
        const b = getAllWBs();
        const index = id == undefined ? 1 : selected_custom_wb.getIndex(id);
        selected_custom_wb.set(b.length > 1 ? b[index] : b[0]);
      }
    };

    return {
      subscribe,
      init,
      get: getAllWBs,
      getWBFromId,
      addUpdateWB,
      receiveNewWB,
      deleteWB,
      importWB,
      swapWBs,
      setToLive,
      setToCustom,
    };
  }()
);
export default custom_whiteboards;

const selected_custom_wb = (
  function () {
    const { subscribe, set, update } = writable(null);

    subscribe((val) => {
      if (val) sessionStorage.setItem("selected_cwb_id", val.board_id); //TODO: determine why periodically receiving null/undefined
    });

    const setWithId = function (board_id) {
      const wbs = custom_whiteboards.getAllWBs(); 
      selected_custom_wb.set(wbs.find(c => c.board_id === board_id));
    };

    const getIndex = function (board_id) {
      const wbs = custom_whiteboards.getAllWBs(); 
      return wbs.indexOf(c => c.board_id === board_id);
    };

    const getFilters = function () {
      return get(selected_custom_wb).filters;
    };

    const setFilter = function (obj) {
      update(scwb => {
        scwb.filters = obj;
        websocket.addUpdateCustomWB(scwb, "update");
        return scwb;
      });
    };

    const share = function (recipient, wb = get(selected_custom_wb)) {
      if (typeof recipient != "number") {
        recipient = recipient?.broker_id;
      }
      if (!recipient || typeof recipient != "number") {
        console.error("Cannot share custom whiteboard to unknown recipient.");
        return false;
      }
      websocket.shareCustomWB(wb, recipient);
    };

    return {
      subscribe,
      set,
      setWithId, // Unused so far
      get,
      getIndex, // unused so far
      getFilters,
      setFilter,
      share
    };
  }()
);
export { selected_custom_wb };
