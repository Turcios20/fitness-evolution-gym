"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const session = window.GymApp?.getSession();
  if (!session) { window.location.href = "login.html"; return; }

  const username = session.username;

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-HN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };
  const fmtTime = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
  };

  const BADGE_COLOR = (disponibles, capacidad) => {
    const ratio = disponibles / capacidad;
    if (ratio > 0.5) return "#4cdb8e";
    if (ratio > 0.2) return "#f0c040";
    return "#e07070";
  };

  // Avatar setup (igual que otras páginas cliente)
  (function setupAvatar() {
    const av   = document.getElementById("userAvatar");
    const dn   = document.getElementById("dropdownName");
    const wrap = document.getElementById("avatarWrap");
    const drop = document.getElementById("avatarDropdown");
    const logoutBtn = document.getElementById("btnLogout");
    const name = session.displayName || "Usuario";
    const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
    const palette = ["#c45e1a","#7b2d8b","#1a6fbf","#1a8f5a","#8a4f0d","#3d5a9e","#8b1a1a","#b0390e"];
    av.textContent = initials;
    av.style.background = palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
    dn.textContent = name;
    wrap.addEventListener("click", (e) => { e.stopPropagation(); drop.classList.toggle("open"); });
    document.addEventListener("click", () => drop.classList.remove("open"));
    logoutBtn.addEventListener("click", () => { GymApp.clearSession(); window.location.href = "login.html"; });
  })();

  let todasClases = [];
  let misReservasIds = new Set();

  async function loadClases() {
    const grid = document.getElementById("clasesGrid");
    grid.innerHTML = `<p class="cal-loading">Cargando clases...</p>`;
    try {
      const [dataClases, dataReservas] = await Promise.all([
        GymApp.api("/api/clases"),
        GymApp.api(`/api/clases/mis-reservas?username=${encodeURIComponent(username)}`)
      ]);
      todasClases = dataClases.clases || [];
      misReservasIds = new Set(
        (dataReservas.reservas || [])
          .filter((r) => r.estado === "Confirmada")
          .map((r) => r.id_clase)
      );
      renderMisReservas(dataReservas.reservas || []);
      renderClases(todasClases);
    } catch (e) {
      grid.innerHTML = `<p class="cal-empty">Error cargando clases. Intenta de nuevo.</p>`;
    }
  }

  function renderClases(clases) {
    const grid = document.getElementById("clasesGrid");
    if (!clases.length) {
      grid.innerHTML = `<p class="cal-empty">No hay clases disponibles próximamente.</p>`;
      return;
    }
    grid.innerHTML = clases.map((c) => {
      const yaReservada = misReservasIds.has(c.id_clase);
      const sinCupo = c.disponibles <= 0;
      return `
        <div class="cal-clase-card ${yaReservada ? "reservada" : ""}">
          <div class="cal-clase-header">
            <span class="cal-clase-nombre">${c.nombre}</span>
            <span class="cal-badge" style="background:${yaReservada ? "#4cdb8e22" : "rgba(232,124,42,0.12)"}; color:${yaReservada ? "#4cdb8e" : "var(--orange)"}; border:1px solid ${yaReservada ? "#4cdb8e55" : "rgba(232,124,42,0.3)"}">
              ${yaReservada ? "✔ Reservada" : `${c.disponibles} cupos`}
            </span>
          </div>
          <div class="cal-clase-meta">
            <span>🧑‍🏫 ${c.entrenador || "—"}</span>
            <span>📅 ${fmtDate(c.fecha_hora)} · ${fmtTime(c.fecha_hora)}</span>
            <span>⏱ ${c.duracion_min} min</span>
          </div>
          ${c.descripcion ? `<p class="cal-clase-desc">${c.descripcion}</p>` : ""}
          <button
            class="cal-btn ${yaReservada ? "cal-btn--reservada" : (sinCupo ? "cal-btn--llena" : "")}"
            data-id="${c.id_clase}"
            ${yaReservada || sinCupo ? "disabled" : ""}
          >
            ${yaReservada ? "Ya tienes esta clase" : (sinCupo ? "Sin cupos" : "Reservar")}
          </button>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".cal-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const claseId = Number(btn.dataset.id);
        btn.disabled = true;
        btn.textContent = "Reservando...";
        try {
          await GymApp.api(`/api/clases/${claseId}/reservar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          GymApp.toast("¡Reserva confirmada!", "success");
          loadClases();
        } catch (e) {
          GymApp.toast(e.message || "Error al reservar", "error");
          btn.disabled = false;
          btn.textContent = "Reservar";
        }
      });
    });
  }

  function renderMisReservas(reservas) {
    const wrap = document.getElementById("misReservasWrap");
    const confirmadas = reservas.filter((r) => r.estado === "Confirmada");
    if (!confirmadas.length) {
      wrap.innerHTML = `<p class="cal-empty">Aún no tienes reservas activas.</p>`;
      return;
    }
    wrap.innerHTML = confirmadas.map((r) => `
      <div class="cal-reserva-row">
        <div class="cal-reserva-info">
          <span class="cal-reserva-nombre">${r.nombre}</span>
          <span class="cal-reserva-meta">📅 ${fmtDate(r.fecha_hora)} · ${fmtTime(r.fecha_hora)} · ⏱ ${r.duracion_min} min · 🧑‍🏫 ${r.entrenador}</span>
        </div>
        <button class="cal-btn-cancel" data-reserva="${r.id_reserva}" data-clase="${r.id_clase}">Cancelar</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".cal-btn-cancel").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const reservaId = Number(btn.dataset.reserva);
        if (!confirm("¿Cancelar esta reserva?")) return;
        btn.disabled = true;
        try {
          await GymApp.api(`/api/clases/reservas/${reservaId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
          });
          GymApp.toast("Reserva cancelada", "info");
          loadClases();
        } catch (e) {
          GymApp.toast(e.message || "Error al cancelar", "error");
          btn.disabled = false;
        }
      });
    });
  }

  // Búsqueda en tiempo real
  document.getElementById("calSearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtradas = q
      ? todasClases.filter((c) => c.nombre.toLowerCase().includes(q) || (c.entrenador || "").toLowerCase().includes(q))
      : todasClases;
    renderClases(filtradas);
  });

  loadClases();
});
