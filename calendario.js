"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("cliente")) {
    return;
  }

  const session = window.GymApp.getSession();

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
    logoutBtn.addEventListener("click", () => { GymApp.clearSession(); window.location.href = "/login"; });
  })();

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  let todasClases = [];
  let misReservasIds = new Set();
  let classesCatalogReady = false;

  function setClassesNotice(message = "", variant = "warn") {
    const notice = document.getElementById("clasesNotice");
    if (!notice) return;

    if (!message) {
      notice.hidden = true;
      notice.textContent = "";
      notice.className = "cal-inline-state";
      return;
    }

    notice.hidden = false;
    notice.textContent = message;
    notice.className = `cal-inline-state cal-inline-state--${variant}`;
  }

  function renderMisRutinasError(message) {
    const wrap = document.getElementById("misReservasWrap");
    wrap.innerHTML = `<p class="cal-empty">${escapeHtml(message)}</p>`;
  }

  async function loadClases() {
    const grid = document.getElementById("clasesGrid");
    const routinesWrap = document.getElementById("misReservasWrap");
    grid.innerHTML = `<p class="cal-loading">Cargando clases...</p>`;
    routinesWrap.innerHTML = `<p class="cal-loading">Cargando...</p>`;
    setClassesNotice("");
    classesCatalogReady = false;

    const [dataClases, dataReservas, dataRutinas] = await Promise.allSettled([
      GymApp.api("/api/clases"),
      GymApp.api("/api/clases/mis-reservas"),
      GymApp.api(`/api/client/${session.id}/routines`)
    ]);

    if (dataRutinas.status === "fulfilled") {
      renderMisRutinas(Array.isArray(dataRutinas.value?.routines) ? dataRutinas.value.routines : []);
    } else {
      renderMisRutinasError("No pudimos cargar tus rutinas asignadas por ahora.");
    }

    if (dataClases.status !== "fulfilled") {
      todasClases = [];
      misReservasIds = new Set();
      grid.innerHTML = `<p class="cal-empty">Las clases no estan disponibles en este momento.</p>`;

      const reservationMessage = dataReservas.status !== "fulfilled"
        ? "Tus rutinas siguen visibles, pero el modulo de clases y reservas no esta disponible en esta base local."
        : "Tus rutinas siguen visibles, pero el catalogo de clases no pudo cargarse.";
      setClassesNotice(reservationMessage, "warn");
      return;
    }

    classesCatalogReady = true;
    todasClases = dataClases.value?.clases || [];

    if (dataReservas.status === "fulfilled") {
      misReservasIds = new Set(
        (dataReservas.value?.reservas || [])
          .filter((r) => r.estado === "Confirmada")
          .map((r) => r.id_clase)
      );
      setClassesNotice("");
    } else {
      misReservasIds = new Set();
      setClassesNotice(
        "El catalogo de clases se cargo, pero tus reservas no estuvieron disponibles. Puedes revisar tus rutinas mientras tanto.",
        "warn"
      );
    }

    renderClases(todasClases);
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
            method: "POST"
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

  function renderMisRutinas(rutinas) {
    const wrap = document.getElementById("misReservasWrap");
    if (!rutinas.length) {
      wrap.innerHTML = `<p class="cal-empty">Tu entrenador aún no te ha asignado rutinas.</p>`;
      return;
    }
    wrap.innerHTML = rutinas.map((r) => {
      const dia = r.dia_semana || "Sin día";
      const detalles = [];
      if (r.series != null) detalles.push(`${r.series} series`);
      if (r.repeticiones != null) detalles.push(`${r.repeticiones} reps`);
      if (r.duracion != null) detalles.push(`${r.duracion} min`);
      const meta = detalles.length ? detalles.join(" · ") : "—";
      const desc = r.descripcion
        ? `<span class="cal-reserva-meta" style="display:block;margin-top:4px;">${escapeHtml(r.descripcion)}</span>`
        : "";
      return `
        <div class="cal-reserva-row" style="border-color:rgba(232,124,42,0.35);">
          <div class="cal-reserva-info">
            <span class="cal-reserva-nombre">
              ${escapeHtml(r.nombre_ejercicio)}
              <span class="cal-badge" style="background:rgba(232,124,42,0.15);color:var(--orange);border:1px solid rgba(232,124,42,0.4);margin-left:8px;">${escapeHtml(dia)}</span>
            </span>
            <span class="cal-reserva-meta">💪 ${meta}</span>
            ${desc}
          </div>
          <span style="color:var(--text-dim);font-size:12px;font-style:italic;">Asignada por tu entrenador</span>
        </div>
      `;
    }).join("");
  }

  // Búsqueda en tiempo real
  document.getElementById("calSearch").addEventListener("input", (e) => {
    if (!classesCatalogReady) {
      return;
    }

    const q = e.target.value.toLowerCase();
    const filtradas = q
      ? todasClases.filter((c) => c.nombre.toLowerCase().includes(q) || (c.entrenador || "").toLowerCase().includes(q))
      : todasClases;
    renderClases(filtradas);
  });

  loadClases();
});
