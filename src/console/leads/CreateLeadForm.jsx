import { useState } from "react";
import { apiRequest } from "../../api";

function CreateLeadForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    website: "",
    city: "",
    state: "",
    pincode: "",
    category: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.phone && !form.email) {
      alert("Please provide at least a phone number or email address.");
      return;
    }

    setSaving(true);
    try {
      const lead = await apiRequest("/leads", { method: "POST", body: form });
      onCreated(lead);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>New Lead</h2>
      <form className="simple-form" onSubmit={handleSubmit}>
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))} maxLength={10} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div className="field">
          <label>Company</label>
          <input value={form.company} onChange={(e) => setField("company", e.target.value)} />
        </div>
        <div className="field">
          <label>Website</label>
          <input value={form.website} onChange={(e) => setField("website", e.target.value)} />
        </div>
        <div className="field">
          <label>City</label>
          <input value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div className="field">
          <label>State</label>
          <input value={form.state} onChange={(e) => setField("state", e.target.value)} />
        </div>
        <div className="field">
          <label>Pincode</label>
          <input value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} />
        </div>
        <div className="field">
          <label>Category</label>
          <input value={form.category} onChange={(e) => setField("category", e.target.value)} />
        </div>
        <div className="field field-wide">
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create Lead"}
        </button>
        <button type="button" onClick={onCancel} className="secondary-btn">
          Cancel
        </button>
      </form>
    </section>
  );
}

export default CreateLeadForm;
