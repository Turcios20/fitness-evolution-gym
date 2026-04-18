"use strict";

(function bootstrapGymApp() {
  const fromStorage = localStorage.getItem("gymApiBase");
  const API_BASE = fromStorage || (window.location.protocol === "file:" ? "http://localhost:3000" : "");
  const FAVICON_PATH = "assets/favicon.svg";
  const THEME_KEY = "gym-theme";

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("gym-theme-change", { detail: { theme: nextTheme } }));
  }

  function buildDesktopToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle-btn";
    button.setAttribute("aria-label", "Cambiar tema");
    button.innerHTML = `
      <svg class="theme-icon icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="theme-icon icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <span class="toggle-track">
        <span class="toggle-knob">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
          </svg>
        </span>
      </span>
      <span class="toggle-label"></span>
    `;
    button.addEventListener("click", toggleTheme);
    return button;
  }

  function buildMobileToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-theme-btn";
    button.setAttribute("aria-label", "Cambiar tema");
    button.innerHTML = `
      <svg class="m-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <svg class="m-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;
    button.addEventListener("click", toggleTheme);
    return button;
  }

  function initThemeToggle() {
    applyTheme(getTheme());

    const topnav = document.querySelector(".topnav");
    const clienteTopnav = document.querySelector(".cliente-topnav");
    const loginWrapper = document.querySelector(".login-wrapper");
    const topBarRight = document.querySelector(".top-bar-right");
    const topBar = document.querySelector(".top-bar");
    const desktopHost =
      (topnav && topnav.querySelector(".topnav-actions")) ||
      topBarRight ||
      topnav ||
      topBar ||
      clienteTopnav ||
      loginWrapper;

    if (desktopHost && !document.querySelector(".theme-toggle-btn")) {
      desktopHost.appendChild(buildDesktopToggle());
    }

    if ((topnav || clienteTopnav || loginWrapper || topBar) && !document.querySelector(".mobile-theme-btn")) {
      document.body.appendChild(buildMobileToggle());
    }
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
  initThemeToggle();

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

  window.GymApp = {
    api,
    getSession,
    setSession,
    clearSession,
    isSessionExpired,
    guardRoute,
    getHomeByRole,
    toast
  };
})();
