import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { apiRequest } from "../../api";
import StatusBadge from "../StatusBadge";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Converted", "Rejected", "Duplicate"];

function LeadDetail({ leadId, onBack }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);

  const load = () => {
    setLoading(true);
    apiRequest(`/leads/${leadId}`)
      .then(setLead)
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiRequest("/agents").then(setAgents).catch(() => setAgents([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  const handleStatusChange = async (status) => {
    try {
      const updated = await apiRequest(`/leads/${leadId}/status`, { method: "PATCH", body: { status } });
      setLead((l) => ({ ...l, status: updated.status }));
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssign = async (agentId) => {
    if (!agentId) return;
    try {
      await apiRequest(`/leads/${leadId}/assign`, { method: "PATCH", body: { agentId: Number(agentId) } });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading || !lead) {
    return <div className="tab-note">Loading lead...</div>;
  }

  return (
    <section className="order-panel">
      <button
        onClick={onBack}
        style={{
          border: "none",
          background: "none",
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: 0,
          marginBottom: "16px",
          fontSize: "13px",
        }}
      >
        <FaArrowLeft /> Back to Leads
      </button>

      <div className="panel-title">
        <span>{lead.leadNumber} — {lead.name || "Unnamed Lead"}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <StatusBadge status={lead.temperature} />
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="form-card">
        <h2>Contact Details</h2>
        <div className="form-grid">
          <div className="field">
            <label>Phone</label>
            <input value={lead.phone || ""} readOnly />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={lead.email || ""} readOnly />
          </div>
          <div className="field">
            <label>Company</label>
            <input value={lead.company || ""} readOnly />
          </div>
          <div className="field">
            <label>Website</label>
            <input value={lead.website || ""} readOnly />
          </div>
          <div className="field">
            <label>City</label>
            <input value={lead.city || ""} readOnly />
          </div>
          <div className="field">
            <label>State</label>
            <input value={lead.state || ""} readOnly />
          </div>
          <div className="field">
            <label>Category</label>
            <input value={lead.category || ""} readOnly />
          </div>
          <div className="field">
            <label>Source</label>
            <input value={lead.source} readOnly />
          </div>
        </div>
        {lead.notes && (
          <div className="field field-wide">
            <label>Notes</label>
            <textarea value={lead.notes} readOnly />
          </div>
        )}
      </div>

      <div className="form-card">
        <h2>AI Score</h2>
        <p>
          <strong>{lead.score}/100</strong> — {lead.temperature}
        </p>
        <p className="tab-note">{lead.scoreExplanation}</p>
      </div>

      <div className="form-card">
        <h2>Actions</h2>
        <div className="form-grid">
          <div className="field">
            <label>Change Status</label>
            <select value={lead.status} onChange={(e) => handleStatusChange(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Assign To</label>
            <select value={lead.assignedTo || ""} onChange={(e) => handleAssign(e.target.value)}>
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="tab-panel">
        <div className="panel-title">
          <span>Activity Timeline</span>
        </div>

        {lead.activities.length === 0 ? (
          <p className="tab-note">No activity yet.</p>
        ) : (
          <div className="briefing-list">
            {lead.activities.map((act) => (
              <div key={act.id} className="briefing-card">
                <p>{act.message}</p>
                <span>
                  {act.type} &middot; {act.createdByName || "System"} &middot; {act.createdAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default LeadDetail;
