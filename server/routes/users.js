const express = require("express");
const bcrypt = require("bcryptjs");
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
router.use(requirePermission("users.manage"));

function isLockedUser(user) {
  return Boolean(user?.isProtected);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "50", 10));
    const q = (req.query.q || "").trim();
    const role = req.query.role;
    const filter = withTenant(req, {
      isPlatformAdmin: { $ne: true },
    });
    if (q) {
      filter.$or = [
        { username: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { fullName: new RegExp(q, "i") },
      ];
    }
    if (role) filter.roles = role;

    const [items, total] = await Promise.all([
      User.find(filter)
        .populate("roles", "name isSystem")
        .select("-password -resetToken")
        .sort({ isProtected: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return ok(res, { items, total, page, limit });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { username, email, password, fullName, phone, roles, status } = req.body;
    if (!username || !email || !password) {
      return fail(res, "Username, email and password are required.");
    }
    const exists = await User.findOne(
      withTenant(req, {
        $or: [{ username }, { email: email.toLowerCase() }],
      })
    );
    if (exists) return fail(res, "Username or email already exists.", 409);

    const user = await User.create(
      tenantPayload(req, {
        username,
        email: email.toLowerCase(),
        password: await bcrypt.hash(password, 10),
        fullName: fullName || "",
        phone: phone || "",
        roles: roles || [],
        status: status || "active",
        isProtected: false,
        isPlatformAdmin: false,
      })
    );

    await writeAudit({
      user: req.user,
      action: "create",
      module: "users",
      description: `Created user ${username}`,
      newValues: { username, email },
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });

    const populated = await User.findOne(withTenant(req, { _id: user._id }))
      .populate("roles", "name isSystem")
      .select("-password");
    return ok(res, populated, "User created.", 201);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const userDoc = await findTenantDoc(User, req, req.params.id);
    if (!userDoc) return denyCrossTenant(res);
    if (userDoc.isPlatformAdmin) return denyCrossTenant(res);
    if (isLockedUser(userDoc)) {
      return fail(res, "Protected developer account cannot be changed.", 403);
    }

    const previousValues = {
      username: userDoc.username,
      status: userDoc.status,
    };

    const updates = sanitizeTenantPayload(req.body);
    delete updates.password;
    delete updates.isProtected;
    delete updates.isPlatformAdmin;
    if (updates.email) updates.email = updates.email.toLowerCase();

    Object.assign(userDoc, updates);
    await userDoc.save();
    const user = await User.findOne(withTenant(req, { _id: userDoc._id }))
      .populate("roles", "name isSystem")
      .select("-password");

    await writeAudit({
      user: req.user,
      action: "update",
      module: "users",
      description: `Updated user ${user.username}`,
      previousValues,
      newValues: { username: user.username, status: user.status },
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });

    return ok(res, user, "User updated.");
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const password = req.body.password || "ChangeMe@123";
    const user = await findTenantDoc(User, req, req.params.id);
    if (!user) return denyCrossTenant(res);
    if (user.isPlatformAdmin) return denyCrossTenant(res);
    if (isLockedUser(user)) {
      return fail(res, "Protected developer account password cannot be reset here.", 403);
    }
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    await writeAudit({
      user: req.user,
      action: "reset_password",
      module: "users",
      description: `Reset password for ${user.username}`,
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, null, "Password reset.");
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (String(req.user._id) === req.params.id) {
      return fail(res, "You cannot delete your own account.", 400);
    }
    const user = await findTenantDoc(User, req, req.params.id);
    if (!user) return denyCrossTenant(res);
    if (user.isPlatformAdmin) return denyCrossTenant(res);
    if (isLockedUser(user)) {
      return fail(res, "Protected developer account cannot be deleted.", 403);
    }
    await user.deleteOne();
    await writeAudit({
      user: req.user,
      action: "delete",
      module: "users",
      description: `Deleted user ${user.username}`,
      previousValues: { username: user.username },
      ipAddress: req.ip,
      tenantId: req.tenantId,
    });
    return ok(res, null, "User deleted.");
  })
);

module.exports = router;
