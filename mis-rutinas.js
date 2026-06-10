"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!window.GymApp?.guardRoute("cliente")) return;

  const session = window.GymApp.getSession();
  window.GymApp.setupUserMenu();
  const userAvatar = document.getElementById("userAvatar");
  const container = document.getElementById("rutinasContainer");

  function getInitials(name) {
    return (name || "CL").trim().split(/\s+/)
      .slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }
  userAvatar.textContent = getInitials(session.name || "Cliente");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRutinas(rutinas) {
    if (!rutinas.length) {
      container.innerHTML = `
        <div class="subs-card" style="text-align:center;">
          <p style="color:var(--text-dim);margin:0;">
            Aún no tienes rutinas asignadas.
          </p>
        </div>`;
      return;
    }

    container.innerHTML = rutinas.map((r) => `
      <div class="subs-card" style="margin-bottom:14px;">
        <div class="subs-row">
          <span class="subs-key">${escapeHtml(r.dia_semana || "Sin día")}</span>
          <span class="subs-val orange">${escapeHtml(r.nombre_ejercicio)}</span>
        </div>
        ${r.descripcion ? `
          <div class="subs-row">
            <span class="subs-key">Descripción</span>
            <span class="subs-val" style="font-size:13px;">${escapeHtml(r.descripcion)}</span>
          </div>` : ""}
        <div class="subs-row">
          <span class="subs-key">Series × Reps</span>
          <span class="subs-val">${r.series ?? "--"} × ${r.repeticiones ?? "--"}</span>
        </div>
        ${r.duracion ? `
          <div class="subs-row">
            <span class="subs-key">Duración</span>
            <span class="subs-val">${escapeHtml(r.duracion)} min</span>
          </div>` : ""}
      </div>
    `).join("");
  }

  async function loadRutinas() {
    try {
      const data = await window.GymApp.api(`/api/client/${session.id}/routines`);
      const rutinas = Array.isArray(data?.routines) ? data.routines : [];
      renderRutinas(rutinas);
    } catch (error) {
      container.innerHTML = `
        <div class="subs-card" style="text-align:center;">
          <p style="color:var(--text-dim);margin:0;">
            Error cargando rutinas: ${escapeHtml(error.message)}
          </p>
        </div>`;
    }
  }

  loadRutinas();
});
