import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword) {
      alert("Please fill all fields.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/agents/me/password", {
        method: "PATCH",
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      alert("Password updated successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>Change Password</h2>
      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Current Password</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>New Password</label>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>Confirm New Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}

function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "", title: "", mrp: "", rate: "", taxPercent: "12" });
  const [saving, setSaving] = useState(false);

  const load = () => {
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

  return (
    <section className="form-card">
      <h2>Manage Products</h2>

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
          {saving ? "Adding..." : "Add Product"}
        </button>
      </form>

      {!loading && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Title</th>
              <th>MRP</th>
              <th>Rate</th>
              <th>Tax%</th>
              <th>Status</th>
              <th></th>
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
                <td>
                  <button className="link-button" onClick={() => toggleActive(p)}>
                    {p.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ManageBranches() {
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiRequest("/branches").then(setBranches).catch(() => setBranches([]));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;

    setSaving(true);
    try {
      await apiRequest("/branches", { method: "POST", body: { name } });
      setName("");
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/branches/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="form-card">
      <h2>Manage Branches</h2>

      <form className="simple-form" onSubmit={handleAdd}>
        <div className="field">
          <label>Branch Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mumbai Branch" />
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add Branch"}
        </button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td>{b.name}</td>
              <td>
                <button className="link-button" onClick={() => handleDelete(b.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Settings() {
  const { agent } = useAuth();

  return (
    <section>
      <div className="panel-title" style={{ marginBottom: "16px" }}>
        <span>Settings</span>
      </div>

      <ChangePasswordCard />

      {agent?.role === "admin" && (
        <>
          <ManageProducts />
          <ManageBranches />
        </>
      )}
    </section>
  );
}

export default Settings;
