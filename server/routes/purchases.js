const express = require("express");
const mongoose = require("mongoose");
const Purchase = require("../models/Purchase");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { addStock } = require("../services/stockService");
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

function purchaseNumber() {
  return `P-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

router.get(
  "/",
  requirePermission("purchases.view"),
  asyncHandler(async (req, res) => {
    const items = await Purchase.find(withTenant(req))
      .populate("supplier", "name")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });
    return ok(res, items);
  })
);

router.post(
  "/",
  requirePermission("purchases.create"),
  asyncHandler(async (req, res) => {
    const { supplierId, items, paymentStatus = "pending" } = req.body;
    if (!supplierId || !items?.length) {
      return fail(res, "Supplier and items are required.");
    }

    const mapped = items.map((item) => ({
      medicine: item.medicineId,
      name: item.name,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      total: item.quantity * item.purchasePrice,
    }));

    const totalCost = mapped.reduce((s, i) => s + i.total, 0);
    const purchase = await Purchase.create(
      tenantPayload(req, {
        purchaseNumber: purchaseNumber(),
        supplier: supplierId,
        createdBy: req.user._id,
        items: mapped,
        totalCost,
        paymentStatus,
        status: "draft",
      })
    );

    return ok(res, purchase, "Purchase created.", 201);
  })
);

router.post(
  "/:id/approve",
  requirePermission("purchases.approve"),
  asyncHandler(async (req, res) => {
    const purchase = await findTenantDoc(Purchase, req, req.params.id);
    if (!purchase) return denyCrossTenant(res);
    if (purchase.status === "approved") {
      return fail(res, "Purchase already approved.");
    }

    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }

    try {
      for (const item of purchase.items) {
        await addStock({
          medicineId: item.medicine,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          purchasePrice: item.purchasePrice,
          supplierId: purchase.supplier,
          type: "purchase",
          reference: purchase.purchaseNumber,
          userId: req.user._id,
          session,
          tenantId: req.tenantId,
        });
      }

      purchase.status = "approved";
      purchase.approvedBy = req.user._id;
      purchase.approvedAt = new Date();
      await purchase.save(session ? { session } : undefined);

      if (session) await session.commitTransaction();

      await writeAudit({
        user: req.user,
        action: "approve",
        module: "purchases",
        description: `Approved purchase ${purchase.purchaseNumber}`,
        ipAddress: req.ip,
        tenantId: req.tenantId,
      });

      return ok(res, purchase, "Purchase approved and stock updated.");
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          /* ignore */
        }
      }
      return fail(res, error.message || "Approval failed.", 400);
    } finally {
      if (session) session.endSession();
    }
  })
);

module.exports = router;
