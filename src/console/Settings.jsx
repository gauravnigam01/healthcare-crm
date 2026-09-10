import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import { useAuth } from "../context/AuthContext";

function MyEmailCard() {
  const { agent, setAgent } = useAuth();
  const [email, setEmail] = useState(agent?.email || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      alert("Please enter an email address.");
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest("/auth/me/email", { method: "PATCH", body: { email } });
      setAgent(data.agent);
      alert("Email updated. Password reset links will be sent here.");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>My Email</h2>
      <p className="tab-note" style={{ marginBottom: "12px" }}>
        Used for "Forgot Password" reset links.
      </p>
      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Email"}
        </button>
      </form>
    </section>
  );
}

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

      <MyEmailCard />
      <ChangePasswordCard />

      {agent?.role === "admin" && <ManageBranches />}
    </section>
  );
}

export default Settings;
