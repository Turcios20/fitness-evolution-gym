"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("cliente")) {
    return;
  }

  const session = window.GymApp.getSession();

  const fmtDate = (value) => {
    if (!value) return "--";
    return new Date(value).toLocaleDateString("es-HN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const fmtTime = (value) => {
    if (!value) return "--";
    return new Date(value).toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  (function setupAvatar() {
    const avatar = document.getElementById("userAvatar");
    const dropdownName = document.getElementById("dropdownName");
    const wrap = document.getElementById("avatarWrap");
    const dropdown = document.getElementById("avatarDropdown");
    const logoutBtn = document.getElementById("btnLogout");
    const name = session.displayName || "Usuario";
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e", "#8b1a1a", "#b0390e"];

    avatar.textContent = initials;
    avatar.style.background = palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
    dropdownName.textContent = name;

    wrap.addEventListener("click", (event) => {
      event.stopPropagation();
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", () => dropdown.classList.remove("open"));
    logoutBtn.addEventListener("click", () => {
      GymApp.clearSession();
      window.location.href = "/login";
    });
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
  let misReservas = [];
  let misReservasByClassId = new Map();
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
    const wrap = document.getElementById("misRutinasWrap");
    wrap.innerHTML = `<p class="cal-empty">${escapeHtml(message)}</p>`;
  }

  function renderMisReservasError(message) {
    const wrap = document.getElementById("misReservasWrap");
    wrap.innerHTML = `<p class="cal-empty">${escapeHtml(message)}</p>`;
  }

  async function loadClases() {
    const clasesGrid = document.getElementById("clasesGrid");
    const rutinasWrap = document.getElementById("misRutinasWrap");
    const reservasWrap = document.getElementById("misReservasWrap");

    clasesGrid.innerHTML = `<p class="cal-loading">Cargando clases...</p>`;
    rutinasWrap.innerHTML = `<p class="cal-loading">Cargando...</p>`;
    reservasWrap.innerHTML = `<p class="cal-loading">Cargando reservas...</p>`;
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

    if (dataReservas.status === "fulfilled") {
      misReservas = (dataReservas.value?.reservas || []).filter((reserva) => reserva.estado === "Confirmada");
      misReservasByClassId = new Map(misReservas.map((reserva) => [reserva.id_clase, reserva]));
      renderMisReservas(misReservas);
    } else {
      misReservas = [];
      misReservasByClassId = new Map();
      renderMisReservasError("No pudimos cargar tus reservas por ahora.");
    }

    if (dataClases.status !== "fulfilled") {
      todasClases = [];
      clasesGrid.innerHTML = `<p class="cal-empty">Las clases no estan disponibles en este momento.</p>`;

      const reservationMessage = dataReservas.status !== "fulfilled"
        ? "Tus rutinas siguen visibles, pero el modulo de clases y reservas no esta disponible en esta base local."
        : "Tus rutinas siguen visibles, pero el catalogo de clases no pudo cargarse.";

      setClassesNotice(reservationMessage, "warn");
      return;
    }

    classesCatalogReady = true;
    todasClases = dataClases.value?.clases || [];

    if (dataReservas.status !== "fulfilled") {
      setClassesNotice(
        "El catalogo de clases se cargo, pero tus reservas no estuvieron disponibles. Puedes revisar tus rutinas mientras tanto.",
        "warn"
      );
    } else {
      setClassesNotice("");
    }

    renderClases(todasClases);
  }

  function renderClases(clases) {
    const grid = document.getElementById("clasesGrid");
    if (!clases.length) {
      grid.innerHTML = `<p class="cal-empty">No hay clases disponibles proximamente.</p>`;
      return;
    }

    grid.innerHTML = clases.map((clase) => {
      const reserva = misReservasByClassId.get(clase.id_clase);
      const yaReservada = Boolean(reserva);
      const fueAsignada = reserva?.asignada_por != null;
      const sinCupo = clase.disponibles <= 0;

      return `
        <div class="cal-clase-card ${yaReservada ? "reservada" : ""}">
          <div class="cal-clase-header">
            <span class="cal-clase-nombre">${escapeHtml(clase.nombre)}</span>
            <span class="cal-badge" style="background:${yaReservada ? "#4cdb8e22" : "rgba(232,124,42,0.12)"}; color:${yaReservada ? "#4cdb8e" : "var(--orange)"}; border:1px solid ${yaReservada ? "#4cdb8e55" : "rgba(232,124,42,0.3)"}">
              ${yaReservada ? (fueAsignada ? "Asignada" : "Reservada") : `${clase.disponibles} cupos`}
            </span>
          </div>
          <div class="cal-clase-meta">
            <span>Entrenador: ${escapeHtml(clase.entrenador || "--")}</span>
            <span>${fmtDate(clase.fecha_hora)} · ${fmtTime(clase.fecha_hora)}</span>
            <span>${Number(clase.duracion_min || 0)} min</span>
          </div>
          ${clase.descripcion ? `<p class="cal-clase-desc">${escapeHtml(clase.descripcion)}</p>` : ""}
          <button
            class="cal-btn ${yaReservada ? "cal-btn--reservada" : (sinCupo ? "cal-btn--llena" : "")}"
            data-id="${clase.id_clase}"
            ${yaReservada || sinCupo ? "disabled" : ""}
          >
            ${yaReservada ? (fueAsignada ? "Asignada por entrenador" : "Ya tienes esta clase") : (sinCupo ? "Sin cupos" : "Reservar")}
          </button>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".cal-btn:not([disabled])").forEach((button) => {
      button.addEventListener("click", async () => {
        const claseId = Number(button.dataset.id);
        button.disabled = true;
        button.textContent = "Reservando...";

        try {
          await GymApp.api(`/api/clases/${claseId}/reservar`, { method: "POST" });
          GymApp.toast("Reserva confirmada", "success");
          loadClases();
        } catch (error) {
          GymApp.toast(error.message || "Error al reservar", "error");
          button.disabled = false;
          button.textContent = "Reservar";
        }
      });
    });
  }

  async function cancelReservation(reserva) {
    const confirmed = await GymApp.confirm({
      title: "Cancelar reserva",
      message: `Se cancelara tu reserva para "${reserva.nombre}".`,
      confirmText: "Cancelar reserva",
      cancelText: "Volver",
      danger: true
    });

    if (!confirmed) return;

    try {
      await GymApp.api(`/api/clases/reservas/${reserva.id_reserva}`, { method: "DELETE" });
      GymApp.toast("Reserva cancelada", "success");
      loadClases();
    } catch (error) {
      GymApp.toast(error.message || "No se pudo cancelar la reserva", "error");
    }
  }

  function renderMisReservas(reservas) {
    const wrap = document.getElementById("misReservasWrap");
    if (!reservas.length) {
      wrap.innerHTML = `<p class="cal-empty">Aun no tienes reservas confirmadas.</p>`;
      return;
    }

    wrap.innerHTML = reservas.map((reserva) => {
      const fueAsignada = reserva.asignada_por != null;
      const action = fueAsignada
        ? `<span style="color:var(--text-dim);font-size:12px;font-style:italic;">Gestionada por tu entrenador</span>`
        : `<button class="cal-btn-cancel" data-reserva-id="${reserva.id_reserva}">Cancelar</button>`;

      return `
        <div class="cal-reserva-row">
          <div class="cal-reserva-info">
            <span class="cal-reserva-nombre">${escapeHtml(reserva.nombre)}</span>
            <span class="cal-reserva-meta">${fmtDate(reserva.fecha_hora)} · ${fmtTime(reserva.fecha_hora)} | Entrenador: ${escapeHtml(reserva.entrenador || "Sin entrenador")}</span>
            <span class="cal-reserva-meta" style="display:block;margin-top:4px;">${fueAsignada ? "Reserva asignada por tu entrenador." : "Reserva hecha desde tu cuenta."}</span>
          </div>
          ${action}
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("[data-reserva-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const reservaId = Number(button.dataset.reservaId);
        const reserva = misReservas.find((item) => item.id_reserva === reservaId);
        if (reserva) {
          cancelReservation(reserva);
        }
      });
    });
  }

  function renderMisRutinas(rutinas) {
    const wrap = document.getElementById("misRutinasWrap");
    if (!rutinas.length) {
      wrap.innerHTML = `<p class="cal-empty">Tu entrenador aun no te ha asignado rutinas.</p>`;
      return;
    }

    wrap.innerHTML = rutinas.map((rutina) => {
      const day = rutina.dia_semana || "Sin dia";
      const details = [];
      if (rutina.series != null) details.push(`${rutina.series} series`);
      if (rutina.repeticiones != null) details.push(`${rutina.repeticiones} reps`);
      if (rutina.duracion != null) details.push(`${rutina.duracion} min`);
      const meta = details.length ? details.join(" · ") : "--";
      const description = rutina.descripcion
        ? `<span class="cal-reserva-meta" style="display:block;margin-top:4px;">${escapeHtml(rutina.descripcion)}</span>`
        : "";

      return `
        <div class="cal-reserva-row" style="border-color:rgba(232,124,42,0.35);">
          <div class="cal-reserva-info">
            <span class="cal-reserva-nombre">
              ${escapeHtml(rutina.nombre_ejercicio)}
              <span class="cal-badge" style="background:rgba(232,124,42,0.15);color:var(--orange);border:1px solid rgba(232,124,42,0.4);margin-left:8px;">${escapeHtml(day)}</span>
            </span>
            <span class="cal-reserva-meta">${meta}</span>
            ${description}
          </div>
          <span style="color:var(--text-dim);font-size:12px;font-style:italic;">Asignada por tu entrenador</span>
        </div>
      `;
    }).join("");
  }

  document.getElementById("calSearch").addEventListener("input", (event) => {
    if (!classesCatalogReady) return;

    const query = event.target.value.toLowerCase();
    const filtered = query
      ? todasClases.filter((clase) =>
        clase.nombre.toLowerCase().includes(query) ||
        (clase.entrenador || "").toLowerCase().includes(query)
      )
      : todasClases;

    renderClases(filtered);
  });

  loadClases();
});
