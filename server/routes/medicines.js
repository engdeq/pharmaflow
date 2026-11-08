const express = require("express");
const Medicine = require("../models/Medicine");
const MedicineBatch = require("../models/MedicineBatch");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
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

async function attachStock(medicines, tenantId) {
  const ids = medicines.map((m) => m._id);
  const batches = await MedicineBatch.find({
    tenantId,
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
    const filter = withTenant(req, {});
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

    const items = await attachStock(rows, req.tenantId);
    return ok(res, { items, total, page, limit });
  })
);

router.get(
  "/search",
  requirePermission("medicines.view", "sales.create"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q) return ok(res, []);
    const rows = await Medicine.find(
      withTenant(req, {
        isActive: true,
        $or: [
          { name: new RegExp(q, "i") },
          { barcode: q },
          { sku: q },
        ],
      })
    )
      .limit(20)
      .populate("category", "name");
    return ok(res, await attachStock(rows, req.tenantId));
  })
);

router.get(
  "/:id",
  requirePermission("medicines.view"),
  asyncHandler(async (req, res) => {
    const medicine = await findTenantDoc(Medicine, req, req.params.id);
    if (!medicine) return denyCrossTenant(res);
    await medicine.populate("category", "name");
    await medicine.populate("supplier", "name");
    const batches = await MedicineBatch.find(
      withTenant(req, { medicine: medicine._id })
    ).sort({ expiryDate: 1 });
    const [enriched] = await attachStock([medicine], req.tenantId);
    return ok(res, { ...enriched, batches });
  })
);

router.post(
  "/",
  requirePermission("medicines.create"),
  asyncHandler(async (req, res) => {
    const payload = tenantPayload(req, req.body);
    delete payload.initialBatch;
    const medicine = await Medicine.create(payload);
    if (req.body.initialBatch) {
      const b = req.body.initialBatch;
      if (b.batchNumber && b.quantity && b.expiryDate) {
        await MedicineBatch.create({
          tenantId: req.tenantId,
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
      tenantId: req.tenantId,
    });
    return ok(res, medicine, "Medicine created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("medicines.edit"),
  asyncHandler(async (req, res) => {
    const medicine = await findTenantDoc(Medicine, req, req.params.id);
    if (!medicine) return denyCrossTenant(res);
    const previousValues = medicine.toObject();
    const updates = sanitizeTenantPayload(req.body);
    delete updates.initialBatch;
    Object.assign(medicine, updates);
    await medicine.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "medicines",
      description: `Updated medicine ${medicine.name}`,
      previousValues,
      newValues: medicine,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, medicine, "Medicine updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("medicines.delete"),
  asyncHandler(async (req, res) => {
    const medicine = await findTenantDoc(Medicine, req, req.params.id);
    if (!medicine) return denyCrossTenant(res);
    await medicine.deleteOne();
    await MedicineBatch.deleteMany(withTenant(req, { medicine: medicine._id }));
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "medicines",
      description: `Deleted medicine ${medicine.name}`,
      previousValues: medicine,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, null, "Medicine deleted.");
  })
);

module.exports = router;
