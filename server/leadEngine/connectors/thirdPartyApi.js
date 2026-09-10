// Stub — for any authorized third-party lead/business-data provider
// (e.g. Apollo, Clearbit, ZoomInfo, a business directory API). Set
// THIRD_PARTY_LEAD_API_KEY to enable; until then this reports itself as
// "not configured".

module.exports = {
  key: "third_party_api",
  name: "Third-Party Lead API",
  configured: () => !!process.env.THIRD_PARTY_LEAD_API_KEY,
  async discover() {
    throw new Error("Third-party lead API connector is not configured. Set THIRD_PARTY_LEAD_API_KEY to enable.");
  },
};
