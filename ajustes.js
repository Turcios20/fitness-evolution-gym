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
  const btnSaveGym = document.getElementById("btnSaveGym");
  const gymSaveMsg = document.getElementById("gymSaveMsg");
  const scheduleGrid = document.getElementById("scheduleGrid");
  const btnSaveSchedule = document.getElementById("btnSaveSchedule");
  const scheduleSaveMsg = document.getElementById("scheduleSaveMsg");
  const planGrid = document.getElementById("planGrid");
  const btnAddPlan = document.getElementById("btnAddPlan");
  const planSaveMsg = document.getElementById("planSaveMsg");
  let plans = [];
  const gymFields = {
    nombre: document.getElementById("gymNombre"),
    eslogan: document.getElementById("gymEslogan"),
    nit: document.getElementById("gymNit"),
    telefono: document.getElementById("gymTelefono"),
    correo: document.getElementById("gymCorreo"),
    sitio_web: document.getElementById("gymSitioWeb"),
    direccion: document.getElementById("gymDireccion"),
    ciudad: document.getElementById("gymCiudad"),
    pais: document.getElementById("gymPais")
  };
  let trainers = [];

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

  function hideSection(sectionId) {
    const item = sidebarItems.find((sidebarItem) => sidebarItem.dataset.section === sectionId);
    const section = document.getElementById(`sec-${sectionId}`);

    if (item) item.style.display = "none";
    if (section) section.style.display = "none";
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
        hideSection(item.dataset.section);
      }
    });

    [...document.querySelectorAll(".sidebar-section")].forEach((group) => {
      const hasAllowed = [...group.querySelectorAll(".sidebar-item[data-section]")]
        .some((item) => allowedSections.has(item.dataset.section));
      if (!hasAllowed) {
        group.style.display = "none";
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
    if (normalized === "cliente") return "role-badge role-client";
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

  function trainerOptions(selectedTrainerId) {
    const selectedId = Number(selectedTrainerId || 0);
    return ['<option value="">Sin asignar</option>']
      .concat(
        trainers.map((trainer) => `
          <option value="${trainer.id}" ${trainer.id === selectedId ? "selected" : ""}>
            ${escapeHtml(trainer.name)}
          </option>
        `)
      )
      .join("");
  }

  async function ensureTrainersLoaded() {
    if (trainers.length) {
      return trainers;
    }

    const response = await GymApp.api("/api/trainers");
    trainers = Array.isArray(response.trainers) ? response.trainers : [];
    return trainers;
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

  function showReactivateModal(staffMember) {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Reactivar empleado</h3>
      <p class="gm-body">
        Se restaurara el acceso de <strong>${escapeHtml(staffMember.name)}</strong> y se notificara por correo.
      </p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmConfirm">Reactivar</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = async () => {
      try {
        await GymApp.api(`/api/admin/staff-members/${staffMember.id}/reactivate`, {
          method: "POST"
        });
        overlay.remove();
        GymApp.toast("Empleado reactivado correctamente.", "success");
        await loadStaffMembers();
      } catch (error) {
        GymApp.toast(error.message || "No se pudo reactivar al empleado.", "error");
      }
    };
  }

  async function showEditStaffModal(staffMember) {
    await ensureTrainersLoaded();
    if (!plans.length) {
      try {
        plans = await GymApp.getPlans();
      } catch (error) {
        console.error("No se pudieron cargar los planes:", error);
      }
    }

    const { overlay, box } = createOverlay();
    box.classList.add("gm-edit-box");
    const currentRole = String(staffMember.role || "recepcionista").toLowerCase();
    const roleLabels = {
      cliente: "Cliente",
      entrenador: "Entrenador",
      recepcionista: "Recepcionista",
      admin: "Administrador"
    };

    box.innerHTML = `
      <h3 class="gm-title">Editar acceso</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Nombre completo</label>
          <input id="gmName" class="gm-input" type="text" value="${escapeHtml(staffMember.name)}">
        </div>
        <div class="gm-field">
          <label>Correo electronico</label>
          <input id="gmEmail" class="gm-input" type="email" value="${escapeHtml(staffMember.email)}">
        </div>
        <div class="gm-field">
          <label>Rol</label>
          <select id="gmRole" class="gm-input">
            ${[
              ["cliente", "Cliente"],
              ["entrenador", "Entrenador"],
              ["recepcionista", "Recepcionista"],
              ["admin", "Administrador"]
            ].map(([value, label]) => `
              <option value="${value}" ${value === currentRole ? "selected" : ""}>${label}</option>
            `).join("")}
          </select>
        </div>
        <div class="gm-field">
          <label>Acceso al sistema</label>
          <select id="gmAccessStatus" class="gm-input">
            ${["Activo", "Inactivo"].map((status) => `
              <option value="${status}" ${status === staffMember.status ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </div>
        <div class="gm-role-toolbar">
          <span class="gm-role-summary" id="gmRoleSummary">Rol actual: ${roleLabels[currentRole] || "Recepcionista"}</span>
        </div>
        <div id="gmClientFields" class="gm-role-panel" hidden>
          <div class="gm-field">
            <label>Plan de membresia</label>
            <select id="gmPlan" class="gm-input">
              ${(plans.filter((plan) => plan.activo).length ? plans.filter((plan) => plan.activo) : plans)
                .map((plan) => `<option value="${escapeHtml(plan.nombre)}">${escapeHtml(plan.nombre)}</option>`)
                .join("")}
            </select>
          </div>
          <div class="gm-field">
            <label>Estado de membresia</label>
            <select id="gmMembershipStatus" class="gm-input">
              ${["Activo", "Inactivo"].map((status) => `
                <option value="${status}">${status}</option>
              `).join("")}
            </select>
          </div>
          <div class="gm-field">
            <label>Entrenador asignado</label>
            <select id="gmTrainer" class="gm-input">${trainerOptions(null)}</select>
          </div>
          <p class="gm-body gm-help-note">
            Si conviertes este acceso en cliente, dejara de verse en esta tabla y pasara al modulo de miembros.
          </p>
        </div>
        <span class="gm-error" id="gmError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSave">Guardar cambios</button>
      </div>
    `;

    const roleSelect = box.querySelector("#gmRole");
    const roleSummary = box.querySelector("#gmRoleSummary");
    const clientFields = box.querySelector("#gmClientFields");

    function syncFields() {
      const isClientRole = roleSelect.value === "cliente";
      clientFields.hidden = !isClientRole;
      roleSummary.textContent = `Rol: ${roleLabels[roleSelect.value] || "Recepcionista"}`;
    }

    roleSelect.addEventListener("change", syncFields);
    syncFields();

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSave").onclick = async () => {
      const name = box.querySelector("#gmName").value.trim();
      const email = box.querySelector("#gmEmail").value.trim();
      const role = roleSelect.value;
      const accessStatus = box.querySelector("#gmAccessStatus").value;
      const errEl = box.querySelector("#gmError");

      if (!name) {
        errEl.textContent = "El nombre es obligatorio.";
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Correo invalido.";
        return;
      }

      const payload = {
        name,
        email,
        role,
        accessStatus
      };

      if (role === "cliente") {
        payload.plan = box.querySelector("#gmPlan").value;
        payload.status = box.querySelector("#gmMembershipStatus").value;
        const trainerIdValue = box.querySelector("#gmTrainer").value;
        payload.trainerId = trainerIdValue ? Number(trainerIdValue) : null;
      }

      try {
        const response = await GymApp.api(`/api/admin/staff-members/${staffMember.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        overlay.remove();
        GymApp.toast(
          response?.message || (payload.role === "cliente"
            ? "El colaborador fue convertido a cliente."
            : "Colaborador actualizado correctamente."),
          "success"
        );
        await loadStaffMembers();
      } catch (error) {
        errEl.textContent = error.message || "No se pudo actualizar el colaborador.";
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
            <button class="icon-btn" type="button" data-action="edit" data-id="${staffMember.id}">Editar</button>
            ${staffMember.status === "Activo"
              ? `<button class="icon-btn danger" type="button" data-action="dismiss" data-id="${staffMember.id}">Desactivar</button>`
              : `<button class="icon-btn success" type="button" data-action="reactivate" data-id="${staffMember.id}">Reactivar</button>`}
          </div>
        </td>
      </tr>
    `).join("");

    staffUsersBody.querySelectorAll("[data-action='edit']").forEach((button) => {
      button.addEventListener("click", async () => {
        const staffMember = staffMembers.find((item) => String(item.id) === String(button.dataset.id));
        if (!staffMember) return;

        try {
          await showEditStaffModal(staffMember);
        } catch (error) {
          GymApp.toast(error.message || "No se pudo abrir la edicion del colaborador.", "error");
        }
      });
    });

    staffUsersBody.querySelectorAll("[data-action='dismiss']").forEach((button) => {
      button.addEventListener("click", () => {
        const staffMember = staffMembers.find((item) => String(item.id) === String(button.dataset.id));
        if (staffMember) {
          showDismissModal(staffMember);
        }
      });
    });

    staffUsersBody.querySelectorAll("[data-action='reactivate']").forEach((button) => {
      button.addEventListener("click", () => {
        const staffMember = staffMembers.find((item) => String(item.id) === String(button.dataset.id));
        if (staffMember) {
          showReactivateModal(staffMember);
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

  async function loadGymSettings() {
    if (!gymFields.nombre) return;

    try {
      const response = await GymApp.api("/api/gym-settings");
      const gym = response.gym || {};
      Object.entries(gymFields).forEach(([key, input]) => {
        if (input && gym[key] != null) {
          input.value = gym[key];
        }
      });
    } catch (error) {
      console.error("No se pudieron cargar los datos del gimnasio:", error);
    }
  }

  async function handleSaveGym() {
    if (!btnSaveGym) return;

    const gym = {};
    Object.entries(gymFields).forEach(([key, input]) => {
      if (input) {
        gym[key] = input.value.trim();
      }
    });

    setInlineMessage(gymSaveMsg, "", null);
    btnSaveGym.disabled = true;
    try {
      await GymApp.api("/api/gym-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gym })
      });
      setInlineMessage(gymSaveMsg, "Datos del gimnasio guardados correctamente.", "success");
      GymApp.toast("Datos del gimnasio guardados correctamente.", "success");
    } catch (error) {
      setInlineMessage(gymSaveMsg, error.message || "No se pudieron guardar los datos.", "error");
      GymApp.toast(error.message || "No se pudieron guardar los datos.", "error");
    } finally {
      btnSaveGym.disabled = false;
    }
  }

  function renderPlans() {
    if (!planGrid) return;

    if (!plans.length) {
      planGrid.innerHTML = '<div class="plan-empty">No hay planes registrados. Agrega el primero.</div>';
      return;
    }

    planGrid.innerHTML = plans
      .map((plan) => {
        const features = (plan.caracteristicas || [])
          .map((feature) => `<li>${escapeHtml(feature)}</li>`)
          .join("");
        const price = Number.isInteger(plan.precio) ? plan.precio : Number(plan.precio).toFixed(2);
        const inactiveClass = plan.activo ? "" : " plan-inactive";
        const badge = plan.popular ? '<div class="plan-badge">Mas popular</div>' : "";
        const inactiveTag = plan.activo ? "" : '<div class="plan-badge plan-badge-off">Inactivo</div>';
        return `
          <div class="plan-card${plan.popular ? " selected" : ""}${inactiveClass}" data-id="${plan.id}" role="button" tabindex="0">
            ${badge}${inactiveTag}
            <div class="plan-name">${escapeHtml(plan.nombre)}</div>
            <div class="plan-price">$${price} <span>${escapeHtml(plan.periodo || "")}</span></div>
            <ul class="plan-features">${features}</ul>
            <div class="plan-card-hint">Clic para editar</div>
          </div>
        `;
      })
      .join("");

    planGrid.querySelectorAll(".plan-card").forEach((card) => {
      const plan = plans.find((item) => String(item.id) === String(card.dataset.id));
      if (!plan) return;
      card.addEventListener("click", () => showPlanModal(plan));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showPlanModal(plan);
        }
      });
    });
  }

  async function loadPlans() {
    if (!planGrid) return;

    try {
      plans = await GymApp.getPlans({ force: true });
      renderPlans();
    } catch (error) {
      planGrid.innerHTML = '<div class="plan-empty">No se pudieron cargar los planes.</div>';
      console.error("No se pudieron cargar los planes:", error);
    }
  }

  function showPlanModal(existingPlan) {
    const isEdit = Boolean(existingPlan);
    const plan = existingPlan || {
      nombre: "",
      precio: "",
      duracionDias: 30,
      periodo: "/mes",
      caracteristicas: [],
      popular: false,
      activo: true
    };

    const { overlay, box } = createOverlay();
    box.classList.add("gm-edit-box");
    box.innerHTML = `
      <h3 class="gm-title">${isEdit ? "Editar plan" : "Nuevo plan"}</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Nombre del plan</label>
          <input id="planNombre" class="gm-input" type="text" maxlength="50" value="${escapeHtml(plan.nombre)}" placeholder="Ej: Mensual">
        </div>
        <div class="gm-field">
          <label>Precio ($)</label>
          <input id="planPrecio" class="gm-input" type="number" min="0" step="0.01" value="${escapeHtml(plan.precio)}" placeholder="35">
        </div>
        <div class="gm-field">
          <label>Duracion (dias)</label>
          <input id="planDuracion" class="gm-input" type="number" min="1" step="1" value="${escapeHtml(plan.duracionDias)}" placeholder="30">
        </div>
        <div class="gm-field">
          <label>Etiqueta de periodo</label>
          <input id="planPeriodo" class="gm-input" type="text" maxlength="30" value="${escapeHtml(plan.periodo)}" placeholder="/mes">
        </div>
        <div class="gm-field">
          <label>Caracteristicas (una por linea)</label>
          <textarea id="planFeatures" class="gm-input" rows="4" placeholder="Acceso completo&#10;Clases grupales">${escapeHtml((plan.caracteristicas || []).join("\n"))}</textarea>
        </div>
        <div class="toggle-row">
          <div class="toggle-info"><div class="toggle-name">Marcar como popular</div><div class="toggle-desc">Se resalta con la etiqueta "Mas popular"</div></div>
          <label class="toggle"><input type="checkbox" id="planPopular" ${plan.popular ? "checked" : ""}/><span class="toggle-slider"></span></label>
        </div>
        <div class="toggle-row">
          <div class="toggle-info"><div class="toggle-name">Plan activo</div><div class="toggle-desc">Disponible para nuevas altas y renovaciones</div></div>
          <label class="toggle"><input type="checkbox" id="planActivo" ${plan.activo ? "checked" : ""}/><span class="toggle-slider"></span></label>
        </div>
        <span class="gm-error" id="planError"></span>
      </div>
      <div class="gm-actions">
        ${isEdit ? '<button class="gm-btn gm-btn-danger" id="planDelete">Eliminar</button>' : ""}
        <button class="gm-btn gm-btn-cancel" id="planCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="planSave">${isEdit ? "Guardar cambios" : "Crear plan"}</button>
      </div>
    `;

    const errEl = box.querySelector("#planError");

    box.querySelector("#planCancel").onclick = () => overlay.remove();

    box.querySelector("#planSave").onclick = async () => {
      const payload = {
        nombre: box.querySelector("#planNombre").value.trim(),
        precio: Number(box.querySelector("#planPrecio").value),
        duracionDias: Number(box.querySelector("#planDuracion").value),
        periodo: box.querySelector("#planPeriodo").value.trim() || "/mes",
        caracteristicas: box.querySelector("#planFeatures").value
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        popular: box.querySelector("#planPopular").checked,
        activo: box.querySelector("#planActivo").checked
      };

      if (!payload.nombre) {
        errEl.textContent = "El nombre es obligatorio.";
        return;
      }
      if (!Number.isFinite(payload.precio) || payload.precio < 0) {
        errEl.textContent = "Ingresa un precio valido.";
        return;
      }
      if (!Number.isInteger(payload.duracionDias) || payload.duracionDias < 1) {
        errEl.textContent = "La duracion debe ser un numero de dias mayor a 0.";
        return;
      }

      const saveBtn = box.querySelector("#planSave");
      saveBtn.disabled = true;
      try {
        await GymApp.api(isEdit ? `/api/membership-plans/${existingPlan.id}` : "/api/membership-plans", {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        overlay.remove();
        GymApp.clearPlansCache();
        await loadPlans();
        setInlineMessage(planSaveMsg, isEdit ? "Plan actualizado correctamente." : "Plan creado correctamente.", "success");
        GymApp.toast(isEdit ? "Plan actualizado." : "Plan creado.", "success");
      } catch (error) {
        errEl.textContent = error.message || "No se pudo guardar el plan.";
        saveBtn.disabled = false;
      }
    };

    if (isEdit) {
      box.querySelector("#planDelete").onclick = () => {
        showDeletePlanModal(existingPlan, overlay);
      };
    }
  }

  function showDeletePlanModal(plan, parentOverlay) {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Eliminar plan</h3>
      <p class="gm-body">
        Se eliminara el plan <strong>${escapeHtml(plan.nombre)}</strong>. Las membresias existentes con este plan no se modifican, pero dejara de aparecer en altas y renovaciones.
      </p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="delCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="delConfirm">Eliminar</button>
      </div>
    `;
    box.querySelector("#delCancel").onclick = () => overlay.remove();
    box.querySelector("#delConfirm").onclick = async () => {
      try {
        await GymApp.api(`/api/membership-plans/${plan.id}`, { method: "DELETE" });
        overlay.remove();
        parentOverlay?.remove();
        GymApp.clearPlansCache();
        await loadPlans();
        setInlineMessage(planSaveMsg, "Plan eliminado correctamente.", "success");
        GymApp.toast("Plan eliminado.", "success");
      } catch (error) {
        GymApp.toast(error.message || "No se pudo eliminar el plan.", "error");
      }
    };
  }

  function normalizeTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? "").trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  async function loadGymSchedule() {
    if (!scheduleGrid) return;

    try {
      const response = await GymApp.api("/api/gym-schedule");
      const schedule = Array.isArray(response.schedule) ? response.schedule : [];

      schedule.forEach((day) => {
        const row = scheduleGrid.querySelector(`.hours-row[data-day="${day.dia}"]`);
        if (!row) return;
        const apertura = row.querySelector('[data-field="apertura"]');
        const cierre = row.querySelector('[data-field="cierre"]');
        const activo = row.querySelector('[data-field="activo"]');
        if (apertura) apertura.value = day.apertura ?? "";
        if (cierre) cierre.value = day.cierre ?? "";
        if (activo) activo.checked = Boolean(day.activo);
      });
    } catch (error) {
      console.error("No se pudieron cargar los horarios:", error);
    }
  }

  async function handleSaveSchedule() {
    if (!scheduleGrid || !btnSaveSchedule) return;

    const rows = [...scheduleGrid.querySelectorAll(".hours-row")];
    const schedule = [];

    for (const row of rows) {
      const dia = Number(row.dataset.day);
      const dayName = row.querySelector(".day-name")?.textContent?.trim() || `Dia ${dia}`;
      const apertura = normalizeTime(row.querySelector('[data-field="apertura"]')?.value);
      const cierre = normalizeTime(row.querySelector('[data-field="cierre"]')?.value);
      const activo = row.querySelector('[data-field="activo"]')?.checked || false;

      if (!apertura || !cierre) {
        setInlineMessage(scheduleSaveMsg, `Revisa las horas de ${dayName}. Usa el formato HH:MM.`, "error");
        return;
      }

      if (apertura >= cierre) {
        setInlineMessage(scheduleSaveMsg, `En ${dayName} la hora de cierre debe ser mayor a la de apertura.`, "error");
        return;
      }

      schedule.push({ dia, apertura, cierre, activo });
    }

    setInlineMessage(scheduleSaveMsg, "", null);
    btnSaveSchedule.disabled = true;
    try {
      await GymApp.api("/api/gym-schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule })
      });
      setInlineMessage(scheduleSaveMsg, "Horarios guardados correctamente.", "success");
      GymApp.toast("Horarios guardados correctamente.", "success");
    } catch (error) {
      setInlineMessage(scheduleSaveMsg, error.message || "No se pudieron guardar los horarios.", "error");
      GymApp.toast(error.message || "No se pudieron guardar los horarios.", "error");
    } finally {
      btnSaveSchedule.disabled = false;
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

  btnSaveGym?.addEventListener("click", handleSaveGym);

  btnSaveSchedule?.addEventListener("click", handleSaveSchedule);

  btnAddPlan?.addEventListener("click", () => showPlanModal(null));

  document.getElementById("btnSettingsLogout")?.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
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
  loadUserThemePreference();
  loadStaffMembers();
  loadGymSettings();
  loadGymSchedule();
  loadPlans();
});
