"use strict";

(function initGymEvolution() {
  const METRICS = [
    { key: "weight", label: "Peso", unit: "kg" },
    { key: "chest", label: "Pecho", unit: "cm" },
    { key: "waist", label: "Cintura", unit: "cm" },
    { key: "hips", label: "Cadera", unit: "cm" },
    { key: "arms", label: "Brazos", unit: "cm" },
    { key: "legs", label: "Piernas", unit: "cm" }
  ];

  function hasValue(value) {
    return value !== null && value !== undefined && value !== "";
  }

  function toNumber(value) {
    if (!hasValue(value)) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatNumber(value) {
    const parsed = toNumber(value);
    return parsed == null ? "-" : parsed.toFixed(2);
  }

  function formatDate(dateString) {
    if (!dateString) return "--/--/----";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatBytes(sizeBytes) {
    const size = Number(sizeBytes);
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  function calculateDifference(previousValue, currentValue) {
    const previous = toNumber(previousValue);
    const current = toNumber(currentValue);

    if (previous == null || current == null) return null;
    return current - previous;
  }

  function getTrend(difference) {
    if (difference == null || difference === 0) {
      return {
        differenceClass: "diferencia-neutra",
        iconClass: "cambio-igual",
        cardClass: "",
        icon: "=",
        label: "Sin cambio",
        cardLabel: "sin cambio"
      };
    }

    if (difference < 0) {
      return {
        differenceClass: "diferencia-positiva",
        iconClass: "cambio-mejoro",
        cardClass: "mejoro",
        icon: "&darr;",
        label: "Mejoro",
        cardLabel: "mejor"
      };
    }

    return {
      differenceClass: "diferencia-negativa",
      iconClass: "cambio-empeoro",
      cardClass: "empeoro",
      icon: "&uarr;",
      label: "Empeoro",
      cardLabel: "peor"
    };
  }

  function resolvePhotoUrl(photo) {
    const rawUrl = String(photo?.url || "").trim();
    if (!rawUrl) return "";
    return window.GymApp?.resolveUrl ? window.GymApp.resolveUrl(rawUrl) : rawUrl;
  }

  function renderComparativeRows(measurements) {
    if (!measurements.length) {
      return '<tr><td colspan="5" class="loading-row">No hay mediciones registradas</td></tr>';
    }

    const first = measurements[measurements.length - 1];
    const latest = measurements[0];
    const rows = METRICS.map((metric) => {
      const firstValue = toNumber(first[metric.key]);
      const latestValue = toNumber(latest[metric.key]);

      if (firstValue == null && latestValue == null) {
        return "";
      }

      const difference = calculateDifference(firstValue, latestValue);
      const trend = getTrend(difference);
      const differenceText = difference == null
        ? "Sin dato comparable"
        : `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${Math.abs(difference).toFixed(2)} ${metric.unit}`;
      const changeText = difference == null ? "Sin dato suficiente" : trend.label;

      return `
        <tr>
          <td class="medida-nombre">${metric.label}</td>
          <td class="medida-valor">${firstValue == null ? "-" : `${formatNumber(firstValue)} ${metric.unit}`}</td>
          <td class="medida-valor">${latestValue == null ? "-" : `${formatNumber(latestValue)} ${metric.unit}`}</td>
          <td class="medida-valor ${trend.differenceClass}">${differenceText}</td>
          <td class="medida-valor">
            <span class="cambio-icon ${trend.iconClass}">${difference == null ? "?" : trend.icon}</span>
            ${changeText}
          </td>
        </tr>
      `;
    }).filter(Boolean).join("");

    return rows || '<tr><td colspan="5" class="loading-row">No hay mediciones completas para comparar</td></tr>';
  }

  function renderPhotoSection(measurement, options) {
    const photo = measurement?.photo;
    const photoUrl = resolvePhotoUrl(photo);
    const photoMeta = [photo?.mimeType?.replace("image/", "").toUpperCase(), formatBytes(photo?.sizeBytes)]
      .filter(Boolean)
      .join(" · ");
    const uploadControls = options.showPhotoUploadControls
      ? `
        <label class="progress-photo-picker">
          <span>${photo ? "Reemplazar fotografia" : "Subir fotografia"}</span>
          <input
            class="progress-photo-input"
            type="file"
            accept="image/jpeg,image/png"
            data-measurement-id="${measurement.id}">
        </label>
        <div class="progress-photo-hint">Formato JPG o PNG, maximo 5 MB.</div>
      `
      : "";

    return `
      <div class="progress-photo-card">
        <div class="progress-photo-top">
          <span class="progress-photo-title">Fotografia de progreso</span>
          ${photoMeta ? `<span class="progress-photo-meta">${photoMeta}</span>` : ""}
        </div>

        ${photoUrl
          ? `
            <a class="progress-photo-link" href="${photoUrl}" target="_blank" rel="noreferrer">
              <img class="progress-photo-preview" src="${photoUrl}" alt="Fotografia de progreso del miembro">
            </a>
          `
          : '<div class="progress-photo-empty">No hay fotografia cargada para este registro.</div>'}

        ${uploadControls ? `<div class="progress-photo-actions">${uploadControls}</div>` : ""}
      </div>
    `;
  }

  function renderHistoryItems(measurements, options = {}) {
    if (!measurements.length) {
      return '<div class="loading-message">No hay mediciones registradas</div>';
    }

    return measurements.map((measurement, index) => {
      const previousMeasurement = measurements[index + 1] || null;
      const measuresHtml = METRICS.map((metric) => {
        const currentValue = toNumber(measurement[metric.key]);

        if (currentValue == null) return "";

        let cardClass = "";
        let changeHtml = '<div class="medida-card-cambio">Registro base</div>';

        if (previousMeasurement) {
          const difference = calculateDifference(previousMeasurement[metric.key], currentValue);

          if (difference == null) {
            changeHtml = '<div class="medida-card-cambio">Sin comparativa</div>';
          } else {
            const trend = getTrend(difference);
            cardClass = trend.cardClass;
            changeHtml = `
              <div class="medida-card-cambio">
                ${trend.icon} ${Math.abs(difference).toFixed(2)} ${metric.unit} (${trend.cardLabel})
              </div>
            `;
          }
        }

        return `
          <div class="medida-card ${cardClass}">
            <div class="medida-card-label">${metric.label}</div>
            <div class="medida-card-valor">${formatNumber(currentValue)}</div>
            <div class="medida-card-unit">${metric.unit}</div>
            ${changeHtml}
          </div>
        `;
      }).filter(Boolean).join("");

      return `
        <div class="historial-item" data-measurement-id="${measurement.id}">
          <div class="historial-fecha">
            <span class="historial-fecha-badge">${formatDate(measurement.date)}</span>
            ${index === 0 ? '<span class="historial-current-tag">Mas reciente</span>' : ""}
          </div>
          <div class="historial-medidas">
            ${measuresHtml || '<div class="loading-message">Sin medidas registradas ese dia</div>'}
          </div>
          ${renderPhotoSection(measurement, options)}
        </div>
      `;
    }).join("");
  }

  function renderEvolution(targets, payload, options = {}) {
    const objective = String(payload?.objective || "").trim();
    const measurements = Array.isArray(payload?.measurements) ? payload.measurements : [];

    if (targets.objective) {
      targets.objective.textContent = objective || "No hay objetivo configurado";
    }

    if (targets.comparison) {
      targets.comparison.innerHTML = renderComparativeRows(measurements);
    }

    if (targets.history) {
      targets.history.innerHTML = renderHistoryItems(measurements, options);
    }
  }

  window.GymEvolution = {
    formatBytes,
    formatDate,
    renderEvolution
  };
})();
