/**
 * Safe one-time migration: wrap existing single-tenant data into a Company.
 * Does NOT delete pharmacy records.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDB, disconnectDB } = require("../config/db");
const Company = require("../models/Company");
const Branch = require("../models/Branch");
const User = require("../models/User");
const Role = require("../models/Role");
const Menu = require("../models/Menu");
const Permission = require("../models/Permission");
const Settings = require("../models/Settings");
const Category = require("../models/Category");
const Medicine = require("../models/Medicine");
const MedicineBatch = require("../models/MedicineBatch");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const Sale = require("../models/Sale");
const Purchase = require("../models/Purchase");
const InventoryTransaction = require("../models/InventoryTransaction");
const AuditLog = require("../models/AuditLog");

const TENANT_MODELS = [
  Role,
  Menu,
  Category,
  Medicine,
  MedicineBatch,
  Customer,
  Supplier,
  Sale,
  Purchase,
  InventoryTransaction,
  AuditLog,
  Settings,
];

async function dropLegacyUniqueIfExists(collection, indexName) {
  try {
    await collection.dropIndex(indexName);
    console.log(`Dropped legacy index: ${indexName}`);
  } catch {
    // index may not exist
  }
}

async function migrateToMultiTenant() {
  const existingCompanies = await Company.countDocuments();
  if (existingCompanies > 0) {
    console.log("Migration skip: companies already exist.");
    await ensurePlatformAdmin();
    return { skipped: true };
  }

  const settings = (await Settings.findOne().lean()) || {};
  const companyName = settings.pharmacyName || "Default Pharmacy";

  const company = await Company.create({
    name: companyName,
    legalName: companyName,
    phone: settings.phone || "",
    email: settings.email || "admin@pharmacy.local",
    address: settings.address || "",
    logo: settings.logo || "",
    status: "active",
    branding: {
      logo: settings.logo || "",
      pharmacyName: companyName,
      primaryColor: "#748CF8",
      secondaryColor: "#5A6FD8",
      sidebarActiveColor: "#748CF8",
      buttonColor: "#748CF8",
    },
    settings: {
      currency: settings.currency || "USD",
      language: settings.language || "en",
      timezone: "UTC",
      dateFormat: settings.dateFormat || "YYYY-MM-DD",
      taxRate: settings.taxRate || 0,
      receiptFooter: settings.receiptFooter || "Thank you for your purchase!",
      lowStockThreshold: settings.lowStockThreshold || 10,
      theme: settings.theme || "light",
    },
    subscription: {
      plan: "professional",
      status: "active",
      trialEndsAt: null,
      userLimit: 50,
      branchLimit: 5,
    },
    approvedAt: new Date(),
  });

  const tenantId = company._id;
  console.log(`Created company: ${company.name} (${tenantId})`);

  const mainBranch = await Branch.create({
    tenantId,
    name: "Main Branch",
    code: "MAIN",
    phone: company.phone,
    address: company.address,
    isMain: true,
    isActive: true,
  });
  console.log(`Created branch: ${mainBranch.code}`);

  // Drop old global unique indexes that conflict with compound tenant indexes
  await dropLegacyUniqueIfExists(User.collection, "username_1");
  await dropLegacyUniqueIfExists(User.collection, "email_1");
  await dropLegacyUniqueIfExists(Role.collection, "name_1");
  await dropLegacyUniqueIfExists(Category.collection, "name_1");
  await dropLegacyUniqueIfExists(Sale.collection, "receiptNumber_1");
  await dropLegacyUniqueIfExists(Purchase.collection, "purchaseNumber_1");

  for (const Model of TENANT_MODELS) {
    const res = await Model.updateMany(
      { $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { tenantId } }
    );
    console.log(`Backfill ${Model.modelName}: ${res.modifiedCount} docs`);
  }

  // Attach users (except future platform admin) to company
  const userRes = await User.updateMany(
    {
      isPlatformAdmin: { $ne: true },
      $or: [{ tenantId: null }, { tenantId: { $exists: false } }],
    },
    { $set: { tenantId, branchIds: [mainBranch._id] } }
  );
  console.log(`Backfill User: ${userRes.modifiedCount} docs`);

  // Mark medicines/batches/sales/purchases with main branch
  await Medicine.updateMany({ tenantId, branchId: null }, { $set: { branchId: mainBranch._id } });
  await MedicineBatch.updateMany({ tenantId, branchId: null }, { $set: { branchId: mainBranch._id } });
  await Sale.updateMany({ tenantId, branchId: null }, { $set: { branchId: mainBranch._id } });
  await Purchase.updateMany({ tenantId, branchId: null }, { $set: { branchId: mainBranch._id } });
  await InventoryTransaction.updateMany(
    { tenantId, branchId: null },
    { $set: { branchId: mainBranch._id } }
  );

  const admin = await User.findOne({ username: "admin" });
  if (admin) {
    admin.tenantId = tenantId;
    admin.isPlatformAdmin = false;
    admin.isProtected = true;
    admin.branchIds = [mainBranch._id];
    admin.status = "active";
    await admin.save();
    company.ownerUserId = admin._id;
    await company.save();
    console.log("Linked existing admin as Company Owner (protected).");
  }

  await ensurePlatformAdmin();
  console.log("Multi-tenant migration complete.");
  return { companyId: String(tenantId), branchId: String(mainBranch._id) };
}

async function ensurePlatformAdmin() {
  let platform = await User.findOne({ username: "platform", isPlatformAdmin: true });
  if (platform) {
    console.log("Platform admin already exists.");
    return platform;
  }

  // Also check username collision with tenant user
  platform = await User.findOne({ username: "platform" });
  if (platform && !platform.isPlatformAdmin) {
    platform.isPlatformAdmin = true;
    platform.tenantId = null;
    platform.status = "active";
    platform.isProtected = true;
    platform.password = await bcrypt.hash("Platform@123", 10);
    await platform.save();
    console.log("Converted user `platform` to platform admin.");
    return platform;
  }

  platform = await User.create({
    username: "platform",
    email: "platform@pharmacore.local",
    password: await bcrypt.hash("Platform@123", 10),
    fullName: "Platform Super Admin",
    tenantId: null,
    isPlatformAdmin: true,
    isProtected: true,
    status: "active",
    roles: [],
    branchIds: [],
  });
  console.log("Created platform admin: platform / Platform@123");
  return platform;
}

async function run() {
  await connectDB();
  try {
    await migrateToMultiTenant();
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrateToMultiTenant, ensurePlatformAdmin };
