const express = require("express");
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Medicine = require("../models/Medicine");
const MedicineBatch = require("../models/MedicineBatch");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { withTenant } = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);
router.use(requirePermission("dashboard.view"));

function rangeFromQuery(query) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (query.range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "week":
      start.setDate(now.getDate() - 7);
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "custom":
      if (query.from) start.setTime(new Date(query.from).getTime());
      if (query.to) end.setTime(new Date(query.to).getTime());
      break;
    case "month":
    default:
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const { start, end } = rangeFromQuery(req.query);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const tenantId = new mongoose.Types.ObjectId(String(req.tenantId));

    const [
      salesAgg,
      todayAgg,
      monthAgg,
      totalMedicines,
      totalCustomers,
      totalSuppliers,
      lowStockBatches,
      expiredBatches,
      recentSales,
      recentPurchases,
      salesByDay,
      topMedicines,
      categoryStats,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: start, $lte: end },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: todayStart },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: monthStart },
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Medicine.countDocuments(withTenant(req, { isActive: true })),
      Customer.countDocuments(withTenant(req, { isActive: true })),
      Supplier.countDocuments(withTenant(req, { isActive: true })),
      MedicineBatch.aggregate([
        { $match: { tenantId, quantity: { $gt: 0 } } },
        {
          $lookup: {
            from: "medicines",
            localField: "medicine",
            foreignField: "_id",
            as: "med",
          },
        },
        { $unwind: "$med" },
        { $match: { "med.tenantId": tenantId } },
        {
          $group: {
            _id: "$medicine",
            qty: { $sum: "$quantity" },
            minStock: { $first: "$med.minStock" },
            name: { $first: "$med.name" },
          },
        },
        { $match: { $expr: { $lte: ["$qty", "$minStock"] } } },
      ]),
      MedicineBatch.countDocuments(
        withTenant(req, {
          quantity: { $gt: 0 },
          expiryDate: { $lt: now },
        })
      ),
      Sale.find(withTenant(req, { status: "completed" }))
        .populate("customer", "name")
        .populate("cashier", "username")
        .sort({ createdAt: -1 })
        .limit(8),
      Purchase.find(withTenant(req))
        .populate("supplier", "name")
        .sort({ createdAt: -1 })
        .limit(8),
      Sale.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: start, $lte: end },
            status: "completed",
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        {
          $match: {
            tenantId,
            createdAt: { $gte: start, $lte: end },
            status: "completed",
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            qty: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 8 },
      ]),
      Medicine.aggregate([
        { $match: { tenantId } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "cat",
          },
        },
        {
          $group: {
            _id: { $ifNull: [{ $arrayElemAt: ["$cat.name", 0] }, "Uncategorized"] },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return ok(res, {
      kpis: {
        totalSales: salesAgg[0]?.count || 0,
        totalRevenue: salesAgg[0]?.total || 0,
        todayRevenue: todayAgg[0]?.total || 0,
        monthlyRevenue: monthAgg[0]?.total || 0,
        totalMedicines,
        totalCustomers,
        totalSuppliers,
        lowStock: lowStockBatches.length,
        expired: expiredBatches,
      },
      charts: {
        salesOverview: salesByDay.map((d) => ({ date: d._id, total: d.total, count: d.count })),
        topMedicines,
        categories: categoryStats,
      },
      recentSales,
      recentPurchases,
      lowStockAlerts: lowStockBatches.slice(0, 10),
    });
  })
);

module.exports = router;
