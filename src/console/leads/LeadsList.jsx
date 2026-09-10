import { useEffect, useRef, useState } from "react";
import { FaSearch, FaUpload, FaPlus } from "react-icons/fa";
import { apiRequest } from "../../api";
import { parseCsv } from "../../utils/csv";
import StatusBadge from "../StatusBadge";

const STATUS_OPTIONS = ["All", "New", "Contacted", "Qualified", "Converted", "Rejected", "Duplicate"];
const TEMPERATURE_OPTIONS = ["All", "Hot", "Warm", "Cold", "Unqualified"];

function LeadsList({ onOpenLead, onNewLead }) {
  const [filters, setFilters] = useState({ status: "All", temperature: "All", q: "" });
  const [result, setResult] = useState({ leads: [], totalPages: 1, totalRecords: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      status: filters.status,
      temperature: filters.temperature,
    });
    if (filters.q) params.set("q", filters.q);

    apiRequest(`/leads?${params.toString()}`)
      .then(setResult)
      .catch(() => setResult({ leads: [], totalPages: 1, totalRecords: 0, page: 1 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      alert("No rows found in the CSV file.");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const result = await apiRequest("/leads/import", { method: "POST", body: { rows } });
      alert(
        `Import complete — found ${result.found}, qualified ${result.qualified}, rejected ${result.rejected}, duplicates ${result.duplicate}.`
      );
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <section className="order-panel">
      <div className="panel-title">
        <span>Leads</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-btn" onClick={handleImportClick} disabled={importing}>
            <FaUpload /> {importing ? "Importing..." : "Import CSV"}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportFile} />
          <button
            onClick={onNewLead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "13px",
            }}
          >
            <FaPlus /> New Lead
          </button>
        </div>
      </div>

      <div className="order-filters">
        <div>
          <label>Search</label>
          <input
            placeholder="Name, phone, email, company"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        <div>
          <label>Status</label>
          <div className="status-buttons">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                className={filters.status === status ? "selected" : ""}
                onClick={() => setFilters((f) => ({ ...f, status }))}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Temperature</label>
          <select
            value={filters.temperature}
            onChange={(e) => setFilters((f) => ({ ...f, temperature: e.target.value }))}
          >
            {TEMPERATURE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <button className="search-orders" onClick={handleSearch}>
          <FaSearch /> Search
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead #</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Company</th>
              <th>Source</th>
              <th>Score</th>
              <th>Temperature</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10}>Loading...</td>
              </tr>
            )}

            {!loading && result.leads.length === 0 && (
              <tr>
                <td colSpan={10}>No leads found.</td>
              </tr>
            )}

            {!loading &&
              result.leads.map((lead) => (
                <tr key={lead.id} style={{ cursor: "pointer" }} onClick={() => onOpenLead(lead.id)}>
                  <td>
                    <button className="order-id">{lead.leadNumber}</button>
                  </td>
                  <td>{lead.name || "-"}</td>
                  <td>{lead.phone || lead.email || "-"}</td>
                  <td>{lead.company || "-"}</td>
                  <td>{lead.source}</td>
                  <td>{lead.score}</td>
                  <td>
                    <StatusBadge status={lead.temperature} />
                  </td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>{lead.assignedToName || "Unassigned"}</td>
                  <td>{lead.createdAt}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span>
          Page {result.page} of {result.totalPages} &nbsp;&nbsp; Total Records: {result.totalRecords}
        </span>
        <button disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </section>
  );
}

export default LeadsList;
