const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { runDiscovery } = require("../leadEngine/pipeline");
const { listConnectors } = require("../leadEngine/connectors");
const { computeNextRunAt } = require("../leadEngine/scheduler");

const router = express.Router();

router.use(requireAuth, requireAdmin);

function toPublicCampaign(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    source: row.source,
    targetLocation: row.target_location,
    targetKeywords: row.target_keywords,
    targetCategory: row.target_category,
    productInterest: row.product_interest,
    leadLimitPerRun: row.lead_limit_per_run,
    minScore: row.min_score,
    schedule: row.schedule,
    autoAssign: !!row.auto_assign,
    autoFollowup: !!row.auto_followup,
    createdBy: row.created_by,
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    leadsDiscovered: row.leads_discovered,
    leadsQualified: row.leads_qualified,
  };
}

function toPublicRun(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name || null,
    source: row.source,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    leadsFound: row.leads_found,
    leadsQualified: row.leads_qualified,
    leadsRejected: row.leads_rejected,
    leadsDuplicate: row.leads_duplicate,
    errors: row.errors,
  };
}

router.get("/connectors", (req, res) => {
  res.json(listConnectors());
});

router.get("/settings", (req, res) => {
  const settings = db.prepare("SELECT * FROM lead_settings WHERE id = 1").get();
  res.json({ dailyLeadCap: settings.daily_lead_cap, webhookEnabled: !!settings.webhook_enabled });
});

router.put("/settings", (req, res) => {
  const { dailyLeadCap, webhookEnabled } = req.body || {};

  db.prepare(
    "UPDATE lead_settings SET daily_lead_cap = ?, webhook_enabled = ?, updated_at = datetime('now') WHERE id = 1"
  ).run(Number(dailyLeadCap) || 500, webhookEnabled ? 1 : 0);

  const settings = db.prepare("SELECT * FROM lead_settings WHERE id = 1").get();
  res.json({ dailyLeadCap: settings.daily_lead_cap, webhookEnabled: !!settings.webhook_enabled });
});

router.get("/runs", (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, c.name AS campaign_name FROM lead_discovery_runs r
       LEFT JOIN lead_campaigns c ON c.id = r.campaign_id
       ORDER BY r.started_at DESC LIMIT 100`
    )
    .all();
  res.json(rows.map(toPublicRun));
});

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM lead_campaigns ORDER BY created_at DESC").all();
  res.json(rows.map(toPublicCampaign));
});

router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Campaign not found." });
  res.json(toPublicCampaign(row));
});

router.get("/:id/runs", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM lead_discovery_runs WHERE campaign_id = ? ORDER BY started_at DESC")
    .all(req.params.id);
  res.json(rows.map(toPublicRun));
});

router.post("/", (req, res) => {
  const {
    name,
    source,
    targetLocation,
    targetKeywords,
    targetCategory,
    productInterest,
    leadLimitPerRun,
    minScore,
    schedule,
    autoAssign,
    autoFollowup,
  } = req.body || {};

  if (!name || !source) {
    return res.status(400).json({ error: "Name and source are required." });
  }

  const result = db
    .prepare(
      `INSERT INTO lead_campaigns (
        name, source, target_location, target_keywords, target_category, product_interest,
        lead_limit_per_run, min_score, schedule, auto_assign, auto_followup, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      source,
      targetLocation || null,
      targetKeywords || null,
      targetCategory || null,
      productInterest || null,
      Number(leadLimitPerRun) || 50,
      Number(minScore) || 0,
      schedule || "manual",
      autoAssign ? 1 : 0,
      autoFollowup ? 1 : 0,
      req.agentId
    );

  const created = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(toPublicCampaign(created));
});

router.put("/:id", (req, res) => {
  const campaign = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  const {
    name,
    source,
    targetLocation,
    targetKeywords,
    targetCategory,
    productInterest,
    leadLimitPerRun,
    minScore,
    schedule,
    autoAssign,
    autoFollowup,
  } = req.body || {};

  db.prepare(
    `UPDATE lead_campaigns SET
      name = ?, source = ?, target_location = ?, target_keywords = ?, target_category = ?, product_interest = ?,
      lead_limit_per_run = ?, min_score = ?, schedule = ?, auto_assign = ?, auto_followup = ?
     WHERE id = ?`
  ).run(
    name ?? campaign.name,
    source ?? campaign.source,
    targetLocation ?? campaign.target_location,
    targetKeywords ?? campaign.target_keywords,
    targetCategory ?? campaign.target_category,
    productInterest ?? campaign.product_interest,
    leadLimitPerRun !== undefined ? Number(leadLimitPerRun) : campaign.lead_limit_per_run,
    minScore !== undefined ? Number(minScore) : campaign.min_score,
    schedule ?? campaign.schedule,
    autoAssign !== undefined ? (autoAssign ? 1 : 0) : campaign.auto_assign,
    autoFollowup !== undefined ? (autoFollowup ? 1 : 0) : campaign.auto_followup,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  res.json(toPublicCampaign(updated));
});

router.patch("/:id/pause", (req, res) => {
  const campaign = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  db.prepare("UPDATE lead_campaigns SET status = 'Paused' WHERE id = ?").run(req.params.id);
  const updated = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  res.json(toPublicCampaign(updated));
});

router.patch("/:id/resume", (req, res) => {
  const campaign = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  const nextRunAt = computeNextRunAt(campaign.schedule);
  db.prepare("UPDATE lead_campaigns SET status = 'Active', next_run_at = ? WHERE id = ?").run(
    nextRunAt,
    req.params.id
  );
  const updated = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  res.json(toPublicCampaign(updated));
});

router.post("/:id/run", async (req, res) => {
  const campaign = db.prepare("SELECT * FROM lead_campaigns WHERE id = ?").get(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found." });

  try {
    const result = await runDiscovery({
      campaign,
      connectorKey: campaign.source,
      triggeredBy: "manual_run",
      agentId: req.agentId,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Run failed." });
  }
});

module.exports = router;
