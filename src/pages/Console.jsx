import { useState } from "react";
import { ConfigProvider } from "../context/ConfigContext";
import { CallingPanelActionsContext } from "../hooks/useCallingPanelActions";
import AppTabBar from "../console/AppTabBar";
import ProcessBar from "../console/ProcessBar";
import CallingPanel from "../console/CallingPanel";
import StatusBar from "../console/StatusBar";
import OrderManagement from "../console/order-management/OrderManagement";
import CallTransfer from "../console/CallTransfer";
import DispositionSummary from "../console/DispositionSummary";
import MissedCallManagement from "../console/MissedCallManagement";
import CallBackManagement from "../console/CallBackManagement";
import AgentBriefing from "../console/AgentBriefing";

const TABS = [
  { key: "callTransfer", label: "Call Transfer" },
  { key: "dispositionSummary", label: "Disposition Summary (Today)" },
  { key: "missedCalls", label: "Missed Call Management" },
  { key: "callBack", label: "Call Back Management" },
  { key: "briefing", label: "Agent Briefing" },
  { key: "orderManagement", label: "Order Management" },
];

function Console() {
  const [activeTab, setActiveTab] = useState("orderManagement");
  const [callingPanelActions, setCallingPanelActions] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);

  return (
    <ConfigProvider>
      <CallingPanelActionsContext.Provider
        value={{ actions: callingPanelActions, setActions: setCallingPanelActions }}
      >
        <div className="console-shell">
          <AppTabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <ProcessBar activeCustomer={activeCustomer} />

          <div className="console-workspace">
            <main className="console-main">
              {activeTab === "callTransfer" && <CallTransfer />}
              {activeTab === "dispositionSummary" && <DispositionSummary />}
              {activeTab === "missedCalls" && <MissedCallManagement />}
              {activeTab === "callBack" && <CallBackManagement />}
              {activeTab === "briefing" && <AgentBriefing />}
              {activeTab === "orderManagement" && (
                <OrderManagement onActiveCustomerChange={setActiveCustomer} />
              )}
            </main>

            <CallingPanel activeCustomer={activeCustomer} setActiveCustomer={setActiveCustomer} />
          </div>

          <StatusBar />
        </div>
      </CallingPanelActionsContext.Provider>
    </ConfigProvider>
  );
}

export default Console;
