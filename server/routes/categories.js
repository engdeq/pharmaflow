const express = require("express");
const Category = require("../models/Category");
const Medicine = require("../models/Medicine");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
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
  requirePermission("categories.view", "medicines.view"),
  asyncHandler(async (req, res) => {
    const categories = await Category.find(withTenant(req)).sort({ name: 1 });
    const withCounts = await Promise.all(
      categories.map(async (cat) => ({
        ...cat.toObject(),
        medicinesCount: await Medicine.countDocuments(
          withTenant(req, { category: cat._id })
        ),
      }))
    );
    return ok(res, withCounts);
  })
);

router.post(
  "/",
  requirePermission("categories.create"),
  asyncHandler(async (req, res) => {
    const category = await Category.create(tenantPayload(req, req.body));
    return ok(res, category, "Category created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("categories.edit"),
  asyncHandler(async (req, res) => {
    const category = await findTenantDoc(Category, req, req.params.id);
    if (!category) return denyCrossTenant(res);
    Object.assign(category, sanitizeTenantPayload(req.body));
    await category.save();
    return ok(res, category, "Category updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("categories.delete"),
  asyncHandler(async (req, res) => {
    const used = await Medicine.countDocuments(
      withTenant(req, { category: req.params.id })
    );
    if (used > 0) return fail(res, "Category has medicines.", 400);
    const category = await findTenantDoc(Category, req, req.params.id);
    if (!category) return denyCrossTenant(res);
    await category.deleteOne();
    return ok(res, null, "Category deleted.");
  })
);

module.exports = router;
