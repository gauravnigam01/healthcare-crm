import { useEffect, useState } from "react";
import OrderForm from "./OrderForm";
import ViewOrderList from "./ViewOrderList";
import QuotationsTab from "./QuotationsTab";

function OrderManagement({
  onActiveCustomerChange,
  jumpToOrderId,
  onJumpHandled,
  initialSubTab,
  onInitialSubTabHandled,
}) {
  const [subTab, setSubTab] = useState("new");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [fromQuotationId, setFromQuotationId] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const openOrder = (orderId) => {
    setEditingOrderId(orderId);
    setFromQuotationId(null);
    setFormKey((k) => k + 1);
    setSubTab("new");
  };

  useEffect(() => {
    if (jumpToOrderId) {
      openOrder(jumpToOrderId);
      onJumpHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToOrderId]);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
      onInitialSubTabHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubTab]);

  const startNewOrder = () => {
    setEditingOrderId(null);
    setFromQuotationId(null);
    setFormKey((k) => k + 1);
    setSubTab("new");
  };

  const openQuotationAsOrder = (quotationId) => {
    setEditingOrderId(null);
    setFromQuotationId(quotationId);
    setFormKey((k) => k + 1);
    setSubTab("new");
  };

  return (
    <section className="order-panel">
      <div className="order-tabs">
        <button className={subTab === "new" ? "active" : ""} onClick={startNewOrder}>
          {editingOrderId ? "Order Update" : "New Order"}
        </button>
        <button className={subTab === "view" ? "active" : ""} onClick={() => setSubTab("view")}>
          View Order
        </button>
        <button className={subTab === "quotations" ? "active" : ""} onClick={() => setSubTab("quotations")}>
          Quotations
        </button>
      </div>

      {subTab === "new" && (
        <OrderForm
          key={`${editingOrderId || "new"}-${fromQuotationId || "x"}-${formKey}`}
          orderId={editingOrderId}
          quotationId={fromQuotationId}
          onSaved={() => setSubTab("view")}
          onSavedAndNext={startNewOrder}
          onActiveCustomerChange={onActiveCustomerChange}
        />
      )}

      {subTab === "view" && <ViewOrderList onOpenOrder={openOrder} />}

      {subTab === "quotations" && (
        <QuotationsTab onCreateOrder={startNewOrder} onConvert={openQuotationAsOrder} />
      )}
    </section>
  );
}

export default OrderManagement;
