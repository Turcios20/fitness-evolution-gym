"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("recepcionista")) return;

  const memberSearchInput = document.getElementById("memberSearchInput");
  const memberResults = document.getElementById("memberResults");
  const memberResultsEmpty = document.getElementById("memberResultsEmpty");
  const attendanceHistoryList = document.getElementById("attendanceHistoryList");
  const historyEmpty = document.getElementById("historyEmpty");
  const historyFrom = document.getElementById("historyFrom");
  const historyTo = document.getElementById("historyTo");
  const historyQuery = document.getElementById("historyQuery");
  const loadHistoryButton = document.getElementById("loadHistoryButton");
  const btnReceptionLogout = document.getElementById("btnReceptionLogout");
  const checkinFeedback = document.getElementById("checkinFeedback");
  const metricTodayCheckins = document.getElementById("metricTodayCheckins");
  const metricUniqueMembers = document.getElementById("metricUniqueMembers");
  const metricExpiredCheckins = document.getElementById("metricExpiredCheckins");

  let searchDebounce = null;

  function formatDateInput(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateDisplay(value) {
    if (!value) return "--/--/----";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }

  function badgeClass(tone) {
    if (tone === "green") return "badge-green";
    if (tone === "orange") return "badge-orange";
    return "badge-red";
  }

  function initials(name) {
    return String(name || "GM")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("");
  }

  function avatarColor(seed) {
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e"];
    return palette[(seed.charCodeAt(0) + (seed.charCodeAt(1) || 0)) % palette.length];
  }

  function setMetrics(summary) {
    metricTodayCheckins.textContent = String(summary?.totalCheckins || 0);
    metricUniqueMembers.textContent = String(summary?.uniqueMembers || 0);
    metricExpiredCheckins.textContent = String(summary?.expiredCheckins || 0);
  }

  function showCheckinFeedback(message, tone) {
    checkinFeedback.className = `att-feedback att-feedback--${tone} is-visible`;
    checkinFeedback.textContent = message;
  }

  function clearCheckinFeedback() {
    checkinFeedback.className = "att-feedback";
    checkinFeedback.textContent = "";
  }

  function renderEmpty(targetList, emptyState, message) {
    targetList.innerHTML = "";
    emptyState.textContent = message;
    emptyState.style.display = "block";
  }

  function hideEmpty(emptyState) {
    emptyState.style.display = "none";
  }

  function createMemberResultItem(member) {
    const item = document.createElement("div");
    item.className = "att-item";

    const avatarSeed = initials(member.name);
    const plan = member.membership?.plan || "Sin membresia";
    const endDate = member.membership?.endDate ? formatDateDisplay(member.membership.endDate) : "Sin fecha";
    const indicator = member.membershipIndicator;

    item.innerHTML = `
      <div class="att-avatar" style="background:${avatarColor(avatarSeed)};">${avatarSeed}</div>
      <div class="att-info">
        <div class="att-name-text">${member.name}</div>
        <div class="att-detail">ID ${member.id} · ${member.email}</div>
        <div class="att-detail"><span class="att-detail-strong">${plan}</span> · vence ${endDate}</div>
      </div>
      <div class="att-item-actions">
        <span class="badge ${badgeClass(indicator.tone)}">${indicator.label}</span>
        <button type="button" class="btn-orange att-compact-btn">Registrar entrada</button>
      </div>
    `;

    item.querySelector("button").addEventListener("click", () => {
      registerCheckin(member);
    });

    return item;
  }

  function renderMemberResults(members, query) {
    memberResults.innerHTML = "";

    if (!query.trim()) {
      renderEmpty(memberResults, memberResultsEmpty, "Escribe al menos 1 caracter para buscar un miembro.");
      return;
    }

    if (!members.length) {
      renderEmpty(memberResults, memberResultsEmpty, "No se encontraron miembros con esa busqueda.");
      return;
    }

    hideEmpty(memberResultsEmpty);
    members.forEach((member) => {
      memberResults.appendChild(createMemberResultItem(member));
    });
  }

  function createAttendanceItem(entry) {
    const item = document.createElement("div");
    item.className = "att-item";

    const avatarSeed = initials(entry.member.name);
    const indicator = entry.membershipIndicator;
    const plan = entry.member.membership?.plan || "Sin membresia";

    item.innerHTML = `
      <div class="att-avatar" style="background:${avatarColor(avatarSeed)};">${avatarSeed}</div>
      <div class="att-info">
        <div class="att-name-text">${entry.member.name}</div>
        <div class="att-detail">ID ${entry.member.id} · ${entry.member.email}</div>
        <div class="att-detail"><span class="att-detail-strong">${entry.checkedInTime || "--:--"}</span> · ${formatDateDisplay(entry.checkedInDate)} · ${plan}</div>
      </div>
      <div class="att-item-actions">
        <span class="badge ${badgeClass(indicator.tone)}">${indicator.label}</span>
      </div>
    `;

    return item;
  }

  function renderAttendanceHistory(entries) {
    attendanceHistoryList.innerHTML = "";

    if (!entries.length) {
      renderEmpty(attendanceHistoryList, historyEmpty, "No hay registros de asistencia en ese rango.");
      return;
    }

    hideEmpty(historyEmpty);
    entries.forEach((entry) => {
      attendanceHistoryList.appendChild(createAttendanceItem(entry));
    });
  }

  async function loadDashboard() {
    try {
      const payload = await GymApp.api("/api/reception/dashboard");
      setMetrics(payload.summary);
    } catch (error) {
      GymApp.toast(`No se pudo cargar el resumen: ${error.message}`, "error");
    }
  }

  async function searchMembers() {
    const query = memberSearchInput.value.trim();

    if (!query) {
      renderMemberResults([], query);
      return;
    }

    try {
      const payload = await GymApp.api(`/api/reception/members?query=${encodeURIComponent(query)}`);
      renderMemberResults(payload.members || [], query);
    } catch (error) {
      GymApp.toast(`Error buscando miembros: ${error.message}`, "error");
    }
  }

  async function registerCheckin(member) {
    try {
      const response = await GymApp.api("/api/reception/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id })
      });

      const indicator = response.membershipIndicator || member.membershipIndicator;
      const baseMessage = response.alreadyRegistered
        ? `La entrada de ${member.name} ya estaba registrada hoy.`
        : `Entrada registrada para ${member.name}.`;
      const detailMessage = `${baseMessage} Estado de membresia: ${indicator.label}.`;

      showCheckinFeedback(detailMessage, indicator.tone);
      GymApp.toast(detailMessage, response.alreadyRegistered ? "info" : "success");

      await Promise.all([loadDashboard(), loadHistory()]);
    } catch (error) {
      GymApp.toast(`No se pudo registrar la entrada: ${error.message}`, "error");
    }
  }

  async function loadHistory() {
    const params = new URLSearchParams({
      from: historyFrom.value,
      to: historyTo.value
    });

    const query = historyQuery.value.trim();
    if (query) {
      params.set("query", query);
    }

    try {
      const payload = await GymApp.api(`/api/reception/attendance?${params.toString()}`);
      renderAttendanceHistory(payload.entries || []);
    } catch (error) {
      GymApp.toast(`No se pudo consultar el historial: ${error.message}`, "error");
    }
  }

  function initializeDates() {
    const today = new Date();
    const fromDate = new Date(today.getTime() - (6 * 24 * 60 * 60 * 1000));

    historyTo.value = formatDateInput(today);
    historyFrom.value = formatDateInput(fromDate);
  }

  memberSearchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    clearCheckinFeedback();
    searchDebounce = setTimeout(searchMembers, 220);
  });

  loadHistoryButton.addEventListener("click", loadHistory);

  btnReceptionLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  initializeDates();
  loadDashboard();
  loadHistory();
});
