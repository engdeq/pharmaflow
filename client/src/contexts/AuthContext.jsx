import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

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
      setUser(meRes.data);
      setMenus(menuRes.data || []);
    } catch {
      localStorage.removeItem("pharmacy_token");
      setUser(null);
      setMenus([]);
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
