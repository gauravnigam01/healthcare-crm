import { useEffect, useState } from "react";
import {
  FaListAlt,
  FaFire,
  FaThermometerHalf,
  FaSnowflake,
  FaBan,
  FaBullseye,
  FaPercentage,
} from "react-icons/fa";
import { apiRequest } from "../../../api";

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

function findCount(rows, key) {
  const row = rows?.find((r) => r.key === key);
  return row ? row.count : 0;
}

function AiLeadDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/leads/dashboard-summary")
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="tab-note">Loading AI lead dashboard...</p>;
  if (!summary) return <p className="tab-note">Could not load dashboard.</p>;

  return (
    <div className="tab-panel" style={{ marginBottom: "20px" }}>
      <div className="panel-title">
        <span>AI Lead Dashboard</span>
      </div>

      <div className="stat-grid">
        <StatCard icon={FaListAlt} label="Total Leads" value={summary.totalLeads} tone="primary" />
        <StatCard icon={FaFire} label="Hot Leads" value={findCount(summary.byTemperature, "Hot")} tone="red" />
        <StatCard icon={FaThermometerHalf} label="Warm Leads" value={findCount(summary.byTemperature, "Warm")} tone="amber" />
        <StatCard icon={FaSnowflake} label="Cold Leads" value={findCount(summary.byTemperature, "Cold")} tone="blue" />
        <StatCard icon={FaBan} label="Duplicates" value={findCount(summary.byStatus, "Duplicate")} tone="neutral" />
        <StatCard icon={FaBullseye} label="Avg. Score" value={summary.avgScore} tone="green" />
        <StatCard icon={FaPercentage} label="Conversion Rate" value={`${summary.conversionRate}%`} tone="green" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "20px" }}>
        <div>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Leads by Source</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {(summary.bySource || []).map((row) => (
                <tr key={row.key}>
                  <td>{row.key}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Leads by Status</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {(summary.byStatus || []).map((row) => (
                <tr key={row.key}>
                  <td>{row.key}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AiLeadDashboard;
