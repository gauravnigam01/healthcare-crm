// Stub — real Meta/Facebook Lead Ads integration requires a Meta Business
// app + Graph API access token. Set META_ACCESS_TOKEN to enable; until then
// this reports itself as "not configured" rather than faking data.

module.exports = {
  key: "meta",
  name: "Meta Lead Ads",
  configured: () => !!process.env.META_ACCESS_TOKEN,
  async discover() {
    throw new Error("Meta Lead Ads connector is not configured. Set META_ACCESS_TOKEN to enable.");
  },
};
