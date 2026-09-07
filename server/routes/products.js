const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

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
  };
}

router.get("/", (req, res) => {
  const { category } = req.query;

  const rows = category
    ? db
        .prepare("SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY title")
        .all(category)
    : db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY category, title").all();

  res.json(rows.map(toPublicProduct));
});

module.exports = router;
