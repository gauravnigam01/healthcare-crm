const db = require("../db");
const { nextLeadNumber } = require("../utils/ids");
const { getConnector } = require("./connectors");
const { scoreLead } = require("./scoring");

function logActivity(leadId, type, message, createdBy) {
  db.prepare(
    "INSERT INTO lead_activities (lead_id, type, message, created_by) VALUES (?, ?, ?, ?)"
  ).run(leadId, type, message, createdBy || null);
}

function normalize(raw) {
  return {
    ...raw,
    name: raw.name ? String(raw.name).trim() : null,
    phone: raw.phone ? String(raw.phone).replace(/\D/g, "") : null,
    email: raw.email ? String(raw.email).trim().toLowerCase() : null,
    company: raw.company ? String(raw.company).trim() : null,
    website: raw.website ? String(raw.website).trim() : null,
  };
}

function findExistingLead({ phone, email, website, sourceRef }) {
  const conditions = [];
  const params = [];

  if (phone) {
    conditions.push("phone = ?");
    params.push(phone);
  }
  if (email) {
    conditions.push("email = ?");
    params.push(email);
  }
  if (website) {
    conditions.push("website = ?");
    params.push(website);
  }
  if (sourceRef) {
    conditions.push("source_ref = ?");
    params.push(sourceRef);
  }

  if (conditions.length === 0) return null;

  return db
    .prepare(`SELECT * FROM leads WHERE ${conditions.join(" OR ")} ORDER BY id DESC LIMIT 1`)
    .get(...params);
}

function findExistingCustomer({ phone, email }) {
  if (phone) {
    const byPhone = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(phone);
    if (byPhone) return byPhone;
  }
  if (email) {
    const byEmail = db.prepare("SELECT * FROM customers WHERE email = ?").get(email);
    if (byEmail) return byEmail;
  }
  return null;
}

function getDailyLeadCount() {
  return db
    .prepare("SELECT COUNT(*) AS count FROM leads WHERE date(created_at) = date('now')")
    .get().count;
}

function getDailyCap() {
  const settings = db.prepare("SELECT * FROM lead_settings WHERE id = 1").get();
  return settings ? settings.daily_lead_cap : 500;
}

async function runDiscovery({ campaign = null, connectorKey, payload, rows, triggeredBy = "manual_run", agentId = null }) {
  const connector = getConnector(connectorKey);

  if (!connector) {
    throw Object.assign(new Error(`Unknown lead source "${connectorKey}".`), { status: 400 });
  }

  const isConfigured = typeof connector.configured === "function" ? connector.configured() : !!connector.configured;
  if (!isConfigured) {
    throw Object.assign(new Error(`${connector.name} is not configured yet.`), { status: 400 });
  }

  const runResult = db
    .prepare(
      "INSERT INTO lead_discovery_runs (campaign_id, source, triggered_by, status) VALUES (?, ?, ?, 'running')"
    )
    .run(campaign?.id || null, connectorKey, triggeredBy);
  const runId = runResult.lastInsertRowid;

  const counters = { found: 0, qualified: 0, rejected: 0, duplicate: 0 };
  const errors = [];

  try {
    const rawLeads = await connector.discover({ campaign, payload, rows });
    counters.found = rawLeads.length;

    const dailyCap = getDailyCap();
    const perRunLimit = campaign?.lead_limit_per_run || rawLeads.length;

    let processed = 0;

    for (const raw of rawLeads) {
      if (processed >= perRunLimit) {
        errors.push(`Stopped early: campaign lead_limit_per_run (${perRunLimit}) reached.`);
        break;
      }
      if (getDailyLeadCount() >= dailyCap) {
        errors.push(`Stopped early: daily_lead_cap (${dailyCap}) reached.`);
        break;
      }

      const lead = normalize(raw);
      lead.source = connectorKey;

      if (!lead.phone && !lead.email) {
        counters.rejected += 1;
        processed += 1;
        continue;
      }

      const existingLead = findExistingLead({
        phone: lead.phone,
        email: lead.email,
        website: lead.website,
        sourceRef: lead.sourceRef,
      });

      if (existingLead) {
        db.prepare(
          "UPDATE leads SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
        ).run(existingLead.id);
        logActivity(existingLead.id, "duplicate", `Re-discovered via ${connector.name} — no new lead created.`);
        counters.duplicate += 1;
        processed += 1;
        continue;
      }

      const scoring = scoreLead(lead, campaign);
      const minScore = campaign?.min_score || 0;
      const status = scoring.score < minScore ? "Rejected" : "New";

      const existingCustomer = findExistingCustomer({ phone: lead.phone, email: lead.email });

      const leadNumber = nextLeadNumber();

      const insertResult = db
        .prepare(
          `INSERT INTO leads (
            lead_number, campaign_id, source, source_ref, name, phone, email, company, website,
            city, state, pincode, category, notes, raw_payload, score, temperature, score_explanation,
            status, customer_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          leadNumber,
          campaign?.id || null,
          connectorKey,
          lead.sourceRef || null,
          lead.name || null,
          lead.phone || null,
          lead.email || null,
          lead.company || null,
          lead.website || null,
          lead.city || null,
          lead.state || null,
          lead.pincode || null,
          lead.category || null,
          lead.notes || null,
          lead.rawPayload ? JSON.stringify(lead.rawPayload) : null,
          scoring.score,
          scoring.temperature,
          scoring.explanation,
          status,
          existingCustomer ? existingCustomer.id : null
        );

      const leadId = insertResult.lastInsertRowid;

      logActivity(leadId, "discovered", `Discovered via ${connector.name}.`, agentId);
      logActivity(leadId, "scored", scoring.explanation);

      if (status === "Rejected") {
        counters.rejected += 1;
      } else {
        counters.qualified += 1;
      }

      processed += 1;
    }

    db.prepare(
      `UPDATE lead_discovery_runs SET
        ended_at = datetime('now'), status = 'completed',
        leads_found = ?, leads_qualified = ?, leads_rejected = ?, leads_duplicate = ?, errors = ?
       WHERE id = ?`
    ).run(counters.found, counters.qualified, counters.rejected, counters.duplicate, errors.join("\n") || null, runId);

    if (campaign?.id) {
      db.prepare(
        `UPDATE lead_campaigns SET
          last_run_at = datetime('now'),
          leads_discovered = leads_discovered + ?,
          leads_qualified = leads_qualified + ?
         WHERE id = ?`
      ).run(counters.found, counters.qualified, campaign.id);
    }

    return { runId, ...counters, errors };
  } catch (err) {
    db.prepare(
      `UPDATE lead_discovery_runs SET ended_at = datetime('now'), status = 'failed', errors = ? WHERE id = ?`
    ).run(err.message || "Unknown error", runId);
    throw err;
  }
}

module.exports = { runDiscovery };
