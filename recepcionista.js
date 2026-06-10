"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("recepcionista")) return;

  const session = GymApp.getSession();
  GymApp.setupUserMenu({ anchorId: "receptionAvatar", avatarId: "receptionAvatar" });
  const avatar = document.getElementById("receptionAvatar");
  const welcome = document.getElementById("receptionWelcome");
  const searchInput = document.getElementById("receptionSearch");
  const tableBody = document.getElementById("receptionTableBody");
  const memberSearchInput = document.getElementById("checkinMemberSearch");
  const memberSelect = document.getElementById("checkinMemberSelect");
  const memberDetails = document.getElementById("checkinMemberDetails");
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
  const historyMemberSelect = document.getElementById("historyMemberSelect");
  const historyFromDate = document.getElementById("historyFromDate");
  const historyToDate = document.getElementById("historyToDate");
  const btnLoadHistory = document.getElementById("btnLoadHistory");
  const historyTotalEntries = document.getElementById("historyTotalEntries");
  const historyLatestEntry = document.getElementById("historyLatestEntry");
  const historyCurrentStatus = document.getElementById("historyCurrentStatus");
  const historyTableBody = document.getElementById("historyTableBody");

  let allMembers = [];
  let presentMembers = [];
  let autoRefreshTimer = null;
  let defaultPlan = null;

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

  function parseDateValue(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim())) {
      const [year, month, day] = String(value).split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(value);
  }

  function formatDate(value) {
    if (!value) return "--";
    return parseDateValue(value).toLocaleDateString("es-SV", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function formatDateTime(value) {
    if (!value) return "--";
    return `${formatDate(value)} ${formatTime(value)}`;
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function shiftDate(date, amount) {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    nextDate.setDate(nextDate.getDate() + amount);
    return nextDate;
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
        Promise.all([loadDashboard(), refreshHistoryIfSelected()]).catch(() => {});
      }, 30000);
    }
  }

  function getMembershipStatus(membership) {
    if (!membership) {
      return {
        label: "Sin membresia",
        className: "danger",
        renewable: true,
        detail: "No hay un plan registrado para este miembro."
      };
    }

    const status = membership.status || "Inactivo";
    const daysRemaining = Number(membership.daysRemaining || 0);

    if (status !== "Activo") {
      return {
        label: "Inactiva",
        className: "danger",
        renewable: true,
        detail: "La membresia esta marcada como inactiva."
      };
    }

    if (daysRemaining <= 0) {
      return {
        label: "Vencida",
        className: "danger",
        renewable: true,
        detail: "La membresia ya vencio y requiere renovacion."
      };
    }

    if (daysRemaining <= 7) {
      return {
        label: "Por vencer",
        className: "warn",
        renewable: true,
        detail: `Quedan ${daysRemaining} dias para el vencimiento.`
      };
    }

    return {
      label: "Activa",
      className: "active",
      renewable: false,
      detail: `Quedan ${daysRemaining} dias vigentes.`
    };
  }

  function getPresentMemberStatus(member) {
    return getMembershipStatus({
      status: member.membershipStatus,
      daysRemaining: member.daysRemaining
    });
  }

  function statusPillHtml(status) {
    return `<span class="status-pill ${status.className}">${status.label}</span>`;
  }

  function memberSearchText(member) {
    return `#${member.id} ${member.name} ${member.email}`.toLowerCase();
  }

  function findMemberById(memberId) {
    const numericId = Number(memberId);
    return allMembers.find((member) => Number(member.id) === numericId) || null;
  }

  function syncMemberMembership(memberId, membership) {
    const member = findMemberById(memberId);
    if (!member) return;
    member.membership = membership
      ? {
          ...(member.membership || {}),
          ...membership
        }
      : null;
  }

  function renderCheckinPreview() {
    const selectedMember = findMemberById(memberSelect.value);

    if (!selectedMember) {
      memberDetails.className = "member-preview member-preview--placeholder";
      memberDetails.innerHTML = "<p>Selecciona un miembro para ver su estado de membresia antes del registro.</p>";
      return;
    }

    const membership = selectedMember.membership || null;
    const status = getMembershipStatus(membership);
    const toneClass = status.className === "active"
      ? "member-preview--ok"
      : status.className === "warn"
        ? "member-preview--warn"
        : "member-preview--danger";

    memberDetails.className = `member-preview ${toneClass}`;
    memberDetails.innerHTML = `
      <div class="member-preview-top">
        <div>
          <div class="member-preview-name">${selectedMember.name}</div>
          <span class="member-preview-id">ID #${selectedMember.id} · ${selectedMember.email}</span>
        </div>
        ${statusPillHtml(status)}
      </div>
      <div class="member-preview-grid">
        <div class="member-preview-item">
          <span class="member-preview-label">Plan</span>
          <span class="member-preview-value">${membership?.plan || "Sin plan"}</span>
        </div>
        <div class="member-preview-item">
          <span class="member-preview-label">Vence</span>
          <span class="member-preview-value">${membership?.endDate ? formatDate(membership.endDate) : "--"}</span>
        </div>
      </div>
      <div class="member-preview-note">${status.detail}</div>
    `;
  }

  function createMemberOption(member) {
    return `<option value="${member.id}">#${member.id} - ${member.name} - ${member.email}</option>`;
  }

  function populateCheckinSelect() {
    const currentValue = memberSelect.value;
    const query = String(memberSearchInput.value || "").trim().toLowerCase();
    const list = query
      ? allMembers.filter((member) => memberSearchText(member).includes(query))
      : allMembers;

    memberSelect.innerHTML = ['<option value="">Selecciona un cliente...</option>']
      .concat(
        [...list]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(createMemberOption)
      )
      .join("");

    if (list.some((member) => String(member.id) === currentValue)) {
      memberSelect.value = currentValue;
    }

    renderCheckinPreview();
  }

  function populateHistorySelect() {
    const currentValue = historyMemberSelect.value;
    historyMemberSelect.innerHTML = ['<option value="">Selecciona un cliente...</option>']
      .concat(
        [...allMembers]
          .sort((left, right) => left.name.localeCompare(right.name))
          .map(createMemberOption)
      )
      .join("");

    if (allMembers.some((member) => String(member.id) === currentValue)) {
      historyMemberSelect.value = currentValue;
    }
  }

  function renderTable() {
    const query = String(searchInput.value || "").trim().toLowerCase();
    const filtered = presentMembers.filter((member) =>
      memberSearchText(member).includes(query)
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
      const status = getPresentMemberStatus(member);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="m-info">
            <span class="m-name">${member.name}</span>
            <span class="m-id">ID #${member.id} · ${member.email}</span>
          </div>
        </td>
        <td>${statusPillHtml(status)}</td>
        <td>${formatTime(member.checkInTime)}</td>
        <td>
          <button class="btn-table" ${status.renewable ? "" : "disabled"}>
            ${status.renewable ? `Renovar ${defaultPlan?.duracionDias || 30}d` : "Al dia"}
          </button>
        </td>
      `;

      const button = tr.querySelector(".btn-table");
      if (status.renewable) {
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            const response = await GymApp.api(`/api/members/${member.id}/renew`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                days: defaultPlan?.duracionDias || 30,
                plan: defaultPlan?.nombre || "Mensual"
              })
            });
            const invoiceText = response?.invoiceNumber ? ` Factura: ${response.invoiceNumber}.` : "";
            GymApp.toast(`Membresia renovada para ${member.name}.${invoiceText}`, "success");
            await loadMembers();
            await Promise.all([loadDashboard(), refreshHistoryIfSelected(member.id)]);
          } catch (error) {
            button.disabled = false;
            GymApp.toast(`Error: ${error.message}`, "error");
          }
        });
      }

      tableBody.appendChild(tr);
    });
  }

  function renderHistoryTable(entries) {
    if (!entries.length) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty">No hay registros de asistencia para este rango.</td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = entries.map((entry) => {
      const status = getMembershipStatus(entry.membership);
      const detail = entry.membership?.plan
        ? `${entry.membership.plan} · ${entry.member.email}`
        : entry.member.email;

      return `
        <tr>
          <td>${formatDate(entry.checkInAt)}</td>
          <td>${formatTime(entry.checkInAt)}</td>
          <td>${statusPillHtml(status)}</td>
          <td>${detail}</td>
        </tr>
      `;
    }).join("");
  }

  function updateHistorySummary(member, entries) {
    const currentStatus = getMembershipStatus(member?.membership || null);
    historyTotalEntries.textContent = String(entries.length);
    historyLatestEntry.textContent = entries.length ? formatDateTime(entries[0].checkInAt) : "--";
    historyCurrentStatus.textContent = currentStatus.label;
  }

  async function loadMembers() {
    const data = await GymApp.api("/api/members");
    allMembers = data.members || [];
    populateCheckinSelect();
    populateHistorySelect();
    renderCheckinPreview();
  }

  async function loadPlans() {
    const planList = await GymApp.getPlans({ force: true, activeOnly: true });
    defaultPlan = planList.find((plan) => plan.popular) || planList[0] || null;
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

  async function loadHistory(options = {}) {
    const memberId = Number(historyMemberSelect.value);
    if (!Number.isFinite(memberId)) {
      if (!options.silent) GymApp.toast("Selecciona un miembro para consultar el historial.", "info");
      return;
    }

    if (!historyFromDate.value || !historyToDate.value) {
      if (!options.silent) GymApp.toast("Define un rango de fechas valido.", "info");
      return;
    }

    if (historyFromDate.value > historyToDate.value) {
      if (!options.silent) GymApp.toast("La fecha inicial no puede ser mayor que la final.", "info");
      return;
    }

    btnLoadHistory.disabled = true;
    try {
      const query = new URLSearchParams({
        memberId: String(memberId),
        from: historyFromDate.value,
        to: historyToDate.value
      });
      const response = await GymApp.api(`/api/reception/history?${query.toString()}`);
      const member = findMemberById(memberId);
      renderHistoryTable(response.entries || []);
      updateHistorySummary(member, response.entries || []);
    } catch (error) {
      if (!options.silent) GymApp.toast(`Error: ${error.message}`, "error");
    } finally {
      btnLoadHistory.disabled = false;
    }
  }

  async function refreshHistoryIfSelected(expectedMemberId = null) {
    const selectedValue = Number(historyMemberSelect.value);
    if (!Number.isFinite(selectedValue)) return;
    if (expectedMemberId != null && selectedValue !== Number(expectedMemberId)) return;
    await loadHistory({ silent: true });
  }

  avatar.textContent = getInitials(session.displayName || "Recepcion");
  avatar.style.background = avatarColor(avatar.textContent);
  welcome.textContent = `Turno de ${session.displayName || "Recepcion"}`;

  historyToDate.value = toInputDate(new Date());
  historyFromDate.value = toInputDate(shiftDate(new Date(), -29));

  searchInput.addEventListener("input", renderTable);
  memberSearchInput.addEventListener("input", populateCheckinSelect);
  memberSelect.addEventListener("change", () => {
    renderCheckinPreview();
    if (!historyMemberSelect.value && memberSelect.value) {
      historyMemberSelect.value = memberSelect.value;
    }
  });
  historyMemberSelect.addEventListener("change", () => {
    if (historyMemberSelect.value) {
      const member = findMemberById(historyMemberSelect.value);
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="table-empty">Pulsa "Consultar historial" para cargar los registros.</td>
        </tr>
      `;
      updateHistorySummary(member, []);
    }
  });

  btnLoadHistory.addEventListener("click", () => {
    loadHistory().catch((error) => {
      GymApp.toast(`Error: ${error.message}`, "error");
    });
  });

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  btnFocusCheckin.addEventListener("click", () => {
    checkinCard.scrollIntoView({ behavior: "smooth", block: "center" });
    memberSearchInput.focus();
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

    const selectedMember = findMemberById(memberId);
    const membershipStatus = getMembershipStatus(selectedMember?.membership || null);
    if (membershipStatus.className === "danger") {
      GymApp.toast(`Acceso denegado: ${membershipStatus.detail} Renueva la suscripcion para registrar la entrada.`, "error");
      return;
    }

    btnRegisterEntry.disabled = true;
    try {
      const result = await GymApp.api("/api/reception/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId })
      });

      syncMemberMembership(memberId, result.membership || null);
      renderCheckinPreview();

      if (isToggleOn(toggleAccessNotifications)) {
        const toastType = result.indicator?.expired ? "error" : result.alreadyRegistered ? "info" : "success";
        const suffix = result.indicator?.label ? ` (${result.indicator.label})` : "";
        GymApp.toast(`${result.message || "Entrada registrada."}${suffix}`, toastType);
      }

      await Promise.all([loadDashboard(), refreshHistoryIfSelected(memberId)]);
    } catch (error) {
      GymApp.toast(`Error: ${error.message}`, "error");
    } finally {
      btnRegisterEntry.disabled = false;
    }
  });

  loadPlans()
    .catch(() => {})
    .then(() => Promise.all([loadMembers(), loadDashboard(), loadSettings()]))
    .catch((error) => {
      GymApp.toast(`Error inicial: ${error.message}`, "error");
    });

  window.addEventListener("beforeunload", () => {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  });
});
