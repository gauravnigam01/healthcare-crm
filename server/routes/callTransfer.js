const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// No real telephony/PBX is connected — this just logs the intent so the
// UI button isn't dead. Swap this out if a real transfer provider is added later.
router.post("/", (req, res) => {
  const { toExtension, note } = req.body || {};

  if (!toExtension) {
    return res.status(400).json({ error: "Target extension is required." });
  }

  res.status(201).json({
    ok: true,
    message: `Transfer to extension ${toExtension} logged (simulated — no telephony provider connected).`,
    note: note || null,
  });
});

module.exports = router;
