"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("recepcionista")) {
    return;
  }

  GymApp.setupUserMenu({ anchorId: "receptionAvatar", avatarId: "receptionAvatar" });

  const themeToggle = document.getElementById("receptionThemeToggle");
  const saveThemeButton = document.getElementById("btnSaveReceptionTheme");
  const changePasswordButton = document.getElementById("btnChangeReceptionPassword");
  const messageBox = document.getElementById("receptionPasswordMsg");
  const btnLogout = document.getElementById("btnReceptionLogout");

  const passwordFields = {
    current: document.getElementById("receptionCurrentPassword"),
    next: document.getElementById("receptionNewPassword"),
    confirm: document.getElementById("receptionConfirmPassword")
  };

  const passwordErrors = {
    current: document.getElementById("receptionErrCurrentPassword"),
    next: document.getElementById("receptionErrNewPassword"),
    confirm: document.getElementById("receptionErrConfirmPassword")
  };

  GymApp.setupPasswordToggles(document);

  function applyThemeToPage(theme) {
    const normalizedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    document.body?.setAttribute("data-theme", normalizedTheme);
    if (themeToggle) {
      themeToggle.checked = normalizedTheme !== "light";
    }
  }

  function getSelectedTheme() {
    return themeToggle?.checked ? "dark" : "light";
  }

  function setPasswordMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = `form-msg form-msg--${type}`;
    messageBox.style.display = "block";
  }

  function clearPasswordErrors() {
    Object.values(passwordErrors).forEach((element) => {
      if (element) element.textContent = "";
    });
    messageBox.style.display = "none";
  }

  async function loadUserThemePreference() {
    try {
      const response = await window.GymApp.api("/api/settings");
      const savedTheme = response.settings?.[window.GymApp.THEME_SETTING_KEY];
      if (!savedTheme) {
        applyThemeToPage(window.GymApp.getTheme());
        return;
      }

      window.GymApp.setTheme(savedTheme);
    } catch (error) {
      applyThemeToPage(window.GymApp.getTheme());
      console.error("No se pudo cargar el tema de recepcion:", error);
    }
  }

  async function saveThemePreference() {
    const nextTheme = getSelectedTheme();

    try {
      await window.GymApp.api("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  async function changePassword() {
    clearPasswordErrors();

    const currentPassword = passwordFields.current.value;
    const newPassword = passwordFields.next.value;
    const confirmPassword = passwordFields.confirm.value;
    let hasError = false;

    if (!currentPassword) {
      passwordErrors.current.textContent = "Ingresa tu contrasena actual.";
      hasError = true;
    }

    if (newPassword.length < 6) {
      passwordErrors.next.textContent = "La nueva contrasena debe tener minimo 6 caracteres.";
      hasError = true;
    }

    if (newPassword !== confirmPassword) {
      passwordErrors.confirm.textContent = "Las contrasenas no coinciden.";
      hasError = true;
    }

    if (hasError) return;

    changePasswordButton.disabled = true;

    try {
      await GymApp.api("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      Object.values(passwordFields).forEach((field) => {
        field.value = "";
        field.type = "password";
      });
      GymApp.setupPasswordToggles(document);
      setPasswordMessage("Contrasena actualizada correctamente.", "ok");
    } catch (error) {
      setPasswordMessage(error.message || "No se pudo cambiar la contrasena.", "error");
    } finally {
      changePasswordButton.disabled = false;
    }
  }

  themeToggle?.addEventListener("change", () => {
    applyThemeToPage(getSelectedTheme());
  });

  saveThemeButton?.addEventListener("click", async () => {
    await saveThemePreference();
  });

  changePasswordButton?.addEventListener("click", async () => {
    await changePassword();
  });

  btnLogout?.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "/login";
  });

  window.addEventListener("gym-theme-change", (event) => {
    applyThemeToPage(event.detail?.theme || window.GymApp.getTheme());
  });

  await loadUserThemePreference();
});
