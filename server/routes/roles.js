const express = require("express");
const Role = require("../models/Role");
const User = require("../models/User");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate, requirePermission("roles.manage"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = q ? { name: new RegExp(q, "i") } : {};
    const roles = await Role.find(filter)
      .populate("permissions")
      .sort({ name: 1 });

    const withCounts = await Promise.all(
      roles.map(async (role) => {
        const usersCount = await User.countDocuments({ roles: role._id });
        return { ...role.toObject(), usersCount };
      })
    );

    return ok(res, withCounts);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, description, permissions, isActive } = req.body;
    if (!name) return fail(res, "Role name is required.");
    const exists = await Role.findOne({ name });
    if (exists) return fail(res, "Role already exists.", 409);

    const role = await Role.create({
      name,
      description: description || "",
      permissions: permissions || [],
      isActive: isActive !== false,
    });

    await writeAudit({
      user: req.user,
      action: "create",
      module: "roles",
      description: `Created role ${name}`,
      newValues: role,
      ipAddress: req.ip,
    });

    return ok(res, await role.populate("permissions"), "Role created.", 201);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const prev = await Role.findById(req.params.id);
    if (!prev) return fail(res, "Role not found.", 404);

    const role = await Role.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("permissions");

    await writeAudit({
      user: req.user,
      action: "update",
      module: "roles",
      description: `Updated role ${role.name}`,
      previousValues: prev,
      newValues: role,
      ipAddress: req.ip,
    });

    return ok(res, role, "Role updated.");
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) return fail(res, "Role not found.", 404);
    if (role.isSystem) return fail(res, "System roles cannot be deleted.", 400);

    const assigned = await User.countDocuments({ roles: role._id });
    if (assigned > 0) {
      return fail(res, "Role is assigned to users.", 400);
    }

    await role.deleteOne();
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "roles",
      description: `Deleted role ${role.name}`,
      previousValues: role,
      ipAddress: req.ip,
    });
    return ok(res, null, "Role deleted.");
  })
);

module.exports = router;
