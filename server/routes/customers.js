const express = require("express");
const Customer = require("../models/Customer");
const Sale = require("../models/Sale");
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
  requirePermission("customers.view"),
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = withTenant(req, {});
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }
    const items = await Customer.find(filter).sort({ name: 1 });
    return ok(res, items);
  })
);

router.get(
  "/:id/history",
  requirePermission("customers.view"),
  asyncHandler(async (req, res) => {
    const customer = await findTenantDoc(Customer, req, req.params.id);
    if (!customer) return denyCrossTenant(res);
    const sales = await Sale.find(withTenant(req, { customer: customer._id }))
      .sort({ createdAt: -1 })
      .limit(50);
    return ok(res, sales);
  })
);

router.post(
  "/",
  requirePermission("customers.create"),
  asyncHandler(async (req, res) => {
    const customer = await Customer.create(tenantPayload(req, req.body));
    return ok(res, customer, "Customer created.", 201);
  })
);

router.put(
  "/:id",
  requirePermission("customers.edit"),
  asyncHandler(async (req, res) => {
    const customer = await findTenantDoc(Customer, req, req.params.id);
    if (!customer) return denyCrossTenant(res);
    Object.assign(customer, sanitizeTenantPayload(req.body));
    await customer.save();
    return ok(res, customer, "Customer updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("customers.delete"),
  asyncHandler(async (req, res) => {
    const customer = await findTenantDoc(Customer, req, req.params.id);
    if (!customer) return denyCrossTenant(res);
    await customer.deleteOne();
    return ok(res, null, "Customer deleted.");
  })
);

module.exports = router;
