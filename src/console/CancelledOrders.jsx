import ViewOrderList from "./order-management/ViewOrderList";

function CancelledOrders({ onOpenOrder }) {
  return (
    <ViewOrderList title="Cancelled Orders" lockedStatus="Cancelled" onOpenOrder={onOpenOrder} />
  );
}

export default CancelledOrders;
