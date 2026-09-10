const csvImport = require("./csvImport");
const websiteWebhook = require("./websiteWebhook");

const manual = {
  key: "manual",
  name: "Manual Entry",
  configured: true,
  async discover({ payload }) {
    return [
      {
        name: payload?.name || "",
        phone: payload?.phone || null,
        email: payload?.email || null,
        company: payload?.company || null,
        website: payload?.website || null,
        city: payload?.city || null,
        state: payload?.state || null,
        pincode: payload?.pincode || null,
        category: payload?.category || null,
        notes: payload?.notes || null,
        sourceRef: null,
        rawPayload: payload,
      },
    ];
  },
};

// More connectors (websiteWebhook, meta, instagram, google, thirdPartyApi)
// are registered here as they're built — see the build plan phases.
const registry = {
  [manual.key]: manual,
  [csvImport.key]: csvImport,
  [websiteWebhook.key]: websiteWebhook,
};

function getConnector(key) {
  return registry[key];
}

function listConnectors() {
  return Object.values(registry).map((c) => ({
    key: c.key,
    name: c.name,
    configured: typeof c.configured === "function" ? c.configured() : !!c.configured,
  }));
}

module.exports = { registry, getConnector, listConnectors };
