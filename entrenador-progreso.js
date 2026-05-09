"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("entrenador")) return;

  const session = GymApp.getSession();
  const userAvatar = document.getElementById("userAvatar");
  const btnLogout = document.getElementById("btnTrainerLogout");
  const clientsList = document.getElementById("clientsList");
  const clientsCount = document.getElementById("clientsCount");
  const detailsPlaceholder = document.getElementById("detailsPlaceholder");
  const detailsContent = document.getElementById("detailsContent");
  const clientName = document.getElementById("clientName");
  const clientEmail = document.getElementById("clientEmail");
  const trainerObjective = document.getElementById("trainerObjective");
  const trainerComparisonBody = document.getElementById("trainerComparisonBody");
  const trainerHistoryList = document.getElementById("trainerHistoryList");

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

  function renderAvatar() {
    const displayName = session.displayName || "Coach";
    const initials = getInitials(displayName);
    userAvatar.textContent = initials;
    userAvatar.style.background = avatarColor(initials);
  }

  function resetEvolutionPanels(message) {
    trainerObjective.textContent = "No hay objetivo configurado";
    trainerComparisonBody.innerHTML = `<tr><td colspan="5" class="loading-row">${message}</td></tr>`;
    trainerHistoryList.innerHTML = `<div class="loading-message">${message}</div>`;
  }

  function renderClients(clients) {
    clientsList.innerHTML = "";
    clientsCount.textContent = String(clients.length);

    if (!clients.length) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>No tienes clientes asignados aún</p>
        </div>
      `;
      resetEvolutionPanels("Todavía no hay clientes asignados");
      return;
    }

    clients.forEach((client) => {
      const item = document.createElement("div");
      item.className = "client-item";
      item.dataset.clientId = String(client.id);
      item.innerHTML = `
        <p class="client-item-name">${client.name}</p>
        <p class="client-item-email">${client.email}</p>
      `;

      item.addEventListener("click", () => {
        selectClient(client);
      });

      clientsList.appendChild(item);
    });
  }

  function selectClient(client) {
    document.querySelectorAll(".client-item").forEach((item) => {
      item.classList.remove("active");
    });
    document.querySelector(`[data-client-id="${client.id}"]`)?.classList.add("active");

    clientName.textContent = client.name;
    clientEmail.textContent = client.email;
    detailsPlaceholder.style.display = "none";
    detailsContent.classList.remove("hidden");
    resetEvolutionPanels("Cargando evolución...");
    loadEvolution(client.id);
  }

  async function loadEvolution(clientId) {
    try {
      const payload = await GymApp.api(`/api/client/${clientId}/evolution`);
      GymEvolution.renderEvolution(
        {
          objective: trainerObjective,
          comparison: trainerComparisonBody,
          history: trainerHistoryList
        },
        payload
      );
    } catch (error) {
      resetEvolutionPanels(`Error cargando evolución: ${error.message}`);
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  async function loadTrainerClients() {
    try {
      const data = await GymApp.api("/api/trainer/dashboard");
      const clients = Array.isArray(data?.clients) ? data.clients : [];
      renderClients(clients);

      if (clients.length > 0) {
        selectClient(clients[0]);
      }
    } catch (error) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>Error cargando clientes</p>
          <p style="font-size: 10px; margin-top: 5px;">${error.message}</p>
        </div>
      `;
      resetEvolutionPanels("No se pudo cargar la evolución");
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  renderAvatar();
  loadTrainerClients().catch((error) => {
    GymApp.toast(`Error inicial: ${error.message}`, "error");
  });
