const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  const agents = db
    .prepare("SELECT id, username, full_name, extension, role FROM agents ORDER BY full_name")
    .all();

  res.json(
    agents.map((agent) => ({
      id: agent.id,
      username: agent.username,
      fullName: agent.full_name,
      extension: agent.extension,
      role: agent.role,
    }))
  );
});

const BREAK_STATUSES = ["Tea Break", "Lunch", "Meeting"];

router.post("/status", (req, res) => {
  const { status } = req.body || {};

  const validStatuses = ["Login", "Logout", "Tea Break", "Lunch", "Meeting", "Wrap", "Ready"];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const openLog = db
    .prepare(
      "SELECT id FROM agent_status_logs WHERE agent_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1"
    )
    .get(req.agentId);

  if (openLog) {
    db.prepare("UPDATE agent_status_logs SET ended_at = datetime('now') WHERE id = ?").run(
      openLog.id
    );
  }

  if (status !== "Logout") {
    db.prepare("INSERT INTO agent_status_logs (agent_id, status) VALUES (?, ?)").run(
      req.agentId,
      status
    );
  }

  res.status(201).json({ ok: true });
});

router.get("/status/summary", (req, res) => {
  const logs = db
    .prepare(
      `SELECT status, started_at, ended_at FROM agent_status_logs
       WHERE agent_id = ? AND date(started_at) = date('now')
       ORDER BY started_at ASC`
    )
    .all(req.agentId);

  const durationSeconds = (startedAt, endedAt) => {
    const start = new Date(`${startedAt}Z`).getTime();
    const end = endedAt ? new Date(`${endedAt}Z`).getTime() : Date.now();
    return Math.max(0, Math.round((end - start) / 1000));
  };

  let loginTime = null;
  let breakSeconds = 0;
  let wrapSeconds = 0;
  let currentStatus = "Logged Out";

  for (const log of logs) {
    if (log.status === "Login" && !loginTime) {
      loginTime = log.started_at;
    }
    if (BREAK_STATUSES.includes(log.status)) {
      breakSeconds += durationSeconds(log.started_at, log.ended_at);
    }
    if (log.status === "Wrap") {
      wrapSeconds += durationSeconds(log.started_at, log.ended_at);
    }
    if (!log.ended_at) {
      currentStatus = log.status;
    }
  }

  res.json({
    loginTime,
    breakSeconds,
    wrapSeconds,
    currentStatus,
  });
});

module.exports = router;
