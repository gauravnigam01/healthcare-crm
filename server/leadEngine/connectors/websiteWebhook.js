// Real connector — accepts a single inbound JSON payload from an external
// source (website contact form, Zapier/Make automation, Meta Lead Ads
// webhook forwarder, WhatsApp Business forwarder, etc.) posted to
// POST /api/leads/webhook. Requires LEAD_WEBHOOK_SECRET to be set.

module.exports = {
  key: "website_webhook",
  name: "Website Webhook",
  configured: () => !!process.env.LEAD_WEBHOOK_SECRET,
  async discover({ payload }) {
    return [
      {
        name: payload?.name || "",
        phone: payload?.phone || payload?.mobile || null,
        email: payload?.email || null,
        company: payload?.company || null,
        website: payload?.website || null,
        city: payload?.city || null,
        state: payload?.state || null,
        pincode: payload?.pincode || null,
        category: payload?.category || null,
        notes: payload?.message || payload?.notes || null,
        sourceRef: payload?.id || payload?.formId || null,
        rawPayload: payload,
      },
    ];
  },
};
