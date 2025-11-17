<script>
  import { convertDateToString, roundToNearest, tenorToYear, toBPPrice, toEFPSPSTenor, toPrice, toRBATenor, toTenor, toVolumeString } from "../../common/formatting";
  import { getRbaRuns } from "../../common/rba_handler";
  import Validator from "../../common/validator";
  import active_product from "../../stores/active_product";
  import products from "../../stores/products";
  import quotes from "../../stores/quotes";
  import Dv01Options from "./Subcomponents/DV01Options.svelte";
  import OtherOptions from "./Subcomponents/OtherOptions.svelte";
  import PriceField from "./Subcomponents/PriceField.svelte";
  import ProductSelector from "./Subcomponents/ProductSelector.svelte";
  import SubmitClear from "./Subcomponents/SubmitClear.svelte";
  import TenorOptions from "./Subcomponents/TenorOptions.svelte";
  import TraderSelector from "./Subcomponents/TraderSelector.svelte";
  import VolumeField from "./Subcomponents/VolumeField.svelte";

  export let selected;
  export let order_ft = null;
  export let opposingOrder = false;
  
  let rba_runs = getRbaRuns();
  let dv01component, tenorComponent;
  let fields = {};
  let product_options = [];
  let count = 0;
  let rbaTenors = rba_runs.map((r) => {
    let str = r[0].split(" ");
    return {id: count++, start_date: new Date(r[0]), day_count: r[4], text: str[1] + " " + str[2].slice(-2)}
  });
  
  let setDefaultDv01 = () => {dv01component?.setDefaultDv01();}
  let tenorSet = (bool = false) => {tenorComponent?.tenorSet(fields, bool);}

  $: {
    defaultFields();
    setProdOptions(selected?.product_id ?? $active_product);
  }
  $: copyToOrderForm(selected);

  function setProdOptions(prod) {
    if (product_options.includes(prod)) return;
    const optionsFrom = function (id) {
      switch (id) {
        case 17:
        case 18:
        case 27:
          return [17, 18, 27];
        default:
          return [id, products.fwdOf(id)];
      }
    }
    let options = optionsFrom(prod);
    // Get Non - forward products
    let nf = products.nonFwd(prod);
    if (nf != prod) { options.push.apply(options, optionsFrom(nf)); fields.isFWD = true; }
    if (prod == 1 || nf == 1) { options.push.apply(options, optionsFrom(2)); }
    if (prod == 2 || nf == 2) { options.push.apply(options, optionsFrom(1)); }
    if (prod == 29) { options = [28,29]}
    product_options = [...new Set(options)].filter(p => p != null).sort((a, b) => a - b);
  }

  function defaultFields () {
    let prod = selected?.product_id ?? $active_product;
    fields.id = Math.round(Math.random()*1000);
    fields.order_id = 0;
    fields.interest = false;
    fields.firm = true;
    fields.specific = false;
    fields.tenor = new Validator(prod);
    fields.fwd = new Validator(prod);
    fields.price = new Validator();
    fields.offer_price = new Validator();
    fields.bid_price = new Validator();
    fields.volume = new Validator();
    fields.dv01 = new Validator();
    fields.start = new Validator();
    fields.product = prod;
    fields.volume_mmp = '';
    fields.offer_selector = 'offer';
    fields.dv01_Currency = products.currency(prod);
    fields.isFWD = products.isFwd(prod);
    fields.opposingOrder = opposingOrder,
    fields.trader = {
      id: undefined, 
      invalid: false
    };
    fields.rba = {
      rbaLeg1Index: -1,
      rbaLeg2Index: -1,
      invalidRBA1: false,
      invalidRBA2: false,
      secondLeg: false,
    };
    setDefaultDv01();
  }
  
  function copyToOrderForm (selected) {
    if (selected == null || typeof selected == 'number') {
      defaultFields();
    } else {
      fields.order_id = selected.order_id ?? 0;
      fields.trader.id = selected.trader_id;
      fields.product = selected.product_id ?? fields.product ?? $active_product;
      fields.tenor.setProd(fields.product);

      // Set Price Fields
      if(selected.price != null && !isNaN(selected.price)){
        let p = fields.product == 2 && selected?.type == "indicator" ? selected.secondary_price : selected.price ?? parseFloat(selected.rate);
        if (p == null || p == undefined) { fields.price.reset(); }
        else { 
          let priceStr;
          if ((fields.product == 1 || fields.product == 3 || fields.product == 20) && 
              (selected?.years?.length > 1 || selected?.spread_start_date)) { priceStr = toBPPrice(p); }
          else { priceStr = toPrice(p); }
          fields.price.set(p, priceStr);
        }
      }

      // set start date or fwd tenor
      if (selected.fwd != null) {
        fields.specific = false;
        fields.fwd.setProd(fields.product);
        fields.fwd.set(+selected.fwd, toTenor(selected.fwd));
        fields.isFWD = true;
      } else if (selected.start_date != null) {
        fields.fwd.reset();
        fields.specific = true;
        fields.start.str = convertDateToString(selected.start_date);
      } else {
        fields.fwd.reset();
        fields.specific = false;
      }

      // set bid/offer
      if (selected?.type != "indicator") { fields.offer_selector = selected.bid ? 'bid' : 'offer'; }

      // set tenor fields
      switch (fields.product) {
        case 17:
        case 27:
          fields.tenor.set([0.25], toEFPSPSTenor(selected.start_date));
          fields.specific = true;
          break;
        case 20:
          if (selected.years && !selected.years.includes(1000)) {
            fields.tenor.set(selected.years, toRBATenor(selected.years));
            fields.rba.rbaLeg1Index = selected.years[0] - 1001;
            if (selected.years[1]) {
              fields.rba.rbaLeg2Index = selected.years[1] - 1001;
              fields.rba.secondLeg = true;
            } else {
              fields.rba.secondLeg = false;
            }
          } else if (selected.start_date && new Date(selected.start_date).getTime() > new Date().getTime()) {
            for (let i = 0; i < rba_runs.length; i++) {
              if (new Date(rba_runs[i][0]).toString() === selected.start_date.toString()){
                let str = (1001 + i).toString();
                let yr = (tenorToYear(str));
                fields.tenor.set(yr, toRBATenor(yr));
                fields.rba.rbaLeg1Index = i;
                fields.rba.secondLeg = false;
                break;
              }
            }
            if (selected.spread_start_date) {
              for (let i = 0; i < rba_runs.length; i++) {
                if (new Date(rba_runs[i][0]).toString() === selected.spread_start_date.toString()){
                  let str = fields.tenor.value[0] + " x " + (1001 + i).toString();
                  let yr = (tenorToYear(str));
                  fields.tenor.set(yr, toRBATenor(yr));
                  fields.rba.rbaLeg2Index = i;
                  fields.rba.secondLeg = true;
                  break;
                }
              }
            }
          }
          break;
        default:
          fields.tenor.set(selected.years, toTenor(selected.years));
          break;
      }

      // set interest and firm fields
      fields.interest = !!selected.eoi;
      fields.firm = !!selected.firm;
      
      // set volume fields
      if (selected.volume) {
        fields.dv01_Currency = products.currency(fields.product);
        if (selected.years[0] != 1000) {
          let val = quotes.getDV01FromVol(fields.product, selected.years, selected.volume, selected?.fwd);
          fields.dv01.set(val, roundToNearest(val, 1).toString());
        }
        fields.volume.set(selected.volume, toVolumeString(selected.volume));
        fields.dv01.hasPriority = true;
      } else {
        setDefaultDv01();
        tenorSet();
        fields.dv01.hasPriority = false;
      }
    }
  }


  
</script>
  <div style="width: 400px;display: flex;flex-direction: column;gap: 16px;" on:keypress|stopPropagation>
    <TraderSelector 
      bind:fields
      {order_ft}/>
    <OtherOptions 
      bind:fields 
      on:tenorSet={(e) => tenorSet(e?.detail ?? false)}/>
    <ProductSelector 
      bind:fields 
      bind:selected 
      bind:product_options 
      on:setDefaultDv01={setDefaultDv01}
      on:tenorSet={(e) => tenorSet(e?.detail ?? false)}/>
    <TenorOptions 
      bind:this={tenorComponent} 
      bind:fields {rbaTenors} 
      on:setDefaultDv01={setDefaultDv01}/>
    <PriceField 
      bind:fields/>
    <VolumeField 
      bind:fields 
      {rbaTenors} 
      on:setDefaultDv01={setDefaultDv01}/>
    <Dv01Options 
      bind:this={dv01component} 
      bind:fields 
      on:tenorSet={(e) => tenorSet(e?.detail ?? false)}/>
    <SubmitClear 
      {rbaTenors} 
      bind:fields 
      bind:selected 
      on:reset 
      on:tenorSet={(e) => tenorSet(e?.detail ?? false)} 
      on:setDefaultDv01={setDefaultDv01}
      on:defaultFields={defaultFields}
      on:order_updated/>
    </div>


<style>

:global(.my_radio .bx--radio-button-group) {
  margin: 0;
}
:global(.centered_container .bx--radio-button-wrapper:not(:last-of-type)) {
  align-items: center;
  margin-right: 2rem
}
:global(.centered_container .bx--form-item) {
  align-items: center;
}
:global(.checkbox_container .bx--form-item) {
  flex-grow: 0;
}

</style>