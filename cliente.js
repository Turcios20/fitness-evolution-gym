"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = GymApp.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const renewButton = document.querySelector(".subs-card .btn-orange");
  const bottomLinks = document.querySelectorAll(".bottomnav .bot-link");
  const bars = document.querySelectorAll(".bar-chart .bar");
  const sectionActions = document.querySelectorAll(".ver-todo");
  const welcomeTitle = document.querySelector(".welcome-title");
  const planEl = document.querySelector(".subs-row .subs-val.orange");
  const remainingDaysEl = Array.from(document.querySelectorAll(".subs-row")).find((row) =>
    (row.querySelector(".subs-key")?.textContent || "").toLowerCase().includes("tiempo restante")
  )?.querySelector(".subs-val");

  function renderClientData(data) {
    const name = data?.name || session.displayName || "Cliente";
    const plan = data?.subscription?.plan || "Mensual";
    const days = Number(data?.subscription?.daysRemaining ?? 14);

    if (welcomeTitle) {
      welcomeTitle.textContent = `¡Bienvenido, ${name}!`;
    }
    if (planEl) {
      planEl.textContent = plan;
    }
    if (remainingDaysEl) {
      remainingDaysEl.textContent = `${days} días`;
    }
  }

  async function loadClientData() {
    try {
      const data = await GymApp.api(`/api/client/dashboard?username=${encodeURIComponent(session.username)}`);
      renderClientData(data);
    } catch {
      renderClientData(null);
    }
  }

  bottomLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === "#") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        alert("Sección pendiente de implementación.");
      });
    }
  });

  sectionActions.forEach((action) => {
    action.style.cursor = "pointer";
    action.addEventListener("click", () => {
      alert("Vista completa en construcción.");
    });
  });

  bars.forEach((bar) => {
    bar.style.cursor = "pointer";
    bar.addEventListener("click", () => {
      bars.forEach((item) => item.classList.remove("active"));
      bar.classList.add("active");
    });
  });

  if (renewButton) {
    renewButton.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        await GymApp.api("/api/subscription/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username })
        });

        await loadClientData();
        alert("Suscripción renovada.");
        return;
      } catch {
        // Fallback local mientras no exista API activa.
      }

      if (remainingDaysEl) {
        remainingDaysEl.textContent = "30 días";
      }
      alert("Renovación simulada localmente (sin backend).");
    });
  }

  loadClientData();
});
