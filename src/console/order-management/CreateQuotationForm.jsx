import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import OrderLineItems from "./OrderLineItems";

function CreateQuotationForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    mobile: "",
    name: "",
    pincode: "",
    city: "",
    state: "",
    address: "",
    notes: "",
  });
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest("/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSave = async () => {
    if (!form.mobile || form.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items: items.map((item) => ({
          productId: item.productId,
          category: item.category,
          title: item.title,
          qty: item.qty,
          mrp: item.mrp,
          rate: item.rate,
          taxPercent: item.taxPercent,
        })),
      };
      const quotation = await apiRequest("/quotations", { method: "POST", body: payload });
      alert(`Quotation saved: ${quotation.quotationNumber}`);
      onCreated();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>New Quotation</h2>

      <div className="form-grid">
        <div className="field">
          <label>
            Mobile <b>*</b>
          </label>
          <input
            value={form.mobile}
            maxLength={10}
            onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Pincode</label>
          <input value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} />
        </div>
        <div className="field">
          <label>City</label>
          <input value={form.city} onChange={(e) => setField("city", e.target.value)} />
        </div>
        <div className="field">
          <label>State</label>
          <input value={form.state} onChange={(e) => setField("state", e.target.value)} />
        </div>
        <div className="field field-wide">
          <label>Address</label>
          <textarea value={form.address} onChange={(e) => setField("address", e.target.value)} />
        </div>
      </div>

      <OrderLineItems items={items} onChange={setItems} products={products} />

      <div className="field field-wide" style={{ marginTop: "16px" }}>
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button type="button" className="update-courier-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Quotation"}
        </button>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 18px" }}>
          Cancel
        </button>
      </div>
    </section>
  );
}

export default CreateQuotationForm;
