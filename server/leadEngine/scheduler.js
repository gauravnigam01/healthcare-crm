const db = require("../db");
const { runDiscovery } = require("./pipeline");

const TICK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

const SCHEDULE_STEP_MS = {
  hourly: 60 * 60 * 1000,
  "6hourly": 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

function formatSqliteDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function computeNextRunAt(schedule, from = new Date()) {
  const step = SCHEDULE_STEP_MS[schedule];
  if (!step) return null; // 'manual' or unrecognized — no auto-scheduling
  return formatSqliteDatetime(new Date(from.getTime() + step));
}

async function runDueCampaigns() {
  const dueCampaigns = db
    .prepare(
      `SELECT * FROM lead_campaigns
       WHERE status = 'Active' AND schedule != 'manual'
         AND (next_run_at IS NULL OR next_run_at <= datetime('now'))`
    )
    .all();

  for (const campaign of dueCampaigns) {
    try {
      await runDiscovery({ campaign, connectorKey: campaign.source, triggeredBy: "scheduler" });
    } catch (err) {
      console.error(`[scheduler] campaign ${campaign.id} (${campaign.name}) failed:`, err.message);
    }

    const nextRunAt = computeNextRunAt(campaign.schedule);
    db.prepare("UPDATE lead_campaigns SET next_run_at = ? WHERE id = ?").run(nextRunAt, campaign.id);
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    runDueCampaigns().catch((err) => console.error("[scheduler] tick failed:", err.message));
  }, TICK_INTERVAL_MS);
  console.log(`Lead discovery scheduler started (checks every ${TICK_INTERVAL_MS / 60000} min).`);
}

module.exports = { start, runDueCampaigns, computeNextRunAt };
