const express = require("express");
const Role = require("../models/Role");
const User = require("../models/User");
const { authenticate, requirePermission } = require("../middleware/auth");
const { requireTenant, sanitizeTenantPayload } = require("../middleware/tenant");
const { ok, fail } = require("../utils/response");
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
router.use(requirePermission("roles.manage"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q || "").trim();
    const filter = withTenant(req, q ? { name: new RegExp(q, "i") } : {});
    const roles = await Role.find(filter)
      .populate("permissions")
      .sort({ name: 1 });

    const withCounts = await Promise.all(
      roles.map(async (role) => {
        const usersCount = await User.countDocuments(
          withTenant(req, {
            roles: role._id,
            isPlatformAdmin: { $ne: true },
          })
        );
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
    const exists = await Role.findOne(withTenant(req, { name }));
    if (exists) return fail(res, "Role already exists.", 409);

    const role = await Role.create(
      tenantPayload(req, {
        name,
        description: description || "",
        permissions: permissions || [],
        isActive: isActive !== false,
      })
    );

    await writeAudit({
      user: req.user,
      action: "create",
      module: "roles",
      description: `Created role ${name}`,
      newValues: role,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });

    return ok(res, await role.populate("permissions"), "Role created.", 201);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const prev = await findTenantDoc(Role, req, req.params.id);
    if (!prev) return denyCrossTenant(res);
    const previousValues = prev.toObject();

    const updates = sanitizeTenantPayload(req.body);
    if (prev.isSystem) {
      delete updates.name;
      delete updates.isSystem;
      if (updates.isActive === false) {
        return fail(res, "System roles cannot be deactivated.", 403);
      }
    }

    Object.assign(prev, updates);
    await prev.save();
    const role = await Role.findOne(withTenant(req, { _id: prev._id })).populate(
      "permissions"
    );

    await writeAudit({
      user: req.user,
      action: "update",
      module: "roles",
      description: `Updated role ${role.name}`,
      previousValues,
      newValues: role,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });

    return ok(res, role, "Role updated.");
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const role = await findTenantDoc(Role, req, req.params.id);
    if (!role) return denyCrossTenant(res);
    if (role.isSystem) return fail(res, "System roles cannot be deleted.", 400);

    const assigned = await User.countDocuments(
      withTenant(req, { roles: role._id })
    );
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
      tenantId: req.tenantId,
    });
    return ok(res, null, "Role deleted.");
  })
);

module.exports = router;
