import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Crown,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  PLATFORM_NAV,
  findActiveGroupIds,
  pathMatches,
  titleFromPath,
} from "./platformNav";
import "./PlatformLayout.css";

const EXPANDED_KEY = "medaxis_platform_nav_expanded";

function readExpanded() {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => {
    const saved = readExpanded();
    return Array.isArray(saved) ? saved : PLATFORM_NAV.map((g) => g.id);
  });

  const initials = useMemo(() => {
    const source = user?.fullName || user?.username || "P";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const crumb = titleFromPath(location.pathname);

  useEffect(() => {
    sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(expanded));
  }, [expanded]);

  useEffect(() => {
    const activeIds = findActiveGroupIds(location.pathname, location.search);
    if (!activeIds.length) return;
    setExpanded((prev) => Array.from(new Set([...prev, ...activeIds])));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        if (collapsed) setCollapsed(false);
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLATFORM_NAV;
    return PLATFORM_NAV.map((group) => ({
      ...group,
      children: (group.children || []).filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          group.label.toLowerCase().includes(q) ||
          String(item.to).toLowerCase().includes(q)
      ),
    })).filter((group) => group.children.length > 0);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) return;
    setExpanded(filteredNav.map((g) => g.id));
  }, [query, filteredNav]);

  const toggleGroup = (id) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
            <div className="medaxis-brand-row">
              <strong>MedAxis</strong>
              <span className="medaxis-platform-badge">Platform</span>
            </div>
            <span>Control Center</span>
          </div>
          <button type="button" className="mx-icon mobile-only" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="medaxis-search">
          <Search size={16} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
            aria-label="Search menu"
          />
          <kbd>Ctrl /</kbd>
        </div>

        <nav className="medaxis-nav">
          {filteredNav.map((group) => {
            const Icon = group.icon;
            const isOpen = expanded.includes(group.id) || Boolean(query.trim());
            const groupActive = (group.children || []).some((item) =>
              pathMatches(item.to, location.pathname, location.search)
            );

            return (
              <div
                key={group.id}
                className={`medaxis-section${isOpen ? " open" : ""}${groupActive ? " has-active" : ""}`}
              >
                <button
                  type="button"
                  className={`medaxis-group${groupActive ? " active" : ""}`}
                  onClick={() => toggleGroup(group.id)}
                  title={collapsed ? group.label : undefined}
                >
                  <span className="medaxis-link-icon">
                    <Icon size={18} />
                  </span>
                  <span className="medaxis-group-label">{group.label}</span>
                  <ChevronRight
                    size={16}
                    className={`medaxis-chevron${isOpen ? " rotated" : ""}`}
                  />
                </button>

                <div className={`medaxis-submenu-wrap${isOpen ? " open" : ""}`}>
                  <ul className="medaxis-submenu">
                    {(group.children || []).map((item) => {
                      const ChildIcon = item.icon;
                      const active = pathMatches(item.to, location.pathname, location.search);
                      return (
                        <li key={`${item.to}-${item.label}`}>
                          <NavLink
                            to={item.to}
                            end={item.end}
                            title={collapsed ? item.label : undefined}
                            className={() => `medaxis-link${active ? " active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="tree-rail" aria-hidden="true" />
                            <span className="medaxis-link-icon nested">
                              <ChildIcon size={16} />
                            </span>
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="medaxis-enterprise-card">
          <div className="medaxis-enterprise-icon">
            <Crown size={16} />
          </div>
          <div className="medaxis-enterprise-copy">
            <strong>MedAxis Enterprise</strong>
            <span>Platform Management Suite</span>
          </div>
          <ChevronRight size={16} className="medaxis-enterprise-arrow" />
        </div>
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
              <span>MedAxis</span> / <strong>{crumb}</strong>
            </div>
          </div>

          <div className="medaxis-topbar-right">
            <span className="medaxis-chip">Control Center</span>
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
