"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("cliente")) return;

  const session = GymApp.getSession();
  const objectiveEl = document.getElementById("objetivoPersonal");
  const comparisonEl = document.getElementById("tablaComparativa");
  const historyEl = document.getElementById("historialList");
  const avatarEl = document.getElementById("userAvatar");

  function renderAvatar(name) {
    if (!avatarEl) return;

    const initials = (name || "CL")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("");
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];

    avatarEl.textContent = initials || "CL";
    avatarEl.style.background = palette[(avatarEl.textContent.charCodeAt(0) + (avatarEl.textContent.charCodeAt(1) || 0)) % palette.length];
  }

  async function loadEvolution() {
    try {
      const payload = await GymApp.api(`/api/client/${session.id}/evolution`);
      renderAvatar(payload?.client?.name || session.displayName || "Cliente");
      GymEvolution.renderEvolution(
        {
          objective: objectiveEl,
          comparison: comparisonEl,
          history: historyEl
        },
        payload
      );
    } catch (error) {
      comparisonEl.innerHTML = `<tr><td colspan="5" class="loading-row">Error: ${error.message}</td></tr>`;
      historyEl.innerHTML = `<div class="error-message">No se pudo cargar el historial: ${error.message}</div>`;
      renderAvatar(session.displayName || "Cliente");
    }
  }

  loadEvolution();
});
