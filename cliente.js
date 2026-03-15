"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Redirige si no hay sesión
  const session = GymApp.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // ── Referencias al DOM ──
  const welcomeTitle  = document.getElementById("welcomeTitle");
  const planEl        = document.getElementById("planType");
  const daysEl        = document.getElementById("daysLeft");
  const userAvatar    = document.getElementById("userAvatar");
  const avatarWrap    = document.getElementById("avatarWrap");
  const avatarDropdown= document.getElementById("avatarDropdown");
  const dropdownName  = document.getElementById("dropdownName");
  const btnLogout     = document.getElementById("btnLogout");
  const bars          = document.querySelectorAll(".bar-chart .bar");
  const bottomLinks   = document.querySelectorAll(".bottomnav .bot-link");
  const verTodos      = document.querySelectorAll(".ver-todo");
  const renewButton   = document.querySelector(".subs-card .btn-orange");

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

  // ── Interacción de las barras del gráfico ──
  bars.forEach((bar) => {
    bar.style.cursor = "pointer";
    bar.addEventListener("click", () => {
      bars.forEach((b) => b.classList.remove("active"));
      bar.classList.add("active");
    });
  });

  // Los links del nav inferior ya apuntan a sus páginas reales

  verTodos.forEach((el) => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => alert("Vista completa en construcción."));
  });

  // ── Renovar suscripción ──
  if (renewButton) {
    renewButton.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await GymApp.api("/api/subscription/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username }),
        });
        await loadClientData();
        alert("Suscripción renovada.");
      } catch {
        if (daysEl) daysEl.textContent = "30 días";
        alert("Renovación simulada localmente (sin backend).");
      }
    });
  }

  loadClientData();
});
