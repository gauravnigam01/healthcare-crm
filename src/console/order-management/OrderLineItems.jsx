import { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// "Dr. Advice" is a fixed consultation fee — its amount must never move with
// a discount, so any discount on this line is ignored during computation.
const NON_DISCOUNTABLE_TITLES = new Set(["Dr. Advice"]);

export function computeLine(item) {
  const discountPercent = NON_DISCOUNTABLE_TITLES.has(item.title) ? 0 : item.discountPercent || 0;
  const amount = round2(item.rate * item.qty * (1 - discountPercent / 100));
  const taxAmount = round2(amount * (item.taxPercent / 100));
  const total = round2(amount + taxAmount);
  return { ...item, discountPercent, amount, taxAmount, total };
}

function OrderLineItems({ items, onChange, products, onPendingChange }) {
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))],
    [products]
  );

  const categoryProducts = useMemo(
    () => (category ? products.filter((p) => p.category === category) : products),
    [products, category]
  );

  const selectedProduct = products.find((p) => String(p.id) === String(productId));

  const addItem = () => {
    if (!selectedProduct) {
      alert("Please select a product.");
      return;
    }

    const line = computeLine({
      productId: selectedProduct.id,
      category: selectedProduct.category,
      title: selectedProduct.title,
      qty: Number(qty) || 1,
      mrp: selectedProduct.mrp,
      rate: selectedProduct.rate,
      discountPercent: 0,
      taxPercent: selectedProduct.taxPercent,
    });

    onChange([...items, line]);
    setCategory("");
    setProductId("");
    setQty(1);
  };

  const removeItem = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const previewLine =
    selectedProduct &&
    computeLine({
      productId: selectedProduct.id,
      category: selectedProduct.category,
      title: selectedProduct.title,
      qty: Number(qty) || 1,
      mrp: selectedProduct.mrp,
      rate: selectedProduct.rate,
      discountPercent: 0,
      taxPercent: selectedProduct.taxPercent,
    });

  // While a product is picked but not yet added with "+", it should still
  // count toward the order's Total Amount and get saved with the order —
  // otherwise the discount fields above look broken (subtracting from a
  // subtotal that reads 0), and clicking Save says "add at least one
  // product" even though the picked item is already visible on screen.
  useEffect(() => {
    onPendingChange?.(previewLine || null);
  }, [previewLine?.productId, previewLine?.qty, previewLine?.total]);

  return (
    <div className="line-items-wrapper">
      <div className="table-scroll">
        <table className="order-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Qty</th>
              <th>MRP</th>
              <th>Rate</th>
              <th>Discount</th>
              <th>Amount</th>
              <th>Tax%</th>
              <th>Tax Amt</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <span className="category-tag">{item.category}</span>
                </td>
                <td>{item.title}</td>
                <td>{item.qty}</td>
                <td>&#8377;{item.mrp.toLocaleString("en-IN")}</td>
                <td>&#8377;{item.rate.toLocaleString("en-IN")}</td>
                <td>{item.discountPercent || 0}%</td>
                <td>&#8377;{item.amount.toLocaleString("en-IN")}</td>
                <td>{item.taxPercent}%</td>
                <td>&#8377;{item.taxAmount.toLocaleString("en-IN")}</td>
                <td>&#8377;{item.total.toLocaleString("en-IN")}</td>
                <td>
                  <button type="button" className="delete-btn" onClick={() => removeItem(index)}>
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}

            <tr className="add-product-row">
              <td>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">Select Product</option>
                  {categoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                />
              </td>
              <td>{selectedProduct ? `₹${selectedProduct.mrp.toLocaleString("en-IN")}` : "₹0"}</td>
              <td>{selectedProduct ? `₹${selectedProduct.rate.toLocaleString("en-IN")}` : "₹0"}</td>
              <td>
                <input value="0" readOnly />
              </td>
              <td>{previewLine ? `₹${previewLine.amount.toLocaleString("en-IN")}` : "₹0"}</td>
              <td>{selectedProduct ? `${selectedProduct.taxPercent}%` : "-"}</td>
              <td>{previewLine ? `₹${previewLine.taxAmount.toLocaleString("en-IN")}` : "₹0"}</td>
              <td>{previewLine ? `₹${previewLine.total.toLocaleString("en-IN")}` : "₹0"}</td>
              <td>
                <button type="button" className="add-icon-btn" onClick={addItem} title="Add Product">
                  <FaPlus />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button type="button" className="add-more-btn" onClick={addItem}>
        <FaPlus /> Add More
      </button>
    </div>
  );
}

export default OrderLineItems;
