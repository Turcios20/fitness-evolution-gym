"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.GymApp?.guardRoute("entrenador")) {
    return;
  }

  const session = window.GymApp.getSession();
  window.GymApp.setupUserMenu();
  const refs = {
    userAvatar: document.getElementById("userAvatar"),
    clientsList: document.getElementById("clientsList"),
    clientsCount: document.getElementById("clientsCount"),
    emptyState: document.getElementById("emptyState"),
    medidaForm: document.getElementById("medidaForm"),
    objetivoSection: document.getElementById("objetivoSection"),
    trainerAccountHint: document.getElementById("trainerAccountHint"),
    selectedClientName: document.getElementById("selectedClientName"),
    medidasList: document.getElementById("medidasList"),
    historialCount: document.getElementById("historialCount"),
    historialMedidas: document.getElementById("historialMedidas"),
    objetivoActual: document.getElementById("objetivoActual"),
    selectObjetivo: document.getElementById("selectObjetivo"),
    fecha: document.getElementById("fecha"),
    peso: document.getElementById("peso"),
    pecho: document.getElementById("pecho"),
    cintura: document.getElementById("cintura"),
    cadera: document.getElementById("cadera"),
    brazos: document.getElementById("brazos"),
    piernas: document.getElementById("piernas"),
    btnGuardar: document.getElementById("btnGuardar"),
    btnLimpiar: document.getElementById("btnLimpiar"),
    btnGuardarObjetivo: document.getElementById("btnGuardarObjetivo")
  };

  let selectedClient = null;
  let measurementsCache = [];
  let editingMeasurementId = null;

  function notify(message, type = "info") {
    if (window.GymApp?.toast) {
      window.GymApp.toast(message, type);
      return;
    }

    window.alert(message);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) return "--";

    return new Date(value).toLocaleDateString("es-SV", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatMeasure(value, unit) {
    return value == null ? `- ${unit}` : `${value} ${unit}`;
  }

  function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    refs.fecha.value = `${year}-${month}-${day}`;
  }

  function initAvatar() {
    const displayName = session.name || session.displayName || session.username || "Entrenador";
    const initials = displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "EN";
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];

    refs.userAvatar.textContent = initials;
    refs.userAvatar.style.background = palette[
      (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length
    ];

    if (refs.trainerAccountHint) {
      refs.trainerAccountHint.textContent = `Cuenta activa: ${session.username || "sin correo"}`;
    }
  }

  function resetForm() {
    editingMeasurementId = null;
    refs.peso.value = "";
    refs.pecho.value = "";
    refs.cintura.value = "";
    refs.cadera.value = "";
    refs.brazos.value = "";
    refs.piernas.value = "";
    refs.btnGuardar.textContent = "Guardar medida";
    setTodayDate();
  }

  function buildPayload() {
    return {
      fecha: refs.fecha.value,
      peso: refs.peso.value.trim(),
      pecho: refs.pecho.value.trim(),
      cintura: refs.cintura.value.trim(),
      cadera: refs.cadera.value.trim(),
      brazos: refs.brazos.value.trim(),
      piernas: refs.piernas.value.trim()
    };
  }

  function hasAtLeastOneMeasure(payload) {
    return [payload.peso, payload.pecho, payload.cintura, payload.cadera, payload.brazos, payload.piernas]
      .some((value) => value !== "");
  }

  function startEditMeasurement(measurement) {
    editingMeasurementId = measurement.id;
    refs.fecha.value = String(measurement.date || "").slice(0, 10);
    refs.peso.value = measurement.weight ?? "";
    refs.pecho.value = measurement.chest ?? "";
    refs.cintura.value = measurement.waist ?? "";
    refs.cadera.value = measurement.hips ?? "";
    refs.brazos.value = measurement.arms ?? "";
    refs.piernas.value = measurement.legs ?? "";
    refs.btnGuardar.textContent = "Actualizar medida";
    refs.fecha.scrollIntoView({ behavior: "smooth", block: "center" });
    refs.fecha.focus();
  }

  function renderObjective(objective) {
    refs.objetivoActual.textContent = objective || "Sin objetivo asignado";

    if (objective && Array.from(refs.selectObjetivo.options).some((option) => option.value === objective)) {
      refs.selectObjetivo.value = objective;
      return;
    }

    refs.selectObjetivo.value = "";
  }

  function bindMeasurementCard(card, measurement) {
    const editButton = card.querySelector("[data-action='edit']");
    const deleteButton = card.querySelector("[data-action='delete']");
    const fileInput = card.querySelector("input[type='file']");

    editButton?.addEventListener("click", () => startEditMeasurement(measurement));
    deleteButton?.addEventListener("click", () => deleteMeasurement(measurement));
    fileInput?.addEventListener("change", () => uploadPhoto(measurement, fileInput));
  }

  function renderMeasurements(measurements) {
    refs.medidasList.innerHTML = "";

    if (!measurements.length) {
      refs.historialMedidas.style.display = "none";
      refs.historialCount.textContent = "0";
      return;
    }

    refs.historialMedidas.style.display = "block";
    refs.historialCount.textContent = String(measurements.length);

    measurements.forEach((measurement) => {
      const card = document.createElement("div");
      card.className = "medida-item";
      card.innerHTML = `
        <div class="medida-fecha">${escapeHtml(formatDate(measurement.date))}</div>
        <div class="medida-datos">
          <div class="medida-dato">
            <span class="medida-label">Peso</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.weight, "kg"))}</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Pecho</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.chest, "cm"))}</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Cintura</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.waist, "cm"))}</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Cadera</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.hips, "cm"))}</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Brazos</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.arms, "cm"))}</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Piernas</span>
            <span class="medida-valor">${escapeHtml(formatMeasure(measurement.legs, "cm"))}</span>
          </div>
        </div>
        <div class="foto-upload">
          <label class="foto-label">Fotografia de progreso</label>
          <input type="file" accept="image/jpeg,image/png">
          <span class="foto-status">${measurement.photo ? `Archivo actual: ${escapeHtml(measurement.photo.name)}` : ""}</span>
        </div>
        <div class="medida-actions">
          <button class="btn-edit" type="button" data-action="edit">Editar</button>
          <button class="btn-delete" type="button" data-action="delete">Eliminar</button>
        </div>
      `;

      bindMeasurementCard(card, measurement);
      refs.medidasList.appendChild(card);
    });
  }

  function renderClients(clients) {
    refs.clientsList.innerHTML = "";
    refs.clientsCount.textContent = String(clients.length);

    if (!clients.length) {
      refs.clientsList.innerHTML = '<p class="loading-text">No tienes clientes asignados</p>';
      refs.emptyState.style.display = "block";
      refs.medidaForm.style.display = "none";
      refs.objetivoSection.style.display = "none";
      refs.historialMedidas.style.display = "none";
      return;
    }

    clients.forEach((client) => {
      const item = document.createElement("div");
      item.className = "client-item";
      item.dataset.clientId = String(client.id);
      item.innerHTML = `
        <span class="client-name">${escapeHtml(client.name)}</span>
        <span class="client-email">${escapeHtml(client.email)}</span>
      `;
      item.addEventListener("click", () => selectClient(client));
      refs.clientsList.appendChild(item);
    });
  }

  async function loadClients() {
    const data = await window.GymApp.api("/api/trainer/dashboard");
    const clients = Array.isArray(data?.clients) ? data.clients : [];
    renderClients(clients);

    if (clients.length > 0) {
      await selectClient(clients[0]);
    }
  }

  async function loadClientEvolution(clientId) {
    const data = await window.GymApp.api(`/api/client/${clientId}/evolution`);
    measurementsCache = Array.isArray(data?.measurements) ? data.measurements : [];
    renderMeasurements(measurementsCache);
    renderObjective(data?.objective || "");
  }

  async function selectClient(client) {
    document.querySelectorAll(".client-item").forEach((item) => item.classList.remove("active"));
    document.querySelector(`[data-client-id="${client.id}"]`)?.classList.add("active");

    selectedClient = client;
    refs.selectedClientName.textContent = client.name;
    refs.emptyState.style.display = "none";
    refs.medidaForm.style.display = "block";
    refs.objetivoSection.style.display = "block";
    resetForm();

    try {
      await loadClientEvolution(client.id);
    } catch (error) {
      refs.medidasList.innerHTML = `<p class="loading-text" style="color:#ff3232;">Error: ${escapeHtml(error.message)}</p>`;
      notify(error.message || "No se pudo cargar el progreso del cliente.", "error");
    }
  }

  async function saveMeasurement() {
    if (!selectedClient) {
      notify("Selecciona un cliente primero.", "error");
      return;
    }

    const payload = buildPayload();
    if (!payload.fecha) {
      notify("La fecha es obligatoria.", "error");
      return;
    }

    if (!hasAtLeastOneMeasure(payload)) {
      notify("Debes ingresar al menos una medida.", "error");
      return;
    }

    const isEditing = editingMeasurementId != null;
    const endpoint = isEditing
      ? `/api/client/${selectedClient.id}/measurements/${editingMeasurementId}`
      : `/api/client/${selectedClient.id}/measurements`;

    try {
      await window.GymApp.api(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      notify(isEditing ? "Medida actualizada correctamente." : "Medida registrada correctamente.", "success");
      resetForm();
      await loadClientEvolution(selectedClient.id);
    } catch (error) {
      notify(error.message || "No se pudo guardar la medida.", "error");
    }
  }

  async function deleteMeasurement(measurement) {
    if (!selectedClient) return;
    if (!window.confirm(`Eliminar el registro del ${formatDate(measurement.date)}?`)) {
      return;
    }

    try {
      await window.GymApp.api(`/api/client/${selectedClient.id}/measurements/${measurement.id}`, {
        method: "DELETE"
      });

      if (editingMeasurementId === measurement.id) {
        resetForm();
      }

      notify("Medida eliminada correctamente.", "success");
      await loadClientEvolution(selectedClient.id);
    } catch (error) {
      notify(error.message || "No se pudo eliminar la medida.", "error");
    }
  }

  async function saveObjective() {
    if (!selectedClient) {
      notify("Selecciona un cliente primero.", "error");
      return;
    }

    const objective = refs.selectObjetivo.value.trim();
    if (!objective) {
      notify("Selecciona un objetivo primero.", "error");
      return;
    }

    try {
      await window.GymApp.api(`/api/client/${selectedClient.id}/objective`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective })
      });

      notify("Objetivo actualizado correctamente.", "success");
      await loadClientEvolution(selectedClient.id);
    } catch (error) {
      notify(error.message || "No se pudo actualizar el objetivo.", "error");
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      reader.readAsDataURL(file);
    });
  }

  async function uploadPhoto(measurement, input) {
    if (!selectedClient) return;

    const file = input.files?.[0];
    if (!file) return;

    const isAllowedType = ["image/jpeg", "image/png"].includes(file.type);
    if (!isAllowedType) {
      notify("Solo se permiten archivos JPG o PNG.", "error");
      input.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("La imagen no puede superar 5 MB.", "error");
      input.value = "";
      return;
    }

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      await window.GymApp.api(`/api/client/${selectedClient.id}/measurements/${measurement.id}/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          fileName: file.name
        })
      });

      notify("Fotografia guardada correctamente.", "success");
      await loadClientEvolution(selectedClient.id);
    } catch (error) {
      notify(error.message || "No se pudo guardar la fotografia.", "error");
    } finally {
      input.value = "";
    }
  }

  refs.btnGuardar.addEventListener("click", saveMeasurement);
  refs.btnLimpiar.addEventListener("click", resetForm);
  refs.btnGuardarObjetivo.addEventListener("click", saveObjective);

  initAvatar();
  resetForm();
  loadClients().catch((error) => {
    refs.clientsList.innerHTML = `<p class="loading-text" style="color:#ff3232;">Error: ${escapeHtml(error.message)}</p>`;
    notify(error.message || "No se pudo cargar la lista de clientes.", "error");
  });
});
