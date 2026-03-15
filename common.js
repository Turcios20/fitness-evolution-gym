"use strict";

(function bootstrapGymApp() {
  const fromStorage = localStorage.getItem("gymApiBase");
  const API_BASE = fromStorage || (window.location.protocol === "file:" ? "http://localhost:3000" : "");

  // ── API con interceptor de sesión ──────────────────────────
  async function api(path, options = {}) {
    const session = getSession();

    // Adjunta el token si existe
    if (session?.token) {
      options.headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${session.token}`
      };
    }

    const url = `${API_BASE}${path}`;
    const response = await fetch(url, options);

    // 401 = sesión expirada o inválida → redirige al login
    if (response.status === 401) {
      clearSession();
      window.location.href = "login.html";
      throw new Error("Sesión expirada.");
    }

    if (!response.ok) {
      const message = await safeText(response);
      throw new Error(message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  }

  async function safeText(response) {
    try { return await response.text(); } catch { return ""; }
  }

  // ── Sesión ──────────────────────────────────────────────────
  function getSession() {
    try { return JSON.parse(localStorage.getItem("gymSession") || "null"); }
    catch { return null; }
  }

  function setSession(session) {
    // Guarda la hora de login para detectar expiración en cliente
    session._loginAt = Date.now();
    localStorage.setItem("gymSession", JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem("gymSession");
  }

  // Devuelve true si la sesión lleva más de 8 horas activa
  function isSessionExpired() {
    const s = getSession();
    if (!s) return true;
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    return s._loginAt && (Date.now() - s._loginAt) > EIGHT_HOURS;
  }

  // ── Guardián de ruta ────────────────────────────────────────
  // Llama esto en cada página protegida.
  // requiredRole: "admin" | "cliente" | null (cualquiera autenticado)
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
    if (requiredRole && session.role !== requiredRole) {
      window.location.href = session.role === "admin" ? "admin.html" : "cliente.html";
      return false;
    }
    return true;
  }

  // ── Sistema de Toasts ───────────────────────────────────────
  // Uso: GymApp.toast("Mensaje", "success" | "error" | "info")
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

    const icons = { success: "✔", error: "✖", info: "ℹ" };
    el.innerHTML = `<span class="gym-toast-icon">${icons[type] || "ℹ"}</span><span>${message}</span>`;

    container.appendChild(el);

    // Anima entrada
    requestAnimationFrame(() => el.classList.add("gym-toast--show"));

    // Desaparece después de 3.2s
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
    toast,
  };
})();
