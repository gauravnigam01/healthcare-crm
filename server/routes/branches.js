const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT id, name FROM branches ORDER BY name").all();
  res.json(rows);
});

router.post("/", requireAdmin, (req, res) => {
  const { name } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: "Branch name is required." });
  }

  const existing = db.prepare("SELECT id FROM branches WHERE name = ?").get(name);
  if (existing) {
    return res.status(409).json({ error: "A branch with this name already exists." });
  }

  const result = db.prepare("INSERT INTO branches (name) VALUES (?)").run(name);
  res.status(201).json({ id: result.lastInsertRowid, name });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT id FROM branches WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Branch not found." });
  }

  db.prepare("DELETE FROM branches WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
