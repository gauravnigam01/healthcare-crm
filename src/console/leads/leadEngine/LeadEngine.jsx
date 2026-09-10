import { useEffect, useState } from "react";
import { FaPlay, FaPause, FaRedo } from "react-icons/fa";
import { apiRequest } from "../../../api";
import StatusBadge from "../../StatusBadge";
import ConnectorStatus from "./ConnectorStatus";
import RunHistory from "./RunHistory";

const SCHEDULES = ["manual", "hourly", "6hourly", "daily", "weekly"];

const BLANK_FORM = {
  name: "",
  source: "website_webhook",
  targetLocation: "",
  targetKeywords: "",
  targetCategory: "",
  productInterest: "",
  leadLimitPerRun: 50,
  minScore: 0,
  schedule: "manual",
  autoAssign: false,
  autoFollowup: false,
};

function CampaignForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [connectors, setConnectors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest("/lead-campaigns/connectors").then(setConnectors).catch(() => setConnectors([]));
  }, []);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name) {
      alert("Please enter a campaign name.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/lead-campaigns", { method: "POST", body: form });
      onCreated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>New Discovery Campaign</h2>
      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Campaign Name</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Men's Wellness - Delhi" />
        </div>
        <div className="field">
          <label>Source</label>
          <select value={form.source} onChange={(e) => setField("source", e.target.value)}>
            {connectors.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name} {c.configured ? "" : "(not configured)"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Target Location</label>
          <input value={form.targetLocation} onChange={(e) => setField("targetLocation", e.target.value)} />
        </div>
        <div className="field">
          <label>Target Keywords (comma-separated)</label>
          <input value={form.targetKeywords} onChange={(e) => setField("targetKeywords", e.target.value)} />
        </div>
        <div className="field">
          <label>Category</label>
          <input value={form.targetCategory} onChange={(e) => setField("targetCategory", e.target.value)} />
        </div>
        <div className="field">
          <label>Product Interest</label>
          <input value={form.productInterest} onChange={(e) => setField("productInterest", e.target.value)} />
        </div>
        <div className="field">
          <label>Lead Limit / Run</label>
          <input type="number" value={form.leadLimitPerRun} onChange={(e) => setField("leadLimitPerRun", e.target.value)} />
        </div>
        <div className="field">
          <label>Min Score</label>
          <input type="number" value={form.minScore} onChange={(e) => setField("minScore", e.target.value)} />
        </div>
        <div className="field">
          <label>Schedule</label>
          <select value={form.schedule} onChange={(e) => setField("schedule", e.target.value)}>
            {SCHEDULES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="checkbox-label">
            <input type="checkbox" checked={form.autoAssign} onChange={(e) => setField("autoAssign", e.target.checked)} />
            Auto-assign
          </label>
        </div>
        <div className="field">
          <label className="checkbox-label">
            <input type="checkbox" checked={form.autoFollowup} onChange={(e) => setField("autoFollowup", e.target.checked)} />
            Auto follow-up
          </label>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create Campaign"}
        </button>
        <button type="button" className="secondary-btn" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </section>
  );
}

function LeadEngine() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = () => {
    setLoading(true);
    apiRequest("/lead-campaigns")
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const handlePause = async (id) => {
    try {
      await apiRequest(`/lead-campaigns/${id}/pause`, { method: "PATCH" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResume = async (id) => {
    try {
      await apiRequest(`/lead-campaigns/${id}/resume`, { method: "PATCH" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRunNow = async (id) => {
    try {
      const result = await apiRequest(`/lead-campaigns/${id}/run`, { method: "POST" });
      alert(`Run complete — found ${result.found}, qualified ${result.qualified}, rejected ${result.rejected}, duplicates ${result.duplicate}.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section>
      <div className="panel-title" style={{ marginBottom: "16px" }}>
        <span>AI Lead Engine</span>
      </div>

      <div className="tab-panel" style={{ marginBottom: "20px" }}>
        <div className="panel-title">
          <span>Connector Status</span>
        </div>
        <ConnectorStatus />
      </div>

      <div className="tab-panel" style={{ marginBottom: "20px" }}>
        <div className="panel-title">
          <span>Discovery Campaigns</span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "13px",
              }}
            >
              + New Campaign
            </button>
          )}
        </div>

        {showForm && (
          <CampaignForm
            onCreated={() => {
              setShowForm(false);
              setRefreshKey((k) => k + 1);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <p className="tab-note">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <h3>No campaigns yet</h3>
            <p>Create a campaign to start automatic lead discovery.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Status</th>
                <th>Schedule</th>
                <th>Discovered</th>
                <th>Qualified</th>
                <th>Last Run</th>
                <th>Next Run</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.source}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.schedule}</td>
                  <td>{c.leadsDiscovered}</td>
                  <td>{c.leadsQualified}</td>
                  <td>{c.lastRunAt || "-"}</td>
                  <td>{c.nextRunAt || "-"}</td>
                  <td style={{ display: "flex", gap: "10px" }}>
                    <button className="link-button" onClick={() => handleRunNow(c.id)} title="Run Now">
                      <FaPlay />
                    </button>
                    {c.status === "Active" || c.status === "Draft" ? (
                      c.status === "Active" && (
                        <button className="link-button" onClick={() => handlePause(c.id)} title="Pause">
                          <FaPause />
                        </button>
                      )
                    ) : null}
                    {c.status !== "Active" && (
                      <button className="link-button" onClick={() => handleResume(c.id)} title="Activate">
                        <FaRedo />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="tab-panel">
        <div className="panel-title">
          <span>Discovery Run History</span>
        </div>
        <RunHistory refreshKey={refreshKey} />
      </div>
    </section>
  );
}

export default LeadEngine;
