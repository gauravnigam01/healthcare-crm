import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import { useConfig } from "../../context/ConfigContext";
import { fetchPincodeLocation } from "../../utils/pincode";
import OrderLineItems, { round2 } from "./OrderLineItems";

const BLANK_FORM = {
  mobile: "",
  name: "",
  pincode: "",
  city: "",
  state: "",
  address: "",
  customerType: "Ecommerce",
  branch: "",
  leadType: "Outbound",
  paymentMethod: "COD",
  package: "",
  additionalDiscountAmount: 0,
  notes: "",
};

function CreateQuotationForm({ onCreated, onCancel }) {
  const { config } = useConfig();
  const [form, setForm] = useState(BLANK_FORM);
  const [items, setItems] = useState([]);
  const [pendingItem, setPendingItem] = useState(null);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest("/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const pincode = form.pincode;
    if (!/^\d{6}$/.test(pincode)) return;

    let cancelled = false;
    fetchPincodeLocation(pincode)
      .then((location) => {
        if (cancelled || !location) return;
        setForm((f) =>
          f.pincode === pincode ? { ...f, city: location.city || f.city, state: location.state || f.state } : f
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [form.pincode]);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const allItems = pendingItem ? [...items, pendingItem] : items;
  const subtotal = round2(allItems.reduce((sum, item) => sum + item.total, 0));
  const discount = round2(Number(form.additionalDiscountAmount) || 0);
  const grandTotal = round2(subtotal - discount);

  const handleSave = async () => {
    if (!form.mobile || form.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (allItems.length === 0) {
      alert("Please add at least one product.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        additionalDiscountAmount: Number(form.additionalDiscountAmount) || 0,
        items: allItems.map((item) => ({
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
        <div className="field field-mobile">
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
          <label>Customer Type</label>
          <select value={form.customerType} onChange={(e) => setField("customerType", e.target.value)}>
            {config.customerTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Branch</label>
          <select value={form.branch} onChange={(e) => setField("branch", e.target.value)}>
            <option value="">Select</option>
            {config.branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
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
        <div className="field">
          <label>Lead Type</label>
          <select value={form.leadType} onChange={(e) => setField("leadType", e.target.value)}>
            {config.leadTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Payment</label>
          <select value={form.paymentMethod} onChange={(e) => setField("paymentMethod", e.target.value)}>
            {config.paymentMethods.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Package</label>
          <select value={form.package} onChange={(e) => setField("package", e.target.value)}>
            <option value="">Nothing selected</option>
            {config.packages.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OrderLineItems items={items} onChange={setItems} products={products} onPendingChange={setPendingItem} />

      <div className="totals-panel">
        <div>
          <span>Total Amount (with Taxes)</span>
          <strong>&#8377;{subtotal.toLocaleString("en-IN")}</strong>
        </div>
        <div>
          <span>Additional/Coupon Discount</span>
          <input
            type="number"
            value={form.additionalDiscountAmount}
            onChange={(e) => setField("additionalDiscountAmount", e.target.value)}
          />
        </div>
        <div className="grand-total">
          <span>Grand Total</span>
          <strong>&#8377;{grandTotal.toLocaleString("en-IN")}</strong>
        </div>
      </div>

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
