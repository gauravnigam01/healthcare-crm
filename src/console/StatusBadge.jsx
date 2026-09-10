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

  // Leads
  Hot: "red",
  Warm: "amber",
  Cold: "blue",
  Unqualified: "neutral",
  New: "amber",
  Contacted: "blue",
  Qualified: "green",
  Converted: "green",
  Rejected: "red",
  Duplicate: "neutral",
};

function StatusBadge({ status }) {
  const variant = VARIANTS[status] || "neutral";
  return <span className={`status-badge status-badge-${variant}`}>{status}</span>;
}

export default StatusBadge;
