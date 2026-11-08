const Menu = require("../models/Menu");

function buildTree(menus, parentId = null) {
  return menus
    .filter((m) => {
      const pid = m.parent ? String(m.parent) : null;
      return pid === parentId;
    })
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      id: m._id,
      name: m.name,
      label: m.label,
      icon: m.icon,
      url: m.url,
      order: m.order,
      permissionKey: m.permissionKey,
      moduleKey: m.moduleKey || "",
      isActive: m.isActive,
      children: buildTree(menus, String(m._id)),
    }));
}

function collectWithAncestors(allowed, allMenus) {
  const byId = new Map(allMenus.map((m) => [String(m._id), m]));
  const selected = new Map(allowed.map((m) => [String(m._id), m]));

  for (const menu of allowed) {
    let parentId = menu.parent ? String(menu.parent) : null;
    while (parentId && !selected.has(parentId)) {
      const parent = byId.get(parentId);
      if (!parent) break;
      selected.set(parentId, parent);
      parentId = parent.parent ? String(parent.parent) : null;
    }
  }

  return Array.from(selected.values());
}

async function getMenusForUser(permissions, { tenantId, enabledModules } = {}) {
  if (!tenantId) return [];

  const filter = { isActive: true, tenantId };
  const menus = await Menu.find(filter).lean();
  const isSuper = permissions.has("*");
  const modules = Array.isArray(enabledModules) ? new Set(enabledModules) : null;

  const allowed = menus.filter((m) => {
    if (modules && m.moduleKey && !modules.has(m.moduleKey)) return false;
    if (!m.permissionKey) return true;
    return isSuper || permissions.has(m.permissionKey);
  });

  const withParents = collectWithAncestors(allowed, menus);
  return buildTree(withParents, null);
}

module.exports = { buildTree, getMenusForUser };
