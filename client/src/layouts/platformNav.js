import {
  Building2,
  CreditCard,
  Globe,
  LayoutDashboard,
  Menu,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

/** MedAxis Control Center — focused working menus only */
export const PLATFORM_NAV = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    children: [
      { label: "Dashboard", to: "/platform", icon: LayoutDashboard, end: true },
    ],
  },
  {
    id: "companies",
    label: "Companies",
    icon: Building2,
    children: [
      { label: "Companies", to: "/platform/companies", icon: Building2 },
      { label: "Register Pharmacy", to: "/platform/companies?register=1", icon: Sparkles },
      { label: "Domains", to: "/platform/domains", icon: Globe },
    ],
  },
  {
    id: "config",
    label: "Configuration",
    icon: Menu,
    children: [
      { label: "Global Menus", to: "/platform/global-menus", icon: Menu },
      { label: "Subscription Plans", to: "/platform/plans", icon: CreditCard },
      { label: "Billing", to: "/platform/billing", icon: Wallet },
    ],
  },
  {
    id: "access",
    label: "Access",
    icon: Users,
    children: [{ label: "Platform Users", to: "/platform/users", icon: Users }],
  },
];

export function pathMatches(to, pathname, search = "") {
  if (!to) return false;
  const [path, query] = to.split("?");
  if (query) {
    return pathname === path && (search.includes(query) || search === `?${query}`);
  }
  if (path === "/platform") return pathname === "/platform";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function findActiveGroupIds(pathname, search = "") {
  return PLATFORM_NAV.filter((group) =>
    (group.children || []).some((item) => pathMatches(item.to, pathname, search))
  ).map((g) => g.id);
}

export function titleFromPath(pathname) {
  for (const group of PLATFORM_NAV) {
    for (const item of group.children || []) {
      const path = item.to.split("?")[0];
      if (path === pathname || (path !== "/platform" && pathname.startsWith(path))) {
        return item.label;
      }
    }
  }
  return "Platform";
}
