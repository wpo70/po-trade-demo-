<script>
  import {
    Button,
    DataTable,
    Modal,
    Toolbar,
    ToolbarBatchActions,
  } from "carbon-components-svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
  import {
    bidToString,
    timestampToDateTime,
    toVolumeString,
  } from "../../common/formatting";
  import websocket from "../../common/websocket";
  import brokers from "../../stores/brokers";
  import traders from "../../stores/traders";

  export let open;
  export let orders = [];
  export let title = '';

  let delete_dialog = false;
  let selectedRowIds = [];

  export const refresh = (orders) => {
    orders = orders;
  };

  function handleDelete() {
    // Close the delete orders Modal
    delete_dialog = false;

    // Delete all of the selected orders.
    websocket.deleteSwaptionOrders(selectedRowIds);

    // Reset selectedRowIds
    selectedRowIds = [];
  }

</script>

<div class="swaption-all-orders">
  <Modal
    bind:open
    passiveModal
    modalHeading={title}
  >
    <DataTable
      selectable
      sortable
      zebra
      bind:selectedRowIds
      headers={[
        { key: "time", value: "Time Placed" },
        { key: "bid", value: "Direction" },
        { key: "option_type", value: "Option Type" },
        { key: "option_expiry", value: "Option Expiry" },
        { key: "swap_term", value: "Swap Term" },
        { key: "premium", value: "Premium" },
        { key: "volume", value: "Volume" },
        { key: "trader", value: "Trader" },
        { key: "bank", value: "Bank" },
        { key: "broker", value: "Broker" },
      ]}
      rows={orders.map((order) => ({
        id: order.order_id,
        time: timestampToDateTime(order.time_placed),
        bid: bidToString(order.bid),
        option_type: order.option_type,
        swap_term: order.swap_term,
        option_expiry: order.option_expiry,
        premium: order.premium,
        volume: toVolumeString(order.volume),
        trader: traders.name(order.trader_id),
        bank: traders.bankName(order.trader_id),
        broker: brokers.name(order.broker_id),
      }))}
    >
      <Toolbar>
        <ToolbarBatchActions>
          <Button
            icon={TrashCan}
            kind="danger"
            disabled={selectedRowIds.length === 0}
            on:click={() => {
              delete_dialog = true;
            }}
          >
            Remove {selectedRowIds.length}
            {selectedRowIds.length === 1 ? "order" : "orders"}
          </Button>
        </ToolbarBatchActions>
      </Toolbar>
    </DataTable>
  </Modal>
</div>

<Modal
  bind:open={delete_dialog}
  modalHeading="Delete orders"
  modalAriaLabel="delete-content"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
  on:submit={handleDelete}
  on:click:button--secondary={() => {
    delete_dialog = false;
  }}
  danger
  size="xs"
>
  <p>
    Do you want to delete {selectedRowIds.length}
    {selectedRowIds.length === 1 ? "order" : "orders"}?
  </p>
</Modal>

<style>
  :global(.swaption-all-orders .bx--modal-container) {
    width: fit-content;
  }
</style>
