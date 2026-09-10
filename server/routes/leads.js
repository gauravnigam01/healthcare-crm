const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { runDiscovery } = require("../leadEngine/pipeline");

const router = express.Router();

// Public webhook — no auth, secured by a shared secret instead. Must be
// declared before router.use(requireAuth) below.
router.post("/webhook", async (req, res) => {
  const secret = req.headers["x-webhook-secret"] || req.query.secret;
  const expected = process.env.LEAD_WEBHOOK_SECRET;

  if (!expected) {
    return res.status(503).json({ error: "Webhook is not configured." });
  }
  if (secret !== expected) {
    return res.status(401).json({ error: "Invalid webhook secret." });
  }

  try {
    const result = await runDiscovery({
      connectorKey: "website_webhook",
      payload: req.body,
      triggeredBy: "webhook",
    });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Webhook processing failed." });
  }
});

router.use(requireAuth);

function toPublicLead(row) {
  if (!row) return null;

  return {
    id: row.id,
    leadNumber: row.lead_number,
    campaignId: row.campaign_id,
    source: row.source,
    sourceRef: row.source_ref,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    website: row.website,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    category: row.category,
    notes: row.notes,
    score: row.score,
    temperature: row.temperature,
    scoreExplanation: row.score_explanation,
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name || null,
    customerId: row.customer_id,
    convertedOrderId: row.converted_order_id,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", (req, res) => {
  const { status, temperature, source, campaignId, assignedTo, dateFrom, dateTo, q, page = 1, pageSize = 20 } = req.query;

  const conditions = [];
  const params = [];

  if (status && status !== "All") {
    conditions.push("l.status = ?");
    params.push(status);
  }
  if (temperature && temperature !== "All") {
    conditions.push("l.temperature = ?");
    params.push(temperature);
  }
  if (source && source !== "All") {
    conditions.push("l.source = ?");
    params.push(source);
  }
  if (campaignId) {
    conditions.push("l.campaign_id = ?");
    params.push(campaignId);
  }
  if (assignedTo && assignedTo !== "All") {
    conditions.push("l.assigned_to = ?");
    params.push(assignedTo);
  }
  if (dateFrom) {
    conditions.push("date(l.created_at) >= date(?)");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("date(l.created_at) <= date(?)");
    params.push(dateTo);
  }
  if (q) {
    conditions.push("(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.company LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRecords = db.prepare(`SELECT COUNT(*) AS count FROM leads l ${whereClause}`).get(...params).count;

  const limit = Math.max(1, Number(pageSize) || 20);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;

  const rows = db
    .prepare(
      `SELECT l.*, a.full_name AS assigned_to_name
       FROM leads l
       LEFT JOIN agents a ON a.id = l.assigned_to
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({
    leads: rows.map(toPublicLead),
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    page: currentPage,
  });
});

router.get("/dashboard-summary", (req, res) => {
  const countBy = (column) =>
    db.prepare(`SELECT ${column} AS key, COUNT(*) AS count FROM leads GROUP BY ${column}`).all();

  const totalLeads = db.prepare("SELECT COUNT(*) AS count FROM leads").get().count;
  const avgScore = db.prepare("SELECT COALESCE(AVG(score), 0) AS avg FROM leads").get().avg;
  const converted = db.prepare("SELECT COUNT(*) AS count FROM leads WHERE status = 'Converted'").get().count;

  res.json({
    totalLeads,
    avgScore: Math.round(avgScore),
    conversionRate: totalLeads > 0 ? Math.round((converted / totalLeads) * 1000) / 10 : 0,
    byTemperature: countBy("temperature"),
    byStatus: countBy("status"),
    bySource: countBy("source"),
  });
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT l.*, a.full_name AS assigned_to_name FROM leads l LEFT JOIN agents a ON a.id = l.assigned_to WHERE l.id = ?`
    )
    .get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: "Lead not found." });
  }

  const activities = db
    .prepare(
      `SELECT la.*, a.full_name AS created_by_name FROM lead_activities la
       LEFT JOIN agents a ON a.id = la.created_by
       WHERE la.lead_id = ? ORDER BY la.created_at DESC`
    )
    .all(req.params.id);

  res.json({
    ...toPublicLead(row),
    activities: activities.map((act) => ({
      id: act.id,
      type: act.type,
      message: act.message,
      createdByName: act.created_by_name,
      createdAt: act.created_at,
    })),
  });
});

router.post("/", async (req, res) => {
  try {
    const result = await runDiscovery({
      connectorKey: "manual",
      payload: req.body,
      triggeredBy: "manual_run",
      agentId: req.agentId,
    });

    if (result.qualified + result.rejected + result.duplicate === 0) {
      return res.status(400).json({ error: "Please provide at least a phone number or email address." });
    }

    const created = db.prepare("SELECT * FROM leads ORDER BY id DESC LIMIT 1").get();
    res.status(201).json(toPublicLead(created));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Failed to create lead." });
  }
});

router.post("/import", async (req, res) => {
  const { rows } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No rows to import." });
  }

  try {
    const result = await runDiscovery({
      connectorKey: "csv_import",
      rows,
      triggeredBy: "csv_import",
      agentId: req.agentId,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Import failed." });
  }
});

router.put("/:id", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);

  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  const { name, phone, email, company, website, city, state, pincode, category, notes } = req.body || {};

  db.prepare(
    `UPDATE leads SET
      name = ?, phone = ?, email = ?, company = ?, website = ?, city = ?, state = ?, pincode = ?, category = ?, notes = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name ?? lead.name,
    phone ?? lead.phone,
    email ?? lead.email,
    company ?? lead.company,
    website ?? lead.website,
    city ?? lead.city,
    state ?? lead.state,
    pincode ?? lead.pincode,
    category ?? lead.category,
    notes ?? lead.notes,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(toPublicLead(updated));
});

router.patch("/:id/status", (req, res) => {
  const { status } = req.body || {};
  const validStatuses = ["New", "Contacted", "Qualified", "Converted", "Rejected", "Duplicate"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  db.prepare("INSERT INTO lead_activities (lead_id, type, message, created_by) VALUES (?, 'status_changed', ?, ?)").run(
    req.params.id,
    `Status changed from ${lead.status} to ${status}.`,
    req.agentId
  );

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(toPublicLead(updated));
});

router.patch("/:id/assign", (req, res) => {
  const { agentId } = req.body || {};

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: "Lead not found." });
  }

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
  if (!agent) {
    return res.status(400).json({ error: "Agent not found." });
  }

  db.prepare("UPDATE leads SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").run(agentId, req.params.id);
  db.prepare("INSERT INTO lead_activities (lead_id, type, message, created_by) VALUES (?, 'assigned', ?, ?)").run(
    req.params.id,
    `Assigned to ${agent.full_name}.`,
    req.agentId
  );

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json(toPublicLead(updated));
});

module.exports = router;
