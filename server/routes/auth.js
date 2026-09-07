const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function toPublicAgent(agent) {
  return {
    id: agent.id,
    username: agent.username,
    fullName: agent.full_name,
    extension: agent.extension,
    role: agent.role,
  };
}

function issueToken(agent) {
  return jwt.sign({ agentId: agent.id, role: agent.role }, JWT_SECRET, {
    expiresIn: "12h",
  });
}

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Please enter username and password." });
  }

  const agent = db.prepare("SELECT * FROM agents WHERE username = ?").get(username);

  if (!agent || !bcrypt.compareSync(password, agent.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  db.prepare(
    "INSERT INTO agent_status_logs (agent_id, status) VALUES (?, 'Login')"
  ).run(agent.id);

  res.json({
    token: issueToken(agent),
    agent: toPublicAgent(agent),
  });
});

router.get("/me", requireAuth, (req, res) => {
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.agentId);

  if (!agent) {
    return res.status(404).json({ error: "Agent not found." });
  }

  res.json({ agent: toPublicAgent(agent) });
});

module.exports = router;
