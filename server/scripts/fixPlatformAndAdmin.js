require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/db");
const User = require("../models/User");
const Role = require("../models/Role");
const Company = require("../models/Company");
const Branch = require("../models/Branch");

async function main() {
  await connectDB();

  const company = await Company.findOne({ status: "active" }).sort({ createdAt: 1 });
  const branch = company
    ? await Branch.findOne({ tenantId: company._id, isMain: true })
    : null;
  const ownerRole = company
    ? (await Role.findOne({ tenantId: company._id, name: "Company Owner" })) ||
      (await Role.findOne({ tenantId: company._id, name: "Super Admin" }))
    : null;

  const adminHash = await bcrypt.hash("Admin@123", 10);
  let admin = await User.findOne({ username: "admin" });
  if (!admin) {
    admin = await User.create({
      username: "admin",
      email: "admin@pharmacy.local",
      password: adminHash,
      fullName: "Company Owner",
      tenantId: company?._id || null,
      isPlatformAdmin: false,
      isProtected: true,
      status: "active",
      roles: ownerRole ? [ownerRole._id] : [],
      branchIds: branch ? [branch._id] : [],
    });
    console.log("CREATED admin");
  } else {
    admin.password = adminHash;
    admin.status = "active";
    admin.isProtected = true;
    admin.isPlatformAdmin = false;
    if (company) admin.tenantId = company._id;
    if (ownerRole) admin.roles = [ownerRole._id];
    if (branch) admin.branchIds = [branch._id];
    await admin.save();
    console.log("FIXED admin");
  }

  const platHash = await bcrypt.hash("Platform@123", 10);
  let platform = await User.findOne({ username: "platform" });
  if (!platform) {
    platform = await User.create({
      username: "platform",
      email: "platform@pharmacore.local",
      password: platHash,
      fullName: "Platform Super Admin",
      tenantId: null,
      isPlatformAdmin: true,
      isProtected: true,
      status: "active",
      roles: [],
      branchIds: [],
    });
    console.log("CREATED platform");
  } else {
    platform.password = platHash;
    platform.status = "active";
    platform.isPlatformAdmin = true;
    platform.isProtected = true;
    platform.tenantId = null;
    platform.roles = [];
    platform.branchIds = [];
    await platform.save();
    console.log("FIXED platform");
  }

  const okAdmin = await bcrypt.compare(
    "Admin@123",
    (await User.findOne({ username: "admin" })).password
  );
  const okPlat = await bcrypt.compare(
    "Platform@123",
    (await User.findOne({ username: "platform" })).password
  );

  console.log(
    JSON.stringify(
      {
        company: company ? { name: company.name, status: company.status } : null,
        verify: { okAdmin, okPlat },
        admin: {
          status: admin.status,
          isPlatformAdmin: admin.isPlatformAdmin,
          tenantId: admin.tenantId,
        },
        platform: {
          status: platform.status,
          isPlatformAdmin: platform.isPlatformAdmin,
          tenantId: platform.tenantId,
        },
      },
      null,
      2
    )
  );

  await disconnectDB();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
