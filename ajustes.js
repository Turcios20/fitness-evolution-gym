"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = window.GymApp?.getSession();
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
      const response = await window.GymApp.api(`/api/settings?username=${encodeURIComponent(session.username)}`);
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
          username: session.username,
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
      pageSub.textContent = "Usa el mismo ajuste visual del sistema, con permisos limitados para tu rol.";
    }
    if (appearanceDesc) {
      appearanceDesc.textContent = "Cambia el tema de tu cuenta. El resto de opciones del sistema es solo para administracion.";
    }

    sidebarItems.forEach((item) => {
      if (item.dataset.section !== "apariencia") {
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

    addRoleNotice("Solo puedes cambiar el modo claro u oscuro de tu cuenta desde esta pantalla.");
    showSection("apariencia");
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
});
