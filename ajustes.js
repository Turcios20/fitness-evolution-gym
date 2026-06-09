"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.GymApp?.guardRoute()) {
    return;
  }

  const session = window.GymApp.getSession();
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebarClose = document.getElementById("sidebarClose");
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  const topNav = document.getElementById("topNav");
  const breadcrumb = document.querySelector(".breadcrumb");
  const pageTitle = document.querySelector(".page-title");
  const pageSub = document.querySelector(".page-sub");
  const sidebarItems = [...document.querySelectorAll(".sidebar-item[data-section]")];
  const sections = [...document.querySelectorAll(".section")];
  const swatches = [...document.querySelectorAll(".color-swatch")];
  const hexInput = document.getElementById("hexInput");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const btnSaveAppearance = document.getElementById("btnSaveAppearance");
  const appearanceSection = document.getElementById("sec-apariencia");
  const appearanceDesc = appearanceSection?.querySelector(".section-desc");
  const securityDesc = document.querySelector("#sec-seguridad .section-desc");

  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const btnChangePassword = document.getElementById("btnChangePassword");
  const passwordChangeMsg = document.getElementById("passwordChangeMsg");
  const errCurrentPassword = document.getElementById("errCurrentPassword");
  const errNewPassword = document.getElementById("errNewPassword");
  const errConfirmPassword = document.getElementById("errConfirmPassword");
  const staffUsersBody = document.getElementById("staffUsersBody");
  const btnAddStaffUser = document.getElementById("btnAddStaffUser");

  const roleLabels = {
    admin: "Panel de control",
    recepcionista: "Recepcion",
    entrenador: "Entrenador"
  };

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  if (session.role === "cliente") {
    window.location.href = "ajustes-cliente.html";
    return;
  }

  GymApp.setupPasswordToggles(document);

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");
    document.body.classList.add("no-scroll");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
    document.body.classList.remove("no-scroll");
  }

  function toggleSidebar() {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function closeMobileNav() {
    mobileNav.classList.remove("open");
  }

  function toggleMobileNav() {
    mobileNav.classList.toggle("open");
  }

  function showSection(sectionId) {
    const selectedItem = sidebarItems.find((item) => item.dataset.section === sectionId);
    if (selectedItem?.classList.contains("is-disabled")) {
      return;
    }

    sections.forEach((section) => {
      section.classList.toggle("visible", section.id === `sec-${sectionId}`);
    });

    sidebarItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.section === sectionId);
    });

    if (window.innerWidth < 900) {
      closeSidebar();
    }
  }

  function setColorSelection(hex) {
    swatches.forEach((swatch) => {
      swatch.classList.toggle("selected", swatch.dataset.color === hex);
    });
    if (hexInput) {
      hexInput.value = hex;
    }
  }

  function applyThemeToPage(theme) {
    const normalizedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", normalizedTheme);
    document.body?.setAttribute("data-theme", normalizedTheme);
    if (darkModeToggle) {
      darkModeToggle.checked = normalizedTheme !== "light";
    }
  }

  function getSelectedTheme() {
    return darkModeToggle?.checked ? "dark" : "light";
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
      console.error("No se pudo cargar el tema del usuario:", error);
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
      window.GymApp.toast("Tema guardado para tu usuario.", "success");
    } catch (error) {
      applyThemeToPage(window.GymApp.getTheme());
      window.GymApp.toast(error.message || "No se pudo guardar el tema.", "error");
    }
  }

  function renderRoleNav(items) {
    if (topNav) {
      topNav.innerHTML = items
        .map((item) => `<a class="nav-item${item.active ? " active" : ""}" href="${item.href}">${item.label}</a>`)
        .join("");
    }

    if (mobileNav) {
      mobileNav.innerHTML = items
        .map((item) => `<a class="mobile-nav-item${item.active ? " active" : ""}" href="${item.href}">${item.label}</a>`)
        .join("");
    }
  }

  function addRoleNotice(message) {
    if (!appearanceSection || document.getElementById("roleSettingsNotice")) return;
    const note = document.createElement("div");
    note.id = "roleSettingsNotice";
    note.className = "section-role-note";
    note.textContent = message;
    appearanceDesc?.insertAdjacentElement("afterend", note);
  }

  function disableSection(sectionId) {
    const item = sidebarItems.find((sidebarItem) => sidebarItem.dataset.section === sectionId);
    const section = document.getElementById(`sec-${sectionId}`);

    item?.classList.add("is-disabled");
    section?.classList.add("is-disabled");
    section?.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = true;
    });
  }

  function configureRoleMode() {
    if (session.role === "admin") {
      return;
    }

    const navItems = [
      { href: window.GymApp.getHomeByRole(session.role), label: "Inicio", active: false },
      { href: "ajustes.html", label: "Ajustes", active: true }
    ];
    renderRoleNav(navItems);

    if (breadcrumb) {
      breadcrumb.innerHTML = `${roleLabels[session.role] || "Cuenta"} / <span>Ajustes</span>`;
    }
    if (pageTitle) {
      pageTitle.textContent = "Preferencias de tu cuenta";
    }
    if (pageSub) {
      pageSub.textContent = "Puedes cambiar el tema de tu cuenta y tu contrasena desde esta pantalla.";
    }
    if (appearanceDesc) {
      appearanceDesc.textContent = "Cambia el tema de tu cuenta. El resto de opciones del sistema sigue reservado para administracion.";
    }
    if (securityDesc) {
      securityDesc.textContent = "Actualiza tu contrasena personal sin depender del administrador.";
    }

    const allowedSections = new Set(["apariencia", "seguridad"]);
    sidebarItems.forEach((item) => {
      if (!allowedSections.has(item.dataset.section)) {
        disableSection(item.dataset.section);
      }
    });

    if (appearanceSection) {
      const appearanceCards = [...appearanceSection.querySelectorAll(".settings-card")];
      appearanceCards.forEach((card) => {
        if (!card.contains(darkModeToggle)) {
          card.classList.add("is-disabled");
        }
      });

      const extraThemeRows = [...appearanceSection.querySelectorAll(".toggle-row")].filter((row) => !row.contains(darkModeToggle));
      extraThemeRows.forEach((row) => {
        row.classList.add("is-disabled");
        row.querySelectorAll("input, select, textarea, button").forEach((control) => {
          control.disabled = true;
        });
      });
    }

    addRoleNotice("Desde esta pantalla puedes cambiar el modo claro u oscuro y tu contrasena personal.");
    showSection("seguridad");
  }

  function setInlineMessage(element, message, type) {
    if (!element) return;
    element.textContent = message || "";
    element.className = "settings-inline-msg";
    if (type) {
      element.classList.add(`is-${type}`);
    }
  }

  function clearPasswordErrors() {
    [errCurrentPassword, errNewPassword, errConfirmPassword, passwordChangeMsg].forEach((element) => {
      if (element) {
        element.textContent = "";
        element.className = "settings-inline-msg";
      }
    });
  }

  async function handlePasswordChange() {
    clearPasswordErrors();

    const currentPassword = currentPasswordInput?.value || "";
    const newPassword = newPasswordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";
    let hasError = false;

    if (!currentPassword) {
      setInlineMessage(errCurrentPassword, "Ingresa tu contrasena actual.", "error");
      hasError = true;
    }
    if (newPassword.length < 6) {
      setInlineMessage(errNewPassword, "La nueva contrasena debe tener minimo 6 caracteres.", "error");
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setInlineMessage(errConfirmPassword, "Las contrasenas no coinciden.", "error");
      hasError = true;
    }

    if (hasError) return;

    btnChangePassword.disabled = true;
    try {
      await GymApp.api("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      [currentPasswordInput, newPasswordInput, confirmPasswordInput].forEach((input) => {
        if (input) {
          input.value = "";
          input.type = "password";
        }
      });
      GymApp.setupPasswordToggles(document);
      setInlineMessage(passwordChangeMsg, "Contrasena actualizada correctamente.", "success");
    } catch (error) {
      setInlineMessage(passwordChangeMsg, error.message || "No se pudo cambiar la contrasena.", "error");
    } finally {
      btnChangePassword.disabled = false;
    }
  }

  function getRoleBadgeClass(roleLabel) {
    const normalized = String(roleLabel || "").toLowerCase();
    if (normalized === "administrador") return "role-badge role-admin";
    if (normalized === "recepcionista") return "role-badge role-staff";
    return "role-badge role-trainer";
  }

  function renderStatus(status) {
    const isActive = status !== "Inactivo";
    return `
      <span class="status-dot ${isActive ? "dot-active" : "dot-inactive"}"></span>
      ${escapeHtml(isActive ? "Activo" : "Inactivo")}
    `;
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    return { overlay, box };
  }

  function showDismissModal(staffMember) {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Desactivar empleado</h3>
      <p class="gm-body">
        Se desactivara el acceso de <strong>${escapeHtml(staffMember.name)}</strong> y se enviara un correo automatico desde admin@fitness-evolution-gym.pro.
      </p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmConfirm">Desactivar</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = async () => {
      try {
        await GymApp.api(`/api/admin/staff-members/${staffMember.id}/dismiss`, {
          method: "POST"
        });
        overlay.remove();
        GymApp.toast("Empleado desactivado correctamente.", "success");
        await loadStaffMembers();
      } catch (error) {
        GymApp.toast(error.message || "No se pudo desactivar al empleado.", "error");
      }
    };
  }

  function renderStaffTable(staffMembers) {
    if (!staffUsersBody) return;

    if (!staffMembers.length) {
      staffUsersBody.innerHTML = '<tr><td colspan="5" class="user-table-empty">No hay personal registrado.</td></tr>';
      return;
    }

    staffUsersBody.innerHTML = staffMembers.map((staffMember) => `
      <tr>
        <td>
          <div class="user-name-stack">
            <strong>${escapeHtml(staffMember.name)}</strong>
            <span class="user-meta-note">Alta: ${new Date(staffMember.joinedAt).toLocaleDateString("es-SV")}</span>
          </div>
        </td>
        <td>${escapeHtml(staffMember.email)}</td>
        <td><span class="${getRoleBadgeClass(staffMember.roleLabel)}">${escapeHtml(staffMember.roleLabel)}</span></td>
        <td>${renderStatus(staffMember.status)}</td>
        <td>
          <div class="user-actions">
            ${staffMember.status === "Activo"
              ? `<button class="icon-btn danger" type="button" data-action="dismiss" data-id="${staffMember.id}">Desactivar</button>`
              : '<span class="user-meta-note">Sin acceso</span>'}
          </div>
        </td>
      </tr>
    `).join("");

    staffUsersBody.querySelectorAll("[data-action='dismiss']").forEach((button) => {
      button.addEventListener("click", () => {
        const staffMember = staffMembers.find((item) => String(item.id) === String(button.dataset.id));
        if (staffMember) {
          showDismissModal(staffMember);
        }
      });
    });
  }

  async function loadStaffMembers() {
    if (session.role !== "admin" || !staffUsersBody) return;

    staffUsersBody.innerHTML = '<tr><td colspan="5" class="user-table-empty">Cargando personal...</td></tr>';
    try {
      const response = await GymApp.api("/api/admin/staff-members");
      renderStaffTable(Array.isArray(response.staff) ? response.staff : []);
    } catch (error) {
      staffUsersBody.innerHTML = '<tr><td colspan="5" class="user-table-empty">No se pudo cargar el personal.</td></tr>';
      GymApp.toast(error.message || "No se pudo cargar el personal.", "error");
    }
  }

  hamburgerBtn?.addEventListener("click", toggleSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  navToggle?.addEventListener("click", toggleMobileNav);

  document.addEventListener("click", (event) => {
    if (
      mobileNav.classList.contains("open") &&
      !mobileNav.contains(event.target) &&
      !navToggle.contains(event.target)
    ) {
      closeMobileNav();
    }
  });

  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => showSection(item.dataset.section));
  });

  swatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      if (swatch.closest(".settings-card")?.classList.contains("is-disabled")) return;
      setColorSelection(swatch.dataset.color);
    });
  });

  darkModeToggle?.addEventListener("change", () => {
    applyThemeToPage(getSelectedTheme());
  });

  btnSaveAppearance?.addEventListener("click", async () => {
    await saveThemePreference();
  });

  btnChangePassword?.addEventListener("click", async () => {
    await handlePasswordChange();
  });

  btnAddStaffUser?.addEventListener("click", () => {
    window.location.href = "form.html";
  });

  window.addEventListener("gym-theme-change", (event) => {
    applyThemeToPage(event.detail?.theme || window.GymApp.getTheme());
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900) {
      closeSidebar();
      closeMobileNav();
    }
  });

  configureRoleMode();
  setColorSelection("#f07922");
  loadUserThemePreference();
  loadStaffMembers();
});
