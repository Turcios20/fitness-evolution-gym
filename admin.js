"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = GymApp.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const navLinks = document.querySelectorAll(".topnav .nav-link");
  const searchInput = document.querySelector(".search-bar input");
  const memberCards = document.querySelectorAll(".member-card");
  const verTodo = document.querySelector(".ver-todo");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === "#") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        alert("Módulo pendiente de implementación backend.");
      });
    }
  });

  if (verTodo) {
    verTodo.style.cursor = "pointer";
    verTodo.addEventListener("click", () => {
      alert("Listado completo de miembros pendiente de conexión.");
    });
  }

  memberCards.forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      alert("Detalle de miembro pendiente de implementación.");
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();
      memberCards.forEach((card) => {
        const name = (card.querySelector(".member-name")?.textContent || "").toLowerCase();
        card.style.display = !query || name.includes(query) ? "" : "none";
      });
    });
  }
});
