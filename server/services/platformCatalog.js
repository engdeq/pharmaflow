const GlobalMenu = require("../models/GlobalMenu");
const SubscriptionPlan = require("../models/SubscriptionPlan");

const DEFAULT_PLANS = [
  {
    code: "trial",
    name: "Trial",
    description: "14-day evaluation",
    priceMonthly: 0,
    priceYearly: 0,
    userLimit: 5,
    branchLimit: 1,
    trialDays: 14,
    sortOrder: 1,
    features: ["Core POS", "Inventory", "1 branch"],
    modules: ["dashboard", "pos", "medicines", "categories", "inventory", "sales", "customers"],
  },
  {
    code: "starter",
    name: "Starter",
    description: "Single-branch pharmacies",
    priceMonthly: 29,
    priceYearly: 290,
    userLimit: 10,
    branchLimit: 1,
    trialDays: 0,
    sortOrder: 2,
    features: ["POS", "Purchases", "Reports"],
    modules: [
      "dashboard",
      "pos",
      "medicines",
      "categories",
      "inventory",
      "purchases",
      "suppliers",
      "customers",
      "sales",
      "expiry",
      "reports",
      "users",
      "settings",
    ],
  },
  {
    code: "professional",
    name: "Professional",
    description: "Growing multi-user pharmacies",
    priceMonthly: 79,
    priceYearly: 790,
    userLimit: 50,
    branchLimit: 5,
    trialDays: 0,
    sortOrder: 3,
    features: ["Multi-branch", "Advanced reports", "Roles"],
    modules: [
      "dashboard",
      "pos",
      "medicines",
      "categories",
      "inventory",
      "purchases",
      "suppliers",
      "customers",
      "sales",
      "expiry",
      "reports",
      "users",
      "roles",
      "settings",
    ],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Chains and high volume",
    priceMonthly: 199,
    priceYearly: 1990,
    userLimit: 200,
    branchLimit: 20,
    trialDays: 0,
    sortOrder: 4,
    features: ["All modules", "Priority support", "Custom domains"],
    modules: [
      "dashboard",
      "pos",
      "medicines",
      "categories",
      "inventory",
      "purchases",
      "suppliers",
      "customers",
      "sales",
      "expiry",
      "reports",
      "users",
      "roles",
      "permissions",
      "menus",
      "settings",
      "audit",
    ],
  },
];

const DEFAULT_GLOBAL_MENUS = [
  { name: "dashboard", label: "Dashboard", icon: "LayoutDashboard", url: "/dashboard", order: 1, section: "operations", moduleKey: "dashboard", permissionKey: "dashboard.view" },
  { name: "pos_group", label: "Point of Sale", icon: "ShoppingCart", url: "", order: 2, section: "operations", moduleKey: "pos", permissionKey: "sales.create" },
  { name: "pos", label: "New Sale", icon: "ScanBarcode", url: "/sales/pos", parentName: "pos_group", order: 1, section: "operations", moduleKey: "pos", permissionKey: "sales.create" },
  { name: "sales", label: "Sales History", icon: "Receipt", url: "/sales", parentName: "pos_group", order: 2, section: "operations", moduleKey: "sales", permissionKey: "sales.view" },
  { name: "medicines", label: "Medicines", icon: "Pill", url: "/medicines", order: 3, section: "operations", moduleKey: "medicines", permissionKey: "medicines.view" },
  { name: "categories", label: "Categories", icon: "Tags", url: "/categories", order: 4, section: "operations", moduleKey: "categories", permissionKey: "categories.view" },
  { name: "inventory", label: "Inventory", icon: "Warehouse", url: "/inventory", order: 5, section: "operations", moduleKey: "inventory", permissionKey: "inventory.view" },
  { name: "expiry", label: "Expiry", icon: "AlarmClock", url: "/expiry", order: 6, section: "operations", moduleKey: "expiry", permissionKey: "expiry.view" },
  { name: "purchases", label: "Purchases", icon: "Truck", url: "/purchases", order: 7, section: "operations", moduleKey: "purchases", permissionKey: "purchases.view" },
  { name: "customers", label: "Customers", icon: "Users", url: "/customers", order: 8, section: "operations", moduleKey: "customers", permissionKey: "customers.view" },
  { name: "suppliers", label: "Suppliers", icon: "Building", url: "/suppliers", order: 9, section: "operations", moduleKey: "suppliers", permissionKey: "suppliers.view" },
  { name: "reports", label: "Reports", icon: "BarChart3", url: "/reports", order: 10, section: "operations", moduleKey: "reports", permissionKey: "reports.view" },
  { name: "users", label: "Users", icon: "UserRound", url: "/users", order: 1, section: "administration", moduleKey: "users", permissionKey: "users.view" },
  { name: "roles", label: "Roles", icon: "Shield", url: "/roles", order: 2, section: "administration", moduleKey: "roles", permissionKey: "roles.view" },
  { name: "permissions", label: "Permissions", icon: "KeyRound", url: "/permissions", order: 3, section: "administration", moduleKey: "permissions", permissionKey: "permissions.view" },
  { name: "menus", label: "Menus", icon: "Menu", url: "/menus", order: 4, section: "administration", moduleKey: "menus", permissionKey: "menus.manage" },
  { name: "audit", label: "Audit Logs", icon: "ScrollText", url: "/audit", order: 5, section: "administration", moduleKey: "audit", permissionKey: "audit.view" },
  { name: "settings", label: "Settings", icon: "Settings", url: "/settings", order: 6, section: "administration", moduleKey: "settings", permissionKey: "settings.manage" },
];

async function ensureDefaultPlans() {
  const count = await SubscriptionPlan.countDocuments();
  if (count > 0) return SubscriptionPlan.find().sort({ sortOrder: 1 }).lean();
  await SubscriptionPlan.insertMany(DEFAULT_PLANS);
  return SubscriptionPlan.find().sort({ sortOrder: 1 }).lean();
}

async function ensureDefaultGlobalMenus() {
  const count = await GlobalMenu.countDocuments();
  if (count > 0) return GlobalMenu.find().sort({ section: 1, order: 1 }).lean();
  await GlobalMenu.insertMany(DEFAULT_GLOBAL_MENUS);
  return GlobalMenu.find().sort({ section: 1, order: 1 }).lean();
}

module.exports = {
  DEFAULT_PLANS,
  DEFAULT_GLOBAL_MENUS,
  ensureDefaultPlans,
  ensureDefaultGlobalMenus,
};
