require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");
const Role = require("../models/Role");

async function main() {
  await connectDB();
  const role = await Role.findOne({ name: "Super Admin" });
  let user = await User.findOne({ username: "admin" });
  const hash = await bcrypt.hash("Admin@123", 10);

  if (!user) {
    user = await User.create({
      username: "admin",
      email: "admin@pharmacy.local",
      password: hash,
      fullName: "System Developer",
      roles: role ? [role._id] : [],
      status: "active",
      isProtected: true,
    });
    console.log("CREATED admin / Admin@123");
  } else {
    user.password = hash;
    user.status = "active";
    user.isProtected = true;
    user.fullName = user.fullName || "System Developer";
    user.email = user.email || "admin@pharmacy.local";
    if (role) user.roles = [role._id];
    await user.save();
    console.log("FIXED admin / Admin@123 — status=active, password reset");
  }

  console.log({
    username: user.username,
    status: user.status,
    isProtected: user.isProtected,
    hasRole: Boolean(role),
  });

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
