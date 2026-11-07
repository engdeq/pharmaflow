const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Role = require("../models/Role");
const { authenticate } = require("../middleware/auth");
const { getMenusForUser } = require("../services/menuService");
const { ok, fail } = require("../utils/response");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const router = express.Router();

function getToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET || "pharmacy_dev_secret",
    { expiresIn: "7d" }
  );
}

function collectPermissions(user) {
  const permissions = new Set();
  (user.roles || []).forEach((role) => {
    if (!role.isActive) return;
    (role.permissions || []).forEach((perm) => {
      if (perm?.key) permissions.add(perm.key);
    });
  });
  return permissions;
}

router.post(
  "/register",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters."),
    body("email").isEmail().withMessage("Valid email is required."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const { username, email, password } = req.body;
    const existing = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }],
    });
    if (existing) return fail(res, "Username or email already exists.", 409);

    const cashierRole = await Role.findOne({ name: "Cashier" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashed,
      roles: cashierRole ? [cashierRole._id] : [],
      status: "active",
    });

    const token = getToken(user);

    // Keep AuthCard response shape
    return res.status(201).json({
      message: "Registration successful.",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  })
);

router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate({
      path: "roles",
      populate: { path: "permissions" },
    });

    if (!user) return fail(res, "Invalid username or password.", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, "Invalid username or password.", 401);

    if (user.status !== "active") {
      return fail(res, "Account is inactive.", 403);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = getToken(user);

    await writeAudit({
      user,
      action: "login",
      module: "auth",
      description: `User ${user.username} logged in`,
      ipAddress: req.ip,
    });

    // Keep AuthCard response shape
    return res.json({
      message: "Login successful.",
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    return ok(res, {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      phone: req.user.phone,
      status: req.user.status,
      lastLogin: req.user.lastLogin,
      roles: (req.user.roles || []).map((r) => ({
        id: r._id,
        name: r.name,
      })),
      permissions: [...req.permissions],
    });
  })
);

router.get(
  "/my-menus",
  authenticate,
  asyncHandler(async (req, res) => {
    const tree = await getMenusForUser(req.permissions);
    return ok(res, tree);
  })
);

router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    await writeAudit({
      user: req.user,
      action: "logout",
      module: "auth",
      description: `User ${req.user.username} logged out`,
      ipAddress: req.ip,
    });
    return ok(res, null, "Logged out.");
  })
);

router.post(
  "/forgot-password",
  [body("email").isEmail()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) {
      return ok(res, null, "If the email exists, a reset token was generated.");
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Email stub — return token in data for local/dev use
    return ok(
      res,
      { resetToken: token },
      "If the email exists, a reset token was generated."
    );
  })
);

router.post(
  "/reset-password",
  [
    body("token").notEmpty(),
    body("password").isLength({ min: 6 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(res, errors.array()[0].msg, 400);

    const user = await User.findOne({
      resetToken: req.body.token,
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) return fail(res, "Invalid or expired reset token.", 400);

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    return ok(res, null, "Password reset successful.");
  })
);

module.exports = router;
