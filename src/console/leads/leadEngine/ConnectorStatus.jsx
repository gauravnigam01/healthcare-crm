import { useEffect, useState } from "react";
import { apiRequest } from "../../../api";
import StatusBadge from "../../StatusBadge";

function ConnectorStatus() {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/lead-campaigns/connectors")
      .then(setConnectors)
      .catch(() => setConnectors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="tab-note">Loading connectors...</p>;

  return (
    <div className="stat-grid">
      {connectors.map((c) => (
        <div key={c.key} className={`stat-card stat-card-${c.configured ? "green" : "neutral"}`}>
          <div>
            <div className="stat-label" style={{ fontWeight: 700, marginBottom: "6px" }}>{c.name}</div>
            <StatusBadge status={c.configured ? "Configured" : "Not Configured"} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ConnectorStatus;
