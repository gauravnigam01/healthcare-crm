import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import StatusBadge from "./StatusBadge";

function CallBackManagement() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const load = (done) => {
    setLoading(true);
    apiRequest(`/call-logs/callbacks?status=${done ? "done" : "pending"}`)
      .then(setCalls)
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(showDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDone]);

  const markDone = async (id) => {
    try {
      await apiRequest(`/call-logs/${id}/callback-done`, { method: "PATCH" });
      load(showDone);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="tab-panel">
      <div className="panel-title">
        <span>Call Back Management</span>

        <div className="status-toggle">
          <button className={!showDone ? "active" : ""} onClick={() => setShowDone(false)}>
            Pending
          </button>
          <button className={showDone ? "active" : ""} onClick={() => setShowDone(true)}>
            Done
          </button>
        </div>
      </div>

      {loading && <p className="tab-note">Loading...</p>}

      {!loading && calls.length === 0 && (
        <div className="empty-state">
          <h3>No {showDone ? "completed" : "pending"} callbacks</h3>
          <p>Calls logged with disposition "Call Back" appear here.</p>
        </div>
      )}

      {!loading && calls.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Phone</th>
              <th>Customer</th>
              <th>Agent</th>
              <th>Callback Note</th>
              <th>Logged At</th>
              <th>Status</th>
              {!showDone && <th></th>}
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id}>
                <td>{call.phone || "-"}</td>
                <td>{call.customerName || "-"}</td>
                <td>{call.agentName || "-"}</td>
                <td>{call.callbackAt || call.note || "-"}</td>
                <td>{call.createdAt}</td>
                <td>
                  <StatusBadge status={call.callbackDone ? "Completed" : "Pending"} />
                </td>
                {!showDone && (
                  <td>
                    <button className="link-button" onClick={() => markDone(call.id)}>
                      Mark Done
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default CallBackManagement;
