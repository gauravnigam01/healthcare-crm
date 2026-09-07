import { useEffect, useState } from "react";
import { apiRequest } from "../api";

function DispositionSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/call-logs/disposition-summary")
      .then(setSummary)
      .catch(() => setSummary({ dispositions: [], total: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="tab-panel">
      <div className="panel-title">
        <span>Disposition Summary (Today)</span>
      </div>

      {loading && <p className="tab-note">Loading...</p>}

      {!loading && (
        <>
          <p className="tab-note">
            Total calls logged today: <strong>{summary.total}</strong>
          </p>

          {summary.dispositions.length === 0 ? (
            <div className="empty-state">
              <h3>No calls logged today</h3>
              <p>Call dispositions logged from the Calling Panel will appear here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Disposition</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {summary.dispositions.map((row) => (
                  <tr key={row.disposition}>
                    <td>{row.disposition}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

export default DispositionSummary;
