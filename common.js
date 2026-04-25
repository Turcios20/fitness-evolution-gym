"use strict";

(function bootstrapGymApp() {
  const fromStorage = localStorage.getItem("gymApiBase");
  const API_BASE = fromStorage || (window.location.protocol === "file:" ? "http://localhost:3000" : "");
  const FAVICON_PATH = "assets/favicon.svg";
  const LEGACY_THEME_KEY = "gym-theme";
  const THEME_SETTING_KEY = "theme_preference";

  function normalizeTheme(theme) {
    return theme === "light" ? "light" : "dark";
  }

  function getThemeCacheKey(username) {
    return username ? `gym-theme:${username}` : LEGACY_THEME_KEY;
  }

  function getCachedTheme(username) {
    return localStorage.getItem(getThemeCacheKey(username));
  }

  function cacheTheme(theme, username) {
    const normalizedTheme = normalizeTheme(theme);
    localStorage.setItem(getThemeCacheKey(username), normalizedTheme);

    if (!username) {
      localStorage.setItem(LEGACY_THEME_KEY, normalizedTheme);
    }
  }

  function getTheme() {
    const session = getSession();
    if (!session?.username) {
      return "dark";
    }

    return normalizeTheme(getCachedTheme(session.username) || "dark");
  }

  function applyTheme(theme) {
    const normalizedTheme = normalizeTheme(theme);
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    if (document.body) {
      document.body.setAttribute("data-theme", normalizedTheme);
    }
  }

  function notifyThemeChange(theme) {
    window.dispatchEvent(new CustomEvent("gym-theme-change", { detail: { theme: normalizeTheme(theme) } }));
  }

  function setTheme(theme) {
    const normalizedTheme = normalizeTheme(theme);
    const session = getSession();
    cacheTheme(normalizedTheme, session?.username || "");
    applyTheme(normalizedTheme);
    notifyThemeChange(normalizedTheme);
  }

  applyTheme(getTheme());

  function ensureFavicon() {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;

    let favicon = head.querySelector('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      head.appendChild(favicon);
    }

    favicon.type = "image/svg+xml";
    favicon.href = FAVICON_PATH;
  }

  ensureFavicon();

  function getHomeByRole(role) {
    const value = String(role || "").trim().toLowerCase();
    if (value === "admin") return "admin.html";
    if (value === "recepcionista") return "recepcionista.html";
    if (value === "entrenador") return "entrenador.html";
    return "cliente.html";
  }

  async function api(path, options = {}) {
    const session = getSession();

    if (session?.token) {
      options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${session.token}`
      };
    }

    const url = `${API_BASE}${path}`;
    const response = await fetch(url, options);

    if (response.status === 401) {
      clearSession();
      window.location.href = "login.html";
      throw new Error("Sesion expirada.");
    }

    if (!response.ok) {
      const message = await safeMessage(response);
      throw new Error(message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  }

  async function safeText(response) {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  async function safeMessage(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json();
        return payload.error || payload.message || payload.detail || JSON.stringify(payload);
      } catch {
        return "";
      }
    }

    return safeText(response);
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem("gymSession") || "null");
    } catch {
      return null;
    }
  }

  function setSession(session) {
    session._loginAt = Date.now();
    localStorage.setItem("gymSession", JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem("gymSession");
  }

  function isSessionExpired() {
    const session = getSession();
    if (!session) return true;
    const eightHours = 8 * 60 * 60 * 1000;
    return session._loginAt && (Date.now() - session._loginAt) > eightHours;
  }

  function guardRoute(requiredRole) {
    if (isSessionExpired()) {
      clearSession();
      window.location.href = "login.html";
      return false;
    }

    const session = getSession();
    if (!session) {
      window.location.href = "login.html";
      return false;
    }

    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : requiredRole
        ? [requiredRole]
        : [];

    if (allowedRoles.length && !allowedRoles.includes(session.role)) {
      window.location.href = getHomeByRole(session.role);
      return false;
    }

    return true;
  }

  let toastContainer = null;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "gym-toast-container";
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, type = "info") {
    const container = getToastContainer();
    const el = document.createElement("div");
    el.className = `gym-toast gym-toast--${type}`;

    const icons = { success: "OK", error: "X", info: "i" };
    el.innerHTML = `<span class="gym-toast-icon">${icons[type] || "i"}</span><span>${message}</span>`;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("gym-toast--show"));

    setTimeout(() => {
      el.classList.remove("gym-toast--show");
      el.classList.add("gym-toast--hide");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    }, 3200);
  }

  async function syncThemeFromSettings() {
    const session = getSession();
    if (!session?.username || !session?.token) return;

    try {
      const response = await api(`/api/settings?username=${encodeURIComponent(session.username)}`);
      const savedTheme = response.settings?.[THEME_SETTING_KEY];
      if (!savedTheme) return;

      const normalizedTheme = normalizeTheme(savedTheme);
      cacheTheme(normalizedTheme, session.username);

      if (normalizedTheme !== document.documentElement.getAttribute("data-theme")) {
        applyTheme(normalizedTheme);
        notifyThemeChange(normalizedTheme);
      }
    } catch {
      // Si falla la carga remota, usamos el cache local sin interrumpir la app.
    }
  }

  window.GymApp = {
    api,
    getSession,
    setSession,
    clearSession,
    isSessionExpired,
    guardRoute,
    getHomeByRole,
    toast,
    getTheme,
    setTheme,
    syncThemeFromSettings,
    THEME_SETTING_KEY
  };

  syncThemeFromSettings();
})();
