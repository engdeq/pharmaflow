const express = require("express");
const Menu = require("../models/Menu");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { buildTree } = require("../services/menuService");
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

router.get(
  "/",
  requirePermission("menus.manage", "dashboard.view"),
  asyncHandler(async (req, res) => {
    const menus = await Menu.find(withTenant(req)).sort({ order: 1 }).lean();
    return ok(res, { flat: menus, tree: buildTree(menus, null) });
  })
);

router.post(
  "/",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const menu = await Menu.create(tenantPayload(req, req.body));
    await writeAudit({
      user: req.user,
      action: "create",
      module: "menus",
      description: `Created menu ${menu.label}`,
      newValues: menu,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, menu, "Menu created.", 201);
  })
);

router.put(
  "/reorder",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const items = req.body.items || [];
    await Promise.all(
      items.map((item) =>
        Menu.findOneAndUpdate(
          { _id: item.id, tenantId: req.tenantId },
          {
            order: item.order,
            parent: item.parent || null,
          }
        )
      )
    );
    return ok(res, null, "Menu order updated.");
  })
);

router.put(
  "/:id",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const prev = await findTenantDoc(Menu, req, req.params.id);
    if (!prev) return denyCrossTenant(res);
    const previousValues = prev.toObject();
    Object.assign(prev, sanitizeTenantPayload(req.body));
    await prev.save();
    await writeAudit({
      user: req.user,
      action: "update",
      module: "menus",
      description: `Updated menu ${prev.label}`,
      previousValues,
      newValues: prev,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, prev, "Menu updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const children = await Menu.countDocuments(
      withTenant(req, { parent: req.params.id })
    );
    if (children > 0) {
      return fail(res, "Remove or reassign child menus first.", 400);
    }
    const menu = await findTenantDoc(Menu, req, req.params.id);
    if (!menu) return denyCrossTenant(res);
    await menu.deleteOne();
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "menus",
      description: `Deleted menu ${menu.label}`,
      previousValues: menu,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, null, "Menu deleted.");
  })
);

module.exports = router;
