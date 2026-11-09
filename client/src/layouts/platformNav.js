import {
  Activity,
  Blocks,
  Building2,
  ChartNoAxesCombined,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  GitBranch,
  Globe,
  HeartPulse,
  KeyRound,
  Languages,
  LayoutDashboard,
  Link2,
  Menu,
  Navigation,
  Paintbrush,
  Plug,
  RefreshCw,
  ScrollText,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Bell,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";

/** MedAxis Control Center navigation catalog */
export const PLATFORM_NAV = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    children: [
      { label: "Executive Dashboard", to: "/platform", icon: LayoutDashboard, end: true },
      { label: "Platform Analytics", to: "/platform/analytics", icon: ChartNoAxesCombined },
      { label: "System Health", to: "/platform/health", icon: HeartPulse },
    ],
  },
  {
    id: "companies",
    label: "Company Management",
    icon: Building2,
    children: [
      { label: "All Companies", to: "/platform/companies", icon: Building2 },
      { label: "Register Pharmacy", to: "/platform/companies?register=1", icon: Sparkles },
      { label: "Company Approvals", to: "/platform/approvals", icon: FileCheck2 },
      { label: "Company Domains", to: "/platform/domains", icon: Globe },
      { label: "Branch Management", to: "/platform/branches", icon: GitBranch },
      { label: "Company Activity", to: "/platform/activity", icon: Activity },
      { label: "Company Settings", to: "/platform/company-settings", icon: Settings2 },
    ],
  },
  {
    id: "config",
    label: "Platform Configuration",
    icon: Blocks,
    children: [
      { label: "Global Menu Builder", to: "/platform/global-menus", icon: Menu },
      { label: "Module Catalog", to: "/platform/modules", icon: Blocks },
      { label: "Feature Management", to: "/platform/features", icon: Sparkles },
      { label: "Page Builder", to: "/platform/page-builder", icon: LayoutDashboard },
      { label: "Navigation Management", to: "/platform/navigation", icon: Navigation },
      { label: "Branding Templates", to: "/platform/branding-templates", icon: Paintbrush },
    ],
  },
  {
    id: "subscription",
    label: "Subscription Management",
    icon: CreditCard,
    children: [
      { label: "Subscription Overview", to: "/platform/subscription-overview", icon: ChartNoAxesCombined },
      { label: "Subscription Plans", to: "/platform/plans", icon: CreditCard },
      { label: "Company Subscriptions", to: "/platform/company-subscriptions", icon: Building2 },
      { label: "Billing & Invoices", to: "/platform/billing", icon: Wallet },
      { label: "Payment Transactions", to: "/platform/payments", icon: CreditCard },
      { label: "Renewal Management", to: "/platform/renewals", icon: RefreshCw },
    ],
  },
  {
    id: "access",
    label: "Access Management",
    icon: ShieldCheck,
    children: [
      { label: "Platform Users", to: "/platform/users", icon: Users },
      { label: "Platform Roles", to: "/platform/roles", icon: ShieldCheck },
      { label: "Platform Permissions", to: "/platform/permissions", icon: KeyRound },
      { label: "Access Policies", to: "/platform/access-policies", icon: FileText },
      { label: "Login Sessions", to: "/platform/sessions", icon: Link2 },
    ],
  },
  {
    id: "system",
    label: "System Management",
    icon: Server,
    children: [
      { label: "Audit Logs", to: "/platform/audit", icon: ScrollText },
      { label: "API Management", to: "/platform/api", icon: Webhook },
      { label: "Notification Center", to: "/platform/notifications", icon: Bell },
      { label: "Database Monitoring", to: "/platform/database", icon: Database },
      { label: "Backup Management", to: "/platform/backups", icon: Database },
      { label: "System Logs", to: "/platform/logs", icon: ScrollText },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    children: [
      { label: "General Settings", to: "/platform/settings", icon: Settings2 },
      { label: "Platform Branding", to: "/platform/branding", icon: Paintbrush },
      { label: "Domain Configuration", to: "/platform/domain-config", icon: Globe },
      { label: "Security Settings", to: "/platform/security", icon: ShieldCheck },
      { label: "Localization", to: "/platform/localization", icon: Languages },
      { label: "Integrations", to: "/platform/integrations", icon: Plug },
    ],
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
