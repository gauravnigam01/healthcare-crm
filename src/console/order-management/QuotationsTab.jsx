import { useEffect, useMemo, useState } from "react";
import { FaFileAlt, FaPlus, FaTrash } from "react-icons/fa";
import { apiRequest } from "../../api";
import { useAuth } from "../../context/AuthContext";
import CreateQuotationForm from "./CreateQuotationForm";

function QuotationsTab({ onCreateOrder, onConvert }) {
  const { agent } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    apiRequest("/quotations")
      .then(setQuotations)
      .catch(() => setQuotations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filteredQuotations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotations;
    return quotations.filter(
      (q) =>
        q.quotationNumber?.toLowerCase().includes(term) ||
        q.mobile?.toLowerCase().includes(term) ||
        q.name?.toLowerCase().includes(term)
    );
  }, [quotations, search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;
    try {
      await apiRequest(`/quotations/${id}`, { method: "DELETE" });
      setQuotations((qs) => qs.filter((q) => q.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (showForm) {
    return (
      <section className="order-panel quotation-panel">
        <CreateQuotationForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      </section>
    );
  }

  if (loading) {
    return <div className="tab-note">Loading...</div>;
  }

  if (quotations.length === 0) {
    return (
      <section className="order-panel quotation-panel">
        <div className="panel-title">
          <span>Quotations</span>
        </div>

        <div className="empty-state">
          <FaFileAlt />
          <h2>No Quotations Found</h2>
          <p>Quotations created for customers will appear here.</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => setShowForm(true)}>
              <FaPlus /> New Quotation
            </button>
            <button onClick={onCreateOrder}>
              <FaPlus /> Create New Order
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="order-panel quotation-panel">
      <div className="panel-title">
        <span>Quotations</span>
        <button
          onClick={() => setShowForm(true)}
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
          <FaPlus /> New Quotation
        </button>
      </div>

      <div className="order-filters" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: "12px" }}>
        <div>
          <label>Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quotation #, mobile or name"
            style={{ minWidth: "260px" }}
          />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Quotation ID</th>
            <th>Mobile</th>
            <th>Name</th>
            <th>Grand Total</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredQuotations.map((q) => (
            <tr key={q.id}>
              <td>{q.quotationNumber}</td>
              <td>{q.mobile}</td>
              <td>{q.name}</td>
              <td>&#8377;{Number(q.grandTotal).toLocaleString("en-IN")}</td>
              <td>{q.createdAt}</td>
              <td style={{ display: "flex", gap: "10px" }}>
                <button className="link-button" onClick={() => onConvert(q.id)}>
                  Convert to Order
                </button>
                {agent?.role === "admin" && (
                  <button className="delete-btn" title="Delete quotation" onClick={() => handleDelete(q.id)}>
                    <FaTrash />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filteredQuotations.length === 0 && (
            <tr>
              <td colSpan={6} className="tab-note">
                No quotations match "{search}".
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default QuotationsTab;
