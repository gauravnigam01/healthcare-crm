import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import StatusBadge from "./StatusBadge";

function MissedCallManagement() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/call-logs/missed")
      .then(setCalls)
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="tab-panel">
      <div className="panel-title">
        <span>Missed Call Management</span>
      </div>

      {loading && <p className="tab-note">Loading...</p>}

      {!loading && calls.length === 0 && (
        <div className="empty-state">
          <h3>No missed calls</h3>
          <p>Calls logged with a "Missed" outcome will appear here.</p>
        </div>
      )}

      {!loading && calls.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Phone</th>
              <th>Customer</th>
              <th>Agent</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td>{call.phone || "-"}</td>
                <td>{call.customerName || "-"}</td>
                <td>{call.agentName || "-"}</td>
                <td>{call.createdAt}</td>
                <td>
                  <StatusBadge status="Missed" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default MissedCallManagement;
