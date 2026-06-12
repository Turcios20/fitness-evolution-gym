"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("cliente")) {
    return;
  }

  const session = window.GymApp.getSession();

  const avatar = document.getElementById("userAvatar");
  const dropdownName = document.getElementById("dropdownName");
  const avatarWrap = document.getElementById("avatarWrap");
  const avatarDropdown = document.getElementById("avatarDropdown");
  const logoutButton = document.getElementById("btnLogout");
  const clientThemeToggle = document.getElementById("clientThemeToggle");
  const saveThemeButton = document.getElementById("btnSaveClientTheme");
  const changePasswordButton = document.getElementById("btnChangeClientPassword");
  const messageBox = document.getElementById("clientPasswordMsg");

  const passwordFields = {
    current: document.getElementById("clientCurrentPassword"),
    next: document.getElementById("clientNewPassword"),
    confirm: document.getElementById("clientConfirmPassword")
  };

  const passwordErrors = {
    current: document.getElementById("clientErrCurrentPassword"),
    next: document.getElementById("clientErrNewPassword"),
    confirm: document.getElementById("clientErrConfirmPassword")
  };

  GymApp.setupPasswordToggles(document);

  function applyThemeToPage(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    if (clientThemeToggle) {
      clientThemeToggle.checked = theme !== "light";
    }
  }

  function getSelectedTheme() {
    return clientThemeToggle?.checked ? "dark" : "light";
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
      const response = await window.GymApp.api("/api/settings");
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

  clientThemeToggle?.addEventListener("change", () => {
    applyThemeToPage(getSelectedTheme());
  });

  saveThemeButton?.addEventListener("click", async () => {
    await saveThemePreference();
  });

  changePasswordButton?.addEventListener("click", async () => {
    await changePassword();
  });

  logoutButton?.addEventListener("click", () => {
    window.GymApp.clearSession();
    window.location.href = "/login";
  });

  window.addEventListener("gym-theme-change", (event) => {
    applyThemeToPage(event.detail?.theme || window.GymApp.getTheme());
  });

  initAvatar();
  await loadUserThemePreference();
});
