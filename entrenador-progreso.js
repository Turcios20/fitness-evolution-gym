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
  const measurementsList = document.getElementById("measurementsList");
  const noMeasurements = document.getElementById("noMeasurements");

  let allClients = [];
  let selectedClientId = null;

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

  userAvatar.textContent = initials;
  userAvatar.style.background = avatarColor(initials);

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  function formatDate(dateString) {
    if (!dateString) return "--/--/----";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
    // Actualizar estado visual
    document.querySelectorAll(".client-item").forEach((item) => {
      item.classList.remove("active");
    });
    document.querySelector(`[data-client-id="${client.id}"]`)?.classList.add("active");

    selectedClientId = client.id;
    clientName.textContent = client.name;
    clientEmail.textContent = client.email;

    // Ocultar placeholder y mostrar contenido
    detailsPlaceholder.style.display = "none";
    detailsContent.classList.remove("hidden");

    loadMeasurements(client.id);
  }

  function formatMeasurementValue(value) {
    if (value == null) return "--";
    return String(value);
  }

  function renderMeasurements(measurements) {
    measurementsList.innerHTML = "";

    if (!measurements.length) {
      measurementsList.classList.add("hidden");
      noMeasurements.classList.remove("hidden");
      return;
    }

    measurementsList.classList.remove("hidden");
    noMeasurements.classList.add("hidden");

    measurements.forEach((measurement) => {
      const card = document.createElement("div");
      card.className = "measurement-card";

      const date = new Date(measurement.date);
      const formattedDate = formatDate(measurement.date);

      card.innerHTML = `
        <div class="measurement-date">
          <span class="measurement-date-label">Medición</span>
          <span class="measurement-date-value">${formattedDate}</span>
        </div>
        <div class="measurement-values">
          <div class="measure-item">
            <span class="measure-label">Peso</span>
            <span class="measure-value">${formatMeasurementValue(measurement.weight)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">kg</span>
          </div>
          <div class="measure-item">
            <span class="measure-label">Pecho</span>
            <span class="measure-value">${formatMeasurementValue(measurement.chest)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">cm</span>
          </div>
          <div class="measure-item">
            <span class="measure-label">Cintura</span>
            <span class="measure-value">${formatMeasurementValue(measurement.waist)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">cm</span>
          </div>
          <div class="measure-item">
            <span class="measure-label">Cadera</span>
            <span class="measure-value">${formatMeasurementValue(measurement.hips)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">cm</span>
          </div>
          <div class="measure-item">
            <span class="measure-label">Brazos</span>
            <span class="measure-value">${formatMeasurementValue(measurement.arms)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">cm</span>
          </div>
          <div class="measure-item">
            <span class="measure-label">Piernas</span>
            <span class="measure-value">${formatMeasurementValue(measurement.legs)}</span>
            <span style="font-size: 10px; color: var(--text-dim);">cm</span>
          </div>
        </div>
      `;

      measurementsList.appendChild(card);
    });
  }

  async function loadMeasurements(clientId) {
    try {
      const data = await GymApp.api(`/api/trainer/clients/${clientId}/measurements`);
      const measurements = Array.isArray(data?.measurements) ? data.measurements : [];
      renderMeasurements(measurements);
    } catch (error) {
      measurementsList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-dim);">
          <p>Error cargando medidas: ${error.message}</p>
        </div>
      `;
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  async function loadTrainerClients() {
    try {
      const data = await GymApp.api("/api/trainer/dashboard");
      const clients = Array.isArray(data?.clients) ? data.clients : [];
      allClients = clients;
      renderClients(clients);

      // Si hay clientes, seleccionar el primero automáticamente
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
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  loadTrainerClients().catch((error) => {
    GymApp.toast(`Error inicial: ${error.message}`, "error");
  });
});
