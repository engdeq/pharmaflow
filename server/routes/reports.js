const express = require("express");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const MedicineBatch = require("../models/MedicineBatch");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { withTenant } = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);
router.use(requirePermission("reports.view"));

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
    const filter = withTenant(req, { ...dateFilter(req.query), status: "completed" });
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
    const filter = withTenant(req, dateFilter(req.query));
    const items = await Purchase.find(filter)
      .populate("supplier", "name")
      .sort({ createdAt: -1 });
    return ok(res, items);
  })
);

router.get(
  "/inventory",
  asyncHandler(async (req, res) => {
    const batches = await MedicineBatch.find(
      withTenant(req, { quantity: { $gt: 0 } })
    )
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
    const filter = withTenant(req, { ...dateFilter(req.query), status: "completed" });
    const sales = await Sale.find(filter);
    const purchases = await Purchase.find(
      withTenant(req, {
        ...dateFilter(req.query),
        status: "approved",
      })
    );
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
  asyncHandler(async (req, res) => {
    const items = await Customer.find(withTenant(req)).sort({ totalSpending: -1 });
    return ok(res, items);
  })
);

router.get(
  "/suppliers",
  asyncHandler(async (req, res) => {
    const items = await Supplier.find(withTenant(req)).sort({ name: 1 });
    return ok(res, items);
  })
);

module.exports = router;
