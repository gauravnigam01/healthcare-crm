const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { nextQuotationNumber } = require("../utils/ids");
const { computeOrderTotals } = require("../utils/totals");

const router = express.Router();

router.use(requireAuth);

function upsertCustomer(payload) {
  const { mobile, name, pincode, city, state, address } = payload;

  if (!mobile) {
    throw Object.assign(new Error("Mobile number is required."), { status: 400 });
  }

  const existing = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(mobile);
  if (existing) return existing.id;

  const result = db
    .prepare(
      `INSERT INTO customers (mobile, name, pincode, city, state, address) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(mobile, name || null, pincode || null, city || null, state || null, address || null);

  return result.lastInsertRowid;
}

function loadQuotation(quotationId) {
  const quotation = db.prepare("SELECT * FROM quotations WHERE id = ?").get(quotationId);
  if (!quotation) return null;

  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(quotation.customer_id);
  const items = db
    .prepare("SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id")
    .all(quotationId);

  return {
    id: quotation.id,
    quotationNumber: quotation.quotation_number,
    mobile: customer ? customer.mobile : null,
    name: quotation.name,
    pincode: quotation.pincode,
    city: quotation.city,
    state: quotation.state,
    address: quotation.address,
    notes: quotation.notes,
    customerType: quotation.customer_type,
    branch: quotation.branch,
    leadType: quotation.lead_type,
    paymentMethod: quotation.payment_method,
    package: quotation.package,
    additionalDiscountAmount: quotation.additional_discount_amount,
    subtotalAmount: quotation.subtotal_amount,
    grandTotal: quotation.grand_total,
    createdAt: quotation.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      category: item.category,
      title: item.title,
      qty: item.qty,
      mrp: item.mrp,
      rate: item.rate,
      amount: item.amount,
      taxPercent: item.tax_percent,
      taxAmount: item.tax_amount,
      total: item.total,
    })),
  };
}

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT q.id, q.quotation_number, q.name, q.grand_total, q.created_at, c.mobile
       FROM quotations q JOIN customers c ON c.id = q.customer_id
       ORDER BY q.created_at DESC`
    )
    .all();

  res.json(
    rows.map((row) => ({
      id: row.id,
      quotationNumber: row.quotation_number,
      name: row.name,
      grandTotal: row.grand_total,
      createdAt: row.created_at,
      mobile: row.mobile,
    }))
  );
});

router.get("/:id", (req, res) => {
  const quotation = loadQuotation(req.params.id);

  if (!quotation) {
    return res.status(404).json({ error: "Quotation not found." });
  }

  res.json(quotation);
});

router.post("/", (req, res) => {
  const body = req.body || {};

  if (!body.mobile || !Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "Mobile number and at least one item are required." });
  }

  const totals = computeOrderTotals({
    items: body.items,
    additionalDiscountAmount: body.additionalDiscountAmount || 0,
    vppDiscountPercent: 0,
    courierCharges: 0,
  });

  let quotationId;

  db.exec("BEGIN");
  try {
    const customerId = upsertCustomer(body);
    const quotationNumber = nextQuotationNumber();

    const result = db
      .prepare(
        `INSERT INTO quotations (quotation_number, customer_id, name, pincode, city, state, address, notes, customer_type, branch, lead_type, payment_method, package, additional_discount_amount, subtotal_amount, grand_total, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        quotationNumber,
        customerId,
        body.name || null,
        body.pincode || null,
        body.city || null,
        body.state || null,
        body.address || null,
        body.notes || null,
        body.customerType || null,
        body.branch || null,
        body.leadType || null,
        body.paymentMethod || null,
        body.package || null,
        totals.additionalDiscountAmount,
        totals.subtotalAmount,
        totals.grandTotal,
        req.agentId
      );

    quotationId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO quotation_items (quotation_id, product_id, category, title, qty, mrp, rate, amount, tax_percent, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of totals.items) {
      insertItem.run(
        quotationId,
        item.productId,
        item.category,
        item.title,
        item.qty,
        item.mrp,
        item.rate,
        item.amount,
        item.taxPercent,
        item.taxAmount,
        item.total
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Failed to create quotation." });
  }

  res.status(201).json(loadQuotation(quotationId));
});

router.post("/:id/convert-to-order", (req, res) => {
  const quotation = loadQuotation(req.params.id);

  if (!quotation) {
    return res.status(404).json({ error: "Quotation not found." });
  }

  res.json({
    quotationId: quotation.id,
    mobile: quotation.mobile,
    name: quotation.name,
    pincode: quotation.pincode,
    city: quotation.city,
    state: quotation.state,
    address: quotation.address,
    notes: quotation.notes,
    customerType: quotation.customerType,
    branch: quotation.branch,
    leadType: quotation.leadType,
    paymentMethod: quotation.paymentMethod,
    package: quotation.package,
    additionalDiscountAmount: quotation.additionalDiscountAmount,
    items: quotation.items.map((item) => ({
      productId: item.productId,
      category: item.category,
      title: item.title,
      qty: item.qty,
      mrp: item.mrp,
      rate: item.rate,
      discountPercent: 0,
      taxPercent: item.taxPercent,
    })),
  });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const quotation = db.prepare("SELECT id FROM quotations WHERE id = ?").get(req.params.id);
  if (!quotation) {
    return res.status(404).json({ error: "Quotation not found." });
  }

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM quotation_items WHERE quotation_id = ?").run(req.params.id);
    db.prepare("DELETE FROM quotations WHERE id = ?").run(req.params.id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: err.message || "Failed to delete quotation." });
  }

  res.status(204).end();
});

module.exports = router;
