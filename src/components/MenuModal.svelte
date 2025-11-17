<script>
import { Modal, Column, Row, Grid } from 'carbon-components-svelte';
import user from '../stores/user';
import { main_content, view } from '../stores/active_product.js';

export let showMenus = false;

let permission = user.getPermission();
</script>

<div class="menu-modal">
    <Modal bind:open={showMenus} passiveModal modalHeading="" on:open on:close>
      <div class="wrapper">
        <Grid condensed>
        <Row>
        <Column>
          <div><button expressive size="xl" type="tertiary"  class="box-modal order-view col_third" on:click={() => {$main_content = 'trading'; $view = 'orders'; showMenus=false;}}>
            <div class="text">ORDERS</div>
          </button></div>
        </Column>
        <Column>
          <div><button expressive size="xl" type="tertiary"  class="box-modal wb-view col_third" on:click={()=> {$main_content = 'trading'; $view = 'whiteboard'; showMenus=false;}}>
            <div class="text">WHITEBOARD</div>
            </button></div>
        </Column>
        <Column>
          <div><button expressive size="xl" type="tertiary"  class="box-modal trade-view col_third" on:click={() => {$main_content = 'trading'; $view = 'trades'; showMenus=false;}}>
            <div class="text">TRADES</div>
          </button></div>
        </Column>
        <Column >
          <div><button expressive size="xl" type="tertiary"  class="box-modal rba-ois-view col_third" on:click={() => {$main_content = 'trading'; $view = 'swaption'; showMenus=false;}}>
            <div class="text">SWAPTIONS</div>
            </button></div>
        </Column>
        <Column >
          <div><button expressive size="xl" type="tertiary"  class="box-modal rba-ois-view col_third" on:click={() => {$main_content = 'trading'; $view = 'rba-ois'; showMenus=false;}}>
            <div class="text">RBA OIS</div>
            </button></div>
        </Column>
        <Column >
          <div><button expressive size="xl" type="tertiary"  class="box-modal rba-ois-view col_third" on:click={() => {$main_content = 'trading'; $view = 'fwds'; showMenus=false;}}>
            <div class="text">FORWARDS</div>
            </button></div>
        </Column>
        <Column >
          <div><button expressive size="xl" type="tertiary"  class="box-modal rba-ois-view col_third" on:click={() => {$main_content = 'trading'; $view = 'fx-options'; showMenus=false;}}>
            <div class="text">FX OPTIONS</div>
            </button></div>
        </Column>
        <!-- m -->
        {#if permission["Trader Management"]}
        <Column>
          <div><button expressive size="xl" type="tertiary"  class="box-modal m-view col_third" on:click={() => {$main_content = 'trader-management'; showMenus=false;}}>
            <div class="text">TRADER MANAGEMENT</div>
          </button></div>
        </Column>
        {/if}
        </Row>
    </Grid>
      </div>
    </Modal> 
    </div>

<style>
    /* .col_third { width: 32%;} */
.col_third {
  position: relative;
  display: inline;
  display: inline-block;
  float: left;
   
}
.text {
  margin: 3px auto;
  background-color: #161616;
}
.menu-modal {opacity: ".2";}
.wrapper {margin: 0 auto; background-color: inherit;}
.box-modal { 
  border-color: none; 
  opacity: "10%"; 
  size: 20px;  color: white; font-style: bold; 
  width: 120px; 
  height: 70px; 
  margin: 5px auto;
  padding-right: 5px auto; 
  border-radius: 10px; 
  -moz-border-radius: 10px; 
  -webkit-border-radius: 10px; }
.order-view { background: url(img/view_order.png) no-repeat center 10px;}
.wb-view { background: url(img/view_whiteboard.png) no-repeat center 10px;}
.trade-view { background: url(img/view_trade.png) no-repeat center 10px;}
.m-view { background: url(img/view_trader_mgmt.png) no-repeat center 10px;}
.rba-ois-view { background: no-repeat center 10px;}
</style>