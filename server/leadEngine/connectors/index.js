const csvImport = require("./csvImport");
const websiteWebhook = require("./websiteWebhook");
const meta = require("./meta");
const instagram = require("./instagram");
const google = require("./google");
const thirdPartyApi = require("./thirdPartyApi");

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

const registry = {
  [manual.key]: manual,
  [csvImport.key]: csvImport,
  [websiteWebhook.key]: websiteWebhook,
  [meta.key]: meta,
  [instagram.key]: instagram,
  [google.key]: google,
  [thirdPartyApi.key]: thirdPartyApi,
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
