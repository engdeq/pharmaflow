/**
 * Rebuild hierarchical menus with sensible parent/submenu URLs.
 * Safe to run multiple times.
 */
require("dotenv").config();
const { connectDB, disconnectDB } = require("../config/db");
const Menu = require("../models/Menu");

async function seedHierarchicalMenus(tenantId) {
  if (!tenantId) throw new Error("tenantId is required to seed menus");
  await Menu.deleteMany({ tenantId });

  const create = (data) => Menu.create({ ...data, tenantId });

  // 1. Dashboard
  await create({
    name: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    url: "/dashboard",
    order: 1,
    permissionKey: "dashboard.view",
    moduleKey: "dashboard",
    parent: null,
  });

  // 2. Point of Sale
  const pos = await create({
    name: "pos_group",
    label: "Point of Sale (POS)",
    icon: "ShoppingCart",
    url: "",
    order: 2,
    permissionKey: "sales.create",
    parent: null,
  });
  await create({
    name: "pos",
    label: "New Sale",
    icon: "ScanBarcode",
    url: "/sales/pos",
    order: 1,
    permissionKey: "sales.create",
    parent: pos._id,
  });
  await create({
    name: "sales",
    label: "Sales History",
    icon: "Receipt",
    url: "/sales",
    order: 2,
    permissionKey: "sales.view",
    parent: pos._id,
  });

  // 3. Medicines
  const medicines = await create({
    name: "medicines_group",
    label: "Medicines",
    icon: "Pill",
    url: "",
    order: 3,
    permissionKey: "medicines.view",
    parent: null,
  });
  await create({
    name: "medicines",
    label: "Medicine List",
    icon: "Pill",
    url: "/medicines",
    order: 1,
    permissionKey: "medicines.view",
    parent: medicines._id,
  });
  await create({
    name: "categories",
    label: "Categories",
    icon: "Tags",
    url: "/categories",
    order: 2,
    permissionKey: "categories.view",
    parent: medicines._id,
  });

  // 4. Inventory
  const inventory = await create({
    name: "inventory_group",
    label: "Inventory",
    icon: "Package",
    url: "",
    order: 4,
    permissionKey: "inventory.view",
    parent: null,
  });
  await create({
    name: "inventory",
    label: "Stock Levels",
    icon: "Warehouse",
    url: "/inventory",
    order: 1,
    permissionKey: "inventory.view",
    parent: inventory._id,
  });
  await create({
    name: "expiry",
    label: "Expiry Management",
    icon: "AlarmClock",
    url: "/expiry",
    order: 2,
    permissionKey: "expiry.view",
    parent: inventory._id,
  });

  // 5. Purchases
  const purchases = await create({
    name: "purchases_group",
    label: "Purchases",
    icon: "ShoppingBag",
    url: "",
    order: 5,
    permissionKey: "purchases.view",
    parent: null,
  });
  await create({
    name: "purchases_pending",
    label: "Pending Purchases",
    icon: "Hourglass",
    url: "/purchases",
    order: 1,
    permissionKey: "purchases.view",
    parent: purchases._id,
  });
  await create({
    name: "purchases_create",
    label: "Create Purchase",
    icon: "SquarePlus",
    url: "/purchases/create",
    order: 2,
    permissionKey: "purchases.create",
    parent: purchases._id,
  });
  await create({
    name: "purchases_incoming",
    label: "Incoming Purchases",
    icon: "Truck",
    url: "/purchases/incoming",
    order: 3,
    permissionKey: "purchases.view",
    parent: purchases._id,
  });

  // 6. Partners
  const partners = await create({
    name: "partners_group",
    label: "Partners",
    icon: "Handshake",
    url: "",
    order: 6,
    permissionKey: "customers.view",
    parent: null,
  });
  await create({
    name: "customers",
    label: "Customers",
    icon: "Users",
    url: "/customers",
    order: 1,
    permissionKey: "customers.view",
    parent: partners._id,
  });
  await create({
    name: "suppliers",
    label: "Suppliers",
    icon: "Building2",
    url: "/suppliers",
    order: 2,
    permissionKey: "suppliers.view",
    parent: partners._id,
  });

  // 7. Reports
  await create({
    name: "reports",
    label: "Reports",
    icon: "BarChart3",
    url: "/reports",
    order: 7,
    permissionKey: "reports.view",
    parent: null,
  });

  // 8. Administration
  const admin = await create({
    name: "admin_group",
    label: "Administration",
    icon: "Settings2",
    url: "",
    order: 8,
    permissionKey: "users.manage",
    parent: null,
  });
  await create({
    name: "users",
    label: "Users",
    icon: "UserCog",
    url: "/users",
    order: 1,
    permissionKey: "users.manage",
    parent: admin._id,
  });
  await create({
    name: "roles",
    label: "Roles",
    icon: "Shield",
    url: "/roles",
    order: 2,
    permissionKey: "roles.manage",
    parent: admin._id,
  });
  await create({
    name: "permissions",
    label: "Permissions",
    icon: "KeyRound",
    url: "/permissions",
    order: 3,
    permissionKey: "permissions.manage",
    parent: admin._id,
  });
  await create({
    name: "menus",
    label: "Menus",
    icon: "Menu",
    url: "/menus",
    order: 4,
    permissionKey: "menus.manage",
    parent: admin._id,
  });
  await create({
    name: "audit",
    label: "Audit Logs",
    icon: "ScrollText",
    url: "/audit",
    order: 5,
    permissionKey: "audit.view",
    parent: admin._id,
  });
  await create({
    name: "settings",
    label: "Settings",
    icon: "Settings",
    url: "/settings",
    order: 6,
    permissionKey: "settings.manage",
    moduleKey: "settings",
    parent: admin._id,
  });

  const total = await Menu.countDocuments({ tenantId });
  console.log(`Menus resynced for tenant ${tenantId}: ${total} items`);
  return total;
}

async function resyncMenus() {
  await connectDB();
  try {
    const Company = require("../models/Company");
    const companies = await Company.find({}).select("_id name slug");
    if (!companies.length) throw new Error("No company found. Run seed/migrate first.");
    for (const company of companies) {
      await seedHierarchicalMenus(company._id);
      console.log(`Menus resynced: ${company.name || company.slug}`);
    }
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  resyncMenus().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { resyncMenus, seedHierarchicalMenus };
