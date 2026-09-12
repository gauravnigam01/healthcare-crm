const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../utils/mailer");

const router = express.Router();

const RESET_TOKEN_TTL_MINUTES = 30;

function toPublicAgent(agent) {
  return {
    id: agent.id,
    username: agent.username,
    fullName: agent.full_name,
    extension: agent.extension,
    role: agent.role,
    email: agent.email,
  };
}

function issueToken(agent) {
  return jwt.sign({ agentId: agent.id, role: agent.role }, JWT_SECRET, {
    expiresIn: "12h",
  });
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Please enter username and password." });
  }

  const agent = db.prepare("SELECT * FROM agents WHERE username = ?").get(username);

  if (!agent || !bcrypt.compareSync(password, agent.password_hash)) {
    const pendingRequest = db
      .prepare("SELECT status FROM agent_requests WHERE username = ? ORDER BY id DESC LIMIT 1")
      .get(username);

    if (pendingRequest?.status === "pending") {
      return res.status(403).json({ error: "Your account request is still pending admin approval." });
    }
    if (pendingRequest?.status === "rejected") {
      return res.status(403).json({ error: "Your account request was rejected. Please contact the admin." });
    }

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

router.post("/request-agent", (req, res) => {
  const { username, password, fullName, extension } = req.body || {};

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: "Username, password and full name are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existingAgent = db.prepare("SELECT id FROM agents WHERE username = ?").get(username);
  if (existingAgent) {
    return res.status(409).json({ error: "This username is already taken." });
  }

  const existingRequest = db
    .prepare("SELECT id FROM agent_requests WHERE username = ? AND status = 'pending'")
    .get(username);
  if (existingRequest) {
    return res.status(409).json({ error: "A request for this username is already pending approval." });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    "INSERT INTO agent_requests (username, password_hash, full_name, extension) VALUES (?, ?, ?, ?)"
  ).run(username, passwordHash, fullName, extension || null);

  res.status(201).json({ ok: true, message: "Request submitted. An admin will review your access request." });
});

router.get("/me", requireAuth, (req, res) => {
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.agentId);

  if (!agent) {
    return res.status(404).json({ error: "Agent not found." });
  }

  res.json({ agent: toPublicAgent(agent) });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};

  // Always respond with the same generic message, whether or not the email
  // is registered — avoids leaking which emails have accounts.
  const genericResponse = {
    ok: true,
    message: "If that email is registered, a reset link has been sent.",
  };

  if (!email) {
    return res.status(400).json({ error: "Please enter your email address." });
  }

  const agent = db.prepare("SELECT * FROM agents WHERE email = ?").get(email);

  if (!agent) {
    return res.json(genericResponse);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  db.prepare(
    "INSERT INTO password_reset_tokens (agent_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).run(agent.id, tokenHash, expiresAt);

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(agent.email, resetUrl);
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
    return res.status(500).json({ error: "Could not send reset email. Please try again later." });
  }

  res.json(genericResponse);
});

router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Missing token or new password." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const tokenHash = hashToken(token);

  const record = db
    .prepare(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')`
    )
    .get(tokenHash);

  if (!record) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);

  db.exec("BEGIN");
  try {
    db.prepare("UPDATE agents SET password_hash = ? WHERE id = ?").run(passwordHash, record.agent_id);
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(record.id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: "Could not reset password. Please try again." });
  }

  res.json({ ok: true });
});

router.patch("/me/email", requireAuth, (req, res) => {
  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const existing = db.prepare("SELECT id FROM agents WHERE email = ? AND id != ?").get(email, req.agentId);
  if (existing) {
    return res.status(409).json({ error: "This email is already in use by another agent." });
  }

  db.prepare("UPDATE agents SET email = ? WHERE id = ?").run(email, req.agentId);

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(req.agentId);
  res.json({ agent: toPublicAgent(agent) });
});

module.exports = router;
