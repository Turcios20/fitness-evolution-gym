"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("admin")) return;

  const reportFrom = document.getElementById("reportFrom");
  const reportTo = document.getElementById("reportTo");
  const loadReportButton = document.getElementById("loadReportButton");
  const exportCsvButton = document.getElementById("exportCsvButton");
  const reportMembersList = document.getElementById("reportMembersList");
  const reportMembersEmpty = document.getElementById("reportMembersEmpty");
  const reportEntriesList = document.getElementById("reportEntriesList");
  const reportEntriesEmpty = document.getElementById("reportEntriesEmpty");
  const reportTotalCheckins = document.getElementById("reportTotalCheckins");
  const reportUniqueMembers = document.getElementById("reportUniqueMembers");
  const reportExpiredCheckins = document.getElementById("reportExpiredCheckins");

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

  function renderEmpty(listElement, emptyElement, message) {
    listElement.innerHTML = "";
    emptyElement.textContent = message;
    emptyElement.style.display = "block";
  }

  function hideEmpty(emptyElement) {
    emptyElement.style.display = "none";
  }

  function setMetrics(summary) {
    reportTotalCheckins.textContent = String(summary?.totalCheckins || 0);
    reportUniqueMembers.textContent = String(summary?.uniqueMembers || 0);
    reportExpiredCheckins.textContent = String(summary?.expiredCheckins || 0);
  }

  function createMemberSummaryItem(memberSummary) {
    const item = document.createElement("div");
    item.className = "att-item";

    const avatarSeed = initials(memberSummary.name);
    const lastDate = formatDateDisplay(memberSummary.lastCheckIn);
    const lastTime = memberSummary.lastCheckIn ? new Date(memberSummary.lastCheckIn).toLocaleTimeString("es-SV", {
      hour: "2-digit",
      minute: "2-digit"
    }) : "--:--";

    item.innerHTML = `
      <div class="att-avatar" style="background:${avatarColor(avatarSeed)};">${avatarSeed}</div>
      <div class="att-info">
        <div class="att-name-text">${memberSummary.name}</div>
        <div class="att-detail">ID ${memberSummary.memberId} · ${memberSummary.email}</div>
        <div class="att-detail"><span class="att-detail-strong">${memberSummary.count} registro(s)</span> · ultimo ${lastDate} ${lastTime}</div>
      </div>
      <div class="att-item-actions">
        <span class="badge ${badgeClass(memberSummary.membershipIndicator.tone)}">${memberSummary.membershipIndicator.label}</span>
      </div>
    `;

    return item;
  }

  function createEntryItem(entry) {
    const item = document.createElement("div");
    item.className = "att-item";

    const avatarSeed = initials(entry.member.name);

    item.innerHTML = `
      <div class="att-avatar" style="background:${avatarColor(avatarSeed)};">${avatarSeed}</div>
      <div class="att-info">
        <div class="att-name-text">${entry.member.name}</div>
        <div class="att-detail">ID ${entry.member.id} · ${entry.member.email}</div>
        <div class="att-detail"><span class="att-detail-strong">${entry.checkedInTime || "--:--"}</span> · ${formatDateDisplay(entry.checkedInDate)} · ${entry.member.membership?.plan || "Sin membresia"}</div>
      </div>
      <div class="att-item-actions">
        <span class="badge ${badgeClass(entry.membershipIndicator.tone)}">${entry.membershipIndicator.label}</span>
      </div>
    `;

    return item;
  }

  function renderMembers(members) {
    reportMembersList.innerHTML = "";

    if (!members.length) {
      renderEmpty(reportMembersList, reportMembersEmpty, "No hay miembros con asistencias en ese rango.");
      return;
    }

    hideEmpty(reportMembersEmpty);
    members.forEach((member) => {
      reportMembersList.appendChild(createMemberSummaryItem(member));
    });
  }

  function renderEntries(entries) {
    reportEntriesList.innerHTML = "";

    if (!entries.length) {
      renderEmpty(reportEntriesList, reportEntriesEmpty, "No hay registros de asistencia en ese rango.");
      return;
    }

    hideEmpty(reportEntriesEmpty);
    entries.forEach((entry) => {
      reportEntriesList.appendChild(createEntryItem(entry));
    });
  }

  async function loadReport() {
    const params = new URLSearchParams({
      from: reportFrom.value,
      to: reportTo.value
    });

    try {
      const payload = await GymApp.api(`/api/admin/attendance/report?${params.toString()}`);
      setMetrics(payload.summary);
      renderMembers(payload.members || []);
      renderEntries(payload.entries || []);
    } catch (error) {
      GymApp.toast(`No se pudo cargar el reporte: ${error.message}`, "error");
    }
  }

  async function exportCsv() {
    const params = new URLSearchParams({
      from: reportFrom.value,
      to: reportTo.value,
      format: "csv"
    });

    try {
      const csv = await GymApp.api(`/api/admin/attendance/report?${params.toString()}`);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reporte-asistencia-${reportFrom.value}-a-${reportTo.value}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      GymApp.toast("Reporte exportado correctamente.", "success");
    } catch (error) {
      GymApp.toast(`No se pudo exportar el CSV: ${error.message}`, "error");
    }
  }

  function initializeDates() {
    const today = new Date();
    const fromDate = new Date(today.getTime() - (29 * 24 * 60 * 60 * 1000));

    reportTo.value = formatDateInput(today);
    reportFrom.value = formatDateInput(fromDate);
  }

  loadReportButton.addEventListener("click", loadReport);
  exportCsvButton.addEventListener("click", exportCsv);

  initializeDates();
  loadReport();
});
