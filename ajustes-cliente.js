"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const session = window.GymApp?.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const avatar = document.getElementById("userAvatar");
  const dropdownName = document.getElementById("dropdownName");
  const avatarWrap = document.getElementById("avatarWrap");
  const avatarDropdown = document.getElementById("avatarDropdown");
  const logoutButton = document.getElementById("btnLogout");
  const clientThemeToggle = document.getElementById("clientThemeToggle");
  const saveButton = document.getElementById("btnSaveClientTheme");

  function applyThemeToPage(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    if (clientThemeToggle) {
      clientThemeToggle.checked = theme !== "light";
    }
  }

  function getSelectedTheme() {
    return clientThemeToggle?.checked ? "dark" : "light";
  }

  function initAvatar() {
    const name = session.displayName || "Usuario";
    const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0].toUpperCase()).join("");
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e", "#8b1a1a", "#b0390e"];
    avatar.textContent = initials;
    avatar.style.background = palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
    dropdownName.textContent = name;

    avatarWrap.addEventListener("click", (event) => {
      event.stopPropagation();
      avatarDropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => avatarDropdown.classList.remove("open"));
  }

  async function loadUserThemePreference() {
    try {
      const response = await window.GymApp.api(`/api/settings?username=${encodeURIComponent(session.username)}`);
      const savedTheme = response.settings?.[window.GymApp.THEME_SETTING_KEY];
      if (!savedTheme) {
        applyThemeToPage(window.GymApp.getTheme());
        return;
      }

      window.GymApp.setTheme(savedTheme);
    } catch (error) {
      applyThemeToPage(window.GymApp.getTheme());
      console.error("No se pudo cargar el tema del cliente:", error);
    }
  }

  async function saveThemePreference() {
    const nextTheme = getSelectedTheme();

    try {
      await window.GymApp.api("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          settings: {
            [window.GymApp.THEME_SETTING_KEY]: nextTheme
          }
        })
      });

      window.GymApp.setTheme(nextTheme);
      window.GymApp.toast("Tema guardado para tu cuenta.", "success");
    } catch (error) {
      applyThemeToPage(window.GymApp.getTheme());
      window.GymApp.toast(error.message || "No se pudo guardar el tema.", "error");
    }
  }

  clientThemeToggle?.addEventListener("change", () => {
    applyThemeToPage(getSelectedTheme());
  });

  saveButton?.addEventListener("click", async () => {
    await saveThemePreference();
  });

  logoutButton?.addEventListener("click", () => {
    window.GymApp.clearSession();
    window.location.href = "login.html";
  });

  window.addEventListener("gym-theme-change", (event) => {
    applyThemeToPage(event.detail?.theme || window.GymApp.getTheme());
  });

  initAvatar();
  await loadUserThemePreference();
});
