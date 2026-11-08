const express = require("express");
const MedicineBatch = require("../models/MedicineBatch");
const InventoryTransaction = require("../models/InventoryTransaction");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { addStock } = require("../services/stockService");
const { writeAudit } = require("../services/auditService");
const { withTenant } = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);

router.get(
  "/",
  requirePermission("inventory.view"),
  asyncHandler(async (req, res) => {
    const batches = await MedicineBatch.find(
      withTenant(req, { quantity: { $gt: 0 } })
    )
      .populate("medicine", "name sku minStock unit")
      .populate("supplier", "name")
      .sort({ expiryDate: 1 });
    return ok(res, batches);
  })
);

router.get(
  "/transactions",
  requirePermission("inventory.view"),
  asyncHandler(async (req, res) => {
    const items = await InventoryTransaction.find(withTenant(req))
      .populate("medicine", "name")
      .populate("performedBy", "username")
      .sort({ createdAt: -1 })
      .limit(100);
    return ok(res, items);
  })
);

router.post(
  "/adjust",
  requirePermission("inventory.adjust"),
  asyncHandler(async (req, res) => {
    const { medicineId, batchNumber, quantity, expiryDate, notes } = req.body;
    if (!medicineId || !batchNumber || quantity == null) {
      return fail(res, "medicineId, batchNumber and quantity are required.");
    }

    const qty = Number(quantity);
    if (qty === 0) return fail(res, "Quantity cannot be zero.");

    if (qty > 0) {
      const batch = await addStock({
        medicineId,
        batchNumber,
        quantity: qty,
        expiryDate: expiryDate || new Date(Date.now() + 365 * 86400000),
        type: "adjustment",
        reference: notes || "Stock adjustment",
        userId: req.user._id,
        tenantId: req.tenantId,
      });
      await writeAudit({
        user: req.user,
        action: "adjust",
        module: "inventory",
        description: `Stock in ${qty} for batch ${batchNumber}`,
        ipAddress: req.ip,
        tenantId: req.tenantId,
      });
      return ok(res, batch, "Stock adjusted.");
    }

    const batch = await MedicineBatch.findOne(
      withTenant(req, { medicine: medicineId, batchNumber })
    );
    if (!batch) return fail(res, "Batch not found.", 404);
    if (batch.quantity < Math.abs(qty)) {
      return fail(res, "Not enough stock to remove.");
    }

    const previousQty = batch.quantity;
    batch.quantity += qty; // qty negative
    await batch.save();
    await InventoryTransaction.create({
      tenantId: req.tenantId,
      medicine: medicineId,
      batch: batch._id,
      type: "adjustment",
      quantity: qty,
      previousQty,
      newQty: batch.quantity,
      notes: notes || "",
      performedBy: req.user._id,
    });

    await writeAudit({
      user: req.user,
      action: "adjust",
      module: "inventory",
      description: `Stock out ${Math.abs(qty)} for batch ${batchNumber}`,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });

    return ok(res, batch, "Stock adjusted.");
  })
);

module.exports = router;
