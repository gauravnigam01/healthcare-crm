import { useEffect, useState } from "react";
import {
  FaShoppingCart,
  FaClock,
  FaTruck,
  FaBan,
  FaRupeeSign,
  FaUsers,
  FaPhoneVolume,
} from "react-icons/fa";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "./StatusBadge";

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-icon">
        <Icon />
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function Dashboard({ onOpenOrder }) {
  const { agent } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/dashboard/summary")
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="tab-note">Loading dashboard...</div>;
  }

  if (!summary) {
    return <div className="tab-note">Could not load dashboard.</div>;
  }

  return (
    <section>
      <div className="dashboard-welcome">
        <h1>Welcome back, {agent?.fullName}</h1>
        <p>Here's what's happening with HINDVED HEALTHCARE orders today.</p>
      </div>

      <div className="stat-grid">
        <StatCard icon={FaShoppingCart} label="Today's Orders" value={summary.todayOrders} tone="amber" />
        <StatCard icon={FaClock} label="Pending Orders" value={summary.pendingOrders} tone="blue" />
        <StatCard icon={FaTruck} label="Delivered" value={summary.deliveredOrders} tone="green" />
        <StatCard icon={FaBan} label="Cancelled" value={summary.cancelledOrders} tone="red" />
        <StatCard
          icon={FaRupeeSign}
          label="Today's Revenue"
          value={`₹${Number(summary.todayRevenue).toLocaleString("en-IN")}`}
          tone="primary"
        />
        <StatCard icon={FaUsers} label="Total Customers" value={summary.totalCustomers} tone="neutral" />
        <StatCard
          icon={FaPhoneVolume}
          label="Pending Callbacks"
          value={summary.pendingCallbacks}
          tone="orange"
        />
      </div>

      <div className="tab-panel" style={{ marginTop: "20px" }}>
        <div className="panel-title">
          <span>Recent Orders</span>
        </div>

        {summary.recentOrders.length === 0 ? (
          <div className="empty-state">
            <h3>No orders yet</h3>
            <p>Orders you book will show up here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Booked At</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <button className="order-id" onClick={() => onOpenOrder(order.id)}>
                      {order.orderNumber}
                    </button>
                  </td>
                  <td>{order.customerName}</td>
                  <td>&#8377;{Number(order.grandTotal).toLocaleString("en-IN")}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{order.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
