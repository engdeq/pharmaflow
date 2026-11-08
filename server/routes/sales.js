const express = require("express");
const mongoose = require("mongoose");
const Sale = require("../models/Sale");
const Customer = require("../models/Customer");
const Settings = require("../models/Settings");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { allocateFEFO, deductStock } = require("../services/stockService");
const { writeAudit } = require("../services/auditService");
const {
  withTenant,
  findTenantDoc,
  denyCrossTenant,
  tenantPayload,
} = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);

function receiptNumber() {
  return `R-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

router.get(
  "/",
  requirePermission("sales.view"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "15", 10));
    const filter = withTenant(req, {});
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      Sale.find(filter)
        .populate("customer", "name phone")
        .populate("cashier", "username fullName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Sale.countDocuments(filter),
    ]);

    return ok(res, { items, total, page, limit });
  })
);

router.get(
  "/:id",
  requirePermission("sales.view"),
  asyncHandler(async (req, res) => {
    const sale = await findTenantDoc(Sale, req, req.params.id);
    if (!sale) return denyCrossTenant(res);
    await sale.populate("customer", "name phone email");
    await sale.populate("cashier", "username fullName");
    await sale.populate("items.medicine", "name");
    return ok(res, sale);
  })
);

router.post(
  "/",
  requirePermission("sales.create"),
  asyncHandler(async (req, res) => {
    const { items, customerId, discount = 0, paymentMethod = "cash", paymentDetails } = req.body;
    if (!items?.length) return fail(res, "Cart is empty.");

    const settings =
      req.company?.settings ||
      (await Settings.findOne({ tenantId: req.tenantId })) ||
      { taxRate: 0 };
    let session = null;

    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      const saleItems = [];
      let subtotal = 0;

      for (const item of items) {
        const qty = Number(item.quantity);
        if (!qty || qty < 1) throw new Error("Invalid quantity.");

        const allocations = await allocateFEFO(
          item.medicineId,
          qty,
          session,
          req.tenantId
        );
        const unitPrice = Number(item.unitPrice);
        const lineDiscount = Number(item.discount || 0);
        const lineTotal = unitPrice * qty - lineDiscount;
        subtotal += lineTotal;

        const medicineName = item.name || "Medicine";
        for (const alloc of allocations) {
          saleItems.push({
            medicine: item.medicineId,
            batch: alloc.batch._id,
            name: medicineName,
            quantity: alloc.quantity,
            unitPrice,
            discount: 0,
            total: unitPrice * alloc.quantity,
          });
        }

        await deductStock(allocations, {
          type: "sale",
          reference: "pending",
          userId: req.user._id,
          session,
          tenantId: req.tenantId,
        });
      }

      const tax = ((subtotal - discount) * (settings.taxRate || 0)) / 100;
      const total = Math.max(0, subtotal - discount + tax);
      const receipt = receiptNumber();

      const saleDoc = tenantPayload(req, {
        receiptNumber: receipt,
        customer: customerId || null,
        cashier: req.user._id,
        items: saleItems,
        subtotal,
        discount,
        tax,
        taxRate: settings.taxRate || 0,
        total,
        paymentMethod,
        paymentDetails: paymentDetails || {
          cash: paymentMethod === "cash" ? total : 0,
          bank: paymentMethod === "bank" ? total : 0,
        },
        status: "completed",
      });

      const sale = session
        ? (await Sale.create([saleDoc], { session }))[0]
        : await Sale.create(saleDoc);

      if (customerId) {
        await Customer.findOneAndUpdate(
          { _id: customerId, tenantId: req.tenantId },
          { $inc: { totalSpending: total } },
          session ? { session } : undefined
        );
      }

      if (session) await session.commitTransaction();

      await writeAudit({
        user: req.user,
        action: "create",
        module: "sales",
        description: `Sale ${receipt} total ${total}`,
        newValues: { receiptNumber: receipt, total },
        ipAddress: req.ip,
        tenantId: req.tenantId,
      });

      const populated = await Sale.findOne(withTenant(req, { _id: sale._id }))
        .populate("customer", "name phone")
        .populate("cashier", "username fullName");

      return ok(res, populated, "Sale completed.", 201);
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          /* ignore */
        }
      }
      return fail(res, error.message || "Sale failed.", 400);
    } finally {
      if (session) session.endSession();
    }
  })
);

module.exports = router;
