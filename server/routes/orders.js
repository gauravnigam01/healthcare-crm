const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { nextOrderNumber } = require("../utils/ids");
const { computeOrderTotals } = require("../utils/totals");

const router = express.Router();

router.use(requireAuth);

function upsertCustomer(payload) {
  const { mobile, name, customerType, pincode, city, state, address } = payload;

  if (!mobile) {
    throw Object.assign(new Error("Mobile number is required."), { status: 400 });
  }

  const existing = db.prepare("SELECT * FROM customers WHERE mobile = ?").get(mobile);

  if (existing) {
    db.prepare(
      `UPDATE customers SET name = ?, customer_type = ?, pincode = ?, city = ?, state = ?, address = ?
       WHERE id = ?`
    ).run(
      name || existing.name,
      customerType || existing.customer_type,
      pincode || existing.pincode,
      city || existing.city,
      state || existing.state,
      address || existing.address,
      existing.id
    );
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO customers (mobile, name, customer_type, pincode, city, state, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(mobile, name || null, customerType || "Ecommerce", pincode || null, city || null, state || null, address || null);

  return result.lastInsertRowid;
}

function toPublicOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    category: row.category,
    title: row.title,
    qty: row.qty,
    mrp: row.mrp,
    rate: row.rate,
    discountPercent: row.discount_percent,
    amount: row.amount,
    taxPercent: row.tax_percent,
    taxAmount: row.tax_amount,
    total: row.total,
  };
}

function loadOrder(orderId) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return null;

  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(order.customer_id);
  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .all(orderId);
  const bookedByAgent = db.prepare("SELECT full_name FROM agents WHERE id = ?").get(order.order_booked_by);
  const createdByAgent = db.prepare("SELECT full_name FROM agents WHERE id = ?").get(order.order_created_by);

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    statusDate: order.status_date,
    createdAt: order.created_at,
    updatedAt: order.updated_at,

    mobile: customer ? customer.mobile : null,
    name: order.name,
    customerType: order.customer_type,
    branch: order.branch,
    pincode: order.pincode,
    city: order.city,
    state: order.state,
    address: order.address,

    sameAsShipping: !!order.same_as_shipping,
    billingAddrMobile: order.billing_addr_mobile,
    billingGst: order.billing_gst,
    billingEmail: order.billing_email,
    billingAltMobile1: order.billing_alt_mobile1,

    leadType: order.lead_type,
    paymentMethod: order.payment_method,
    transactionId: order.transaction_id,
    package: order.package,
    advancePayment: order.advance_payment,
    courierCharges: order.courier_charges,
    orderBookedBy: order.order_booked_by,
    orderBookedByName: bookedByAgent ? bookedByAgent.full_name : null,
    orderCreatedBy: order.order_created_by,
    orderCreatedByName: createdByAgent ? createdByAgent.full_name : null,
    vppDiscountPercent: order.vpp_discount_percent,
    dispatchDate: order.dispatch_date,
    expectedDelivery: order.expected_delivery,

    subtotalAmount: order.subtotal_amount,
    additionalDiscountAmount: order.additional_discount_amount,
    vppDiscountAmount: order.vpp_discount_amount,
    netPayable: order.net_payable,
    grandTotal: order.grand_total,
    paymentStatus: order.payment_status,

    notes: order.notes,
    couponCode: order.coupon_code,

    courierName: order.courier_name,
    docketNumber: order.docket_number,
    deliveryDate: order.delivery_date,

    masterDetails: {
      amountAdvised: order.amount_advised,
      age: order.master_age,
      weight: order.master_weight,
      height: order.master_height,
      problem: order.master_problem,
      maritalStatus: order.master_marital_status,
      district: order.master_district,
      postOffice: order.master_post_office,
      landmark: order.master_landmark,
      medicineAdvised: order.medicine_advised,
      ordo: order.master_ordo,
      followUpAgentId: order.follow_up_agent_id,
      note: order.master_note,
    },

    items: items.map(toPublicOrderItem),
  };
}

router.post("/", (req, res) => {
  const body = req.body || {};

  if (!body.name || !body.pincode || !body.city || !body.state || !body.address) {
    return res.status(400).json({ error: "Please fill all delivery details." });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "Please add at least one product." });
  }

  const totals = computeOrderTotals({
    items: body.items,
    additionalDiscountAmount: body.additionalDiscountAmount,
    vppDiscountPercent: body.vppDiscountPercent,
    courierCharges: body.courierCharges,
  });

  let orderId;

  db.exec("BEGIN");
  try {
    const customerId = upsertCustomer(body);
    const orderNumber = nextOrderNumber();
    const md = body.masterDetails || {};

    const result = db
      .prepare(
        `INSERT INTO orders (
          order_number, customer_id, quotation_id,
          name, customer_type, branch, pincode, city, state, address,
          same_as_shipping, billing_addr_mobile, billing_gst, billing_email, billing_alt_mobile1,
          lead_type, payment_method, transaction_id, package, advance_payment, courier_charges,
          order_booked_by, order_created_by, vpp_discount_percent, dispatch_date, expected_delivery,
          subtotal_amount, additional_discount_amount, vpp_discount_amount, net_payable, grand_total,
          notes, coupon_code,
          amount_advised, master_age, master_weight, master_height, master_problem, master_marital_status,
          master_district, master_post_office, master_landmark, medicine_advised, master_ordo,
          follow_up_agent_id, master_note
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?
        )`
      )
      .run(
        orderNumber,
        customerId,
        body.quotationId || null,

        body.name,
        body.customerType || "Ecommerce",
        body.branch || "",
        body.pincode,
        body.city,
        body.state,
        body.address,

        body.sameAsShipping === false ? 0 : 1,
        body.billingAddrMobile || null,
        body.billingGst || null,
        body.billingEmail || null,
        body.billingAltMobile1 || null,

        body.leadType || "Outbound",
        body.paymentMethod || "COD",
        body.transactionId || null,
        body.package || null,
        Number(body.advancePayment) || 0,
        Number(body.courierCharges) || 0,

        req.agentId,
        req.agentId,
        Number(body.vppDiscountPercent) || 0,
        body.dispatchDate || null,
        body.expectedDelivery || null,

        totals.subtotalAmount,
        totals.additionalDiscountAmount,
        totals.vppDiscountAmount,
        totals.netPayable,
        totals.grandTotal,

        body.notes || null,
        body.couponCode || null,

        md.amountAdvised ?? null,
        md.age ?? null,
        md.weight ?? null,
        md.height ?? null,
        md.problem ?? null,
        md.maritalStatus ?? null,
        md.district ?? null,
        md.postOffice ?? null,
        md.landmark ?? null,
        md.medicineAdvised ?? null,
        md.ordo ?? null,
        md.followUpAgentId ?? null,
        md.note ?? null
      );

    orderId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, category, title, qty, mrp, rate, discount_percent, amount, tax_percent, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of totals.items) {
      insertItem.run(
        orderId,
        item.productId,
        item.category,
        item.title,
        item.qty,
        item.mrp,
        item.rate,
        item.discountPercent,
        item.amount,
        item.taxPercent,
        item.taxAmount,
        item.total
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || "Failed to create order." });
  }

  res.status(201).json(loadOrder(orderId));
});

router.get("/", (req, res) => {
  const { dateFrom, dateTo, status, bookedBy, page = 1, pageSize = 10 } = req.query;

  const conditions = [];
  const params = [];

  if (dateFrom) {
    conditions.push("date(o.created_at) >= date(?)");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("date(o.created_at) <= date(?)");
    params.push(dateTo);
  }
  if (status && status !== "All") {
    conditions.push("o.status = ?");
    params.push(status);
  }
  if (bookedBy && bookedBy !== "All") {
    conditions.push("o.order_booked_by = ?");
    params.push(bookedBy);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const totalRecords = db
    .prepare(`SELECT COUNT(*) AS count FROM orders o ${whereClause}`)
    .get(...params).count;

  const limit = Math.max(1, Number(pageSize) || 10);
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;

  const rows = db
    .prepare(
      `SELECT
        o.id, o.order_number, o.status, o.status_date, o.created_at, o.grand_total,
        c.name AS customer_name, c.mobile AS customer_mobile,
        a.full_name AS booked_by_name,
        (SELECT title FROM order_items WHERE order_id = o.id ORDER BY id LIMIT 1) AS item_title
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       JOIN agents a ON a.id = o.order_booked_by
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  res.json({
    orders: rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      statusDate: row.status_date,
      createdAt: row.created_at,
      grandTotal: row.grand_total,
      customerName: row.customer_name,
      customerMobile: row.customer_mobile,
      bookedByName: row.booked_by_name,
      itemTitle: row.item_title,
    })),
    totalRecords,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    page: currentPage,
  });
});

router.get("/:id", (req, res) => {
  const order = loadOrder(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  res.json(order);
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Order not found." });
  }

  const body = req.body || {};

  if (!body.name || !body.pincode || !body.city || !body.state || !body.address) {
    return res.status(400).json({ error: "Please fill all delivery details." });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "Please add at least one product." });
  }

  const totals = computeOrderTotals({
    items: body.items,
    additionalDiscountAmount: body.additionalDiscountAmount,
    vppDiscountPercent: body.vppDiscountPercent,
    courierCharges: body.courierCharges,
  });

  db.exec("BEGIN");
  try {
    const md = body.masterDetails || {};

    db.prepare(
      `UPDATE orders SET
        name = ?, customer_type = ?, branch = ?, pincode = ?, city = ?, state = ?, address = ?,
        same_as_shipping = ?, billing_addr_mobile = ?, billing_gst = ?, billing_email = ?, billing_alt_mobile1 = ?,
        lead_type = ?, payment_method = ?, transaction_id = ?, package = ?, advance_payment = ?, courier_charges = ?,
        vpp_discount_percent = ?, dispatch_date = ?, expected_delivery = ?,
        subtotal_amount = ?, additional_discount_amount = ?, vpp_discount_amount = ?, net_payable = ?, grand_total = ?,
        notes = ?, coupon_code = ?,
        amount_advised = ?, master_age = ?, master_weight = ?, master_height = ?, master_problem = ?, master_marital_status = ?,
        master_district = ?, master_post_office = ?, master_landmark = ?, medicine_advised = ?, master_ordo = ?,
        follow_up_agent_id = ?, master_note = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      body.name,
      body.customerType || "Ecommerce",
      body.branch || "",
      body.pincode,
      body.city,
      body.state,
      body.address,

      body.sameAsShipping === false ? 0 : 1,
      body.billingAddrMobile || null,
      body.billingGst || null,
      body.billingEmail || null,
      body.billingAltMobile1 || null,

      body.leadType || "Outbound",
      body.paymentMethod || "COD",
      body.transactionId || null,
      body.package || null,
      Number(body.advancePayment) || 0,
      Number(body.courierCharges) || 0,

      Number(body.vppDiscountPercent) || 0,
      body.dispatchDate || null,
      body.expectedDelivery || null,

      totals.subtotalAmount,
      totals.additionalDiscountAmount,
      totals.vppDiscountAmount,
      totals.netPayable,
      totals.grandTotal,

      body.notes || null,
      body.couponCode || null,

      md.amountAdvised ?? null,
      md.age ?? null,
      md.weight ?? null,
      md.height ?? null,
      md.problem ?? null,
      md.maritalStatus ?? null,
      md.district ?? null,
      md.postOffice ?? null,
      md.landmark ?? null,
      md.medicineAdvised ?? null,
      md.ordo ?? null,
      md.followUpAgentId ?? null,
      md.note ?? null,

      req.params.id
    );

    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(req.params.id);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, category, title, qty, mrp, rate, discount_percent, amount, tax_percent, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of totals.items) {
      insertItem.run(
        req.params.id,
        item.productId,
        item.category,
        item.title,
        item.qty,
        item.mrp,
        item.rate,
        item.discountPercent,
        item.amount,
        item.taxPercent,
        item.taxAmount,
        item.total
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: err.message || "Failed to update order." });
  }

  res.json(loadOrder(req.params.id));
});

router.patch("/:id/status", (req, res) => {
  const { status } = req.body || {};
  const validStatuses = ["New Order", "Pending", "Completed"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Order not found." });
  }

  db.prepare(
    "UPDATE orders SET status = ?, status_date = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(status, req.params.id);

  res.json(loadOrder(req.params.id));
});

router.put("/:id/courier", (req, res) => {
  const { courierName, docketNumber, expectedDelivery, deliveryDate } = req.body || {};

  const existing = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Order not found." });
  }

  db.prepare(
    `UPDATE orders SET courier_name = ?, docket_number = ?, expected_delivery = ?, delivery_date = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(courierName || null, docketNumber || null, expectedDelivery || null, deliveryDate || null, req.params.id);

  res.json(loadOrder(req.params.id));
});

router.post("/:id/coupon", (req, res) => {
  const { couponCode, additionalDiscountAmount } = req.body || {};

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(req.params.id);

  const totals = computeOrderTotals({
    items: items.map((item) => ({
      category: item.category,
      title: item.title,
      productId: item.product_id,
      qty: item.qty,
      mrp: item.mrp,
      rate: item.rate,
      discountPercent: item.discount_percent,
      taxPercent: item.tax_percent,
    })),
    additionalDiscountAmount: additionalDiscountAmount ?? order.additional_discount_amount,
    vppDiscountPercent: order.vpp_discount_percent,
    courierCharges: order.courier_charges,
  });

  db.prepare(
    `UPDATE orders SET coupon_code = ?, additional_discount_amount = ?, net_payable = ?, grand_total = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(couponCode || null, totals.additionalDiscountAmount, totals.netPayable, totals.grandTotal, req.params.id);

  res.json(loadOrder(req.params.id));
});

router.post("/:id/reorder", (req, res) => {
  const source = loadOrder(req.params.id);

  if (!source) {
    return res.status(404).json({ error: "Order not found." });
  }

  const totals = computeOrderTotals({
    items: source.items,
    additionalDiscountAmount: 0,
    vppDiscountPercent: source.vppDiscountPercent,
    courierCharges: source.courierCharges,
  });

  let newOrderId;

  db.exec("BEGIN");
  try {
    const customerId = upsertCustomer({
      mobile: source.mobile,
      name: source.name,
      customerType: source.customerType,
      pincode: source.pincode,
      city: source.city,
      state: source.state,
      address: source.address,
    });

    const orderNumber = nextOrderNumber();

    const result = db
      .prepare(
        `INSERT INTO orders (
          order_number, customer_id, name, customer_type, branch, pincode, city, state, address,
          lead_type, payment_method, package, order_booked_by, order_created_by,
          vpp_discount_percent, subtotal_amount, additional_discount_amount, vpp_discount_amount,
          net_payable, grand_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        orderNumber,
        customerId,
        source.name,
        source.customerType,
        source.branch,
        source.pincode,
        source.city,
        source.state,
        source.address,
        source.leadType,
        source.paymentMethod,
        source.package,
        req.agentId,
        req.agentId,
        source.vppDiscountPercent,
        totals.subtotalAmount,
        totals.additionalDiscountAmount,
        totals.vppDiscountAmount,
        totals.netPayable,
        totals.grandTotal
      );

    newOrderId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, category, title, qty, mrp, rate, discount_percent, amount, tax_percent, tax_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of totals.items) {
      insertItem.run(
        newOrderId,
        item.productId,
        item.category,
        item.title,
        item.qty,
        item.mrp,
        item.rate,
        item.discountPercent,
        item.amount,
        item.taxPercent,
        item.taxAmount,
        item.total
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    return res.status(500).json({ error: err.message || "Failed to reorder." });
  }

  res.status(201).json(loadOrder(newOrderId));
});

router.post("/:id/notify", (req, res) => {
  const order = db.prepare("SELECT id FROM orders WHERE id = ?").get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  res.json({ ok: true, message: "Mail + SMS queued (simulated — no provider connected yet)." });
});

module.exports = router;
