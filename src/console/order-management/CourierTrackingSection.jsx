import { useState } from "react";
import { apiRequest } from "../../api";
import { useConfig } from "../../context/ConfigContext";

function CourierTrackingSection({ orderId, courier, onUpdated }) {
  const { config } = useConfig();

  const [form, setForm] = useState({
    courierName: courier.courierName || "",
    docketNumber: courier.docketNumber || "",
    expectedDelivery: courier.expectedDelivery || "",
    deliveryDate: courier.deliveryDate || "",
  });
  const [saving, setSaving] = useState(false);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updated = await apiRequest(`/orders/${orderId}/courier`, {
        method: "PUT",
        body: form,
      });
      onUpdated(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="form-card">
      <h2>Courier Tracking</h2>

      <div className="form-grid">
        <div className="field">
          <label>Courier</label>
          <select value={form.courierName} onChange={(e) => setField("courierName", e.target.value)}>
            <option value="">Select courier</option>
            {config.courierPartners.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Docket Number</label>
          <input value={form.docketNumber} onChange={(e) => setField("docketNumber", e.target.value)} />
        </div>
        <div className="field">
          <label>Expected Delivery</label>
          <input
            type="date"
            value={form.expectedDelivery || ""}
            onChange={(e) => setField("expectedDelivery", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Delivery Date</label>
          <input
            type="date"
            value={form.deliveryDate || ""}
            onChange={(e) => setField("deliveryDate", e.target.value)}
          />
        </div>
      </div>

      <button type="button" className="update-courier-btn" onClick={handleUpdate} disabled={saving}>
        {saving ? "Updating..." : "Update Courier"}
      </button>
    </section>
  );
}

export default CourierTrackingSection;
