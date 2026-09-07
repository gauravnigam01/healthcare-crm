import ViewOrderList from "./order-management/ViewOrderList";

function DeliveredOrders({ onOpenOrder }) {
  return (
    <ViewOrderList title="Delivered Orders" lockedStatus="Delivered" onOpenOrder={onOpenOrder} />
  );
}

export default DeliveredOrders;
