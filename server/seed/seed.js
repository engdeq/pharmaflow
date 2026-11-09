const bcrypt = require("bcryptjs");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const User = require("../models/User");
const Settings = require("../models/Settings");
const Company = require("../models/Company");
const Menu = require("../models/Menu");
const { migrateToMultiTenant, ensurePlatformAdmin } = require("./migrateToMultiTenant");
const { seedHierarchicalMenus } = require("./resyncMenus");

const PERMISSIONS = [
  ["dashboard.view", "dashboard", "view"],
  ["medicines.view", "medicines", "view"],
  ["medicines.create", "medicines", "create"],
  ["medicines.edit", "medicines", "edit"],
  ["medicines.delete", "medicines", "delete"],
  ["sales.view", "sales", "view"],
  ["sales.create", "sales", "create"],
  ["sales.edit", "sales", "edit"],
  ["sales.delete", "sales", "delete"],
  ["sales.approve", "sales", "approve"],
  ["sales.refund", "sales", "refund"],
  ["purchases.view", "purchases", "view"],
  ["purchases.create", "purchases", "create"],
  ["purchases.edit", "purchases", "edit"],
  ["purchases.approve", "purchases", "approve"],
  ["inventory.view", "inventory", "view"],
  ["inventory.adjust", "inventory", "adjust"],
  ["inventory.export", "inventory", "export"],
  ["customers.view", "customers", "view"],
  ["customers.create", "customers", "create"],
  ["customers.edit", "customers", "edit"],
  ["customers.delete", "customers", "delete"],
  ["suppliers.view", "suppliers", "view"],
  ["suppliers.create", "suppliers", "create"],
  ["suppliers.edit", "suppliers", "edit"],
  ["suppliers.delete", "suppliers", "delete"],
  ["reports.view", "reports", "view"],
  ["reports.export", "reports", "export"],
  ["users.manage", "users", "manage"],
  ["roles.manage", "roles", "manage"],
  ["permissions.manage", "permissions", "manage"],
  ["menus.manage", "menus", "manage"],
  ["settings.manage", "settings", "manage"],
  ["categories.view", "categories", "view"],
  ["categories.create", "categories", "create"],
  ["categories.edit", "categories", "edit"],
  ["categories.delete", "categories", "delete"],
  ["expiry.view", "expiry", "view"],
  ["audit.view", "audit", "view"],
  ["branches.manage", "branches", "manage"],
  ["modules.manage", "modules", "manage"],
  ["branding.manage", "branding", "manage"],
];

async function ensureRolesForTenant(tenantId, allPerms, permMap) {
  const permIds = allPerms.map((p) => p._id);
  const roleDefs = [
    { name: "Company Owner", description: "Full company access", all: true, isSystem: true },
    { name: "Super Admin", description: "Full company access (legacy)", all: true, isSystem: true },
    {
      name: "Admin",
      description: "Administrative access",
      keys: allPerms.map((p) => p.key).filter((k) => k !== "permissions.manage"),
      isSystem: true,
    },
    {
      name: "Pharmacist",
      description: "Dispense and manage medicines",
      keys: [
        "dashboard.view",
        "medicines.view",
        "medicines.create",
        "medicines.edit",
        "sales.view",
        "sales.create",
        "customers.view",
        "customers.create",
        "inventory.view",
        "expiry.view",
        "categories.view",
      ],
      isSystem: true,
    },
    {
      name: "Store Manager",
      description: "Inventory and purchasing",
      keys: [
        "dashboard.view",
        "medicines.view",
        "medicines.create",
        "medicines.edit",
        "inventory.view",
        "inventory.adjust",
        "purchases.view",
        "purchases.create",
        "purchases.approve",
        "suppliers.view",
        "suppliers.create",
        "expiry.view",
        "reports.view",
        "categories.view",
      ],
      isSystem: true,
    },
    {
      name: "Cashier",
      description: "POS and sales",
      keys: [
        "dashboard.view",
        "sales.view",
        "sales.create",
        "medicines.view",
        "customers.view",
        "customers.create",
      ],
      isSystem: true,
    },
    {
      name: "Inventory Manager",
      description: "Stock control",
      keys: [
        "dashboard.view",
        "inventory.view",
        "inventory.adjust",
        "inventory.export",
        "medicines.view",
        "expiry.view",
        "purchases.view",
      ],
      isSystem: true,
    },
    {
      name: "Accountant",
      description: "Reports and finances",
      keys: ["dashboard.view", "reports.view", "reports.export", "sales.view", "purchases.view"],
      isSystem: true,
    },
    {
      name: "Branch Manager",
      description: "Manage a single branch",
      keys: [
        "dashboard.view",
        "medicines.view",
        "sales.view",
        "sales.create",
        "inventory.view",
        "purchases.view",
        "customers.view",
        "expiry.view",
      ],
      isSystem: true,
    },
  ];

  for (const def of roleDefs) {
    let role = await Role.findOne({ tenantId, name: def.name });
    if (!role) {
      role = await Role.create({
        tenantId,
        name: def.name,
        description: def.description,
        isSystem: def.isSystem,
        permissions: def.all ? permIds : (def.keys || []).map((k) => permMap[k]).filter(Boolean),
      });
      console.log(`Role created [${tenantId}]: ${def.name}`);
    } else if (def.all && role.permissions.length !== permIds.length) {
      role.permissions = permIds;
      await role.save();
    }
  }
}

async function seedDatabase() {
  const permCount = await Permission.countDocuments();
  if (permCount === 0) {
    await Permission.insertMany(
      PERMISSIONS.map(([key, module, action]) => ({
        key,
        module,
        action,
        description: `${action} ${module}`,
      }))
    );
    console.log("Permissions seeded");
  } else {
    // Add any new permission keys without wiping
    for (const [key, module, action] of PERMISSIONS) {
      const exists = await Permission.exists({ key });
      if (!exists) {
        await Permission.create({ key, module, action, description: `${action} ${module}` });
      }
    }
  }

  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create({});
    console.log("Settings seeded");
  }

  await migrateToMultiTenant();
  await ensurePlatformAdmin();

  const company = await Company.findOne({ status: "active" }).sort({ createdAt: 1 });
  if (!company) {
    throw new Error("No active company after migration.");
  }

  const allPerms = await Permission.find();
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p._id]));
  await ensureRolesForTenant(company._id, allPerms, permMap);

  const menuCount = await Menu.countDocuments({ tenantId: company._id });
  const hasBrandingMenu = await Menu.exists({ tenantId: company._id, name: "branding" });
  if (menuCount === 0 || hasBrandingMenu) {
    await seedHierarchicalMenus(company._id);
    console.log("Menus seeded for company");
  }

  const ownerRole =
    (await Role.findOne({ tenantId: company._id, name: "Company Owner" })) ||
    (await Role.findOne({ tenantId: company._id, name: "Super Admin" }));

  let admin = await User.findOne({ username: "admin", tenantId: company._id });
  if (!admin) {
    admin = await User.findOne({ username: "admin" });
  }
  if (!admin) {
    admin = await User.create({
      username: "admin",
      email: "admin@pharmacy.local",
      password: await bcrypt.hash("Admin@123", 10),
      fullName: "Company Owner",
      roles: ownerRole ? [ownerRole._id] : [],
      status: "active",
      isProtected: true,
      isPlatformAdmin: false,
      tenantId: company._id,
    });
    console.log("Company admin created: admin / Admin@123");
  } else {
    admin.tenantId = company._id;
    admin.isPlatformAdmin = false;
    admin.isProtected = true;
    admin.status = "active";
    if (ownerRole) admin.roles = [ownerRole._id];
    await admin.save();
  }

  if (!company.ownerUserId) {
    company.ownerUserId = admin._id;
    await company.save();
  }

  return { admin, company };
}

module.exports = { seedDatabase, ensureRolesForTenant, PERMISSIONS };
