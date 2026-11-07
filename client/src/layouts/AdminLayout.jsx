import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { DynamicIcon } from "../utils/icons";
import "./AdminLayout.css";

function MenuItems({ items, onNavigate }) {
  return (
    <ul className="side-menu">
      {items.map((item) => (
        <li key={item.id}>
          {item.url ? (
            <NavLink
              to={item.url}
              className={({ isActive }) => `side-link${isActive ? " active" : ""}`}
              onClick={onNavigate}
            >
              <DynamicIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <div className="side-group">
              <DynamicIcon name={item.icon} size={18} />
              <span>{item.label}</span>
            </div>
          )}
          {item.children?.length ? (
            <MenuItems items={item.children} onNavigate={onNavigate} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function AdminLayout() {
  const { user, menus, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    const source = user?.fullName || user?.username || "U";
    return source
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className={`admin-shell${open ? " sidebar-open" : ""}`}>
      <aside className="admin-sidebar">
        <div className="brand">
          <div className="brand-mark">Rx</div>
          <div>
            <strong>Pharmacy</strong>
            <span>Management</span>
          </div>
          <button type="button" className="icon-btn mobile-only" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <MenuItems items={menus} onNavigate={() => setOpen(false)} />
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)}>
              <MenuIcon size={18} />
            </button>
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search modules..." />
            </div>
          </div>
          <div className="topbar-right">
            <button type="button" className="icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button type="button" className="icon-btn">
              <Bell size={18} />
            </button>
            <div className="user-chip">
              <div className="avatar">{initials}</div>
              <div className="user-meta">
                <strong>{user?.fullName || user?.username}</strong>
                <span>{user?.roles?.[0]?.name || "User"}</span>
              </div>
              <ChevronDown size={16} />
            </div>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}
    </div>
  );
}
