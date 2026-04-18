"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("entrenador")) return;

  const session = GymApp.getSession();
  const welcomeTitle = document.getElementById("welcomeTitle");
  const userAvatar = document.getElementById("userAvatar");
  const btnLogout = document.getElementById("btnTrainerLogout");
  const statTotalClients = document.getElementById("statTotalClients");
  const statActiveClients = document.getElementById("statActiveClients");
  const statExpiringSoon = document.getElementById("statExpiringSoon");
  const assignedClientsList = document.getElementById("assignedClientsList");
  const clientsHint = document.getElementById("clientsHint");

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

  document.querySelectorAll(".tool-card").forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      GymApp.toast("Modulo listo para la siguiente HU.", "info");
    });
  });

  function membershipLabel(client) {
    if (client.status !== "Activo") return "Membresia inactiva";
    if (client.daysRemaining <= 0) return "Membresia vencida";
    if (client.daysRemaining <= 7) return `Vence en ${client.daysRemaining} dias`;
    return `${client.daysRemaining} dias restantes`;
  }

  function renderClients(clients) {
    assignedClientsList.innerHTML = "";

    if (!clients.length) {
      assignedClientsList.innerHTML = `
        <div class="session-item session-item--empty">
          <div class="session-info">
            <p class="student-name">Aun no tienes clientes asignados</p>
            <p class="session-goal">Cuando admin te vincule clientes, apareceran aqui.</p>
          </div>
        </div>
      `;
      return;
    }

    clients.forEach((client) => {
      const item = document.createElement("div");
      item.className = "session-item";
      item.innerHTML = `
        <div class="session-time">${client.plan}</div>
        <div class="session-info">
          <p class="student-name">${client.name}</p>
          <p class="session-goal">${client.email}</p>
        </div>
        <div class="session-action session-action--text">
          <span class="session-meta ${client.status === "Activo" ? "session-meta--ok" : "session-meta--warn"}">
            ${membershipLabel(client)}
          </span>
        </div>
      `;
      assignedClientsList.appendChild(item);
    });
  }

  async function loadTrainerDashboard() {
    try {
      const data = await GymApp.api("/api/trainer/dashboard");
      const trainerName = data?.trainer?.name || displayName;
      const clients = Array.isArray(data?.clients) ? data.clients : [];
      const summary = data?.summary || {};

      welcomeTitle.textContent = `Hola, ${trainerName}`;
      if (clientsHint) {
        clientsHint.textContent = clients.length
          ? `${clients.length} cliente${clients.length === 1 ? "" : "s"} bajo tu seguimiento`
          : "Esperando asignaciones";
      }

      if (statTotalClients) statTotalClients.textContent = String(summary.totalClients || clients.length);
      if (statActiveClients) statActiveClients.textContent = String(summary.activeClients || 0);
      if (statExpiringSoon) statExpiringSoon.textContent = String(summary.expiringSoon || 0);

      renderClients(clients);
    } catch (error) {
      if (clientsHint) clientsHint.textContent = "No se pudo cargar el panel";
      assignedClientsList.innerHTML = `
        <div class="session-item session-item--empty">
          <div class="session-info">
            <p class="student-name">No pudimos cargar tus clientes</p>
            <p class="session-goal">${error.message}</p>
          </div>
        </div>
      `;
      GymApp.toast(`Error cargando panel: ${error.message}`, "error");
    }
  }

  loadTrainerDashboard();
});
