const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const limit = Math.max(1, Number(req.query.limit) || 20);

  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.message, b.created_at, a.full_name AS posted_by_name
       FROM briefings b JOIN agents a ON a.id = b.posted_by
       ORDER BY b.created_at DESC
       LIMIT ?`
    )
    .all(limit);

  res.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      createdAt: row.created_at,
      postedByName: row.posted_by_name,
    }))
  );
});

router.post("/", requireAdmin, (req, res) => {
  const { title, message } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required." });
  }

  const result = db
    .prepare("INSERT INTO briefings (posted_by, title, message) VALUES (?, ?, ?)")
    .run(req.agentId, title, message);

  const row = db
    .prepare(
      `SELECT b.id, b.title, b.message, b.created_at, a.full_name AS posted_by_name
       FROM briefings b JOIN agents a ON a.id = b.posted_by WHERE b.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json({
    id: row.id,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    postedByName: row.posted_by_name,
  });
});

module.exports = router;
