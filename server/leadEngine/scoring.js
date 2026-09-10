// Rule-based lead scoring. No AI/LLM key required.
//
// To upgrade to real AI-based scoring later: replace this function's body
// with a call to an LLM (e.g. using ANTHROPIC_API_KEY), but keep the return
// shape { score, temperature, explanation } identical — every caller in
// pipeline.js only depends on that shape, not on how it's computed.

const SOURCE_TRUST = {
  manual: 10,
  csv_import: 15,
  website_webhook: 25,
  meta: 35,
  instagram: 35,
  google: 35,
  third_party_api: 35,
};

function scoreCompleteness(lead) {
  let points = 0;
  const notes = [];

  if (lead.phone) points += 15;
  if (lead.email) points += 10;
  if (lead.company) points += 8;
  if (lead.website) points += 7;

  if (points > 0) {
    notes.push(`${[lead.phone && "phone", lead.email && "email", lead.company && "company", lead.website && "website"].filter(Boolean).join(", ")} present`);
  } else {
    notes.push("no contact details provided");
  }

  return { points: Math.min(points, 40), notes };
}

function scoreKeywordMatch(lead, campaign) {
  const keywords = (campaign?.target_keywords || "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  if (keywords.length === 0) {
    return { points: 0, notes: [] };
  }

  const haystack = [lead.name, lead.company, lead.category, lead.notes, lead.website]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matched = keywords.filter((k) => haystack.includes(k));
  const points = Math.round((matched.length / keywords.length) * 35);

  return {
    points,
    notes: [`matched ${matched.length}/${keywords.length} campaign keywords`],
  };
}

function scoreSourceTrust(source) {
  const points = SOURCE_TRUST[source] ?? 10;
  return { points, notes: [`sourced from ${source} (trust weight ${points}/35)`] };
}

function temperatureFor(score) {
  if (score >= 70) return "Hot";
  if (score >= 40) return "Warm";
  if (score >= 15) return "Cold";
  return "Unqualified";
}

function scoreLead(lead, campaign) {
  const completeness = scoreCompleteness(lead);
  const keywordMatch = scoreKeywordMatch(lead, campaign);
  const sourceTrust = scoreSourceTrust(lead.source);

  const score = Math.min(100, completeness.points + keywordMatch.points + sourceTrust.points);
  const temperature = temperatureFor(score);

  const explanation = [...completeness.notes, ...keywordMatch.notes, ...sourceTrust.notes]
    .join("; ")
    .replace(/^./, (c) => c.toUpperCase());

  return { score, temperature, explanation: `${explanation}. Score: ${score}/100 (${temperature}).` };
}

module.exports = { scoreLead };
