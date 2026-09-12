const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireAdmin);

function toPublicRequest(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    extension: row.extension,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

router.get("/", (req, res) => {
  const { status } = req.query;

  const rows = status
    ? db.prepare("SELECT * FROM agent_requests WHERE status = ? ORDER BY created_at DESC").all(status)
    : db.prepare("SELECT * FROM agent_requests ORDER BY created_at DESC").all();

  res.json(rows.map(toPublicRequest));
});

router.post("/:id/approve", (req, res) => {
  const request = db.prepare("SELECT * FROM agent_requests WHERE id = ?").get(req.params.id);

  if (!request) {
    return res.status(404).json({ error: "Request not found." });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ error: "This request has already been reviewed." });
  }

  const existingAgent = db.prepare("SELECT id FROM agents WHERE username = ?").get(request.username);
  if (existingAgent) {
    return res.status(409).json({ error: "An agent with this username already exists." });
  }

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO agents (username, password_hash, full_name, extension, role) VALUES (?, ?, ?, ?, 'agent')"
    ).run(request.username, request.password_hash, request.full_name, request.extension);

    db.prepare(
      "UPDATE agent_requests SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
    ).run(req.agentId, request.id);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: err.message || "Failed to approve request." });
  }

  res.json(toPublicRequest(db.prepare("SELECT * FROM agent_requests WHERE id = ?").get(request.id)));
});

router.post("/:id/reject", (req, res) => {
  const request = db.prepare("SELECT * FROM agent_requests WHERE id = ?").get(req.params.id);

  if (!request) {
    return res.status(404).json({ error: "Request not found." });
  }
  if (request.status !== "pending") {
    return res.status(400).json({ error: "This request has already been reviewed." });
  }

  db.prepare(
    "UPDATE agent_requests SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = ? WHERE id = ?"
  ).run(req.agentId, request.id);

  res.json(toPublicRequest(db.prepare("SELECT * FROM agent_requests WHERE id = ?").get(request.id)));
});

module.exports = router;
