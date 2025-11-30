<script>
    import products from '../stores/products.js';
    import traders from '../stores/traders';
    import { toPrice, toBPPrice, toTenor, timestampToDateTime } from '../common/formatting.js';

    export  let active_orders; 
    const order_is_old = (time_placed) => {return  new Date(time_placed) < new Date().setHours(0, 0, 0, 0);}
    
</script>
<div style=" flex: 1 1 400px; flex-wrap: wrap; flex-direction: column;display: flex; gap: 5px; align-content: flex-start; height: 100%; width: 100%; overflow-x: scroll;">
    {#each active_orders as o}
    <div style="width: 400px; height: 160px; background-color: #232323; padding: 5px; font-weight: bold; ">
        <div style=" padding: 5px;   font-weight: bold;display: flex; flex-direction: row;border-bottom: 2px solid #aaaaaa;background-color:#262840;white-space: nowrap;">
            <div style=" width: 50%;">{o?.currency_code} &nbsp;{products.name(o?.product_id)} {'\u2003'}{ o?.fwd ? toTenor(o?.fwd): ""}{o?.years ?toTenor(o?.years) : ""}&ensp;@&ensp;{o?.price ? toPrice(o?.price) : "-"} </div>
            <div style="  align-items: center; justify-content: right; width: 50%; padding-right: 2%; display: flex; flex-direction: row;">
               
                {order_is_old(o.time_placed) ? '❄️' : o?.firm ? '' : ' ⛔'}
                {traders.bankName(o?.trader_id)}
            
            </div>
        </div>
        <div class="line-input" style="justify-content: space-between;">
            <div class="input-cal item-cal non-custombox" style="width: fit-content; margin-left:1px; ">
                <input  style="width: 260px" type="text" value={traders.fullNameWithPreferred(traders.get(o?.trader_id))} />
            </div>
            <div  style="padding-left:1px"> {(o?.eoi ) ? "EOI" : ""}</div>
            <div class="input-cal item-cal non-custombox" style={`width: fit-content;margin-left:1px; border: 1px `+ ((o?.bid) ? `var(--cds-link-01, #78a9ff) solid;` :" var(--cds-danger-01, #da1e28) solid")}>
                <input style="background-color: inherit; width: 60px" type="text" value={ (o?.bid) ?"Bid" :"Offer" } />
            </div>
        </div>
        <div class="line-input"> 
            <div class="input-cal item-cal non-custombox" style="width: fit-content; margin-left:1px; ">
                <input style="width: 70px" type="text" value={( o?.fwd ? toTenor(o?.fwd): "").concat(toTenor(o?.years))} />
            </div>
            <div class="input-cal item-cal non-custombox" style="width:130px; margin-left:1px; ">
                <input style="width: 100px" type="text" value={o?.volume ? o?.volume : "-"} />
                <span style="width: fit-content; padding-left: 0px" class="icon-cal" >M</span>
            </div>
            <div style="color: #999; padding:5px">@</div>
            <div class="input-cal item-cal non-custombox" style="width: 155px; margin-left:1px; ">
                <input style="width: 110px" type="text" value={o?.price ? ( ([1, 3, 20].includes(products.nonFwd(o?.product_id))) && o?.years.length != 1 ? toBPPrice(o?.price) : toPrice(o?.price) ) : "-"} />
                <span style="width: fit-content; padding-left: 0px" class="icon-cal" >{products.isPercentageProd(o?.product_id)? "%" : "BPS"}</span>
            </div>
        </div>
        {#if o?.start_date}
        <div class="line-input" >
            <div class="input-cal item-cal non-custombox" style={`width: fit-content;margin-left:1px; background-color: #232323`}>
                <input type="text" style="width: 100px;  background-color: #232323" value={"Start Date"}  />
            </div>
            
            <div class="input-cal item-cal non-custombox" style={`width: 270px;margin-left:7px`}>
                <input type="text" style="width: 100%" value={ o?.start_date ? timestampToDateTime(o?.start_date) : "-"}  />
            </div>
           
        </div>
        {/if}
        <div  class="line-input">
            <div class="input-cal item-cal non-custombox" style={`width: fit-content;margin-left:1px; background-color: #232323`}>
                <input type="text" style="width: 100px;  background-color: #232323" value={"Time placed"}  />
            </div>
            <div class="input-cal item-cal non-custombox" style={`width: 270px;margin-left:7px`}>
                <input type="text" style="width: 100%" value={ o?.time_placed ? timestampToDateTime(o?.time_placed) : "-"}  />
            </div>
            
        </div>
    </div>
    {/each}
   
</div>
<style>
    .line-input {
        padding: 1px; 
        display: flex; 
        flex-direction: row; 
        align-items: center;
    }
</style>