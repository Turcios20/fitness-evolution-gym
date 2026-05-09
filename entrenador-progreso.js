"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute(["entrenador", "admin"])) return;

  const session = GymApp.getSession();
  const userAvatar = document.getElementById("userAvatar");
  const roleBadge = document.getElementById("roleBadge");
  const btnLogout = document.getElementById("btnTrainerLogout");
  const clientsList = document.getElementById("clientsList");
  const clientsCount = document.getElementById("clientsCount");
  const clientsPanelTitle = document.getElementById("clientsPanelTitle");
  const progressSubtitle = document.getElementById("progressSubtitle");
  const progressTitle = document.getElementById("progressTitle");
  const progressHomeLink = document.getElementById("progressHomeLink");
  const progressSettingsLink = document.getElementById("progressSettingsLink");
  const detailsPlaceholder = document.getElementById("detailsPlaceholder");
  const detailsContent = document.getElementById("detailsContent");
  const clientName = document.getElementById("clientName");
  const clientEmail = document.getElementById("clientEmail");
  const trainerObjective = document.getElementById("trainerObjective");
  const trainerComparisonBody = document.getElementById("trainerComparisonBody");
  const trainerHistoryList = document.getElementById("trainerHistoryList");
  const objectiveEditorCard = document.getElementById("objectiveEditorCard");
  const objectiveSelect = document.getElementById("trainerObjectiveSelect");
  const objectiveCustomWrap = document.getElementById("trainerObjectiveCustomWrap");
  const objectiveCustomInput = document.getElementById("trainerObjectiveCustom");
  const objectiveEditorHint = document.getElementById("objectiveEditorHint");
  const saveObjectiveButton = document.getElementById("saveObjectiveButton");

  const initialClientId = Number(new URLSearchParams(window.location.search).get("clientId"));
  const isAdminView = session.role === "admin";
  const OBJECTIVE_OTHER = "Otro";

  let selectedClientId = Number.isFinite(initialClientId) ? initialClientId : null;
  let objectivePresets = [];

  function getInitials(name) {
    return (name || "CO")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("");
  }

  function avatarColor(initials) {
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];
    return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
  }

  function renderAvatar() {
    const displayName = session.displayName || (isAdminView ? "Admin" : "Coach");
    const initials = getInitials(displayName);
    userAvatar.textContent = initials;
    userAvatar.style.background = avatarColor(initials);
  }

  function configurePageByRole() {
    if (isAdminView) {
      roleBadge.textContent = "ADMIN";
      progressSubtitle.textContent = "Seguimiento Fisico";
      progressTitle.textContent = "Progreso de Miembros";
      clientsPanelTitle.textContent = "Clientes";
      progressHomeLink.href = "admin.html";
      progressSettingsLink.href = "ajustes.html";
      objectiveEditorHint.textContent = "Como administrador puedes actualizar el objetivo y subir una fotografia por registro.";
      return;
    }

    roleBadge.textContent = "COACH";
    progressSubtitle.textContent = "Seguimiento de Clientes";
    progressTitle.textContent = "Progreso de Alumnos";
    clientsPanelTitle.textContent = "Mis Clientes";
    progressHomeLink.href = "entrenador.html";
    progressSettingsLink.href = "ajustes.html";
    objectiveEditorHint.textContent = "Como entrenador asignado puedes actualizar el objetivo y subir una fotografia por registro.";
  }

  function resetEvolutionPanels(message) {
    trainerObjective.textContent = "No hay objetivo configurado";
    trainerComparisonBody.innerHTML = `<tr><td colspan="5" class="loading-row">${message}</td></tr>`;
    trainerHistoryList.innerHTML = `<div class="loading-message">${message}</div>`;
    objectiveEditorCard.classList.add("hidden");
  }

  function renderClients(clients) {
    clientsList.innerHTML = "";
    clientsCount.textContent = String(clients.length);

    if (!clients.length) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>${isAdminView ? "No hay clientes registrados aun" : "No tienes clientes asignados aun"}</p>
        </div>
      `;
      detailsPlaceholder.style.display = "flex";
      detailsContent.classList.add("hidden");
      resetEvolutionPanels(isAdminView ? "Todavia no hay clientes para revisar" : "Todavia no hay clientes asignados");
      return;
    }

    clients.forEach((client) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "client-item";
      item.dataset.clientId = String(client.id);
      item.innerHTML = `
        <p class="client-item-name">${client.name}</p>
        <p class="client-item-email">${client.email}</p>
        ${client.assignedTrainer?.name ? `<p class="client-item-trainer">Coach: ${client.assignedTrainer.name}</p>` : ""}
      `;

      item.addEventListener("click", () => {
        selectClient(client);
      });

      clientsList.appendChild(item);
    });
  }

  function getObjectiveFormState(objective) {
    const cleanObjective = String(objective || "").trim();

    if (!cleanObjective) {
      return { selected: "", custom: "" };
    }

    if (objectivePresets.includes(cleanObjective)) {
      return { selected: cleanObjective, custom: "" };
    }

    return { selected: OBJECTIVE_OTHER, custom: cleanObjective };
  }

  function syncObjectiveForm(objective) {
    const state = getObjectiveFormState(objective);
    objectiveSelect.value = state.selected;
    objectiveCustomInput.value = state.custom;
    toggleObjectiveCustomField();
  }

  function toggleObjectiveCustomField() {
    const showCustom = objectiveSelect.value === OBJECTIVE_OTHER;
    objectiveCustomWrap.classList.toggle("hidden", !showCustom);
    objectiveCustomInput.disabled = !showCustom;

    if (!showCustom) {
      objectiveCustomInput.value = "";
    }
  }

  function updateSelectedClientInUrl(clientId) {
    const url = new URL(window.location.href);
    url.searchParams.set("clientId", String(clientId));
    window.history.replaceState({}, "", url.toString());
  }

  function selectClient(client) {
    selectedClientId = client.id;
    updateSelectedClientInUrl(client.id);

    document.querySelectorAll(".client-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.clientId === String(client.id));
    });

    clientName.textContent = client.name;
    clientEmail.textContent = client.email;
    detailsPlaceholder.style.display = "none";
    detailsContent.classList.remove("hidden");
    resetEvolutionPanels("Cargando evolucion...");
    loadEvolution(client.id);
  }

  function buildObjectivePayload() {
    const selectedValue = objectiveSelect.value;

    if (!selectedValue) {
      throw new Error("Selecciona un objetivo antes de guardar.");
    }

    if (selectedValue === OBJECTIVE_OTHER) {
      const customValue = objectiveCustomInput.value.trim();
      if (!customValue) {
        throw new Error("Escribe el objetivo personalizado del miembro.");
      }
      return customValue;
    }

    return selectedValue;
  }

  function bindPhotoInputs() {
    const fileInputs = trainerHistoryList.querySelectorAll(".progress-photo-input");

    fileInputs.forEach((input) => {
      input.addEventListener("change", async () => {
        const measurementId = Number(input.dataset.measurementId);
        const [file] = input.files || [];

        if (!file || !Number.isFinite(measurementId) || !selectedClientId) {
          return;
        }

        if (!["image/jpeg", "image/png"].includes(file.type)) {
          GymApp.toast("Solo se permiten imagenes JPG o PNG.", "error");
          input.value = "";
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          GymApp.toast("La fotografia supera el limite de 5 MB.", "error");
          input.value = "";
          return;
        }

        const actionCard = input.closest(".progress-photo-actions");
        actionCard?.classList.add("is-uploading");

        try {
          const imageDataUrl = await readFileAsDataUrl(file);
          await GymApp.api(`/api/client/${selectedClientId}/measurements/${measurementId}/photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              imageDataUrl
            })
          });

          GymApp.toast("Fotografia guardada correctamente.", "success");
          await loadEvolution(selectedClientId);
        } catch (error) {
          GymApp.toast(error.message || "No se pudo guardar la fotografia.", "error");
          actionCard?.classList.remove("is-uploading");
        } finally {
          input.value = "";
        }
      });
    });
  }

  async function loadEvolution(clientId) {
    try {
      const payload = await GymApp.api(`/api/client/${clientId}/evolution`);
      objectivePresets = Array.isArray(payload.objectivePresets) ? payload.objectivePresets : [];

      GymEvolution.renderEvolution(
        {
          objective: trainerObjective,
          comparison: trainerComparisonBody,
          history: trainerHistoryList
        },
        payload,
        { showPhotoUploadControls: Boolean(payload.canManage) }
      );

      objectiveEditorCard.classList.toggle("hidden", !payload.canManage);
      syncObjectiveForm(payload.objective);
      bindPhotoInputs();
    } catch (error) {
      resetEvolutionPanels(`Error cargando evolucion: ${error.message}`);
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  async function loadClients() {
    try {
      const data = isAdminView
        ? await GymApp.api("/api/admin/members")
        : await GymApp.api("/api/trainer/dashboard");
      const source = isAdminView ? data?.members : data?.clients;
      const clients = Array.isArray(source) ? source : [];
      renderClients(clients);

      if (!clients.length) {
        return;
      }

      const nextClient = clients.find((client) => client.id === selectedClientId) || clients[0];
      selectClient(nextClient);
    } catch (error) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>Error cargando clientes</p>
          <p style="font-size: 10px; margin-top: 5px;">${error.message}</p>
        </div>
      `;
      resetEvolutionPanels("No se pudo cargar la evolucion");
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  async function saveObjective() {
    if (!selectedClientId) {
      GymApp.toast("Selecciona un cliente antes de guardar.", "error");
      return;
    }

    try {
      const objective = buildObjectivePayload();
      saveObjectiveButton.disabled = true;
      await GymApp.api(`/api/client/${selectedClientId}/objective`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective })
      });

      GymApp.toast("Objetivo actualizado correctamente.", "success");
      await loadEvolution(selectedClientId);
    } catch (error) {
      GymApp.toast(error.message || "No se pudo guardar el objetivo.", "error");
    } finally {
      saveObjectiveButton.disabled = false;
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("No se pudo leer la fotografia seleccionada."));
      reader.readAsDataURL(file);
    });
  }

  objectiveSelect.addEventListener("change", toggleObjectiveCustomField);
  saveObjectiveButton.addEventListener("click", saveObjective);

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  configurePageByRole();
  renderAvatar();
  loadClients().catch((error) => {
    GymApp.toast(`Error inicial: ${error.message}`, "error");
  });
});
