const express = require("express");
const Supplier = require("../models/Supplier");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const {
  withTenant,
  findTenantDoc,
  denyCrossTenant,
  tenantPayload,
} = require("../utils/tenantScope");

const router = express.Router();
router.use(authenticate);
router.use(requireTenant);

router.get(
  "/",
  requirePermission("suppliers.view"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = withTenant(req, {});
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { companyName: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];
    }
    const items = await Supplier.find(filter).sort({ name: 1 });
    return ok(res, items);
  })
);

router.post(
  "/",
  requirePermission("suppliers.create"),
  asyncHandler(async (req, res) => {
    const supplier = await Supplier.create(tenantPayload(req, req.body));
    return ok(res, supplier, "Supplier created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("suppliers.edit"),
  asyncHandler(async (req, res) => {
    const supplier = await findTenantDoc(Supplier, req, req.params.id);
    if (!supplier) return denyCrossTenant(res);
    Object.assign(supplier, sanitizeTenantPayload(req.body));
    await supplier.save();
    return ok(res, supplier, "Supplier updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("suppliers.delete"),
  asyncHandler(async (req, res) => {
    const supplier = await findTenantDoc(Supplier, req, req.params.id);
    if (!supplier) return denyCrossTenant(res);
    await supplier.deleteOne();
    return ok(res, null, "Supplier deleted.");
  })
);

module.exports = router;
