import { useEffect, useRef, useState } from "react";
import { FaDownload, FaUpload, FaTrash, FaPlus } from "react-icons/fa";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  };

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row = {};
    header.forEach((key, i) => {
      row[key] = cells[i] ?? "";
    });
    return row;
  });
}

function toCsv(products) {
  const header = ["category", "title", "mrp", "rate", "taxPercent", "active"];
  const rows = products.map((p) =>
    [p.category, p.title, p.mrp, p.rate, p.taxPercent, p.active ? "1" : "0"]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

function downloadFile(filename, content, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Products() {
  const { agent } = useAuth();
  const isAdmin = agent?.role === "admin";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "", title: "", mrp: "", rate: "", taxPercent: "12" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    setLoading(true);
    apiRequest("/products?includeInactive=1")
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!form.category || !form.title || !form.mrp || !form.rate) {
      alert("Please fill category, title, MRP and rate.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/products", { method: "POST", body: form });
      setForm({ category: "", title: "", mrp: "", rate: "", taxPercent: "12" });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product) => {
    try {
      await apiRequest(`/products/${product.id}`, {
        method: "PUT",
        body: { active: !product.active },
      });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;

    try {
      await apiRequest(`/products/${product.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExport = () => {
    downloadFile(`products-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(products));
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
      const result = await apiRequest("/products/import", { method: "POST", body: { products: rows } });
      let message = `Imported ${result.created} product(s).`;
      if (result.errors?.length) {
        message += `\n\nSkipped:\n${result.errors.join("\n")}`;
      }
      alert(message);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <section>
      <div className="panel-title" style={{ marginBottom: "16px" }}>
        <span>Products</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="secondary-btn" onClick={handleExport}>
            <FaDownload /> Export CSV
          </button>
          {isAdmin && (
            <>
              <button className="secondary-btn" onClick={handleImportClick} disabled={importing}>
                <FaUpload /> {importing ? "Importing..." : "Import CSV"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <section className="form-card">
          <h2>Add Product</h2>
          <form className="simple-form" onSubmit={handleAdd}>
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="field">
              <label>MRP</label>
              <input type="number" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} />
            </div>
            <div className="field">
              <label>Rate</label>
              <input type="number" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
            <div className="field">
              <label>Tax %</label>
              <input
                type="number"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={saving}>
              <FaPlus /> {saving ? "Adding..." : "Add Product"}
            </button>
          </form>
        </section>
      )}

      <div className="tab-panel">
        {loading ? (
          <p className="tab-note">Loading...</p>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3>No products yet</h3>
            <p>Add products above, or import a CSV file.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Title</th>
                <th>MRP</th>
                <th>Rate</th>
                <th>Tax%</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.category}</td>
                  <td>{p.title}</td>
                  <td>&#8377;{p.mrp}</td>
                  <td>&#8377;{p.rate}</td>
                  <td>{p.taxPercent}%</td>
                  <td>{p.active ? "Active" : "Inactive"}</td>
                  {isAdmin && (
                    <td style={{ display: "flex", gap: "12px" }}>
                      <button className="link-button" onClick={() => toggleActive(p)}>
                        {p.active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="link-button link-button-danger" onClick={() => handleDelete(p)}>
                        <FaTrash /> Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default Products;
