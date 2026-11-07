const express = require("express");
const Menu = require("../models/Menu");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { buildTree } = require("../services/menuService");
const { writeAudit } = require("../services/auditService");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("menus.manage", "dashboard.view"),
  asyncHandler(async (_req, res) => {
    const menus = await Menu.find().sort({ order: 1 }).lean();
    return ok(res, { flat: menus, tree: buildTree(menus, null) });
  })
);

router.post(
  "/",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const menu = await Menu.create(req.body);
    await writeAudit({
      user: req.user,
      action: "create",
      module: "menus",
      description: `Created menu ${menu.label}`,
      newValues: menu,
      ipAddress: req.ip,
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
        Menu.findByIdAndUpdate(item.id, {
          order: item.order,
          parent: item.parent || null,
        })
      )
    );
    return ok(res, null, "Menu order updated.");
  })
);

router.put(
  "/:id",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const prev = await Menu.findById(req.params.id);
    if (!prev) return fail(res, "Menu not found.", 404);
    const menu = await Menu.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    await writeAudit({
      user: req.user,
      action: "update",
      module: "menus",
      description: `Updated menu ${menu.label}`,
      previousValues: prev,
      newValues: menu,
      ipAddress: req.ip,
    });
    return ok(res, menu, "Menu updated.");
  })
);

router.delete(
  "/:id",
  requirePermission("menus.manage"),
  asyncHandler(async (req, res) => {
    const children = await Menu.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return fail(res, "Remove or reassign child menus first.", 400);
    }
    const menu = await Menu.findByIdAndDelete(req.params.id);
    if (!menu) return fail(res, "Menu not found.", 404);
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "menus",
      description: `Deleted menu ${menu.label}`,
      previousValues: menu,
      ipAddress: req.ip,
    });
    return ok(res, null, "Menu deleted.");
  })
);

module.exports = router;
