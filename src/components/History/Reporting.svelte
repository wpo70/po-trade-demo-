
<script>
  export let selectedTable;
  export let appliedRows;
  export let open;
  export let excludeTest;

  import { Tabs, Tab, Modal, FormGroup, RadioButtonGroup, RadioButton, Button, TextInput, TextArea, Tile, Accordion, AccordionItem,DatePicker, DatePickerInput, Checkbox, Toggle, ComboBox } from "carbon-components-svelte";
  import Validator from "../../common/validator";
  import websocket from "../../common/websocket";
  import EodEomReporting from "./EOD_EOM_Reporting.svelte";
  import EOD from "../../common/eod.js";

  import { addToast } from "../../stores/toast";
  import bic from "../../stores/bic";
  import trades from "../../stores/trades";
  import bank_divisions from "../../stores/bank_divisions";
  import report from "../../stores/report";
  import banks from "../../stores/banks";
  import swaption_orders from "../../stores/swaption_orders";
  import liquidityTrades from "../../stores/liquidityTrades";

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  let format = "all_data";
 
  let report_start_date;
  let report_end_date;
  let eod_scheduler;
  let selectedTableIndex;
  let eod_date = new Date();
  let eom_date = new Date((new Date()).getFullYear(), (new Date()).getMonth(),1 );
  let timestamp = Array.from(new Set($trades.rows.map(function(i) {return new Date(i.timestamp).getFullYear()})));
  let monthNames = [ "January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December" ];
  let month_id = monthNames.find((m,i) => m==(new Date(eom_date)).toLocaleString('default', { month: 'long' }));
  let year_id = timestamp.find((y,i) => y==(new Date(eom_date)).getFullYear());


  /** list of bank_id had eod report */
  let bank_had_report = [];
  /** list of email adress usr had chosen for eod report*/
  let report_email_selected = [];
  let report_email_selected_ = null;
  /** Specific Bank ID user had chosen to send eod report*/
  let bankReport = null;
  /** array of trades data via filtering specific date*/
  let report_reports_data=[]
  
  $: {
    switch(selectedTable) {
      case "Liquidity":
        selectedTableIndex = 2;
        break;
      case "Trades": 
        selectedTableIndex = 0;
        break;
      case "Swaptions": 
        selectedTableIndex = 1
        break;
    }
    /** Determine start date End date based on report type*/
    report_start_date = generate_Date(format, "start" , eod_date, eom_date, month_id, year_id);
    report_end_date = generate_Date(format, "end" , eod_date, eom_date,  month_id, year_id);
    
    /** filter trades based on start date end date */
    if (["eod","eom"].includes(format)) {
      switch(selectedTableIndex) {
        case 0:
          timestamp = Array.from(new Set($trades.rows.map(function(i) {return new Date(i.timestamp).getFullYear()})));
          report_reports_data = $trades?.rows?.filter((r,i, arr) => (
          new Date(arr[i].timestamp) <= report_end_date && new Date(arr[i].timestamp)> report_start_date));
          break;
        case 1:
          timestamp =Array.from(new Set($swaption_orders?.rows?.map(function(i) {return new Date(i.timestamp).getFullYear()})));
          report_reports_data = $swaption_orders?.rows?.filter((r,i, arr) => (
          new Date(arr[i].timestamp) <= report_end_date && new Date(arr[i].timestamp)> report_start_date));
          break;      
        case 2:
          timestamp = Array.from(new Set($liquidityTrades?.rows?.map(function(i) {return new Date(i.timestamp).getFullYear()})));
          report_reports_data = $liquidityTrades?.rows?.filter((r,i, arr) => (
          new Date(arr[i].timestamp) <= report_end_date && new Date(arr[i].timestamp)> report_start_date));
          break;      
    }};
    
    /** filter trades exludes test trades*/
    report_reports_data = checkTestTrade(report_reports_data, excludeTest);
    
    /** Filter bankID had EOD|EOM report*/
    bank_had_report = new Set(
      report_reports_data?.map(i => _get_bank_div_id(selectedTableIndex,i, true)).concat(
      report_reports_data?.map(i => _get_bank_div_id(selectedTableIndex, i, false)))
      );
    report_email_selected = bankReport ? ( (report_email_selected_) ?  report_email_selected_ : report.get(bankReport, format) ) : [];
    report_email_selected_ = null;
  }

  const generate_Date = (format, type, eod_date, eom_date) => {
    // Start date
    if (type=="start") {
      switch(format) {
        case "eod":
          return (new Date(eod_date))?.setHours(0,0,0,0);
        case "eom":
          return new Date((new Date(eom_date)).getFullYear(), (new Date(eom_date)).getMonth(),1 );
        default:
          return "";
    };
    } else {
      // End date
      switch(format) {
        case "eod":
          return  (new Date(eod_date))?.setHours(23,59,0,0);
        case "eom":
          return new Date((new Date(eom_date)).getFullYear(), (new Date(eom_date)).getMonth()+1,0 );
        default:
          return "";
    }   
  } 
}
  
  const generate_EOD_EOM_Report = (bank_id, data) => {

    let bank = bank_id; 
    let reports = [];
    let report = [];
    
    // Push header
    reports.push(Object.keys(new EOD(null, true, selectedTableIndex)));

    // Push rows
    data?.forEach(i => {
      if ( _get_bank_div_id(selectedTableIndex,i, true) == bank ) {
        
        // As a payer || bid
        report = Object.values(new EOD(i, true, selectedTableIndex));
        reports.push(report);
      } else if ( _get_bank_div_id(selectedTableIndex,i, false) == bank) {
        
        // As a seller || offer
        report = Object.values(new EOD(i, false, selectedTableIndex));
        reports.push(report);
      }
    })
    // trim swaption columns
    if (selectedTableIndex !== 1) reports.forEach((r, i, arr)=>  r.splice(-10))
  
    return reports;
  }
  const checkTestTrade = function (trade_data, excludeTest) {
    // Based on bank name (not short code)
      let testGroups= ["MEGA", "TEST1"];
      return (excludeTest) ?  // Filter out and test trades
        trade_data?.filter((r,i, arr) => (
        !testGroups.includes(banks.get(_get_bank_div_id(selectedTableIndex,arr[i], true)).bank) && 
        !testGroups.includes(banks.get(_get_bank_div_id(selectedTableIndex,arr[i], false)).bank)
        )
        ) : trade_data;
    }
    const _reset_report =() => {
    format = "all_data";
    /** list of bank_id had eod report */
    bank_had_report = [];
    /** list of email adress usr had chosen for eod report*/
    report_email_selected = [];
    report_email_selected_ = null;
    /** Specific Bank ID user had chosen to send eod report*/
    bankReport = null;
    /** array of trades data via filtering specific date*/
    report_reports_data=[]
  }
  /**
   * 
   * @param selectedTableIndex : 0|1|2 equivalent to trade sources trades|swaption|liquidity
   * @param trade__
   * @param type true|false - bid/offer - seller/buyer
   * @return bank_id
   */
  const _get_bank_div_id = (selectedTableIndex, trade__, type) =>{
    
    switch(selectedTableIndex) {
      case 0:
        return type ? bank_divisions.get(trade__.bid_bank_division_id)?.bank_id : bank_divisions.get(trade__.offer_bank_division_id)?.bank_id;
      case 1:
        return type ? bank_divisions.get(trade__.buyer_bank_division)?.bank_id : bank_divisions.get(trade__.seller_bank_division)?.bank_id;
      case 2:
        return type ? banks.getBankFromShortCode(trade__.cpty)?.bank_id : banks.getBankFromShortCode(trade__.cpty_2)?.bank_id;
    }
  }

  // ----------------Preparing csv------------------------
  let csvContent = "";
  let previewContent = [[],[]];
  let distribution = "email";

  let recipient = new Validator();
  let recipientCC = new Validator();
  let subject = "PO Capital Markets - Trade Report";
  let invalidSubject = false;
  let emailContent = "To whom it may concern,\n\nPlease find attached a PO Capital Markets trade report.\n\nRegards,\nPO Capital Markets Pty Ltd";

  $: {
    open = open;
    csvContent = "";
    previewContent = [];
  }
  //$: console.log($trades, $liquidityTrades, $swaption_orders)
  $: if (selectedTable != "Liquidity") format = "all_data";
  $: {
    if (subject == "PO Capital Markets - Trade Report" && format == "asic") {
      subject = "PO Trade Liquidity - ASIC Market Report";
    } else if (subject == "PO Trade Liquidity - ASIC Market Report" && format == "all_data") {
      subject = "PO Capital Markets - Trade Report";
    } else if (format == "eod") {
      subject = "PO Capital Markets - Trade Report "+(new Date(eod_date)).toLocaleDateString();
    } else if (format =="eom") {
      subject = "PO Capital Markets - Trade Report Month " +(new Date(eom_date)).toLocaleString('default', { month: 'long' });
    }
  }

  // Required ASIC Headings DO NOT CHANGE!
  let asicHeadings = [
    "Participant Type",
    "Category",
    "Product",
    "Reserved for ASIC",
    "Reserved for ASIC",
    "Reserved for ASIC",
    "Reserved for ASIC",
    "Reserved for ASIC",
    "Reserved for ASIC",
    "Month-end",
    "Participant Name",
    "Participant LEI",
    "Reserved for ASIC",
    "No. of Trades",
    "Value of Trades ($mln)"
  ];

  // These are the ASIC Product Types that need reporting
  // Add the product name recieved by POTL into the respective option to include it in the report
  let asicProducts = [ 
    {name: "FRA", prods: []}, 
    {name: "IRS", prods: ["SPS30D", "SPS90D", "RBAOIS"]}, 
    {name: "XCS", prods: []}, 
    {name: "DebtFWD", prods: []}, 
    {name: "IRO", prods: []}, 
    {name: "Swaption", prods: []}, 
    {name: "DebtOPT", prods: []}, 
    {name: "Exotic", prods: []}
  ];

  // Default Global Rows if no data exists for an asic report 
  let requiredAsicProds = ["IRS"];

  // Sends or Download the Generated Report
  async function sendReport () {
    if (csvContent.length == 0) generateReport(); // Generate csv if not already done
    if (distribution == "save") {
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvURL = URL.createObjectURL(csvBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = csvURL;
      let dateStr = new Date().toISOString().slice(0,10);
      downloadLink.download = ("PO_Capital_Markets_" + (format == "asic" ? "ASIC" : "Trade") + "_Report_" + dateStr + ".csv");
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      open = false;
      csvContent = "";
    } else {
      recipient.dirty = true;
      recipient.invalid = (recipient.isInvalid(Validator.scanEmail) || recipient.str == "");
      recipientCC.dirty = true;
      recipientCC.invalid = recipientCC.isInvalid(Validator.scanEmail);
      invalidSubject = (subject == "");
      if (recipient.invalid || recipientCC.invalid || invalidSubject) return;

      let emailRegex = /[^\s@]+@[^\s@]+\.[^\s@,]+/g;
      let recipientArr = Array.from(recipient.value.matchAll(emailRegex), (m) => m[0]);
      let recipientCCArr = Array.from(recipientCC.value.matchAll(emailRegex), (m) => m[0]);

      let dateStr = new Date().toISOString().slice(0,10);
      let fileName = ("PO_Capital_Markets_" + (format == "asic" ? "ASIC" : "Trade") + "_Report_" + dateStr + ".csv");

      try {
        let emailBody = emailContent.split('\n');
        await websocket.emailReport(recipientArr, recipientCCArr, subject, csvContent, emailBody, fileName);
        addToast ({
          message:"Email Sent Successfully.",
          type: "success",
          dismissible: true,
          timeout: 10000,
        });
        open = false;
        csvContent = "";
      } catch (error) {
        addToast ({
          message:"Email Failed to send.",
          type: "error",
          dismissible: true,
          timeout: 10000,
        });
      }
    }
  }
  const formatDateReporting = (date) =>{
    return new Date(date).toLocaleDateString(); 
  }

  // Generate the CSV and CSV Preview data
  function generateReport() {
    let rows = [];
    let dateArr;
    
    let clonedAppliedRows = structuredClone(appliedRows);

    if (format == "asic") { 
      
      // ----------------Generate ASIC Report----------------------------------
      dateArr = document.getElementById("endDateFilters")?.value?.split("-");
      if (dateArr.length != 3) dateArr = new Date().toISOString().slice(0, 10).split("-");
      let monthEnd = dateArr[2] + "/" + dateArr[1] + "/" + dateArr[0].slice(2);

      for (let prod of asicProducts) {
        // columns at index 3, 4, 5, 6, 7, 8, 12 are allways empty 
        // and columns at index 10 and 11 will be empty for "Global" Participants
        let globalRow = ["Global", "IR", prod.name, "", "", "", "", "", "", monthEnd, "", "", "", 0, 0.0];
        let participants = [];
        for (let row of clonedAppliedRows) {
          if (prod.prods.includes(row.producttype)){
            globalRow[13] += 1;
            globalRow[14] += parseFloat(row.notional);
            let names = getParticipantNames(row);
            let found_A = false;
            let found_B = false;
            for (let p of participants) {
              if (p[10] == names[0]) {
                p[13] += 1;
                p[14] += parseFloat(row.notional);
                found_A = true;
              } else if (p[10] == names[1]) {
                p[13] += 1;
                p[14] += parseFloat(row.notional);
                found_B = true;
              }
            } 
            if (!found_A) {
              participants.push(["Participant", "IR", prod.name, "", "", "", "", "", "", monthEnd, names[0], "", "", 1, parseFloat(row.notional)]);
            }
            if (!found_B) {
              participants.push(["Participant", "IR", prod.name, "", "", "", "", "", "", monthEnd, names[1], "", "", 1, parseFloat(row.notional)]);
            }
          }
        }
        if (participants.length > 0 || requiredAsicProds.includes(prod.name)) {
          rows.push(globalRow);
          rows.push(...participants);
        }
      }
      createCSV(rows, monthEnd);
  
    } else {

    //------------- Generate All Data|| EOD||EOM Format CSV---------------------
    
      dateArr = document.getElementById("startDateFilters")?.value?.split("-");
      if (dateArr.length != 3) dateArr = new Date().toISOString().slice(0, 10).split("-");
      let periodStart = dateArr[2] + "/" + dateArr[1] + "/" + dateArr[0].slice(2);
      
      dateArr = document.getElementById("endDateFilters")?.value?.split("-");
      if (dateArr.length != 3) dateArr = new Date().toISOString().slice(0, 10).split("-");
      let periodEnd = dateArr[2] + "/" + dateArr[1] + "/" + dateArr[0].slice(2);

      if (clonedAppliedRows.length > 0) {
        // Remove unneeded columns
        let fieldsDelete = ["trade_id", "product_id", "offer_order_id", "bid_order_id", "offer_bank_division_id", 
                            "bid_bank_division_id", "offer_trader_id", "bid_trader_id", "id", "has_break_clause", 
                            "order_id", "buyer_id", "seller_id", "trade_id"];
        for (let row of clonedAppliedRows) {
          for (let field of fieldsDelete) {
            delete row[field];
          }
        }
        
        rows.push(Array.from(Object.entries(clonedAppliedRows[0]), (r) => r[0]));
        for (let row of clonedAppliedRows) {
          rows.push(Array.from(Object.entries(row), (r) => r[1]));
        }
      } else {
        rows.push(["No Trade Data Available"])
      }
      if (["eod","eom"].includes(format)) {
        createCSV(rows, [formatDateReporting(report_start_date), formatDateReporting(report_end_date)]);
      } else {
        createCSV(rows, [periodStart, periodEnd]);
      }

    }
  }

  // Get The Participant name for asic format
  function getParticipantNames(trade) {
    console.log(structuredClone(trade));
    let names = [];
    names.push('"' + trade.cpty + ', [' + bic.findByBicCode(trade.BicCptyA).fullbranchname + ']"');
    names.push('"' + trade.cpty_2 + ', [' + bic.findByBicCode(trade.BicCptyB).fullbranchname + ']"');
    return names;
  }

  // Format data into CSV style
  async function createCSV(rows, period) {
    csvContent = "";
    previewContent = [[],[]];

    if (format == "asic") {
      csvContent += "Month-end," + period + "\n";
      previewContent[0].push(["Month-end", period]);
      csvContent += "Market Operator,PO Capital Markets Pty Ltd\n";
      previewContent[0].push(["Market Operator","PO Capital Markets Pty Ltd"]);
      csvContent += "Market Name,PO Trade Liquidity\n";
      previewContent[0].push(["Market Name","PO Trade Liquidity"]);
      csvContent += 'Method of conversion to AUD equivalent:,,"Converted to USD equivalent on each trade date, then aggregate USD values converted to AUD at month-end WM/Reuters London pm AUD/USD rate"\n';
      previewContent[0].push(["Method of conversion to AUD equivalent:","","Converted to USD equivalent on each trade date, then aggregate USD values converted to AUD at month-end WM/Reuters London pm AUD/USD rate"]);
      csvContent += asicHeadings.join(",") + "\n";
      previewContent[1].push(asicHeadings);
      
      for (const row of rows) {
        // Comma "," is defined as delimiter in excel spreadsheet, needed to be removed
        row.forEach((r, i, arr)=> {  if (typeof r == "string") { arr[i] = arr[i]?.replace(',',' ')}})
        csvContent += row.join(",") + "\n";
        row[10] = row[10].replaceAll('"', '');
        row[7] = await row[7].replaceAll(',', ' ');
        previewContent[1].push(row);
      }
    } else if ( ["eod","eom"].includes(format) ) {
        //_____________End Of Date | End Of Month report ___________________
      rows = generate_EOD_EOM_Report(bankReport, report_reports_data);
   
      csvContent += `PO Capital Markets ${format =="eod"? "EOD": (format =="eom"? "EOM" :"")} Trade Report\n`;
      previewContent[0].push([`PO Capital Markets ${format =="eod"? "EOD": (format =="eom"? "EOM" :"")} Trade Report\n`]);
      csvContent += "Period Start: " + period[0] + ",Period End: " + period[1] + ",Total Trades: " + (rows.length-1) + "\n";
      previewContent[0].push(["Period Start: " + period[0], "Period End: " + period[1], "Total Trades: " + (rows.length-1)]);
      
      for (let row of rows) {

        // Comma "," is defined as delimiter in excel spreadsheet, 
        Array.from(row).forEach((r, i, arr)=> {  if (typeof r == "string") { arr[i] = arr[i]?.replace(',',' ')}})
        csvContent += row.join(",") + "\n";
        for (let i in row) {   
          
          if (typeof row[i] != "string") continue;
          row[i] = row[i].replaceAll('"', '');
          row[i] = row[i].replaceAll(',', ' ');
        }
        previewContent[1].push(row);
      }
      } else {
      //_____________All Data report ___________________
      csvContent += "PO Capital Markets Trade Report\n";
      previewContent[0].push(["PO Capital Markets Trade Report\n"]);
      csvContent += "Period Start: " + period[0] + ",Period End: " + period[1] + ",Total Trades: " + (rows.length-1) + "\n";
      previewContent[0].push(["Period Start: " + period[0], "Period End: " + period[1], "Total Trades: " + (rows.length-1)]);
      
      for (const row of rows) {
        // Comma "," is defined as delimiter in excel spreadsheet, 
        row.forEach((r, i, arr)=> {  if (typeof r == "string") { arr[i] = arr[i]?.replace(',',' ')}})
        csvContent += row.join(",") + "\n";
        for (let i in row) {    
          if (typeof row[i] != "string") continue;
          row[i] = row[i].replaceAll('"', '');
          row[i] = row[i].replaceAll(',', ' ');
        }
        previewContent[1].push(row);
     
      }
    }
    csvContent.trim();
  }
</script>

<div class="report_modal">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <Modal
    bind:open={open}
    on:close
    size="lg"
    modalHeading="GENERATE REPORT"
    primaryButtonText={distribution == "email" ? "Send" : "Download"}
    secondaryButtonText="Cancel"
    shouldSubmitOnEnter={false}
    
    on:click:button--primary={sendReport}
    on:click:button--secondary={() => open = false}
    >
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div on:keypress|stopPropagation>
      <div style="display: flex; height:100%; gap: 10px; justify-content: stretch">
        <div style="width: 50%;  height: 500px;" class="report_details report_details_background">
          <Tile>
            <div style="margin-bottom: 15px;">
              <Tabs 
                autoWidth={true} 
                bind:selected={selectedTableIndex} 
                on:change={(e) => {dispatch('selectedTableIndex', e.detail); _reset_report();}}>
                <Tab label="RegularTrades" />
                <Tab label="Swaption" />
                <Tab label="Liquidity" />
              </Tabs>
            </div>
            <div style="overflow-y: auto;height: 365px;" >
                  <!-------- Download/Email --------------->
                <FormGroup>
                  <RadioButtonGroup bind:selected={distribution} legendText="Report Distribution">
                    <RadioButton labelText="Download" value={'save'} />
                    <RadioButton labelText="Send Email" value={'email'} />
                  </RadioButtonGroup>

                  <!-------- Schedule Setting --------------->
                  <div class="time_setting" style="background-color: #393939; margin-top: 15px; margin-bottom: 15px;">
                    <Accordion align="start">
                      <AccordionItem title="End-Of-Date Settings">
                        <div style="display:flex; flex-direction:column; padding: 8px 8px; background-color: #262626; width: 100%; ">
                          <Checkbox labelText="Activate" value="true" checked={true} />
                          <DatePicker datePickerType="single" on:change value={(new Date()).setHours(19,0,0,0)}
                          flatpickrProps={ {
                            static : true,
                            enableTime: true,
                            dateFormat: "Y-m-d H:i",
                            time_24hr: true, 
                            position: "auto"}} >
                            <DatePickerInput labelText="Date Picker" placeholder="yyyy/mm/dd HH:MM" />
                          </DatePicker>
                        </div>
                        </AccordionItem>
                        <AccordionItem title="End-Of-Month Settings">
                          <div style="display:flex; flex-direction:column; padding: 8px 8px; background-color: #262626; width: 100%; ">
                            <Checkbox labelText="Activate" value="true" checked={true} />
                            <DatePicker datePickerType="single" on:change value={(new Date()).setHours(19,0,0,0)}
                            flatpickrProps={ {
                              static : true,
                              enableTime: true,
                              dateFormat: "Y-m-d H:i",
                              time_24hr: true, 
                              position: "auto"}} >
                              <DatePickerInput labelText="Date Picker" placeholder="yyyy/mm/dd HH:MM" />
                            </DatePicker>
                          </div>
                        </AccordionItem>
                    </Accordion>
                  </div>
                  <!-------- Report all/eod/eom/asic --------------->
                  <RadioButtonGroup bind:selected={format} legendText="Reporting Format">
                    <RadioButton labelText="All Data" value={'all_data'} />
                    <RadioButton labelText="EOD" value={'eod'} />
                    <RadioButton labelText="EOM" value={'eom'} />
                    <RadioButton disabled={selectedTable != "Liquidity"} labelText="ASIC (Liquidity Only)" value={'asic'} />
                  </RadioButtonGroup>
                </FormGroup>
                
                <!------------- Filter---------------------->
                <FormGroup>
                <hr>
                <Toggle 
                labelText="Exclude Test Trades" 
                bind:toggled={excludeTest} 
                on:change={(event) => {dispatch("excludeTest", event.target.checked)}}>
                  <span slot="labelA" style="color: red">No</span>
                  <span slot="labelB" style="color: green">Yes</span>
                </Toggle>
                </FormGroup>

                {#if  format =="eod"}
                <!-- Date || Month picker -->
                  <DatePicker
                  datePickerType="single"
                  flatpickrProps={{ static: true }}
                  dateFormat="Y-m-d"
                  bind:value={eod_date}
                  on:change={(e) => console.log(e)}
                  >
                    <DatePickerInput labelText="EOD date" size="sm" placeholder="yyyy-mm-dd" />
                  </DatePicker>

                {:else if format =="eom"}
                <div style="display: flex; flex-direction:row; width: 100%; gap: 5px;">
                  <ComboBox
                  on:select={(e) => {
                    month_id=e.detail.selectedItem.text; 
                    eom_date.setMonth(monthNames.indexOf(e.detail.selectedItem.text))}}
                  titleText="Month"
                  selectedId={month_id}
                  items={monthNames.map(( m,i)=> (
                    { id: m, text: m }
                  ))}
                  />
                  <ComboBox
                  on:select={(e) => {
                    year_id=e.detail.selectedItem.text; 
                    eom_date.setFullYear(parseInt(e.detail.selectedItem.text))}}
                  titleText="Year"
                  selectedId={year_id}
                  items={timestamp.map((y, i) => ({ 
                    id: y, 
                    text: y
                    }))}
                  />
                </div>
                {/if}

                {#if ['eod','eom'].includes(format) } 
              <!-- Had EOD|EOM report -->
              <EodEomReporting 
                  bind:bank_had_report 
                  bind:format
                  bind:report_email_selected 
                  on:report_email_selected={({detail}) => { report_email_selected_ = detail.report_email_selected}}
                  on:bankReportChosen={({detail}) => {bankReport = detail.detail}} 
                  bind:recipient 
                  bind:distribution/>
                {/if}
            </div>
          </Tile>
          <div style=" width:100%;" class="btn-generate-eod">     
              <Button on:click={generateReport}>Generate Report</Button>
          </div>
          
        </div>
  

      <!-- Right Side: Start Mail Form -->
        <div style="width: 50%; height: 500px; " class="report_details_background"   on:keypress|stopPropagation>
          <Tile>
          {#if distribution == "email"}
            <FormGroup>
              <div style="display: flex;">
                <TextInput
                  bind:value={recipient.str} 
                  invalid={recipient.invalid}
                  invalidText={"Must be 1 or more valid email adressess"}  
                  labelText="To: "/>
                <div style="width: 10px"/>
                <TextInput
                  bind:value={recipientCC.str} 
                  invalid={recipientCC.invalid}
                  invalidText={"Must be valid email adressess"}  
                  labelText="CC: "/>
              </div>
            </FormGroup>
            <FormGroup>
              <TextInput 
                bind:value={subject} 
                invalid={invalidSubject}
                invalidText="Subject Cannot Be Empty" 
                labelText="Subject: "/>
            </FormGroup>
            <FormGroup>
              <div style="overflow-y: auto;"> 
              <TextArea 
                bind:value={emailContent} 
                labelText="Text Content (Optional): "/>
              </div>
            </FormGroup>
          {/if}
          </Tile>
        </div>
        <!-- Right Side: Ending of Mail Form -->
      </div>

      <div class="preview_wrapper report_details_background">
        <div class="preview">
          {#if previewContent.length > 0 && previewContent[0]?.length > 0 && previewContent[1]?.length > 0}
          <div class="preview_content" >
            <table>
              <tbody>
                {#each previewContent[0] as row}
                  <tr>
                    {#each row as cell}
                      <td class="cell">{cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
            <table style="min-width: 100%;">
              <tbody>
                {#each previewContent[1] as row}
                  <tr>
                    {#each Array.from(row) as cell}
                      <td class="cell">{cell == "Reserved for ASIC" ? "For ASIC" : cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {/if}   
        </div>  
      </div>
  </Modal>
</div>

<style>
  .preview_wrapper{
    padding: var(--cds-spacing-05, 1rem);
    margin-bottom: 10px;
    margin-top: 10px;
    height: 200px;
  }
  .preview {
    padding: 10px;
    border: 1px solid #ccc;
    height: 100%;
    overflow-y: auto;
  }
  .preview_content{
    background-color: #ffffff;
    color: black;
    width: fit-content;
  }
  .cell {
    padding-left: 2px;
    white-space: nowrap;
    border: var(--cds-text-02) 1px solid;
  }

  :global(.report_modal .bx--modal-container) {
    width: 800px;
  }

  :global(.report_modal .bx--fieldset) {
    margin-bottom: 1rem;
  }
  :global(.report_modal .report_details_background ){
    background-color: var(--cds-ui-01, #f4f4f4);
    align-self: stretch; 
  }

  :global(.report_modal .report_details .bx--fieldset) {
    margin-bottom: 10px;
    margin-top: 10px;
    padding-right: 5px;
  }
  :global(.btn-generate-eod button.bx--btn) {
  width: 100%;
  max-width: 100%;
  justify-content: center;
}
</style>