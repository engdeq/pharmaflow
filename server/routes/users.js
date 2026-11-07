const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authenticate, requirePermission } = require("../middleware/auth");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();
router.use(authenticate, requirePermission("users.manage"));

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
    const filter = {};
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
    const exists = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });
    if (exists) return fail(res, "Username or email already exists.", 409);

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
      fullName: fullName || "",
      phone: phone || "",
      roles: roles || [],
      status: status || "active",
      isProtected: false,
    });

    await writeAudit({
      user: req.user,
      action: "create",
      module: "users",
      description: `Created user ${username}`,
      newValues: { username, email },
      ipAddress: req.ip,
    });

    const populated = await User.findById(user._id)
      .populate("roles", "name isSystem")
      .select("-password");
    return ok(res, populated, "User created.", 201);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const prev = await User.findById(req.params.id);
    if (!prev) return fail(res, "User not found.", 404);
    if (isLockedUser(prev)) {
      return fail(res, "Protected developer account cannot be changed.", 403);
    }

    const updates = { ...req.body };
    delete updates.password;
    delete updates.isProtected;
    if (updates.email) updates.email = updates.email.toLowerCase();

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    })
      .populate("roles", "name isSystem")
      .select("-password");

    await writeAudit({
      user: req.user,
      action: "update",
      module: "users",
      description: `Updated user ${user.username}`,
      previousValues: { username: prev.username, status: prev.status },
      newValues: { username: user.username, status: user.status },
      ipAddress: req.ip,
    });

    return ok(res, user, "User updated.");
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const password = req.body.password || "ChangeMe@123";
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, "User not found.", 404);
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
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, "User not found.", 404);
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
    });
    return ok(res, null, "User deleted.");
  })
);

module.exports = router;
