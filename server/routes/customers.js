const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

function toPublicCustomer(row) {
  if (!row) return null;

  return {
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    customerType: row.customer_type,
    pincode: row.pincode,
    city: row.city,
    state: row.state,
    address: row.address,
    addrMobile: row.addr_mobile,
    gst: row.gst,
    email: row.email,
    altMobile1: row.alt_mobile1,
  };
}

function toPublicAddress(row) {
  return {
    id: row.id,
    label: row.label,
    pincode: row.pincode,
    city: row.city,
    state: row.state,
    address: row.address,
    isDefault: !!row.is_default,
  };
}

router.get("/", (req, res) => {
  const { mobile } = req.query;

  if (!mobile) {
    return res.status(400).json({ error: "mobile query parameter is required." });
  }

  const customer = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(mobile);

  if (!customer) {
    return res.status(404).json({ error: "No customer found for this mobile number." });
  }

  res.json(toPublicCustomer(customer));
});

router.get("/:id", (req, res) => {
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  res.json(toPublicCustomer(customer));
});

router.post("/", (req, res) => {
  const { mobile, name, customerType, pincode, city, state, address, addrMobile, gst, email, altMobile1 } =
    req.body || {};

  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required." });
  }

  const existing = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(mobile);

  if (existing) {
    return res.status(409).json({ error: "A customer with this mobile number already exists." });
  }

  const result = db
    .prepare(
      `INSERT INTO customers (mobile, name, customer_type, pincode, city, state, address, addr_mobile, gst, email, alt_mobile1)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      mobile,
      name || null,
      customerType || "Ecommerce",
      pincode || null,
      city || null,
      state || null,
      address || null,
      addrMobile || null,
      gst || null,
      email || null,
      altMobile1 || null
    );

  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json(toPublicCustomer(customer));
});

router.put("/:id", (req, res) => {
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  const { name, customerType, pincode, city, state, address, addrMobile, gst, email, altMobile1 } =
    req.body || {};

  db.prepare(
    `UPDATE customers SET
      name = ?, customer_type = ?, pincode = ?, city = ?, state = ?, address = ?,
      addr_mobile = ?, gst = ?, email = ?, alt_mobile1 = ?
     WHERE id = ?`
  ).run(
    name ?? customer.name,
    customerType ?? customer.customer_type,
    pincode ?? customer.pincode,
    city ?? customer.city,
    state ?? customer.state,
    address ?? customer.address,
    addrMobile ?? customer.addr_mobile,
    gst ?? customer.gst,
    email ?? customer.email,
    altMobile1 ?? customer.alt_mobile1,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);

  res.json(toPublicCustomer(updated));
});

router.get("/:id/addresses", (req, res) => {
  const addresses = db
    .prepare("SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC")
    .all(req.params.id);

  res.json(addresses.map(toPublicAddress));
});

router.post("/:id/addresses", (req, res) => {
  const { label, pincode, city, state, address, isDefault } = req.body || {};

  if (!pincode || !city || !state || !address) {
    return res.status(400).json({ error: "Pincode, city, state and address are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO customer_addresses (customer_id, label, pincode, city, state, address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.id, label || null, pincode, city, state, address, isDefault ? 1 : 0);

  const created = db
    .prepare("SELECT * FROM customer_addresses WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(toPublicAddress(created));
});

module.exports = router;
