const db = require("../db");
const { nextLeadNumber } = require("../utils/ids");
const { getConnector } = require("./connectors");
const { scoreLead } = require("./scoring");

function logActivity(leadId, type, message, createdBy) {
  db.prepare(
    "INSERT INTO lead_activities (lead_id, type, message, created_by) VALUES (?, ?, ?, ?)"
  ).run(leadId, type, message, createdBy || null);
}

// Simple, stateless round-robin: pick the agent (role='agent') who
// currently has the fewest leads assigned to them. No separate
// "sales team" table exists in this app — agents ARE the team.
function pickAgentForAssignment() {
  return db
    .prepare(
      `SELECT a.id, a.full_name, COUNT(l.id) AS lead_count
       FROM agents a
       LEFT JOIN leads l ON l.assigned_to = a.id
       WHERE a.role = 'agent'
       GROUP BY a.id
       ORDER BY lead_count ASC, a.id ASC
       LIMIT 1`
    )
    .get();
}

// Mirrors upsertCustomer() in routes/orders.js and routes/quotations.js —
// duplicated deliberately rather than shared, matching this codebase's
// existing convention for small per-file DB helpers.
function leadToCustomer(lead) {
  if (!lead.phone) return null;

  const existing = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(lead.phone);
  if (existing) return existing.id;

  const result = db
    .prepare(
      `INSERT INTO customers (mobile, name, email, city, state, pincode, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(lead.phone, lead.name || null, lead.email || null, lead.city || null, lead.state || null, lead.pincode || null, lead.company || null);

  return result.lastInsertRowid;
}

const FOLLOWUP_DELAY_SQL = {
  Hot: "+1 hour",
  Warm: "+1 day",
  Cold: "+7 days",
};

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

        // Assign/follow-up only run for qualified leads. A campaign
        // explicitly controls both; a campaign-less lead (manual/CSV)
        // stays unassigned by default, but a public webhook lead — where
        // no human is in the loop at intake — auto-assigns and
        // auto-follows-up so it doesn't sit untouched.
        const shouldAutoAssign = campaign ? !!campaign.auto_assign : connectorKey === "website_webhook";
        const shouldAutoFollowup = campaign ? !!campaign.auto_followup : connectorKey === "website_webhook";

        let assignedAgent = null;
        if (shouldAutoAssign) {
          assignedAgent = pickAgentForAssignment();
          if (assignedAgent) {
            db.prepare("UPDATE leads SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").run(
              assignedAgent.id,
              leadId
            );
            logActivity(leadId, "assigned", `Auto-assigned to ${assignedAgent.full_name} (round-robin).`);
          } else {
            logActivity(leadId, "assigned", "Auto-assign skipped — no agents available.");
          }
        }

        if (shouldAutoFollowup) {
          const customerId = existingCustomer ? existingCustomer.id : leadToCustomer(lead);

          if (customerId) {
            db.prepare("UPDATE leads SET customer_id = ? WHERE id = ?").run(customerId, leadId);
          }

          const delay = FOLLOWUP_DELAY_SQL[scoring.temperature];

          if (!customerId || !delay) {
            logActivity(leadId, "followup_scheduled", "Follow-up skipped — no phone number to reach this lead.");
          } else if (!assignedAgent) {
            logActivity(leadId, "followup_scheduled", "Follow-up skipped — no agent assigned to attribute the call to.");
          } else {
            db.prepare(
              `INSERT INTO call_logs (agent_id, customer_id, phone, disposition, callback_at, note)
               VALUES (?, ?, ?, 'Call Back', datetime('now', ?), ?)`
            ).run(assignedAgent.id, customerId, lead.phone, delay, `Auto follow-up for lead ${leadNumber} (${scoring.temperature}).`);
            logActivity(leadId, "followup_scheduled", `Follow-up call scheduled (${scoring.temperature} — ${delay}).`);
          }
        }
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
