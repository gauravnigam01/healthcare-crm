const VARIANTS = {
  "New Order": "amber",
  Processing: "blue",
  Shipped: "blue",
  Delivered: "green",
  Cancelled: "red",
  Pending: "orange",
  Completed: "green",
  Paid: "green",
  Missed: "red",
  DNC: "red",
};

function StatusBadge({ status }) {
  const variant = VARIANTS[status] || "neutral";
  return <span className={`status-badge status-badge-${variant}`}>{status}</span>;
}

export default StatusBadge;
