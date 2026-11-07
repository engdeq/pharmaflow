const express = require("express");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const MedicineBatch = require("../models/MedicineBatch");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate, requirePermission("reports.view"));

function dateFilter(query) {
  const filter = {};
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }
  return filter;
}

router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const filter = { ...dateFilter(req.query), status: "completed" };
    const items = await Sale.find(filter)
      .populate("cashier", "username")
      .populate("customer", "name")
      .sort({ createdAt: -1 });
    const summary = items.reduce(
      (acc, s) => {
        acc.count += 1;
        acc.total += s.total;
        acc.tax += s.tax;
        return acc;
      },
      { count: 0, total: 0, tax: 0 }
    );
    return ok(res, { items, summary });
  })
);

router.get(
  "/purchases",
  asyncHandler(async (req, res) => {
    const filter = dateFilter(req.query);
    const items = await Purchase.find(filter)
      .populate("supplier", "name")
      .sort({ createdAt: -1 });
    return ok(res, items);
  })
);

router.get(
  "/inventory",
  asyncHandler(async (_req, res) => {
    const batches = await MedicineBatch.find({ quantity: { $gt: 0 } })
      .populate("medicine", "name purchasePrice sellingPrice")
      .sort({ expiryDate: 1 });
    const valuation = batches.reduce(
      (sum, b) => sum + b.quantity * (b.purchasePrice || b.medicine?.purchasePrice || 0),
      0
    );
    return ok(res, { batches, valuation });
  })
);

router.get(
  "/profit-loss",
  asyncHandler(async (req, res) => {
    const filter = { ...dateFilter(req.query), status: "completed" };
    const sales = await Sale.find(filter);
    const purchases = await Purchase.find({
      ...dateFilter(req.query),
      status: "approved",
    });
    const revenue = sales.reduce((s, x) => s + x.total, 0);
    const cogs = purchases.reduce((s, x) => s + x.totalCost, 0);
    return ok(res, {
      revenue,
      purchases: cogs,
      grossProfit: revenue - cogs,
      salesCount: sales.length,
      purchaseCount: purchases.length,
    });
  })
);

router.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    const items = await Customer.find().sort({ totalSpending: -1 });
    return ok(res, items);
  })
);

router.get(
  "/suppliers",
  asyncHandler(async (_req, res) => {
    const items = await Supplier.find().sort({ name: 1 });
    return ok(res, items);
  })
);

module.exports = router;
