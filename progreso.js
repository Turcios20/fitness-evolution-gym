"use strict";

(function initProgressPage() {
  if (!window.GymApp?.guardRoute("cliente")) {
    return;
  }

  const session = window.GymApp.getSession();
  if (!session?.id) {
    window.location.href = "login.html";
    return;
  }

  window.GymApp.setupUserMenu();

  const historyList = document.getElementById("historialList");

  const latestMap = {
    date: document.getElementById("ultimaFecha"),
    weight: document.getElementById("ultimaPeso"),
    chest: document.getElementById("ultimaPecho"),
    waist: document.getElementById("ultimaCintura"),
    hips: document.getElementById("ultimaCadera"),
    arms: document.getElementById("ultimaBrazos"),
    legs: document.getElementById("ultimaPiernas")
  };

  function hasValue(value) {
    return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
  }

  function normalizeDate(value) {
    if (!value) return "";

    const rawValue = String(value);
    const isoMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
    return isoMatch ? isoMatch[1] : "";
  }

  function formatDateDisplay(value) {
    const normalizedDate = normalizeDate(value);
    if (!normalizedDate) return "--/--/----";

    const [year, month, day] = normalizedDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatMeasureNumber(value) {
    const numericValue = Number(value);
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
  }

  function formatMeasureValue(value, unit) {
    return hasValue(value) ? `${formatMeasureNumber(value)} ${unit}` : `-- ${unit}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderObjectiveBanner(objective) {
    const banner = document.getElementById("objetivoBanner");
    const value = document.getElementById("objetivoValor");
    if (!banner || !value) return;

    if (!objective) {
      banner.style.display = "none";
      value.textContent = "";
      return;
    }

    banner.style.display = "flex";
    value.textContent = objective;
  }

  function updateLatestMeasurementCard(measurements) {
    const latestMeasurement = Array.isArray(measurements) ? measurements[0] : null;

    if (!latestMeasurement) {
      latestMap.date.textContent = "--/--/----";
      latestMap.weight.textContent = "-- kg";
      latestMap.chest.textContent = "-- cm";
      latestMap.waist.textContent = "-- cm";
      latestMap.hips.textContent = "-- cm";
      latestMap.arms.textContent = "-- cm";
      latestMap.legs.textContent = "-- cm";
      return;
    }

    latestMap.date.textContent = formatDateDisplay(latestMeasurement.date);
    latestMap.weight.textContent = formatMeasureValue(latestMeasurement.weight, "kg");
    latestMap.chest.textContent = formatMeasureValue(latestMeasurement.chest, "cm");
    latestMap.waist.textContent = formatMeasureValue(latestMeasurement.waist, "cm");
    latestMap.hips.textContent = formatMeasureValue(latestMeasurement.hips, "cm");
    latestMap.arms.textContent = formatMeasureValue(latestMeasurement.arms, "cm");
    latestMap.legs.textContent = formatMeasureValue(latestMeasurement.legs, "cm");
  }

  async function loadEvolution() {
    const response = await window.GymApp.api(`/api/client/${session.id}/evolution`);
    const measurements = Array.isArray(response.measurements) ? response.measurements : [];

    updateLatestMeasurementCard(measurements);
    renderObjectiveBanner(response.objective || "");

    if (window.GymEvolution?.renderEvolution) {
      window.GymEvolution.renderEvolution(
        {
          history: historyList
        },
        response
      );
    } else if (historyList) {
      historyList.innerHTML = '<div class="loading-message">No se pudo cargar el historial visual.</div>';
    }
  }

  async function initialize() {
    try {
      await loadEvolution();
    } catch (error) {
      if (historyList) {
        historyList.innerHTML = `<div class="error-message">No se pudo cargar el historial: ${escapeHtml(error.message)}</div>`;
      }
      window.GymApp.toast(error.message || "No se pudo cargar tu progreso.", "error");
    }
  }

  initialize();
})();
