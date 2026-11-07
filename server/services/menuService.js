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
      isActive: m.isActive,
      children: buildTree(menus, String(m._id)),
    }));
}

async function getMenusForUser(permissions) {
  const menus = await Menu.find({ isActive: true }).lean();
  const isSuper = permissions.has("*");

  const allowed = menus.filter((m) => {
    if (!m.permissionKey) return true;
    return isSuper || permissions.has(m.permissionKey);
  });

  return buildTree(allowed, null);
}

module.exports = { buildTree, getMenusForUser };
