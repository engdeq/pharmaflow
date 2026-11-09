import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

function applyMedAxisPlatformTheme() {
  const root = document.documentElement;
  root.style.setProperty("--primary", "#315FF4");
  root.style.setProperty("--primary-dark", "#2448C7");
  root.style.setProperty("--primary-hover", "#315FF4");
  root.style.setProperty("--sidebar", "#0F1B33");
  root.style.setProperty("--topbar", "#FFFFFF");
  root.style.setProperty("--bg", "#F4F7FC");
}

function applyCompanyBranding(company) {
  const root = document.documentElement;
  const branding = company?.branding || {};
  const map = {
    "--primary": branding.primaryColor,
    "--primary-dark": branding.secondaryColor || branding.primaryColor,
    "--primary-hover": branding.buttonColor || branding.primaryColor,
    "--sidebar": branding.sidebarColor,
    "--topbar": branding.headerColor,
    "--bg": branding.backgroundColor,
  };
  Object.entries(map).forEach(([key, value]) => {
    if (value) root.style.setProperty(key, value);
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("pharmacy_token");
    if (!token) {
      setUser(null);
      setMenus([]);
      setLoading(false);
      return;
    }

    try {
      const [meRes, menuRes] = await Promise.all([authApi.me(), authApi.myMenus()]);
      const nextUser = meRes.data;
      setUser(nextUser);
      setMenus(menuRes.data || []);
      if (nextUser?.isPlatformAdmin) applyMedAxisPlatformTheme();
      else if (nextUser?.company) applyCompanyBranding(nextUser.company);
      return nextUser;
    } catch {
      localStorage.removeItem("pharmacy_token");
      setUser(null);
      setMenus([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("pharmacy_token");
    setUser(null);
    setMenus([]);
  };

  const hasPermission = useCallback(
    (...keys) => {
      if (!user?.permissions) return false;
      if (user.permissions.includes("*")) return true;
      return keys.some((k) => user.permissions.includes(k));
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      menus,
      loading,
      company: user?.company || null,
      isPlatformAdmin: Boolean(user?.isPlatformAdmin),
      isAuthenticated: Boolean(user),
      loadSession,
      logout,
      hasPermission,
    }),
    [user, menus, loading, loadSession, logout, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
