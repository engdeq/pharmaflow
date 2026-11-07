import { getFeedbackHandlers } from "./feedbackBridge";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SILENT_PATHS = [
  "/auth/me",
  "/auth/my-menus",
  "/auth/logout",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function getToken() {
  return localStorage.getItem("pharmacy_token");
}

function shouldUseFeedback(path, options = {}) {
  if (options.silent || options.skipFeedback) return false;
  const method = String(options.method || "GET").toUpperCase();
  if (!MUTATING.has(method)) return false;
  return !SILENT_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

function defaultLoadingMessage(method) {
  if (method === "DELETE") return "Deleting…";
  if (method === "POST") return "Saving…";
  return "Updating…";
}

function defaultSuccessMessage(method, data) {
  if (data?.message) return data.message;
  if (method === "DELETE") return "Deleted successfully";
  if (method === "POST") return "Saved successfully";
  return "Updated successfully";
}

export async function api(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const useFeedback = shouldUseFeedback(path, options);
  const feedback = getFeedbackHandlers();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  if (useFeedback) {
    feedback.showLoading?.(options.loadingMessage || defaultLoadingMessage(method));
  }

  const {
    silent: _silent,
    skipFeedback: _skipFeedback,
    loadingMessage: _loadingMessage,
    successMessage: _successMessage,
    success: _success,
    body,
    headers: _headers,
    method: _method,
    ...fetchOptions
  } = options;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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

    if (useFeedback) {
      feedback.hideLoading?.();
      if (options.success !== false) {
        feedback.success?.(options.successMessage || defaultSuccessMessage(method, data));
      }
    }

    return data;
  } catch (err) {
    if (useFeedback) {
      feedback.hideLoading?.();
    }
    throw err;
  }
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
  logout: () => api("/auth/logout", { method: "POST", silent: true }),
};
