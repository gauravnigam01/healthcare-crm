import ViewOrderList from "./order-management/ViewOrderList";

function PendingOrders({ onOpenOrder }) {
  return (
    <ViewOrderList
      title="Pending Orders (New / Processing / Shipped)"
      lockedStatus="New Order,Processing,Shipped"
      onOpenOrder={onOpenOrder}
    />
  );
}

export default PendingOrders;
