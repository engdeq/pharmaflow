const express = require("express");
const Supplier = require("../models/Supplier");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("suppliers.view"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, "i") },
            { companyName: new RegExp(q, "i") },
            { phone: new RegExp(q, "i") },
          ],
        }
      : {};
    const items = await Supplier.find(filter).sort({ name: 1 });
    return ok(res, items);
  })
);

router.post(
  "/",
  requirePermission("suppliers.create"),
  asyncHandler(async (req, res) => {
    const supplier = await Supplier.create(req.body);
    return ok(res, supplier, "Supplier created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("suppliers.edit"),
  asyncHandler(async (req, res) => {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!supplier) return fail(res, "Supplier not found.", 404);
    return ok(res, supplier, "Supplier updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("suppliers.delete"),
  asyncHandler(async (req, res) => {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return fail(res, "Supplier not found.", 404);
    return ok(res, null, "Supplier deleted.");
  })
);

module.exports = router;
