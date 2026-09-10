// Real connector — no external API needed. Takes already-parsed CSV rows
// (parsing happens client-side, mirroring src/utils/csv.js) and maps them
// into the raw-lead shape the pipeline expects.

module.exports = {
  key: "csv_import",
  name: "CSV Import",
  configured: true,
  async discover({ rows }) {
    return (rows || []).map((row) => ({
      name: row.name || "",
      phone: (row.phone || "").replace(/\D/g, "") || null,
      email: row.email || null,
      company: row.company || null,
      website: row.website || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      category: row.category || null,
      notes: row.notes || null,
      sourceRef: null,
      rawPayload: row,
    }));
  },
};
