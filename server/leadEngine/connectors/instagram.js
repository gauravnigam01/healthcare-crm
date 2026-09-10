// Stub — real Instagram lead discovery requires Instagram Graph API access
// (via a linked Meta Business account). Set INSTAGRAM_ACCESS_TOKEN to
// enable; until then this reports itself as "not configured".

module.exports = {
  key: "instagram",
  name: "Instagram",
  configured: () => !!process.env.INSTAGRAM_ACCESS_TOKEN,
  async discover() {
    throw new Error("Instagram connector is not configured. Set INSTAGRAM_ACCESS_TOKEN to enable.");
  },
};
