import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  FileCheck2,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Network,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import "./PlatformLayout.css";

const PLATFORM_NAV = [
  {
    section: "Overview",
    items: [{ label: "Platform Dashboard", to: "/platform", icon: LayoutDashboard, end: true }],
  },
  {
    section: "Company Management",
    items: [
      { label: "Companies", to: "/platform/companies", icon: Building2 },
      { label: "Register Pharmacy", to: "/platform/companies?register=1", icon: Sparkles },
      { label: "Company Approvals", to: "/platform/approvals", icon: FileCheck2 },
      { label: "Company Domains", to: "/platform/domains", icon: Globe2 },
      { label: "Company Branches", to: "/platform/branches", icon: Network },
      { label: "Company Activity", to: "/platform/activity", icon: Activity },
    ],
  },
  {
    section: "Platform Configuration",
    items: [
      { label: "Global Menu Management", to: "/platform/global-menus", icon: MenuIcon },
      { label: "Module Management", to: "/platform/modules", icon: Package },
      { label: "Feature Management", to: "/platform/features", icon: Sparkles },
      { label: "Subscription Plans", to: "/platform/plans", icon: CreditCard },
      { label: "Billing Management", to: "/platform/billing", icon: CreditCard },
    ],
  },
  {
    section: "Access Management",
    items: [
      { label: "Platform Users", to: "/platform/users", icon: Users },
      { label: "Platform Roles", to: "/platform/roles", icon: Shield },
      { label: "Platform Permissions", to: "/platform/permissions", icon: Shield },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Platform Audit Logs", to: "/platform/audit", icon: ScrollText },
      { label: "Platform Settings", to: "/platform/settings", icon: Settings },
    ],
  },
];

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = useMemo(() => {
    const source = user?.fullName || user?.username || "P";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const crumb = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1].replace(/-/g, " ") : "platform";
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div
      className={`medaxis-shell${mobileOpen ? " sidebar-open" : ""}${collapsed ? " collapsed" : ""}`}
    >
      <aside className="medaxis-sidebar">
        <div className="medaxis-brand">
          <div className="medaxis-mark">M</div>
          <div className="medaxis-brand-copy">
            <strong>MedAxis</strong>
            <span>Control Center</span>
          </div>
          <button type="button" className="mx-icon mobile-only" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="medaxis-nav">
          {PLATFORM_NAV.map((group) => (
            <div key={group.section} className="medaxis-section">
              <div className="medaxis-section-label">{group.section}</div>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `medaxis-link${isActive ? " active" : ""}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="medaxis-main">
        <header className="medaxis-topbar">
          <div className="medaxis-topbar-left">
            <button
              type="button"
              className="mx-icon"
              onClick={() => {
                if (window.innerWidth <= 960) setMobileOpen((v) => !v);
                else setCollapsed((v) => !v);
              }}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button type="button" className="mx-icon mobile-only" onClick={() => setMobileOpen(true)}>
              <MenuIcon size={18} />
            </button>
            <div className="medaxis-crumbs">
              <span>MedAxis</span> / <strong style={{ textTransform: "capitalize" }}>{crumb}</strong>
            </div>
          </div>

          <div className="medaxis-topbar-right">
            <span className="medaxis-chip">Pharmacy SaaS Administration</span>
            <button type="button" className="mx-icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button type="button" className="mx-icon" style={{ position: "relative" }}>
              <Bell size={18} />
              <span className="mx-dot" />
            </button>
            <div className="medaxis-user">
              <button type="button" className="medaxis-user-btn" onClick={() => setProfileOpen((v) => !v)}>
                <div className="medaxis-avatar">{initials}</div>
                <div className="medaxis-user-meta">
                  <strong>{user?.fullName || user?.username}</strong>
                  <span>Platform Super Admin</span>
                </div>
                <ChevronDown size={16} />
              </button>
              {profileOpen ? (
                <div className="medaxis-profile-menu">
                  <button type="button" onClick={() => navigate("/platform/settings")}>
                    <Settings size={16} /> Settings
                  </button>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="medaxis-content" onClick={() => setProfileOpen(false)}>
          <Outlet />
        </main>

        <footer className="medaxis-footer">
          <span>MedAxis Control Center</span>
          <span>
            <span className="mx-status" /> Platform Online
          </span>
          <span>© {new Date().getFullYear()} MedAxis</span>
        </footer>
      </div>

      {mobileOpen ? <div className="medaxis-backdrop" onClick={() => setMobileOpen(false)} /> : null}
    </div>
  );
}
