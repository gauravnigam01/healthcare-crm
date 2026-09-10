import { useState } from "react";
import { ConfigProvider } from "../context/ConfigContext";
import { CallingPanelActionsContext } from "../hooks/useCallingPanelActions";
import Sidebar from "../console/Sidebar";
import ProcessBar from "../console/ProcessBar";
import CallingPanel from "../console/CallingPanel";
import StatusBar from "../console/StatusBar";
import OrderManagement from "../console/order-management/OrderManagement";
import Dashboard from "../console/Dashboard";
import PendingOrders from "../console/PendingOrders";
import DeliveredOrders from "../console/DeliveredOrders";
import CancelledOrders from "../console/CancelledOrders";
import CallTransfer from "../console/CallTransfer";
import DispositionSummary from "../console/DispositionSummary";
import MissedCallManagement from "../console/MissedCallManagement";
import CallBackManagement from "../console/CallBackManagement";
import AgentBriefing from "../console/AgentBriefing";
import Settings from "../console/Settings";
import Products from "../console/Products";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "orderManagement", label: "Order Management" },
  { key: "pendingOrders", label: "Pending Orders" },
  { key: "deliveredOrders", label: "Delivered Orders" },
  { key: "cancelledOrders", label: "Cancelled Orders" },
  { key: "products", label: "Products" },
  { key: "callTransfer", label: "Call Transfer" },
  { key: "dispositionSummary", label: "Disposition Summary (Today)" },
  { key: "missedCalls", label: "Missed Call Management" },
  { key: "callBack", label: "Call Back Management" },
  { key: "briefing", label: "Agent Briefing" },
  { key: "settings", label: "Settings" },
];

const CALLING_PANEL_TABS = new Set(["orderManagement"]);

function Console() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [callingPanelActions, setCallingPanelActions] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [jumpToOrderId, setJumpToOrderId] = useState(null);
  const [orderManagementSubTab, setOrderManagementSubTab] = useState(null);

  const openOrderInOrderManagement = (orderId) => {
    setJumpToOrderId(orderId);
    setActiveTab("orderManagement");
  };

  const handleDashboardNavigate = (target) => {
    if (target === "allOrders") {
      setOrderManagementSubTab("view");
      setActiveTab("orderManagement");
      return;
    }
    setActiveTab(target);
  };

  return (
    <ConfigProvider>
      <CallingPanelActionsContext.Provider
        value={{ actions: callingPanelActions, setActions: setCallingPanelActions }}
      >
        <div className="console-shell">
          <Sidebar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

          <div className="console-content">
            <ProcessBar activeCustomer={activeCustomer} />

            <div className={CALLING_PANEL_TABS.has(activeTab) ? "console-workspace" : "console-workspace console-workspace-full"}>
              <main className="console-main">
                {activeTab === "dashboard" && (
                  <Dashboard onOpenOrder={openOrderInOrderManagement} onNavigate={handleDashboardNavigate} />
                )}
                {activeTab === "callTransfer" && <CallTransfer />}
                {activeTab === "dispositionSummary" && <DispositionSummary />}
                {activeTab === "missedCalls" && <MissedCallManagement />}
                {activeTab === "callBack" && <CallBackManagement />}
                {activeTab === "briefing" && <AgentBriefing />}
                {activeTab === "settings" && <Settings />}
                {activeTab === "products" && <Products />}
                {activeTab === "pendingOrders" && (
                  <PendingOrders onOpenOrder={openOrderInOrderManagement} />
                )}
                {activeTab === "deliveredOrders" && (
                  <DeliveredOrders onOpenOrder={openOrderInOrderManagement} />
                )}
                {activeTab === "cancelledOrders" && (
                  <CancelledOrders onOpenOrder={openOrderInOrderManagement} />
                )}
                {activeTab === "orderManagement" && (
                  <OrderManagement
                    onActiveCustomerChange={setActiveCustomer}
                    jumpToOrderId={jumpToOrderId}
                    onJumpHandled={() => setJumpToOrderId(null)}
                    initialSubTab={orderManagementSubTab}
                    onInitialSubTabHandled={() => setOrderManagementSubTab(null)}
                  />
                )}
              </main>

              {CALLING_PANEL_TABS.has(activeTab) && (
                <CallingPanel activeCustomer={activeCustomer} setActiveCustomer={setActiveCustomer} />
              )}
            </div>

            <StatusBar />
          </div>
        </div>
      </CallingPanelActionsContext.Provider>
    </ConfigProvider>
  );
}

export default Console;
