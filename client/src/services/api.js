const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("pharmacy_token");
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { message: "Unexpected server response." };
  }

  if (response.status === 401) {
    localStorage.removeItem("pharmacy_token");
    if (!window.location.pathname.startsWith("/login") && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export const authApi = {
  login: (body) =>
    fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed.");
      return data;
    }),
  register: (body) =>
    fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Register failed.");
      return data;
    }),
  me: () => api("/auth/me"),
  myMenus: () => api("/auth/my-menus"),
  logout: () => api("/auth/logout", { method: "POST" }),
};
