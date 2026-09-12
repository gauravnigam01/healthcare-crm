import { useEffect, useState } from "react";
import { FaCheck, FaTimes, FaUserFriends, FaHourglassHalf } from "react-icons/fa";
import { apiRequest } from "../api";
import StatusBadge from "./StatusBadge";

function Agents({ onPendingCountChange }) {
  const [agents, setAgents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([apiRequest("/agents"), apiRequest("/agent-requests")])
      .then(([agentRows, requestRows]) => {
        setAgents(agentRows);
        setRequests(requestRows);
        onPendingCountChange?.(requestRows.filter((r) => r.status === "pending").length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const reviewedRequests = requests.filter((r) => r.status !== "pending");

  const handleDecision = async (id, decision) => {
    setActingId(id);
    try {
      await apiRequest(`/agent-requests/${id}/${decision}`, { method: "POST" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return <div className="tab-note">Loading...</div>;
  }

  return (
    <section>
      <div className="panel-title" style={{ marginBottom: "16px" }}>
        <span>Agents</span>
      </div>

      <section className="form-card">
        <h2>
          <FaHourglassHalf style={{ marginRight: "6px" }} />
          Pending Access Requests
        </h2>

        {pendingRequests.length === 0 ? (
          <p className="tab-note">No pending requests right now.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Extension</th>
                <th>Requested</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.username}</td>
                  <td>{r.fullName}</td>
                  <td>{r.extension || "-"}</td>
                  <td>{r.createdAt}</td>
                  <td style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="link-button"
                      disabled={actingId === r.id}
                      onClick={() => handleDecision(r.id, "approve")}
                    >
                      <FaCheck /> Approve
                    </button>
                    <button
                      className="link-button link-button-danger"
                      disabled={actingId === r.id}
                      onClick={() => handleDecision(r.id, "reject")}
                    >
                      <FaTimes /> Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {reviewedRequests.length > 0 && (
        <section className="form-card">
          <h2>Reviewed Requests</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Status</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {reviewedRequests.map((r) => (
                <tr key={r.id}>
                  <td>{r.username}</td>
                  <td>{r.fullName}</td>
                  <td>
                    <StatusBadge status={r.status === "approved" ? "Approved" : "Rejected"} />
                  </td>
                  <td>{r.reviewedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="form-card">
        <h2>
          <FaUserFriends style={{ marginRight: "6px" }} />
          All Agents
        </h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Extension</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.username}</td>
                <td>{a.fullName}</td>
                <td>{a.extension || "-"}</td>
                <td style={{ textTransform: "capitalize" }}>{a.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}

export default Agents;
