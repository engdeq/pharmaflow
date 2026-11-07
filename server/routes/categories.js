const express = require("express");
const Category = require("../models/Category");
const Medicine = require("../models/Medicine");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("categories.view", "medicines.view"),
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    const withCounts = await Promise.all(
      categories.map(async (cat) => ({
        ...cat.toObject(),
        medicinesCount: await Medicine.countDocuments({ category: cat._id }),
      }))
    );
    return ok(res, withCounts);
  })
);

router.post(
  "/",
  requirePermission("categories.create"),
  asyncHandler(async (req, res) => {
    const category = await Category.create(req.body);
    return ok(res, category, "Category created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("categories.edit"),
  asyncHandler(async (req, res) => {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!category) return fail(res, "Category not found.", 404);
    return ok(res, category, "Category updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("categories.delete"),
  asyncHandler(async (req, res) => {
    const used = await Medicine.countDocuments({ category: req.params.id });
    if (used > 0) return fail(res, "Category has medicines.", 400);
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return fail(res, "Category not found.", 404);
    return ok(res, null, "Category deleted.");
  })
);

module.exports = router;
