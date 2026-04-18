"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const THEME_KEY = "gym-theme";
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebarClose = document.getElementById("sidebarClose");
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  const sidebarItems = [...document.querySelectorAll(".sidebar-item[data-section]")];
  const sections = [...document.querySelectorAll(".section")];
  const swatches = [...document.querySelectorAll(".color-swatch")];
  const hexInput = document.getElementById("hexInput");
  const darkModeToggle = document.getElementById("darkModeToggle");

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
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    if (darkModeToggle) {
      darkModeToggle.checked = theme !== "light";
    }
  }

  function syncThemeFromStorage() {
    applyThemeToPage(localStorage.getItem(THEME_KEY) || "dark");
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
    swatch.addEventListener("click", () => setColorSelection(swatch.dataset.color));
  });

  darkModeToggle?.addEventListener("change", () => {
    const nextTheme = darkModeToggle.checked ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyThemeToPage(nextTheme);
  });

  window.addEventListener("storage", (event) => {
    if (event.key === THEME_KEY) {
      syncThemeFromStorage();
    }
  });

  window.addEventListener("gym-theme-change", (event) => {
    applyThemeToPage(event.detail?.theme || "dark");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900) {
      closeSidebar();
      closeMobileNav();
    }
  });

  setColorSelection("#f07922");
  syncThemeFromStorage();
});
