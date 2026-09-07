import {
  FaExchangeAlt,
  FaChartBar,
  FaPhoneSlash,
  FaPhoneVolume,
  FaBullhorn,
  FaClipboardList,
  FaUserMd,
  FaTachometerAlt,
  FaHourglassHalf,
  FaTruck,
  FaCog,
  FaBoxOpen,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const ICONS = {
  dashboard: FaTachometerAlt,
  orderManagement: FaClipboardList,
  pendingOrders: FaHourglassHalf,
  deliveredOrders: FaTruck,
  products: FaBoxOpen,
  callTransfer: FaExchangeAlt,
  dispositionSummary: FaChartBar,
  missedCalls: FaPhoneSlash,
  callBack: FaPhoneVolume,
  briefing: FaBullhorn,
  settings: FaCog,
};

function Sidebar({ tabs, activeTab, onChange }) {
  const { agent, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <FaUserMd />
        <div>
          <strong>HINDVED</strong>
          <span>HEALTHCARE</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.key];
          return (
            <button
              key={tab.key}
              className={tab.key === activeTab ? "sidebar-link active" : "sidebar-link"}
              onClick={() => onChange(tab.key)}
            >
              <Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-agent">
          <div className="sidebar-avatar">{agent?.fullName?.charAt(0) || "A"}</div>
          <div>
            <strong>{agent?.fullName}</strong>
            <span>{agent?.role}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
