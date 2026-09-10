const db = require("../db");

function nextNumber(counterName, prefix, start) {
  const existing = db.prepare("SELECT value FROM counters WHERE name = ?").get(counterName);

  let value;
  if (existing) {
    value = existing.value + 1;
    db.prepare("UPDATE counters SET value = ? WHERE name = ?").run(value, counterName);
  } else {
    value = start;
    db.prepare("INSERT INTO counters (name, value) VALUES (?, ?)").run(counterName, value);
  }

  return `${prefix}${value}`;
}

function nextOrderNumber() {
  return nextNumber("order_number", "SAS-", 39075);
}

function nextQuotationNumber() {
  return nextNumber("quotation_number", "QT-", 1001);
}

function nextLeadNumber() {
  return nextNumber("lead_number", "LD-", 1001);
}

module.exports = { nextOrderNumber, nextQuotationNumber, nextLeadNumber };
