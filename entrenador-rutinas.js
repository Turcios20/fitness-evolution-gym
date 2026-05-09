"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("entrenador")) return;

  const session = GymApp.getSession();
  const userAvatar         = document.getElementById("userAvatar");
  const btnLogout          = document.getElementById("btnTrainerLogout");
  const clientsList        = document.getElementById("clientsList");
  const clientsCount       = document.getElementById("clientsCount");
  const detailsPlaceholder = document.getElementById("detailsPlaceholder");
  const detailsContent     = document.getElementById("detailsContent");
  const clientName         = document.getElementById("clientName");
  const clientEmail        = document.getElementById("clientEmail");
  const tabRutinas         = document.getElementById("tabRutinas");
  const tabPlanes          = document.getElementById("tabPlanes");
  const seccionRutinas     = document.getElementById("seccionRutinas");
  const seccionPlanes      = document.getElementById("seccionPlanes");
  const listaRutinas       = document.getElementById("listaRutinas");
  const noRutinas          = document.getElementById("noRutinas");
  const btnCrearRutina     = document.getElementById("btnCrearRutina");
  const listaPlanes        = document.getElementById("listaPlanes");
  const noPlanes           = document.getElementById("noPlanes");
  const btnCrearPlan       = document.getElementById("btnCrearPlan");

  let selectedClientId = null;

  // ── Avatar ──
  function getInitials(name) {
    return (name || "CO").trim().split(/\s+/)
      .slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }
  function avatarColor(initials) {
    const palette = ["#c45e1a","#7b2d8b","#1a6fbf","#1a8f5a","#8a4f0d","#3d5a9e"];
    return palette[(initials.charCodeAt(0)+(initials.charCodeAt(1)||0))%palette.length];
  }
  const displayName = session.name || session.displayName || "Coach";
  userAvatar.textContent      = getInitials(displayName);
  userAvatar.style.background = avatarColor(getInitials(displayName));

  // ── Logout ──
  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  // ── Tabs ──
  tabRutinas.addEventListener("click", () => {
    tabRutinas.classList.add("active");
    tabPlanes.classList.remove("active");
    seccionRutinas.classList.remove("hidden");
    seccionPlanes.classList.add("hidden");
    if (selectedClientId) loadRutinas(selectedClientId);
  });

  tabPlanes.addEventListener("click", () => {
    tabPlanes.classList.add("active");
    tabRutinas.classList.remove("active");
    seccionPlanes.classList.remove("hidden");
    seccionRutinas.classList.add("hidden");
    if (selectedClientId) loadPlanes(selectedClientId);
  });

  // ── Seleccionar cliente ──
  function selectClient(client) {
    document.querySelectorAll(".client-item")
      .forEach((i) => i.classList.remove("active"));
    document.querySelector(`[data-client-id="${client.id}"]`)
      ?.classList.add("active");
    selectedClientId        = client.id;
    clientName.textContent  = client.name;
    clientEmail.textContent = client.email;
    detailsPlaceholder.style.display = "none";
    detailsContent.classList.remove("hidden");
    loadRutinas(client.id);
  }

  // ── Render clientes ──
  function renderClients(clients) {
    clientsList.innerHTML    = "";
    clientsCount.textContent = String(clients.length);
    if (!clients.length) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>No tienes clientes asignados aún</p>
        </div>`;
      return;
    }
    clients.forEach((client) => {
      const item = document.createElement("div");
      item.className        = "client-item";
      item.dataset.clientId = String(client.id);
      item.innerHTML = `
        <p class="client-item-name">${client.name}</p>
        <p class="client-item-email">${client.email}</p>`;
      item.addEventListener("click", () => selectClient(client));
      clientsList.appendChild(item);
    });
  }

  // ── Cargar rutinas ──
  async function loadRutinas(clientId) {
    listaRutinas.innerHTML = `<div class="client-item-empty"><p>Cargando rutinas...</p></div>`;
    noRutinas.classList.add("hidden");
    try {
      const data    = await GymApp.api(`/api/client/${clientId}/routines`);
      const rutinas = Array.isArray(data?.routines) ? data.routines : [];
      listaRutinas.innerHTML = "";
      if (!rutinas.length) {
        listaRutinas.classList.add("hidden");
        noRutinas.classList.remove("hidden");
        return;
      }
      listaRutinas.classList.remove("hidden");
      rutinas.forEach((r) => {
        const card = document.createElement("div");
        card.className = "measurement-card";
        card.innerHTML = `
          <div class="measurement-date">
            <span class="measurement-date-label">${r.dia_semana || "--"}</span>
            <span class="measurement-date-value">${r.duracion ? r.duracion + " min" : "--"}</span>
          </div>
          <div class="measurement-values">
            <div class="measure-item">
              <span class="measure-label">Ejercicio</span>
              <span class="measure-value" style="font-size:13px;">${r.nombre_ejercicio}</span>
            </div>
            <div class="measure-item">
              <span class="measure-label">Descripción</span>
              <span class="measure-value" style="font-size:12px;">${r.descripcion || "--"}</span>
            </div>
            <div class="measure-item">
              <span class="measure-label">Series</span>
              <span class="measure-value">${r.series ?? "--"}</span>
            </div>
            <div class="measure-item">
              <span class="measure-label">Reps</span>
              <span class="measure-value">${r.repeticiones ?? "--"}</span>
            </div>
          </div>`;
        listaRutinas.appendChild(card);
      });
    } catch (e) {
      listaRutinas.innerHTML = `
        <div style="text-align:center;padding:20px;color:var(--text-dim);">
          <p>Error: ${e.message}</p>
        </div>`;
    }
  }

  // ── Crear rutina ──
  btnCrearRutina.addEventListener("click", async () => {
    if (!selectedClientId) {
      GymApp.toast("Selecciona un cliente primero", "error");
      return;
    }
    const ejercicio = document.getElementById("inputEjercicio").value.trim();
    if (!ejercicio) {
      GymApp.toast("El nombre del ejercicio es obligatorio", "error");
      return;
    }
    try {
      const response = await fetch(`/api/client/${selectedClientId}/routines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({
          ejercicio:    ejercicio,
          descripcion:  document.getElementById("inputDescripcion").value.trim(),
          dia:          document.getElementById("selectDia").value,
          series:       Number(document.getElementById("inputSeries").value) || null,
          repeticiones: Number(document.getElementById("inputRepeticiones").value) || null,
          duracion:     Number(document.getElementById("inputDuracion").value) || null,
        })
      });
      if (!response.ok) {
        const err = await response.json();
        GymApp.toast(`Error: ${err.error}`, "error");
        return;
      }
      GymApp.toast("Rutina guardada ✓", "success");
      document.getElementById("inputEjercicio").value    = "";
      document.getElementById("inputDescripcion").value  = "";
      document.getElementById("selectDia").value         = "";
      document.getElementById("inputSeries").value       = "";
      document.getElementById("inputRepeticiones").value = "";
      document.getElementById("inputDuracion").value     = "";
      loadRutinas(selectedClientId);
    } catch (e) {
      GymApp.toast(`Error: ${e.message}`, "error");
    }
  });

  // ── Cargar planes ──
  async function loadPlanes(clientId) {
    listaPlanes.innerHTML = `<div class="client-item-empty"><p>Cargando planes...</p></div>`;
    noPlanes.classList.add("hidden");
    try {
      const data   = await GymApp.api(`/api/client/${clientId}/plans`);
      const planes = Array.isArray(data?.plans) ? data.plans : [];
      listaPlanes.innerHTML = "";
      if (!planes.length) {
        listaPlanes.classList.add("hidden");
        noPlanes.classList.remove("hidden");
        return;
      }
      listaPlanes.classList.remove("hidden");
      planes.forEach((p) => {
        const card = document.createElement("div");
        card.className = "measurement-card";
        card.innerHTML = `
          <div class="measurement-date">
            <span class="measurement-date-label">${p.nombre_plan}</span>
            <span class="measurement-date-value" style="
              padding:2px 10px;border-radius:20px;font-size:11px;
              font-weight:700;background:rgba(31,143,79,0.18);color:var(--text);">
              Activo
            </span>
          </div>
          <div class="measurement-values">
            <div class="measure-item">
              <span class="measure-label">Objetivo</span>
              <span class="measure-value" style="font-size:12px;">${p.objetivo || "--"}</span>
            </div>
            <div class="measure-item">
              <span class="measure-label">Inicio</span>
              <span class="measure-value" style="font-size:12px;">${p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString("es-SV") : "--"}</span>
            </div>
            <div class="measure-item">
              <span class="measure-label">Fin</span>
              <span class="measure-value" style="font-size:12px;">${p.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString("es-SV") : "--"}</span>
            </div>
          </div>`;
        listaPlanes.appendChild(card);
      });
    } catch (e) {
      listaPlanes.innerHTML = `
        <div style="text-align:center;padding:20px;color:var(--text-dim);">
          <p>Error: ${e.message}</p>
        </div>`;
    }
  }

  // ── Crear plan ──
  btnCrearPlan.addEventListener("click", async () => {
    if (!selectedClientId) {
      GymApp.toast("Selecciona un cliente primero", "error");
      return;
    }
    const nombre      = document.getElementById("inputNombrePlan").value.trim();
    const fechaInicio = document.getElementById("inputFechaInicio").value;
    if (!nombre) {
      GymApp.toast("El nombre del plan es obligatorio", "error");
      return;
    }
    if (!fechaInicio) {
      GymApp.toast("La fecha de inicio es obligatoria", "error");
      return;
    }
    try {
      const response = await fetch(`/api/client/${selectedClientId}/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify({
          nombre:      nombre,
          objetivo:    document.getElementById("inputObjetivo").value.trim(),
          fechaInicio: fechaInicio,
          fechaFin:    document.getElementById("inputFechaFin").value || null,
        })
      });
      if (!response.ok) {
        const err = await response.json();
        GymApp.toast(`Error: ${err.error}`, "error");
        return;
      }
      GymApp.toast("Plan guardado ✓", "success");
      document.getElementById("inputNombrePlan").value  = "";
      document.getElementById("inputObjetivo").value    = "";
      document.getElementById("inputFechaInicio").value = "";
      document.getElementById("inputFechaFin").value    = "";
      loadPlanes(selectedClientId);
    } catch (e) {
      GymApp.toast(`Error: ${e.message}`, "error");
    }
  });

  // ── Cargar clientes ──
  async function loadTrainerClients() {
    try {
      const data    = await GymApp.api("/api/trainer/dashboard");
      const clients = Array.isArray(data?.clients) ? data.clients : [];
      renderClients(clients);
      if (clients.length > 0) selectClient(clients[0]);
    } catch (error) {
      clientsList.innerHTML = `
        <div class="client-item-empty">
          <p>Error cargando clientes</p>
          <p style="font-size:10px;margin-top:5px;">${error.message}</p>
        </div>`;
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  loadTrainerClients().catch((e) => {
    GymApp.toast(`Error inicial: ${e.message}`, "error");
  });
});