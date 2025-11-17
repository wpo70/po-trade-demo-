<script>
    import RowSelectableTable from "../RowSelectableTable.svelte";

    import swaption_quotes from "../../stores/swaption_quotes";
    import { timestampToISODate } from "../../common/formatting";
    
    export let selected_swaption_idx = null;

    let swaptionHeadings = ['RBA Meeting', 'Option Expiry', 'Swap Tenor', 'Option Type', 'Strike', 'Swap Rate/Strike', 'Swap Start Date', 'Swap End Date', 'Swap Freq', 'Floating Rate Index', 'Swaption Forward Premium'];

    const setFirstColumnLabel = (_, x) => {
        switch (x) {
            case 'RBA Meeting':
                return 'sticky-col-swaption';
            default:
                return '';
        }
    };

    const swaptionBackgroundColor = (_, x) => {
      switch (x) {
        case 'Swaption Forward Premium':
          return '#000';
        case 'Floating Rate Index':
        case 'Swap Freq':
        case 'Option Expiry':
          return '#dededc';
        case 'Swap Start Date':
        case 'Swap End Date':
        case 'Swap Tenor':
          return '#89c5d9';
        case 'Swap Rate/Strike':
          return '#f5ed0a';
        case 'Strike':
          return '#fac802';
        default:
          return '';
      }
    };

    const swaptionColor = (_, x) => {
      if (x === 'Swaption Forward Premium') {
        return '#fcec00';
      } else if (x !== 'Option Type' && x !== 'RBA Meeting') {
        return '#000'
      }
    };

    //
</script>

<h4 class="bx--data-table-header__title rba-quotes-header"><strong>RBA Quotes</strong></h4>
<RowSelectableTable
    x_labels={swaptionHeadings}
    rows={$swaption_quotes.rba.map((quote) => {
        delete quote['quote_id'];
        let obj = {};
        Object.values(quote).forEach((value, idx) => {
            if(['Option Expiry', 'Swap Start Date', 'Swap End Date'].includes(swaptionHeadings[idx])) {
                obj[swaptionHeadings[idx]] = timestampToISODate(value);
            } else {
                obj[swaptionHeadings[idx]] = value;
            }
        });
        return obj;
    })}
    color_fn={swaptionColor}
    background_color_fn={swaptionBackgroundColor}
    aria_label={setFirstColumnLabel}
    bind:selected_row={selected_swaption_idx}
    />

<style>
    .rba-quotes-header {
        flex: 0 1 auto;
        padding-top: 16px;
        padding-bottom: 11px;
    }
</style>