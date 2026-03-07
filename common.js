"use strict";

(function bootstrapGymApp() {
  const fromStorage = localStorage.getItem("gymApiBase");
  const API_BASE = fromStorage || (window.location.protocol === "file:" ? "http://localhost:3000" : "");

  async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, options);

    if (!response.ok) {
      const message = await safeText(response);
      throw new Error(message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async function safeText(response) {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem("gymSession") || "null");
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem("gymSession", JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem("gymSession");
  }

  window.GymApp = {
    api,
    getSession,
    setSession,
    clearSession
  };
})();
