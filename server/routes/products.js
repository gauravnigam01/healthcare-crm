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

router.delete("/:id", requireAdmin, (req, res) => {
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/import", requireAdmin, (req, res) => {
  const { products } = req.body || {};

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "No products to import." });
  }

  const insert = db.prepare(
    "INSERT INTO products (category, title, mrp, rate, tax_percent) VALUES (?, ?, ?, ?, ?)"
  );

  let created = 0;
  const errors = [];

  db.exec("BEGIN");
  try {
    products.forEach((row, index) => {
      const category = (row.category || "").trim();
      const title = (row.title || "").trim();
      const mrp = Number(row.mrp);
      const rate = Number(row.rate);
      const taxPercent = row.taxPercent !== undefined && row.taxPercent !== "" ? Number(row.taxPercent) : 12;

      if (!category || !title || !mrp || !rate) {
        errors.push(`Row ${index + 1}: missing category, title, MRP, or rate.`);
        return;
      }

      insert.run(category, title, mrp, rate, taxPercent);
      created += 1;
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: err.message || "Import failed." });
  }

  res.status(201).json({ created, errors });
});

module.exports = router;
