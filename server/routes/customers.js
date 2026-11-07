const express = require("express");
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  requirePermission("customers.view"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, "i") },
            { phone: new RegExp(q, "i") },
            { email: new RegExp(q, "i") },
          ],
        }
      : {};
    const items = await Customer.find(filter).sort({ name: 1 });
    return ok(res, items);
  })
);

router.get(
  "/:id/history",
  requirePermission("customers.view"),
  asyncHandler(async (req, res) => {
    const sales = await Sale.find({ customer: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    return ok(res, sales);
  })
);

router.post(
  "/",
  requirePermission("customers.create"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.create(req.body);
    return ok(res, customer, "Customer created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("customers.edit"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!customer) return fail(res, "Customer not found.", 404);
    return ok(res, customer, "Customer updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("customers.delete"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return fail(res, "Customer not found.", 404);
    return ok(res, null, "Customer deleted.");
  })
);

module.exports = router;
