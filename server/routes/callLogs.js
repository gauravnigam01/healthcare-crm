const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

function toPublicCallLog(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    customerId: row.customer_id,
    orderId: row.order_id,
    phone: row.phone,
    disposition: row.disposition,
    callbackAt: row.callback_at,
    callbackDone: !!row.callback_done,
    note: row.note,
    createdAt: row.created_at,
    customerName: row.customer_name,
    agentName: row.agent_name,
  };
}

router.post("/", (req, res) => {
  const { customerId, orderId, phone, disposition, callbackAt, note } = req.body || {};

  if (!disposition) {
    return res.status(400).json({ error: "Disposition is required." });
  }

  const result = db
    .prepare(
      `INSERT INTO call_logs (agent_id, customer_id, order_id, phone, disposition, callback_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.agentId, customerId || null, orderId || null, phone || null, disposition, callbackAt || null, note || null);

  const row = db.prepare("SELECT * FROM call_logs WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json(toPublicCallLog(row));
});

router.get("/disposition-summary", (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT disposition, COUNT(*) AS count FROM call_logs
       WHERE date(created_at) = date(?)
       GROUP BY disposition
       ORDER BY count DESC`
    )
    .all(targetDate);

  res.json({
    date: targetDate,
    total: rows.reduce((sum, row) => sum + row.count, 0),
    dispositions: rows,
  });
});

router.get("/callbacks", (req, res) => {
  const { status = "pending" } = req.query;

  const rows = db
    .prepare(
      `SELECT cl.*, c.name AS customer_name, a.full_name AS agent_name
       FROM call_logs cl
       LEFT JOIN customers c ON c.id = cl.customer_id
       LEFT JOIN agents a ON a.id = cl.agent_id
       WHERE cl.disposition = 'Call Back' AND cl.callback_done = ?
       ORDER BY cl.callback_at ASC`
    )
    .all(status === "done" ? 1 : 0);

  res.json(rows.map(toPublicCallLog));
});

router.patch("/:id/callback-done", (req, res) => {
  const existing = db.prepare("SELECT id FROM call_logs WHERE id = ?").get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Call log not found." });
  }

  db.prepare("UPDATE call_logs SET callback_done = 1 WHERE id = ?").run(req.params.id);

  const row = db.prepare("SELECT * FROM call_logs WHERE id = ?").get(req.params.id);
  res.json(toPublicCallLog(row));
});

router.get("/missed", (req, res) => {
  const rows = db
    .prepare(
      `SELECT cl.*, c.name AS customer_name, a.full_name AS agent_name
       FROM call_logs cl
       LEFT JOIN customers c ON c.id = cl.customer_id
       LEFT JOIN agents a ON a.id = cl.agent_id
       WHERE cl.disposition = 'Missed'
       ORDER BY cl.created_at DESC`
    )
    .all();

  res.json(rows.map(toPublicCallLog));
});

router.patch("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM call_logs WHERE id = ?").get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Call log not found." });
  }

  const { note, disposition, callbackAt } = req.body || {};

  db.prepare(
    "UPDATE call_logs SET note = ?, disposition = ?, callback_at = ? WHERE id = ?"
  ).run(
    note ?? existing.note,
    disposition ?? existing.disposition,
    callbackAt ?? existing.callback_at,
    req.params.id
  );

  const row = db.prepare("SELECT * FROM call_logs WHERE id = ?").get(req.params.id);
  res.json(toPublicCallLog(row));
});

module.exports = router;
