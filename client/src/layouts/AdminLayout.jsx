import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { DynamicIcon } from "../utils/icons";
import "./AdminLayout.css";

function MenuItems({ items, onNavigate, openIds, toggleOpen, collapsed }) {
  return (
    <ul className="side-menu">
      {items.map((item) => {
        const hasChildren = item.children?.length > 0;
        const isOpen = openIds.includes(item.id);

        if (hasChildren) {
          return (
            <li key={item.id} className={isOpen ? "open" : ""}>
              <button
                type="button"
                className="side-group"
                title={collapsed ? item.label : undefined}
                onClick={() => toggleOpen(item.id)}
              >
                <DynamicIcon name={item.icon} size={18} />
                <span>{item.label}</span>
                <ChevronDown className="chevron" size={16} />
              </button>
              <MenuItems
                items={item.children}
                onNavigate={onNavigate}
                openIds={openIds}
                toggleOpen={toggleOpen}
                collapsed={collapsed}
              />
            </li>
          );
        }

        return (
          <li key={item.id}>
            {item.url ? (
              <NavLink
                to={item.url}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
                onClick={onNavigate}
              >
                <DynamicIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <div className="side-group" title={collapsed ? item.label : undefined}>
                <DynamicIcon name={item.icon} size={18} />
                <span>{item.label}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function splitMenus(menus) {
  const ops = [];
  const admin = [];
  menus.forEach((m) => {
    const key = `${m.name || ""} ${m.label || ""} ${m.url || ""}`.toLowerCase();
    if (
      key.includes("user") ||
      key.includes("role") ||
      key.includes("permission") ||
      key.includes("menu") ||
      key.includes("audit") ||
      key.includes("setting")
    ) {
      admin.push(m);
    } else {
      ops.push(m);
    }
  });
  return { ops, admin };
}

export default function AdminLayout() {
  const { user, menus, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openIds, setOpenIds] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = useMemo(() => {
    const source = user?.fullName || user?.username || "U";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const { ops, admin } = useMemo(() => splitMenus(menus || []), [menus]);

  const crumb = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1].replace(/-/g, " ") : "dashboard";
  }, [location.pathname]);

  useEffect(() => {
    const parents = [];
    const walk = (items, trail = []) => {
      items.forEach((item) => {
        if (item.url && location.pathname.startsWith(item.url)) {
          parents.push(...trail.map((t) => t.id));
        }
        if (item.children?.length) walk(item.children, [...trail, item]);
      });
    };
    walk(menus || []);
    if (parents.length) setOpenIds((prev) => [...new Set([...prev, ...parents])]);
  }, [menus, location.pathname]);

  const toggleOpen = (id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div
      className={`admin-shell${mobileOpen ? " sidebar-open" : ""}${collapsed ? " collapsed" : ""}`}
    >
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-mark">Rx</div>
          <div className="brand-copy">
            <strong>PharmaCore</strong>
            <span>Pharmacy OS</span>
          </div>
          <button type="button" className="icon-btn mobile-only" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {ops.length ? <div className="side-section-label">Operations</div> : null}
          <MenuItems
            items={ops}
            onNavigate={() => setMobileOpen(false)}
            openIds={openIds}
            toggleOpen={toggleOpen}
            collapsed={collapsed}
          />
          {admin.length ? <div className="side-section-label">System Administration</div> : null}
          <MenuItems
            items={admin}
            onNavigate={() => setMobileOpen(false)}
            openIds={openIds}
            toggleOpen={toggleOpen}
            collapsed={collapsed}
          />
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (window.innerWidth <= 960) setMobileOpen((v) => !v);
                else setCollapsed((v) => !v);
              }}
              title="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <button
              type="button"
              className="icon-btn mobile-only"
              onClick={() => setMobileOpen(true)}
            >
              <MenuIcon size={18} />
            </button>
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search modules, medicines, invoices..." />
              <kbd>Ctrl K</kbd>
            </div>
            <div className="breadcrumbs">
              <span>App</span> / <strong style={{ textTransform: "capitalize" }}>{crumb}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button type="button" className="icon-btn" style={{ position: "relative" }}>
              <Bell size={18} />
              <span className="notif-dot" />
            </button>
            <div className="lang-chip">
              <span role="img" aria-label="language">
                🇬🇧
              </span>
              <span>EN</span>
            </div>
            <div className="user-chip">
              <button
                type="button"
                className="user-chip"
                style={{ border: "none", padding: 0, background: "transparent" }}
                onClick={() => setProfileOpen((v) => !v)}
              >
                <div className="avatar">{initials}</div>
                <div className="user-meta">
                  <strong>{user?.fullName || user?.username}</strong>
                  <span>{user?.roles?.[0]?.name || "User"}</span>
                </div>
                <ChevronDown size={16} />
              </button>
              {profileOpen ? (
                <div className="profile-menu">
                  <button type="button" onClick={() => navigate("/settings")}>
                    <UserRound size={16} /> Profile
                  </button>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="admin-content" onClick={() => setProfileOpen(false)}>
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>PharmaCore v2.0.0</span>
          <span>
            <span className="status-dot" /> System Online
          </span>
          <span>© {new Date().getFullYear()} Pharmacy Management</span>
        </footer>
      </div>

      {mobileOpen ? <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} /> : null}
    </div>
  );
}
