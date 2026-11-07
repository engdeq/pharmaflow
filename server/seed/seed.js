const bcrypt = require("bcryptjs");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const Menu = require("../models/Menu");
const User = require("../models/User");
const Settings = require("../models/Settings");

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
];

const MENUS = [
  { name: "dashboard", label: "Dashboard", icon: "LayoutDashboard", url: "/dashboard", order: 1, permissionKey: "dashboard.view" },
  { name: "pos", label: "Point of Sale", icon: "ShoppingCart", url: "/sales/pos", order: 2, permissionKey: "sales.create" },
  { name: "medicines", label: "Medicines", icon: "Pill", url: "/medicines", order: 3, permissionKey: "medicines.view" },
  { name: "categories", label: "Categories", icon: "Tags", url: "/categories", order: 4, permissionKey: "categories.view" },
  { name: "inventory", label: "Inventory", icon: "Warehouse", url: "/inventory", order: 5, permissionKey: "inventory.view" },
  { name: "expiry", label: "Expiry", icon: "AlarmClock", url: "/expiry", order: 6, permissionKey: "expiry.view" },
  { name: "purchases", label: "Purchases", icon: "Truck", url: "/purchases", order: 7, permissionKey: "purchases.view" },
  { name: "sales", label: "Sales History", icon: "Receipt", url: "/sales", order: 8, permissionKey: "sales.view" },
  { name: "customers", label: "Customers", icon: "Users", url: "/customers", order: 9, permissionKey: "customers.view" },
  { name: "suppliers", label: "Suppliers", icon: "Building2", url: "/suppliers", order: 10, permissionKey: "suppliers.view" },
  { name: "reports", label: "Reports", icon: "BarChart3", url: "/reports", order: 11, permissionKey: "reports.view" },
  { name: "users", label: "Users", icon: "UserCog", url: "/users", order: 12, permissionKey: "users.manage" },
  { name: "roles", label: "Roles", icon: "Shield", url: "/roles", order: 13, permissionKey: "roles.manage" },
  { name: "permissions", label: "Permissions", icon: "KeyRound", url: "/permissions", order: 14, permissionKey: "permissions.manage" },
  { name: "menus", label: "Menus", icon: "Menu", url: "/menus", order: 15, permissionKey: "menus.manage" },
  { name: "audit", label: "Audit Logs", icon: "ScrollText", url: "/audit", order: 16, permissionKey: "audit.view" },
  { name: "settings", label: "Settings", icon: "Settings", url: "/settings", order: 17, permissionKey: "settings.manage" },
];

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
  }

  const allPerms = await Permission.find();
  const permIds = allPerms.map((p) => p._id);
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p._id]));

  const roleDefs = [
    { name: "Super Admin", description: "Full system access", all: true, isSystem: true },
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
      keys: [
        "dashboard.view",
        "reports.view",
        "reports.export",
        "sales.view",
        "purchases.view",
      ],
      isSystem: true,
    },
  ];

  for (const def of roleDefs) {
    let role = await Role.findOne({ name: def.name });
    if (!role) {
      role = await Role.create({
        name: def.name,
        description: def.description,
        isSystem: def.isSystem,
        permissions: def.all
          ? permIds
          : (def.keys || []).map((k) => permMap[k]).filter(Boolean),
      });
      console.log(`Role created: ${def.name}`);
    }
  }

  // Super Admin gets wildcard conceptually via all permissions
  const superAdmin = await Role.findOne({ name: "Super Admin" });
  if (superAdmin && superAdmin.permissions.length !== permIds.length) {
    superAdmin.permissions = permIds;
    await superAdmin.save();
  }

  const menuCount = await Menu.countDocuments();
  if (menuCount === 0) {
    await Menu.insertMany(MENUS);
    console.log("Menus seeded");
  }

  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
    await Settings.create({});
    console.log("Settings seeded");
  }

  let admin = await User.findOne({ username: "admin" });
  if (!admin) {
    const hashed = await bcrypt.hash("Admin@123", 10);
    admin = await User.create({
      username: "admin",
      email: "admin@pharmacy.local",
      password: hashed,
      fullName: "Super Admin",
      roles: [superAdmin._id],
      status: "active",
    });
    console.log("Super Admin created: admin / Admin@123");
  }

  return { admin };
}

module.exports = { seedDatabase };
