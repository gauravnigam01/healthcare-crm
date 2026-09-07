const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/summary", (req, res) => {
  const countByStatusToday = (status) =>
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM orders WHERE status = ? AND date(created_at) = date('now')"
      )
      .get(status).count;

  const todayOrders = db
    .prepare("SELECT COUNT(*) AS count FROM orders WHERE date(created_at) = date('now')")
    .get().count;

  const pendingOrders = db
    .prepare(
      "SELECT COUNT(*) AS count FROM orders WHERE status IN ('New Order', 'Processing', 'Shipped')"
    )
    .get().count;

  const deliveredOrders = db
    .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'Delivered'")
    .get().count;

  const cancelledOrders = db
    .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'Cancelled'")
    .get().count;

  const todayRevenue = db
    .prepare(
      "SELECT COALESCE(SUM(grand_total), 0) AS total FROM orders WHERE date(created_at) = date('now')"
    )
    .get().total;

  const totalCustomers = db.prepare("SELECT COUNT(*) AS count FROM customers").get().count;

  const pendingCallbacks = db
    .prepare(
      "SELECT COUNT(*) AS count FROM call_logs WHERE disposition = 'Call Back' AND callback_done = 0"
    )
    .get().count;

  const recentOrders = db
    .prepare(
      `SELECT o.id, o.order_number, o.status, o.grand_total, o.created_at, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
       ORDER BY o.created_at DESC LIMIT 5`
    )
    .all();

  res.json({
    todayOrders,
    todayNewOrders: countByStatusToday("New Order"),
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    todayRevenue,
    totalCustomers,
    pendingCallbacks,
    recentOrders: recentOrders.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      grandTotal: row.grand_total,
      createdAt: row.created_at,
      customerName: row.customer_name,
    })),
  });
});

module.exports = router;
