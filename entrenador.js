"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("entrenador")) return;

  const session = GymApp.getSession();
  const welcomeTitle = document.getElementById("welcomeTitle");
  const userAvatar = document.getElementById("userAvatar");
  const btnLogout = document.getElementById("btnTrainerLogout");

  function getInitials(name) {
    return (name || "CO")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }

  function avatarColor(initials) {
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];
    return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
  }

  const displayName = session.displayName || "Coach";
  const initials = getInitials(displayName);

  welcomeTitle.textContent = `Hola, ${displayName}`;
  userAvatar.textContent = initials;
  userAvatar.style.background = avatarColor(initials);

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  document.querySelectorAll(".btn-icon-check").forEach((button) => {
    button.addEventListener("click", () => {
      button.disabled = true;
      button.textContent = "OK";
      GymApp.toast("Sesion marcada como completada.", "success");
    });
  });

  document.querySelectorAll(".tool-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      GymApp.toast("Modulo listo para la siguiente HU.", "info");
    });
  });
});
