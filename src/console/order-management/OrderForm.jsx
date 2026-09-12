import { useEffect, useMemo, useState } from "react";
import { FaEnvelope, FaRedo, FaPhone, FaPlus } from "react-icons/fa";
import { apiRequest } from "../../api";
import { useConfig } from "../../context/ConfigContext";
import { useRegisterCallingPanelActions } from "../../hooks/useCallingPanelActions";
import OrderLineItems, { round2, computeLine } from "./OrderLineItems";
import MasterDetailsSection from "./MasterDetailsSection";
import StatusBadge from "../StatusBadge";

const BLANK_FORM = {
  mobile: "",
  name: "",
  customerType: "Ecommerce",
  branch: "",
  pincode: "",
  city: "",
  state: "",
  address: "",
  sameAsShipping: true,
  billingAddrMobile: "",
  billingGst: "",
  billingEmail: "",
  billingAltMobile1: "",
  leadType: "Outbound",
  paymentMethod: "COD",
  transactionId: "",
  package: "",
  advancePayment: 0,
  courierCharges: 0,
  vppDiscountPercent: 0,
  dispatchDate: "",
  expectedDelivery: "",
  additionalDiscountAmount: 0,
  notes: "",
  couponCode: "",
};

const BLANK_MASTER_DETAILS = {
  amountAdvised: "",
  age: "",
  weight: "",
  height: "",
  problem: "",
  maritalStatus: "",
  district: "",
  postOffice: "",
  landmark: "",
  medicineAdvised: "",
  ordo: "",
  followUpAgentId: "",
  note: "",
};

function computeTotalsPreview(items, form, pendingTotal = 0) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.total, 0) + (Number(pendingTotal) || 0));
  const vppAmount = round2(subtotal * ((Number(form.vppDiscountPercent) || 0) / 100));
  const discount = round2(Number(form.additionalDiscountAmount) || 0);
  const courier = round2(Number(form.courierCharges) || 0);
  const netPayable = round2(subtotal - discount - vppAmount + courier);

  return { subtotal, vppAmount, discount, courier, netPayable, grandTotal: netPayable };
}

function OrderForm({ orderId, quotationId, leadId, onSaved, onSavedAndNext, onActiveCustomerChange, onLeadConverted }) {
  const { config } = useConfig();

  const [form, setForm] = useState(BLANK_FORM);
  const [items, setItems] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [masterDetails, setMasterDetails] = useState(BLANK_MASTER_DETAILS);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(!!orderId);
  const [orderMeta, setOrderMeta] = useState(null); // server-returned order once created/loaded
  const [customerId, setCustomerId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [searching, setSearching] = useState(false);
  const [courierForm, setCourierForm] = useState({ courierName: "", docketNumber: "", deliveryDate: "" });
  const [savingCourier, setSavingCourier] = useState(false);

  const isEditMode = !!orderMeta;

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const setMasterField = (name, value) => setMasterDetails((m) => ({ ...m, [name]: value }));

  useEffect(() => {
    apiRequest("/products").then(setProducts).catch(() => setProducts([]));
    apiRequest("/agents").then(setAgents).catch(() => setAgents([]));
    apiRequest("/quotations").then(setQuotations).catch(() => setQuotations([]));
  }, []);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    apiRequest(`/orders/${orderId}`)
      .then((order) => {
        applyOrderToForm(order);
      })
      .catch((err) => alert(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (!quotationId) return;

    apiRequest(`/quotations/${quotationId}/convert-to-order`, { method: "POST" })
      .then((data) => {
        setForm((f) => ({
          ...f,
          mobile: data.mobile || "",
          name: data.name || "",
          pincode: data.pincode || "",
          city: data.city || "",
          state: data.state || "",
          address: data.address || "",
          notes: data.notes || "",
        }));
        setItems((data.items || []).map(computeLine));
      })
      .catch((err) => alert(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  useEffect(() => {
    if (!leadId) return;

    apiRequest(`/leads/${leadId}/convert-to-order`, { method: "POST" })
      .then((data) => {
        setForm((f) => ({
          ...f,
          mobile: data.mobile || "",
          name: data.name || "",
          pincode: data.pincode || "",
          city: data.city || "",
          state: data.state || "",
          address: data.address || "",
          notes: data.notes || "",
        }));
      })
      .catch((err) => alert(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  function applyOrderToForm(order) {
    setOrderMeta(order);
    setForm({
      mobile: order.mobile || "",
      name: order.name || "",
      customerType: order.customerType || "Ecommerce",
      branch: order.branch || "",
      pincode: order.pincode || "",
      city: order.city || "",
      state: order.state || "",
      address: order.address || "",
      sameAsShipping: order.sameAsShipping,
      billingAddrMobile: order.billingAddrMobile || "",
      billingGst: order.billingGst || "",
      billingEmail: order.billingEmail || "",
      billingAltMobile1: order.billingAltMobile1 || "",
      leadType: order.leadType || "Outbound",
      paymentMethod: order.paymentMethod || "COD",
      transactionId: order.transactionId || "",
      package: order.package || "",
      advancePayment: order.advancePayment || 0,
      courierCharges: order.courierCharges || 0,
      vppDiscountPercent: order.vppDiscountPercent || 0,
      dispatchDate: order.dispatchDate || "",
      expectedDelivery: order.expectedDelivery || "",
      additionalDiscountAmount: order.additionalDiscountAmount || 0,
      notes: order.notes || "",
      couponCode: order.couponCode || "",
    });
    setItems(order.items || []);
    setCourierForm({
      courierName: order.courierName || "",
      docketNumber: order.docketNumber || "",
      deliveryDate: order.deliveryDate || "",
    });
    setMasterDetails({
      amountAdvised: order.masterDetails.amountAdvised ?? "",
      age: order.masterDetails.age ?? "",
      weight: order.masterDetails.weight ?? "",
      height: order.masterDetails.height ?? "",
      problem: order.masterDetails.problem ?? "",
      maritalStatus: order.masterDetails.maritalStatus ?? "",
      district: order.masterDetails.district ?? "",
      postOffice: order.masterDetails.postOffice ?? "",
      landmark: order.masterDetails.landmark ?? "",
      medicineAdvised: order.masterDetails.medicineAdvised ?? "",
      ordo: order.masterDetails.ordo ?? "",
      followUpAgentId: order.masterDetails.followUpAgentId ?? "",
      note: order.masterDetails.note ?? "",
    });

    if (onActiveCustomerChange) {
      onActiveCustomerChange({ name: order.name, mobile: order.mobile });
    }

    apiRequest(`/customers?mobile=${encodeURIComponent(order.mobile)}`)
      .then((customer) => {
        setCustomerId(customer.id);
        if (onActiveCustomerChange) onActiveCustomerChange({ id: customer.id, name: customer.name, mobile: customer.mobile });
      })
      .catch(() => {});
  }

  const handleSearchMobile = async () => {
    if (!form.mobile) {
      alert("Enter a mobile number to search.");
      return;
    }

    setSearching(true);
    try {
      const customer = await apiRequest(`/customers?mobile=${encodeURIComponent(form.mobile)}`);
      setCustomerId(customer.id);
      setForm((f) => ({
        ...f,
        name: customer.name || f.name,
        customerType: customer.customerType || f.customerType,
        pincode: customer.pincode || f.pincode,
        city: customer.city || f.city,
        state: customer.state || f.state,
        address: customer.address || f.address,
      }));

      const addressList = await apiRequest(`/customers/${customer.id}/addresses`);
      setAddresses(addressList);

      if (onActiveCustomerChange) {
        onActiveCustomerChange({ id: customer.id, name: customer.name, mobile: customer.mobile });
      }
    } catch (err) {
      setCustomerId(null);
      setAddresses([]);
      alert("No existing customer found for this number — fill details to create a new one.");
    } finally {
      setSearching(false);
    }
  };

  const handleChangeAddress = (addressId) => {
    const address = addresses.find((a) => String(a.id) === String(addressId));
    if (!address) return;

    setField("pincode", address.pincode);
    setField("city", address.city);
    setField("state", address.state);
    setField("address", address.address);
  };

  const totalsPreview = useMemo(
    () => computeTotalsPreview(items, form, pendingTotal),
    [items, form, pendingTotal]
  );

  function buildPayload() {
    return {
      ...form,
      advancePayment: Number(form.advancePayment) || 0,
      courierCharges: Number(form.courierCharges) || 0,
      vppDiscountPercent: Number(form.vppDiscountPercent) || 0,
      additionalDiscountAmount: Number(form.additionalDiscountAmount) || 0,
      items: items.map((item) => ({
        productId: item.productId,
        category: item.category,
        title: item.title,
        qty: item.qty,
        mrp: item.mrp,
        rate: item.rate,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent,
      })),
      masterDetails: {
        amountAdvised: masterDetails.amountAdvised === "" ? null : Number(masterDetails.amountAdvised),
        age: masterDetails.age === "" ? null : Number(masterDetails.age),
        weight: masterDetails.weight === "" ? null : Number(masterDetails.weight),
        height: masterDetails.height === "" ? null : Number(masterDetails.height),
        problem: masterDetails.problem || null,
        maritalStatus: masterDetails.maritalStatus || null,
        district: masterDetails.district || null,
        postOffice: masterDetails.postOffice || null,
        landmark: masterDetails.landmark || null,
        medicineAdvised: masterDetails.medicineAdvised || null,
        ordo: masterDetails.ordo || null,
        followUpAgentId: masterDetails.followUpAgentId || null,
        note: masterDetails.note || null,
      },
    };
  }

  function validate() {
    if (!form.mobile || form.mobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (!form.name || !form.pincode || !form.city || !form.state || !form.address) {
      alert("Please fill Name, Pincode, City, State and Address.");
      return false;
    }
    if (items.length === 0) {
      alert("Please add at least one product.");
      return false;
    }
    return true;
  }

  async function saveOrder() {
    if (!validate()) throw new Error("Validation failed");

    const payload = buildPayload();
    const wasNewOrder = !orderMeta;

    const saved = orderMeta
      ? await apiRequest(`/orders/${orderMeta.id}`, { method: "PUT", body: payload })
      : await apiRequest("/orders", { method: "POST", body: payload });

    setOrderMeta(saved);

    if (wasNewOrder && leadId) {
      try {
        await apiRequest(`/leads/${leadId}/mark-converted`, {
          method: "PATCH",
          body: { orderId: saved.id, orderNumber: saved.orderNumber },
        });
        onLeadConverted?.(leadId, saved.id);
      } catch {
        // Order is already saved — a failed mark-converted call shouldn't block the user.
      }
    }

    alert(`Order saved successfully! Order Number: ${saved.orderNumber}`);
    return saved;
  }

  useRegisterCallingPanelActions({
    saveLabel: isEditMode ? "Update" : "SAVE",
    onSave: async () => {
      await saveOrder();
      if (onSaved) onSaved();
    },
    onSaveAndNext: async () => {
      await saveOrder();
      if (onSavedAndNext) onSavedAndNext();
    },
  });

  const handleApplyCoupon = async () => {
    if (!orderMeta) {
      alert("Coupon will be applied when you save this order.");
      return;
    }

    try {
      const updated = await apiRequest(`/orders/${orderMeta.id}/coupon`, {
        method: "POST",
        body: { couponCode: form.couponCode, additionalDiscountAmount: form.additionalDiscountAmount },
      });
      setOrderMeta(updated);
      setField("additionalDiscountAmount", updated.additionalDiscountAmount);
      alert("Coupon applied.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelectQuotation = async (quotationId) => {
    if (!quotationId) return;
    try {
      const data = await apiRequest(`/quotations/${quotationId}/convert-to-order`, { method: "POST" });
      setForm((f) => ({
        ...f,
        mobile: data.mobile || f.mobile,
        name: data.name || f.name,
        pincode: data.pincode || f.pincode,
        city: data.city || f.city,
        state: data.state || f.state,
        address: data.address || f.address,
        notes: data.notes || f.notes,
      }));
      setItems((data.items || []).map(computeLine));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateCourier = async () => {
    if (!orderMeta) return;
    setSavingCourier(true);
    try {
      const updated = await apiRequest(`/orders/${orderMeta.id}/courier`, {
        method: "PUT",
        body: { ...courierForm, expectedDelivery: form.expectedDelivery },
      });
      setOrderMeta(updated);
      setCourierForm({
        courierName: updated.courierName || "",
        docketNumber: updated.docketNumber || "",
        deliveryDate: updated.deliveryDate || "",
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCourier(false);
    }
  };

  const handleReorder = async () => {
    if (!orderMeta) return;
    try {
      const newOrder = await apiRequest(`/orders/${orderMeta.id}/reorder`, { method: "POST" });
      alert(`Reordered as ${newOrder.orderNumber}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleNotify = async () => {
    if (!orderMeta) return;
    try {
      const data = await apiRequest(`/orders/${orderMeta.id}/notify`, { method: "POST" });
      alert(data.message);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!orderMeta || newStatus === orderMeta.status) return;
    try {
      const updated = await apiRequest(`/orders/${orderMeta.id}/status`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      setOrderMeta(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="tab-note">Loading order...</div>;
  }

  const matchingQuotations = quotations.filter((q) => form.mobile && q.mobile === form.mobile);
  const showCourierRow = isEditMode && orderMeta.status !== "New Order";

  return (
    <div className="order-form">
      <div className="panel-title">
        <span>{isEditMode ? `Order Update : ${orderMeta.orderNumber}` : "New Order"}</span>

        {isEditMode && (
          <div className="order-header-actions">
            <select
              className="order-status-select"
              value={orderMeta.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {["New Order", "Processing", "Shipped", "Delivered", "Cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleNotify}>
              <FaEnvelope /> Mail + SMS
            </button>
            <button type="button" onClick={handleReorder}>
              <FaRedo /> Reorder Now
            </button>
            <button type="button">
              <FaPhone /> Call Now
            </button>
            <button type="button" onClick={onSavedAndNext}>
              <FaPlus /> New Order
            </button>
          </div>
        )}
      </div>

      <section className="form-card">
        <div className="form-grid">
          <div className="field">
            <label>
              Mobile <b>*</b>
            </label>
            <div className="search-input">
              <input
                value={form.mobile}
                maxLength={10}
                onChange={(e) => setField("mobile", e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile"
              />
              <button type="button" onClick={handleSearchMobile} disabled={searching}>
                {searching ? "..." : "Search"}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Quotation</label>
            <select
              defaultValue=""
              disabled={matchingQuotations.length === 0}
              onChange={(e) => handleSelectQuotation(e.target.value)}
            >
              <option value="">{matchingQuotations.length ? "Select Quotation" : "Select Quotation"}</option>
              {matchingQuotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quotationNumber} - {q.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Name <b>*</b>
            </label>
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} />
          </div>

          <div className="field">
            <label>Customer Type *</label>
            <select value={form.customerType} onChange={(e) => setField("customerType", e.target.value)}>
              {config.customerTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Branch *</label>
            <select value={form.branch} onChange={(e) => setField("branch", e.target.value)}>
              <option value="">Select</option>
              {config.branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Change Address</label>
            <select onChange={(e) => handleChangeAddress(e.target.value)} disabled={addresses.length === 0}>
              <option value="">{addresses.length ? "Select saved address" : "No saved addresses"}</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label || a.address}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>
              Pincode <b>*</b>
            </label>
            <input value={form.pincode} onChange={(e) => setField("pincode", e.target.value)} />
          </div>

          <div className="field">
            <label>
              City <b>*</b>
            </label>
            <input value={form.city} onChange={(e) => setField("city", e.target.value)} />
          </div>

          <div className="field">
            <label>
              State <b>*</b>
            </label>
            <input value={form.state} onChange={(e) => setField("state", e.target.value)} />
          </div>

          <div className="field field-wide">
            <label>
              Address <b>*</b>
            </label>
            <textarea value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </div>
        </div>

        <div className="billing-title">
          Billing Address
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.sameAsShipping}
              onChange={(e) => setField("sameAsShipping", e.target.checked)}
            />
            Same As Shipping Address
          </label>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Addr Mobile</label>
            <input
              value={form.billingAddrMobile}
              disabled={form.sameAsShipping}
              onChange={(e) => setField("billingAddrMobile", e.target.value)}
            />
          </div>
          <div className="field">
            <label>GST</label>
            <input value={form.billingGst} disabled={form.sameAsShipping} onChange={(e) => setField("billingGst", e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              value={form.billingEmail}
              disabled={form.sameAsShipping}
              onChange={(e) => setField("billingEmail", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Alt Mobile1</label>
            <input
              value={form.billingAltMobile1}
              disabled={form.sameAsShipping}
              onChange={(e) => setField("billingAltMobile1", e.target.value)}
            />
          </div>

          <div className="field">
            <label>Lead Type *</label>
            <select value={form.leadType} onChange={(e) => setField("leadType", e.target.value)}>
              {config.leadTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Payment *</label>
            <select value={form.paymentMethod} onChange={(e) => setField("paymentMethod", e.target.value)}>
              {config.paymentMethods.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Transaction ID</label>
            <input value={form.transactionId} onChange={(e) => setField("transactionId", e.target.value)} />
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

          <div className="field">
            <label>Advance Payment</label>
            <input type="number" value={form.advancePayment} onChange={(e) => setField("advancePayment", e.target.value)} />
          </div>

          <div className="field">
            <label>Courier Charges</label>
            <input type="number" value={form.courierCharges} onChange={(e) => setField("courierCharges", e.target.value)} />
          </div>

          <div className="field">
            <label>Order Booked By</label>
            <input value={orderMeta?.orderBookedByName || "(you)"} readOnly />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label>Order Created By</label>
            <input value={orderMeta?.orderCreatedByName || "(you)"} readOnly />
          </div>

          <div className="field">
            <label>Vpp Discount %</label>
            <input
              type="number"
              value={form.vppDiscountPercent}
              onChange={(e) => setField("vppDiscountPercent", e.target.value)}
            />
          </div>

          {showCourierRow && (
            <>
              <div className="field">
                <label>Dispatch Date</label>
                <input
                  type="date"
                  value={form.dispatchDate || ""}
                  onChange={(e) => setField("dispatchDate", e.target.value)}
                />
              </div>

              <div className="field">
                <label>Courier</label>
                <select
                  value={courierForm.courierName}
                  onChange={(e) => setCourierForm((c) => ({ ...c, courierName: e.target.value }))}
                >
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
                <input
                  value={courierForm.docketNumber}
                  onChange={(e) => setCourierForm((c) => ({ ...c, docketNumber: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Expected Delivery</label>
                <input
                  type="date"
                  value={form.expectedDelivery || ""}
                  onChange={(e) => setField("expectedDelivery", e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {showCourierRow && (
          <div className="form-grid">
            <div className="field">
              <label>Delivery Date</label>
              <input
                type="date"
                value={courierForm.deliveryDate || ""}
                onChange={(e) => setCourierForm((c) => ({ ...c, deliveryDate: e.target.value }))}
              />
            </div>

            <button type="button" className="update-courier-btn" onClick={handleUpdateCourier} disabled={savingCourier}>
              {savingCourier ? "Updating..." : "Update Courier"}
            </button>
          </div>
        )}
      </section>

      <section className="form-card">
        <h2>Products</h2>
        <OrderLineItems items={items} onChange={setItems} products={products} onPendingChange={setPendingTotal} />

        <div className="totals-panel">
          <div>
            <span>Total Amount (with Taxes)</span>
            <strong>&#8377;{totalsPreview.subtotal.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>Additional/Coupon Discount</span>
            <input
              type="number"
              value={form.additionalDiscountAmount}
              onChange={(e) => setField("additionalDiscountAmount", e.target.value)}
            />
          </div>
          <div>
            <span>Courier Charges</span>
            <strong>&#8377;{totalsPreview.courier.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>VPP Discount Amount</span>
            <strong>&#8377;{totalsPreview.vppAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>Net Payable</span>
            <strong>&#8377;{totalsPreview.netPayable.toLocaleString("en-IN")}</strong>
          </div>
          <div className="grand-total">
            <span>Grand Total</span>
            <strong>&#8377;{totalsPreview.grandTotal.toLocaleString("en-IN")}</strong>
          </div>
          <div>
            <span>Payment Status</span>
            <StatusBadge status={orderMeta?.paymentStatus || "Pending"} />
          </div>
        </div>

        <div className="bottom-order-area">
          <div className="notes-box">
            <label>Notes:</label>
            <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>

          <div className="coupon-box">
            <label>COUPON CODE</label>
            <div>
              <input value={form.couponCode} onChange={(e) => setField("couponCode", e.target.value)} placeholder="Enter coupon" />
              <button type="button" onClick={handleApplyCoupon}>
                Apply
              </button>
            </div>
            <button type="button" className="coupon-save" onClick={handleApplyCoupon}>
              Update
            </button>
          </div>
        </div>
      </section>

      <MasterDetailsSection
        masterDetails={masterDetails}
        setField={setMasterField}
        mirror={form}
        orderNumber={orderMeta?.orderNumber}
        agents={agents}
      />
    </div>
  );
}

export default OrderForm;
