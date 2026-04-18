"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("recepcionista")) return;

  const session = GymApp.getSession();
  const avatar = document.getElementById("receptionAvatar");
  const welcome = document.getElementById("receptionWelcome");
  const searchInput = document.getElementById("receptionSearch");
  const tableBody = document.getElementById("receptionTableBody");
  const memberSelect = document.getElementById("checkinMemberSelect");
  const btnRegisterEntry = document.getElementById("btnRegisterEntry");
  const btnSaveSettings = document.getElementById("btnSaveReceptionSettings");
  const btnLogout = document.getElementById("btnReceptionLogout");
  const btnFocusCheckin = document.getElementById("btnFocusCheckin");
  const checkinCard = document.getElementById("checkinCard");
  const statEntriesToday = document.getElementById("statEntriesToday");
  const statNewMembers = document.getElementById("statNewMembers");
  const statPayments = document.getElementById("statPayments");
  const toggleAccessNotifications = document.getElementById("toggleAccessNotifications");
  const toggleAutoRefresh = document.getElementById("toggleAutoRefresh");

  let allMembers = [];
  let presentMembers = [];
  let autoRefreshTimer = null;

  function getInitials(name) {
    return (name || "RG")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }

  function avatarColor(initials) {
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];
    return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
  }

  function formatTime(value) {
    if (!value) return "--";
    return new Date(value).toLocaleTimeString("es-SV", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setToggle(button, enabled) {
    button.dataset.value = enabled ? "true" : "false";
    button.textContent = enabled ? "On" : "Off";
    button.classList.toggle("is-on", enabled);
  }

  function isToggleOn(button) {
    return button.dataset.value === "true";
  }

  function configureAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }

    if (isToggleOn(toggleAutoRefresh)) {
      autoRefreshTimer = setInterval(() => {
        loadDashboard().catch(() => {});
      }, 30000);
    }
  }

  function memberStatus(member) {
    if (member.membershipStatus !== "Activo") {
      return { label: "Inactivo", className: "danger", renewable: true };
    }
    if (member.daysRemaining <= 0) {
      return { label: "Vencido", className: "danger", renewable: true };
    }
    if (member.daysRemaining <= 7) {
      return { label: "Por vencer", className: "warn", renewable: true };
    }
    return { label: "Activo", className: "active", renewable: false };
  }

  function renderTable() {
    const query = String(searchInput.value || "").trim().toLowerCase();
    const filtered = presentMembers.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(query)
    );

    if (!filtered.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty">No hay miembros presentes que coincidan.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";
    filtered.forEach((member) => {
      const status = memberStatus(member);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="m-info">
            <span class="m-name">${member.name}</span>
            <span class="m-id">${member.email}</span>
          </div>
        </td>
        <td><span class="status-pill ${status.className}">${status.label}</span></td>
        <td>${formatTime(member.checkInTime)}</td>
        <td>
          <button class="btn-table" ${status.renewable ? "" : "disabled"}>
            ${status.renewable ? "Renovar 30d" : "Al dia"}
          </button>
        </td>
      `;

      const button = tr.querySelector(".btn-table");
      if (status.renewable) {
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await GymApp.api(`/api/members/${member.id}/renew`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ days: 30, plan: "Mensual" })
            });
            GymApp.toast(`Membresia renovada para ${member.name}.`, "success");
            await Promise.all([loadMembers(), loadDashboard()]);
          } catch (error) {
            button.disabled = false;
            GymApp.toast(`Error: ${error.message}`, "error");
          }
        });
      }

      tableBody.appendChild(tr);
    });
  }

  function populateMemberSelect() {
    const currentValue = memberSelect.value;
    const options = ['<option value="">Selecciona un cliente...</option>']
      .concat(
        [...allMembers]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((member) => `<option value="${member.id}">${member.name} - ${member.email}</option>`)
      )
      .join("");

    memberSelect.innerHTML = options;
    memberSelect.value = currentValue;
  }

  async function loadMembers() {
    const data = await GymApp.api("/api/members");
    allMembers = data.members || [];
    populateMemberSelect();
  }

  async function loadDashboard() {
    const data = await GymApp.api("/api/reception/dashboard");
    presentMembers = data.presentMembers || [];
    statEntriesToday.textContent = String(data.summary?.entriesToday || 0);
    statNewMembers.textContent = String(data.summary?.newMembers || 0);
    statPayments.textContent = String(data.summary?.paymentsCollected || 0);
    renderTable();
  }

  async function loadSettings() {
    const response = await GymApp.api(`/api/settings?username=${encodeURIComponent(session.username)}`);
    const settings = response.settings || {};
    setToggle(toggleAccessNotifications, settings.access_notifications !== "false");
    setToggle(toggleAutoRefresh, settings.reception_auto_refresh === "true");
    configureAutoRefresh();
  }

  avatar.textContent = getInitials(session.displayName || "Recepcion");
  avatar.style.background = avatarColor(avatar.textContent);
  welcome.textContent = `Turno de ${session.displayName || "Recepcion"}`;

  searchInput.addEventListener("input", renderTable);
  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  btnFocusCheckin.addEventListener("click", () => {
    checkinCard.scrollIntoView({ behavior: "smooth", block: "center" });
    memberSelect.focus();
  });

  [toggleAccessNotifications, toggleAutoRefresh].forEach((button) => {
    button.addEventListener("click", () => {
      setToggle(button, !isToggleOn(button));
      if (button === toggleAutoRefresh) {
        configureAutoRefresh();
      }
    });
  });

  btnSaveSettings.addEventListener("click", async () => {
    btnSaveSettings.disabled = true;
    try {
      await GymApp.api("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: session.username,
          settings: {
            access_notifications: String(isToggleOn(toggleAccessNotifications)),
            reception_auto_refresh: String(isToggleOn(toggleAutoRefresh))
          }
        })
      });
      GymApp.toast("Ajustes guardados correctamente.", "success");
    } catch (error) {
      GymApp.toast(`Error: ${error.message}`, "error");
    } finally {
      btnSaveSettings.disabled = false;
    }
  });

  btnRegisterEntry.addEventListener("click", async () => {
    const memberId = Number(memberSelect.value);
    if (!Number.isFinite(memberId)) {
      GymApp.toast("Selecciona un miembro antes de registrar.", "info");
      return;
    }

    btnRegisterEntry.disabled = true;
    try {
      const result = await GymApp.api("/api/reception/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId })
      });

      if (isToggleOn(toggleAccessNotifications)) {
        GymApp.toast(result.message || "Entrada registrada.", result.alreadyRegistered ? "info" : "success");
      }

      await loadDashboard();
    } catch (error) {
      GymApp.toast(`Error: ${error.message}`, "error");
    } finally {
      btnRegisterEntry.disabled = false;
    }
  });

  Promise.all([loadMembers(), loadDashboard(), loadSettings()]).catch((error) => {
    GymApp.toast(`Error inicial: ${error.message}`, "error");
  });

  window.addEventListener("beforeunload", () => {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  });
});
