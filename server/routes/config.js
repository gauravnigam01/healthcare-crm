const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const DISPOSITION_CODES = [
  "Already Delivered",
  "Already Ordered",
  "Book Order",
  "Call Back",
  "Clinic Visit",
  "DNC",
  "Follow Up",
  "Ladies Call",
  "Language Issue",
  "Money Problem",
  "NC",
  "Not Interested",
];

const CUSTOMER_TYPES = ["Ecommerce", "Retail", "Wholesale"];
const LEAD_TYPES = ["Outbound", "Inbound", "Website", "Referral"];
const PAYMENT_METHODS = ["COD", "UPI", "Card", "Net Banking"];
const PACKAGES = ["Standard Delivery", "Express Delivery"];
const COURIER_PARTNERS = ["Delhivery", "Blue Dart", "DTDC", "India Post", "Ekart"];

router.get("/", requireAuth, (req, res) => {
  const branches = db
    .prepare("SELECT name FROM branches ORDER BY name")
    .all()
    .map((row) => row.name);

  res.json({
    branches,
    customerTypes: CUSTOMER_TYPES,
    leadTypes: LEAD_TYPES,
    paymentMethods: PAYMENT_METHODS,
    packages: PACKAGES,
    dispositionCodes: DISPOSITION_CODES,
    courierPartners: COURIER_PARTNERS,
  });
});

module.exports = router;
