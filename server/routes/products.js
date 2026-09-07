const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

function toPublicProduct(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    mrp: row.mrp,
    rate: row.rate,
    taxPercent: row.tax_percent,
    active: !!row.active,
  };
}

router.get("/", (req, res) => {
  const { category, includeInactive } = req.query;

  let sql = "SELECT * FROM products";
  const conditions = [];
  const params = [];

  if (!includeInactive) {
    conditions.push("active = 1");
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += " ORDER BY category, title";

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(toPublicProduct));
});

router.post("/", requireAdmin, (req, res) => {
  const { category, title, mrp, rate, taxPercent } = req.body || {};

  if (!category || !title || !mrp || !rate) {
    return res.status(400).json({ error: "Category, title, MRP and Rate are required." });
  }

  const result = db
    .prepare(
      "INSERT INTO products (category, title, mrp, rate, tax_percent) VALUES (?, ?, ?, ?, ?)"
    )
    .run(category, title, Number(mrp), Number(rate), Number(taxPercent) || 12);

  const created = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(toPublicProduct(created));
});

router.put("/:id", requireAdmin, (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  const { category, title, mrp, rate, taxPercent, active } = req.body || {};

  db.prepare(
    "UPDATE products SET category = ?, title = ?, mrp = ?, rate = ?, tax_percent = ?, active = ? WHERE id = ?"
  ).run(
    category ?? product.category,
    title ?? product.title,
    mrp !== undefined ? Number(mrp) : product.mrp,
    rate !== undefined ? Number(rate) : product.rate,
    taxPercent !== undefined ? Number(taxPercent) : product.tax_percent,
    active !== undefined ? (active ? 1 : 0) : product.active,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  res.json(toPublicProduct(updated));
});

module.exports = router;
