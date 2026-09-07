const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "healthcare-crm-dev-secret";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.agentId = payload.agentId;
    req.agentRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  if (req.agentRole !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
