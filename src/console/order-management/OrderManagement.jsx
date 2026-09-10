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
  fromLeadId,
  onLeadIdHandled,
  onLeadConverted,
}) {
  const [subTab, setSubTab] = useState("new");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [fromQuotationId, setFromQuotationId] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [formKey, setFormKey] = useState(0);

  const openOrder = (orderId) => {
    setEditingOrderId(orderId);
    setFromQuotationId(null);
    setLeadId(null);
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

  useEffect(() => {
    if (fromLeadId) {
      setEditingOrderId(null);
      setFromQuotationId(null);
      setLeadId(fromLeadId);
      setFormKey((k) => k + 1);
      setSubTab("new");
      onLeadIdHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLeadId]);

  const startNewOrder = () => {
    setEditingOrderId(null);
    setFromQuotationId(null);
    setLeadId(null);
    setFormKey((k) => k + 1);
    setSubTab("new");
  };

  const openQuotationAsOrder = (quotationId) => {
    setEditingOrderId(null);
    setFromQuotationId(quotationId);
    setLeadId(null);
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
          key={`${editingOrderId || "new"}-${fromQuotationId || "x"}-${leadId || "y"}-${formKey}`}
          orderId={editingOrderId}
          quotationId={fromQuotationId}
          leadId={leadId}
          onSaved={() => setSubTab("view")}
          onSavedAndNext={startNewOrder}
          onActiveCustomerChange={onActiveCustomerChange}
          onLeadConverted={onLeadConverted}
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
