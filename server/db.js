const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const dbPath = process.env.DB_PATH || path.join(__dirname, "database.sqlite");

const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    extension TEXT,
    role TEXT NOT NULL DEFAULT 'agent',
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_status_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    status TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    extension TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by INTEGER REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mobile TEXT NOT NULL UNIQUE,
    name TEXT,
    customer_type TEXT DEFAULT 'Ecommerce',
    pincode TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    addr_mobile TEXT,
    gst TEXT,
    email TEXT,
    alt_mobile1 TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    label TEXT,
    pincode TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    mrp REAL NOT NULL,
    rate REAL NOT NULL,
    tax_percent REAL NOT NULL DEFAULT 12,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    name TEXT,
    pincode TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    notes TEXT,
    subtotal_amount REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES agents(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id),
    product_id INTEGER REFERENCES products(id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    qty INTEGER NOT NULL,
    mrp REAL NOT NULL,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    tax_percent REAL NOT NULL,
    tax_amount REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    quotation_id INTEGER REFERENCES quotations(id),

    name TEXT NOT NULL,
    customer_type TEXT NOT NULL DEFAULT 'Ecommerce',
    branch TEXT NOT NULL,
    pincode TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    address TEXT NOT NULL,

    same_as_shipping INTEGER NOT NULL DEFAULT 1,
    billing_addr_mobile TEXT,
    billing_gst TEXT,
    billing_email TEXT,
    billing_alt_mobile1 TEXT,

    lead_type TEXT NOT NULL DEFAULT 'Outbound',
    payment_method TEXT NOT NULL DEFAULT 'COD',
    transaction_id TEXT,
    package TEXT,
    advance_payment REAL NOT NULL DEFAULT 0,
    courier_charges REAL NOT NULL DEFAULT 0,
    order_booked_by INTEGER NOT NULL REFERENCES agents(id),
    order_created_by INTEGER NOT NULL REFERENCES agents(id),
    vpp_discount_percent REAL NOT NULL DEFAULT 0,
    dispatch_date TEXT,
    expected_delivery TEXT,

    subtotal_amount REAL NOT NULL DEFAULT 0,
    additional_discount_amount REAL NOT NULL DEFAULT 0,
    vpp_discount_amount REAL NOT NULL DEFAULT 0,
    net_payable REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Pending',

    notes TEXT,
    coupon_code TEXT,

    courier_name TEXT,
    docket_number TEXT,
    delivery_date TEXT,

    amount_advised REAL,
    master_age INTEGER,
    master_weight REAL,
    master_height REAL,
    master_problem TEXT,
    master_marital_status TEXT,
    master_district TEXT,
    master_post_office TEXT,
    master_landmark TEXT,
    medicine_advised TEXT,
    master_ordo TEXT,
    follow_up_agent_id INTEGER REFERENCES agents(id),
    master_note TEXT,

    status TEXT NOT NULL DEFAULT 'New Order',
    status_date TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    qty INTEGER NOT NULL,
    mrp REAL NOT NULL,
    rate REAL NOT NULL,
    discount_percent REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL,
    tax_percent REAL NOT NULL,
    tax_amount REAL NOT NULL,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    customer_id INTEGER REFERENCES customers(id),
    order_id INTEGER REFERENCES orders(id),
    phone TEXT,
    disposition TEXT NOT NULL,
    callback_at TEXT,
    callback_done INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS briefings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    posted_by INTEGER NOT NULL REFERENCES agents(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    source TEXT NOT NULL,
    target_location TEXT,
    target_keywords TEXT,
    target_category TEXT,
    product_interest TEXT,
    lead_limit_per_run INTEGER NOT NULL DEFAULT 50,
    min_score INTEGER NOT NULL DEFAULT 0,
    schedule TEXT NOT NULL DEFAULT 'manual',
    auto_assign INTEGER NOT NULL DEFAULT 0,
    auto_followup INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES agents(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_run_at TEXT,
    next_run_at TEXT,
    leads_discovered INTEGER NOT NULL DEFAULT 0,
    leads_qualified INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_number TEXT UNIQUE,
    campaign_id INTEGER REFERENCES lead_campaigns(id),
    source TEXT NOT NULL,
    source_ref TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    company TEXT,
    website TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    category TEXT,
    notes TEXT,
    raw_payload TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    temperature TEXT NOT NULL DEFAULT 'Unqualified',
    score_explanation TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to INTEGER REFERENCES agents(id),
    customer_id INTEGER REFERENCES customers(id),
    converted_order_id INTEGER REFERENCES orders(id),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by INTEGER REFERENCES agents(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_discovery_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES lead_campaigns(id),
    source TEXT NOT NULL,
    triggered_by TEXT NOT NULL DEFAULT 'scheduler',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    leads_found INTEGER NOT NULL DEFAULT 0,
    leads_qualified INTEGER NOT NULL DEFAULT 0,
    leads_rejected INTEGER NOT NULL DEFAULT 0,
    leads_duplicate INTEGER NOT NULL DEFAULT 0,
    errors TEXT
  );

  CREATE TABLE IF NOT EXISTS lead_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    daily_lead_cap INTEGER NOT NULL DEFAULT 500,
    webhook_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
`);

const agentColumns = db.prepare("PRAGMA table_info(agents)").all().map((c) => c.name);
if (!agentColumns.includes("email")) {
  db.exec("ALTER TABLE agents ADD COLUMN email TEXT");
}

const quotationColumns = db.prepare("PRAGMA table_info(quotations)").all().map((c) => c.name);
const quotationColumnsToAdd = {
  customer_type: "TEXT",
  branch: "TEXT",
  lead_type: "TEXT",
  payment_method: "TEXT",
  package: "TEXT",
  additional_discount_amount: "REAL NOT NULL DEFAULT 0",
};
for (const [column, type] of Object.entries(quotationColumnsToAdd)) {
  if (!quotationColumns.includes(column)) {
    db.exec(`ALTER TABLE quotations ADD COLUMN ${column} ${type}`);
  }
}

function seedIfEmpty(table, rows, insertSql) {
  const count = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  if (count > 0) return;

  const insert = db.prepare(insertSql);
  db.exec("BEGIN");
  for (const row of rows) insert.run(row);
  db.exec("COMMIT");
}

seedIfEmpty(
  "branches",
  [{ name: "ManForce CRM" }, { name: "Delhi Branch" }, { name: "Mathura Branch" }],
  "INSERT INTO branches (name) VALUES (@name)"
);

db.prepare("UPDATE branches SET name = 'ManForce CRM' WHERE name = 'HINDVED HEALTHCARE'").run();

seedIfEmpty(
  "lead_settings",
  [{ id: 1, dailyLeadCap: 500, webhookEnabled: 1 }],
  "INSERT INTO lead_settings (id, daily_lead_cap, webhook_enabled) VALUES (@id, @dailyLeadCap, @webhookEnabled)"
);

seedIfEmpty(
  "products",
  [
    { category: "HERBAL", title: "Dr. Advice", mrp: 3000, rate: 2678.57, taxPercent: 12 },
    { category: "HERBAL", title: "Joint Pain Oil", mrp: 899, rate: 749, taxPercent: 12 },
    { category: "HERBAL", title: "Immunity Booster Capsules", mrp: 1299, rate: 1099, taxPercent: 12 },
    { category: "HERBAL", title: "Digestive Care Syrup", mrp: 599, rate: 499, taxPercent: 12 },
    { category: "HERBAL", title: "Skin Care Cream", mrp: 749, rate: 629, taxPercent: 18 },
    { category: "HERBAL", title: "Hair Growth Oil", mrp: 999, rate: 849, taxPercent: 18 },
    { category: "HERBAL", title: "Diabetes Care Tablets", mrp: 1499, rate: 1249, taxPercent: 12 },
    { category: "HERBAL", title: "Weight Management Powder", mrp: 1199, rate: 999, taxPercent: 12 },
    { category: "HERBAL", title: "Stress Relief Capsules", mrp: 899, rate: 749, taxPercent: 12 },
    { category: "HERBAL", title: "Cough Relief Syrup", mrp: 349, rate: 289, taxPercent: 12 },
  ],
  "INSERT INTO products (category, title, mrp, rate, tax_percent) VALUES (@category, @title, @mrp, @rate, @taxPercent)"
);

const agentCount = db.prepare("SELECT COUNT(*) AS count FROM agents").get().count;
const DEFAULT_ADMIN_EMAIL = "vivekprakashgautam1@gmail.com";

if (agentCount === 0) {
  const adminPassword = "Admin@123";
  const agentPassword = "Agent@123";

  db.prepare(
    "INSERT INTO agents (username, password_hash, full_name, extension, role, email) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("admin", bcrypt.hashSync(adminPassword, 10), "Admin", "2000", "admin", DEFAULT_ADMIN_EMAIL);

  db.prepare(
    "INSERT INTO agents (username, password_hash, full_name, extension, role) VALUES (?, ?, ?, ?, ?)"
  ).run("agent1", bcrypt.hashSync(agentPassword, 10), "Yogesh Bhatt", "2007", "agent");

  console.log("Seeded default logins:");
  console.log(`  admin  / ${adminPassword}`);
  console.log(`  agent1 / ${agentPassword}`);
} else {
  db.prepare("UPDATE agents SET email = ? WHERE username = 'admin' AND (email IS NULL OR email = '')").run(
    DEFAULT_ADMIN_EMAIL
  );
}

module.exports = db;
