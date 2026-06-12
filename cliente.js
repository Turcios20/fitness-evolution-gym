"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Protege la ruta — solo clientes autenticados
  if (!GymApp.guardRoute("cliente")) return;
  const session = GymApp.getSession();

  // ── Referencias al DOM ──
  const welcomeTitle  = document.getElementById("welcomeTitle");
  const planEl        = document.getElementById("planType");
  const daysEl        = document.getElementById("daysLeft");
  const userAvatar    = document.getElementById("userAvatar");
  const avatarWrap    = document.getElementById("avatarWrap");
  const avatarDropdown= document.getElementById("avatarDropdown");
  const dropdownName  = document.getElementById("dropdownName");
  const btnLogout     = document.getElementById("btnLogout");
  const bottomLinks   = document.querySelectorAll(".bottomnav .bot-link");

  // ── Genera iniciales a partir del nombre (ej: "Jhoscar Ochoa" → "JO") ──
  function getInitials(name) {
    return (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }

  // ── Asigna un color de fondo único según las iniciales ──
  function getAvatarColor(initials) {
    const palette = [
      "#c45e1a", "#b0390e", "#7b2d8b", "#1a6fbf",
      "#1a8f5a", "#8a4f0d", "#3d5a9e", "#8b1a1a",
    ];
    const index = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length;
    return palette[index];
  }

  // ── Pinta el avatar con las iniciales del usuario ──
  function renderAvatar(name) {
    const initials = getInitials(name);
    userAvatar.textContent = initials;
    userAvatar.style.background = getAvatarColor(initials);
  }

  // ── Rellena los datos del usuario en pantalla ──
  function renderClientData(data) {
    const name = data?.name || session.displayName || "Cliente";
    const plan = data?.subscription?.plan || "Mensual";
    const days = Number(data?.subscription?.daysRemaining ?? 14);

    if (welcomeTitle) welcomeTitle.textContent = `¡Bienvenido, ${name.split(" ")[0]}!`;
    if (planEl)       planEl.textContent = plan;
    if (daysEl)       daysEl.textContent = `${days} días`;
    if (dropdownName) dropdownName.textContent = name;

    renderAvatar(name);
  }

  // ── Carga datos del backend o usa fallback ──
  async function loadClientData() {
    try {
      const data = await GymApp.api(
        `/api/client/dashboard?username=${encodeURIComponent(session.username)}`
      );
      renderClientData(data);
    } catch {
      renderClientData(null);
    }
  }

  // ── Dropdown: abrir/cerrar al hacer clic en el avatar ──
  avatarWrap.addEventListener("click", (e) => {
    e.stopPropagation();
    avatarDropdown.classList.toggle("open");
  });

  // Cierra el dropdown si se hace clic fuera de él
  document.addEventListener("click", () => {
    avatarDropdown.classList.remove("open");
  });

  // ── Cerrar sesión ──
  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  // Los links del nav inferior ya apuntan a sus páginas reales

  // ── Cargar rutinas del cliente ──
  const rutinasContainer = document.getElementById("rutinasContainer");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRutinas(rutinas) {
    if (!rutinasContainer) return;

    if (!rutinas.length) {
      rutinasContainer.innerHTML = `
        <div class="subs-card" style="text-align:center;">
          <p style="color:var(--text-dim);margin:0;">
            Aún no tienes rutinas asignadas.
          </p>
        </div>`;
      return;
    }

    rutinasContainer.innerHTML = rutinas.map((r) => `
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
    if (!rutinasContainer || !session?.id) return;
    try {
      const data = await GymApp.api(`/api/client/${session.id}/routines`);
      renderRutinas(Array.isArray(data?.routines) ? data.routines : []);
    } catch (error) {
      rutinasContainer.innerHTML = `
        <div class="subs-card" style="text-align:center;">
          <p style="color:var(--text-dim);margin:0;">
            Error cargando rutinas: ${escapeHtml(error.message)}
          </p>
        </div>`;
    }
  }

  const catalogGrid = document.getElementById("catalogGrid");

  function renderCatalog(planList) {
    if (!catalogGrid) return;

    if (!planList.length) {
      catalogGrid.innerHTML = '<div class="plan-card"><p class="plan-note">No hay planes disponibles.</p></div>';
      return;
    }

    catalogGrid.innerHTML = planList.map((plan) => {
      const price = Number(plan.precio).toFixed(2);
      const note = (plan.caracteristicas && plan.caracteristicas[0]) || "Acceso general";
      return `
        <div class="plan-card">
          <p class="plan-name">Plan ${escapeHtml(plan.nombre)}</p>
          <p class="plan-price">$${price}</p>
          <span class="plan-note">${escapeHtml(note)}</span>
        </div>`;
    }).join("");
  }

  async function loadCatalog() {
    if (!catalogGrid) return;
    try {
      const planList = await GymApp.getPlans({ activeOnly: true });
      renderCatalog(planList);
    } catch (error) {
      catalogGrid.innerHTML = '<div class="plan-card"><p class="plan-note">No se pudieron cargar los planes.</p></div>';
      console.error("No se pudo cargar el catálogo de planes:", error);
    }
  }

  loadClientData();
  loadRutinas();
  loadCatalog();
});
