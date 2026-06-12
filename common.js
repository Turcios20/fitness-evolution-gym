"use strict";

(function bootstrapGymApp() {
  const fromStorage = localStorage.getItem("gymApiBase");
  const API_BASE = fromStorage || (window.location.protocol === "file:" ? "http://localhost:3000" : "");
  const FAVICON_PATH = "assets/image.png";
  const LEGACY_THEME_KEY = "gym-theme";
  const THEME_SETTING_KEY = "theme_preference";

  function normalizeTheme(theme) {
    return theme === "light" ? "light" : "dark";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

    favicon.type = "image/png";
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

  function resolveUrl(resourcePath) {
    const value = String(resourcePath || "").trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (!value.startsWith("/")) return `${API_BASE}${value.startsWith(".") ? value.slice(1) : `/${value}`}`;
    return `${API_BASE}${value}`;
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
    el.innerHTML = `<span class="gym-toast-icon">${icons[type] || "i"}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("gym-toast--show"));

    setTimeout(() => {
      el.classList.remove("gym-toast--show");
      el.classList.add("gym-toast--hide");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    }, 3200);
  }

  function confirmDialog(options = {}) {
    const {
      title = "¿Estás seguro?",
      message = "",
      confirmText = "Aceptar",
      cancelText = "Cancelar",
      danger = false,
    } = typeof options === "string" ? { message: options } : options;

    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);
    const safeConfirmText = escapeHtml(confirmText);
    const safeCancelText = escapeHtml(cancelText);

    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "gym-confirm-overlay";
      overlay.innerHTML = `
        <div class="gym-confirm" role="dialog" aria-modal="true">
          <h3 class="gym-confirm-title">${safeTitle}</h3>
          ${message ? `<p class="gym-confirm-message">${safeMessage}</p>` : ""}
          <div class="gym-confirm-actions">
            <button type="button" class="gym-confirm-btn gym-confirm-cancel">${safeCancelText}</button>
            <button type="button" class="gym-confirm-btn gym-confirm-ok${danger ? " gym-confirm-danger" : ""}">${safeConfirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add("gym-confirm-overlay--show"));

      const close = (result) => {
        overlay.classList.remove("gym-confirm-overlay--show");
        overlay.addEventListener("transitionend", () => overlay.remove(), { once: true });
        document.removeEventListener("keydown", onKey);
        resolve(result);
      };

      const onKey = (event) => {
        if (event.key === "Escape") close(false);
        if (event.key === "Enter") close(true);
      };

      overlay.querySelector(".gym-confirm-ok").addEventListener("click", () => close(true));
      overlay.querySelector(".gym-confirm-cancel").addEventListener("click", () => close(false));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      document.addEventListener("keydown", onKey);

      overlay.querySelector(".gym-confirm-ok").focus();
    });
  }

  const EYE_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5C6.5 5 2 8.6 1 12c1 3.4 5.5 7 11 7s10-3.6 11-7c-1-3.4-5.5-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"></path>
      <circle cx="12" cy="12" r="2.2"></circle>
    </svg>
  `;
  const EYE_OFF_ICON = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.3 2.3L2 3.6l3.1 3.1C2.9 8.1 1.4 10 1 12c1 3.4 5.5 7 11 7 1.9 0 3.6-.4 5.2-1.1l3.2 3.2 1.3-1.3L3.3 2.3zM12 16a4 4 0 0 1-4-4c0-.7.2-1.4.5-1.9l5.4 5.4c-.6.3-1.2.5-1.9.5zm4-4c0 .7-.2 1.4-.5 1.9l-5.4-5.4c.6-.3 1.2-.5 1.9-.5a4 4 0 0 1 4 4zm-4-7c5.5 0 10 3.6 11 7-.3 1.1-1 2.2-1.9 3.2l-1.4-1.4c.5-.6.9-1.2 1.1-1.8-1-2.8-4.8-5.7-8.8-5.7-.9 0-1.7.1-2.5.4L8.1 5.3c1.2-.2 2.5-.3 3.9-.3z"></path>
    </svg>
  `;

  function renderPasswordToggle(button, isVisible) {
    button.innerHTML = isVisible ? EYE_OFF_ICON : EYE_ICON;
    button.setAttribute("aria-label", isVisible ? "Ocultar contrasena" : "Mostrar contrasena");
    button.setAttribute("title", isVisible ? "Ocultar contrasena" : "Mostrar contrasena");
    button.setAttribute("aria-pressed", isVisible ? "true" : "false");
  }

  function setupPasswordToggles(root = document) {
    root.querySelectorAll("[data-password-toggle]").forEach((button) => {
      const inputId = button.getAttribute("data-password-toggle");
      const input = document.getElementById(inputId);
      if (!input) return;

      const syncState = () => {
        renderPasswordToggle(button, input.type === "text");
      };

      if (button.dataset.passwordToggleBound !== "true") {
        button.type = "button";
        button.classList.add("password-toggle");
        button.addEventListener("click", () => {
          input.type = input.type === "password" ? "text" : "password";
          syncState();
          input.focus({ preventScroll: true });
        });
        button.dataset.passwordToggleBound = "true";
      }

      syncState();
    });
  }

  const AVATAR_PALETTE = [
    "#c45e1a", "#b0390e", "#7b2d8b", "#1a6fbf",
    "#1a8f5a", "#8a4f0d", "#3d5a9e", "#8b1a1a"
  ];

  function getInitials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => (word[0] || "").toUpperCase())
      .join("") || "?";
  }

  function getAvatarColor(initials) {
    const safe = initials || "?";
    const index = (safe.charCodeAt(0) + (safe.charCodeAt(1) || 0)) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[index];
  }

  function setupUserMenu(options = {}) {
    const session = getSession();
    if (!session) return;

    const avatarId = options.avatarId || "userAvatar";
    const anchorId = options.anchorId || "avatarWrap";

    const avatar = document.getElementById(avatarId);
    const anchor = document.getElementById(anchorId) || avatar?.parentElement;
    if (!anchor) return;

    const name = options.name || session.displayName || session.username || "Usuario";
    const initials = getInitials(name);

    if (avatar) {
      avatar.textContent = initials;
      if (!avatar.style.background) {
        avatar.style.background = getAvatarColor(initials);
      }
    }

    if (getComputedStyle(anchor).position === "static") {
      anchor.style.position = "relative";
    }

    let dropdown = anchor.querySelector(".avatar-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "avatar-dropdown";
      dropdown.innerHTML = `
        <div class="dropdown-name"></div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item dropdown-logout" type="button">Cerrar sesion</button>
      `;
      anchor.appendChild(dropdown);
    }

    const nameEl = dropdown.querySelector(".dropdown-name");
    if (nameEl) nameEl.textContent = name;

    if (anchor.dataset.userMenuBound === "true") return;
    anchor.dataset.userMenuBound = "true";

    anchor.style.cursor = "pointer";
    anchor.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdown.classList.toggle("open");
    });

    dropdown.addEventListener("click", (event) => event.stopPropagation());

    document.addEventListener("click", () => dropdown.classList.remove("open"));

    const logoutBtn = dropdown.querySelector(".dropdown-logout");
    logoutBtn?.addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  }

  let plansCache = null;

  async function getPlans({ force = false, activeOnly = false } = {}) {
    if (!plansCache || force) {
      const response = await api("/api/membership-plans");
      plansCache = Array.isArray(response.plans) ? response.plans : [];
    }
    return activeOnly ? plansCache.filter((plan) => plan.activo) : plansCache;
  }

  function clearPlansCache() {
    plansCache = null;
  }

  function formatPlanPrice(plan) {
    if (!plan) return "";
    const price = Number(plan.precio);
    const amount = Number.isInteger(price) ? price : price.toFixed(2);
    return `$${amount}`;
  }

  async function syncThemeFromSettings() {
    const session = getSession();
    if (!session?.username || !session?.token) return;

    try {
      const response = await api("/api/settings");
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
    resolveUrl,
    toast,
    confirm: confirmDialog,
    getTheme,
    setTheme,
    syncThemeFromSettings,
    setupPasswordToggles,
    setupUserMenu,
    getPlans,
    clearPlansCache,
    formatPlanPrice,
    THEME_SETTING_KEY
  };

  syncThemeFromSettings();
})();
