const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const agentRoutes = require("./routes/agents");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const configRoutes = require("./routes/config");
const orderRoutes = require("./routes/orders");
const quotationRoutes = require("./routes/quotations");
const callLogRoutes = require("./routes/callLogs");
const briefingRoutes = require("./routes/briefings");
const callTransferRoutes = require("./routes/callTransfer");

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigin = process.env.FRONTEND_URL;

app.use(cors(allowedOrigin ? { origin: allowedOrigin } : {}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/config", configRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/call-logs", callLogRoutes);
app.use("/api/briefings", briefingRoutes);
app.use("/api/call-transfer", callTransferRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Healthcare CRM API running on http://localhost:${PORT}`);
});
