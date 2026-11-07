const express = require("express");
const Medicine = require("../models/Medicine");
const MedicineBatch = require("../models/MedicineBatch");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate);

async function attachStock(medicines) {
  const ids = medicines.map((m) => m._id);
  const batches = await MedicineBatch.find({
    medicine: { $in: ids },
    isActive: true,
    quantity: { $gt: 0 },
  });

  const stockMap = {};
  const expiryMap = {};
  batches.forEach((b) => {
    const id = String(b.medicine);
    stockMap[id] = (stockMap[id] || 0) + b.quantity;
    if (!expiryMap[id] || b.expiryDate < expiryMap[id]) {
      expiryMap[id] = b.expiryDate;
    }
  });

  return medicines.map((m) => {
    const obj = m.toObject ? m.toObject() : m;
    return {
      ...obj,
      availableQuantity: stockMap[String(m._id)] || 0,
      nearestExpiry: expiryMap[String(m._id)] || null,
    };
  });
}

router.get(
  "/",
  requirePermission("medicines.view"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "12", 10));
    const q = (req.query.q || "").trim();
    const filter = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { genericName: new RegExp(q, "i") },
        { barcode: new RegExp(q, "i") },
        { sku: new RegExp(q, "i") },
      ];
    }
    if (req.query.category) filter.category = req.query.category;

    const [rows, total] = await Promise.all([
      Medicine.find(filter)
        .populate("category", "name")
        .populate("supplier", "name")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Medicine.countDocuments(filter),
    ]);

    const items = await attachStock(rows);
    return ok(res, { items, total, page, limit });
  })
);

router.get(
  "/search",
  requirePermission("medicines.view", "sales.create"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q) return ok(res, []);
    const rows = await Medicine.find({
      isActive: true,
      $or: [
        { name: new RegExp(q, "i") },
        { barcode: q },
        { sku: q },
      ],
    })
      .limit(20)
      .populate("category", "name");
    return ok(res, await attachStock(rows));
  })
);

router.get(
  "/:id",
  requirePermission("medicines.view"),
  asyncHandler(async (req, res) => {
    const medicine = await Medicine.findById(req.params.id)
      .populate("category", "name")
      .populate("supplier", "name");
    if (!medicine) return fail(res, "Medicine not found.", 404);
    const batches = await MedicineBatch.find({ medicine: medicine._id }).sort({
      expiryDate: 1,
    });
    const [enriched] = await attachStock([medicine]);
    return ok(res, { ...enriched, batches });
  })
);

router.post(
  "/",
  requirePermission("medicines.create"),
  asyncHandler(async (req, res) => {
    const medicine = await Medicine.create(req.body);
    if (req.body.initialBatch) {
      const b = req.body.initialBatch;
      if (b.batchNumber && b.quantity && b.expiryDate) {
        await MedicineBatch.create({
          medicine: medicine._id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          purchasePrice: b.purchasePrice || medicine.purchasePrice,
          sellingPrice: b.sellingPrice || medicine.sellingPrice,
          expiryDate: b.expiryDate,
          supplier: medicine.supplier,
        });
      }
    }
    await writeAudit({
      user: req.user,
      action: "create",
      module: "medicines",
      description: `Created medicine ${medicine.name}`,
      newValues: medicine,
      ipAddress: req.ip,
    });
    return ok(res, medicine, "Medicine created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("medicines.edit"),
  asyncHandler(async (req, res) => {
    const prev = await Medicine.findById(req.params.id);
    if (!prev) return fail(res, "Medicine not found.", 404);
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    await writeAudit({
      user: req.user,
      action: "update",
      module: "medicines",
      description: `Updated medicine ${medicine.name}`,
      previousValues: prev,
      newValues: medicine,
      ipAddress: req.ip,
    });
    return ok(res, medicine, "Medicine updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("medicines.delete"),
  asyncHandler(async (req, res) => {
    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) return fail(res, "Medicine not found.", 404);
    await MedicineBatch.deleteMany({ medicine: medicine._id });
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "medicines",
      description: `Deleted medicine ${medicine.name}`,
      previousValues: medicine,
      ipAddress: req.ip,
    });
    return ok(res, null, "Medicine deleted.");
  })
);

module.exports = router;
