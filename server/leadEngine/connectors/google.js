// Stub — real Google-based business/prospect discovery requires a Google
// Places/Business Profile API key. Set GOOGLE_PLACES_API_KEY to enable;
// until then this reports itself as "not configured".

module.exports = {
  key: "google",
  name: "Google Business",
  configured: () => !!process.env.GOOGLE_PLACES_API_KEY,
  async discover() {
    throw new Error("Google Business connector is not configured. Set GOOGLE_PLACES_API_KEY to enable.");
  },
};
