import { useEffect, useState } from "react";
import { apiRequest } from "../../../api";
import StatusBadge from "../../StatusBadge";

function RunHistory({ refreshKey }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/lead-campaigns/runs")
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <p className="tab-note">Loading run history...</p>;

  if (runs.length === 0) {
    return (
      <div className="empty-state">
        <h3>No discovery runs yet</h3>
        <p>Run a campaign or import leads to see history here.</p>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Campaign</th>
          <th>Source</th>
          <th>Triggered By</th>
          <th>Started</th>
          <th>Status</th>
          <th>Found</th>
          <th>Qualified</th>
          <th>Rejected</th>
          <th>Duplicate</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id}>
            <td>{r.campaignName || "-"}</td>
            <td>{r.source}</td>
            <td>{r.triggeredBy}</td>
            <td>{r.startedAt}</td>
            <td>
              <StatusBadge status={r.status} />
            </td>
            <td>{r.leadsFound}</td>
            <td>{r.leadsQualified}</td>
            <td>{r.leadsRejected}</td>
            <td>{r.leadsDuplicate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default RunHistory;
