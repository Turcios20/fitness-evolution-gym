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

  const form = document.getElementById("formProgreso");
  const dateInput = document.getElementById("fecha");
  const prefillHint = document.getElementById("prefillHint");

  const inputMap = {
    weight: document.getElementById("peso"),
    chest: document.getElementById("pecho"),
    waist: document.getElementById("cintura"),
    hips: document.getElementById("cadera"),
    arms: document.getElementById("brazos"),
    legs: document.getElementById("piernas")
  };

  const latestMap = {
    date: document.getElementById("ultimaFecha"),
    weight: document.getElementById("ultimaPeso"),
    chest: document.getElementById("ultimaPecho"),
    waist: document.getElementById("ultimaCintura"),
    hips: document.getElementById("ultimaCadera"),
    arms: document.getElementById("ultimaBrazos"),
    legs: document.getElementById("ultimaPiernas")
  };

  const fieldPairs = [
    ["weight", "weight"],
    ["chest", "chest"],
    ["waist", "waist"],
    ["hips", "hips"],
    ["arms", "arms"],
    ["legs", "legs"]
  ];

  let measurementsCache = [];

  function hasValue(value) {
    return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
  }

  function normalizeDate(value) {
    if (!value) return "";

    const rawValue = String(value);
    const isoMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }

    return "";
  }

  function formatDateDisplay(value) {
    const normalizedDate = normalizeDate(value);
    if (!normalizedDate) return "--/--/----";

    const [year, month, day] = normalizedDate.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatMeasureNumber(value) {
    const numericValue = Number(value);
    return Number.isInteger(numericValue)
      ? String(numericValue)
      : numericValue.toFixed(1);
  }

  function formatMeasureValue(value, unit) {
    return hasValue(value) ? `${formatMeasureNumber(value)} ${unit}` : `-- ${unit}`;
  }

  function setPrefillHint(message, state = "") {
    if (!prefillHint) return;

    prefillHint.textContent = message;
    prefillHint.classList.remove("prefill-hint--prefilled", "prefill-hint--editing");

    if (state === "prefilled") {
      prefillHint.classList.add("prefill-hint--prefilled");
    } else if (state === "editing") {
      prefillHint.classList.add("prefill-hint--editing");
    }
  }

  function clearMeasureInputs() {
    Object.values(inputMap).forEach((input) => {
      if (input) {
        input.value = "";
      }
    });
  }

  function fillMeasureInputs(measurement) {
    fieldPairs.forEach(([inputKey, measurementKey]) => {
      const input = inputMap[inputKey];
      if (!input) return;

      const value = measurement?.[measurementKey];
      input.value = hasValue(value) ? String(value) : "";
    });
  }

  function updateLatestMeasurementCard() {
    const latestMeasurement = measurementsCache[0];

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

  function getExactMeasurement(dateValue) {
    return measurementsCache.find((measurement) => normalizeDate(measurement.date) === dateValue) || null;
  }

  function getPreviousMeasurement(dateValue) {
    return measurementsCache.find((measurement) => normalizeDate(measurement.date) < dateValue) || null;
  }

  function hydrateFormForDate(dateValue) {
    const normalizedDate = normalizeDate(dateValue);

    if (!normalizedDate) {
      clearMeasureInputs();
      setPrefillHint("Selecciona una fecha valida para cargar tus medidas.");
      return;
    }

    const exactMeasurement = getExactMeasurement(normalizedDate);
    if (exactMeasurement) {
      fillMeasureInputs(exactMeasurement);
      setPrefillHint(
        `Estas editando el registro del ${formatDateDisplay(exactMeasurement.date)}.`,
        "editing"
      );
      return;
    }

    const previousMeasurement = getPreviousMeasurement(normalizedDate);
    if (previousMeasurement) {
      fillMeasureInputs(previousMeasurement);
      setPrefillHint(
        `Se cargaron automaticamente las medidas del ${formatDateDisplay(previousMeasurement.date)}. Edita solo lo que cambio.`,
        "prefilled"
      );
      return;
    }

    clearMeasureInputs();
    setPrefillHint("No hay medidas previas para autocompletar. Ingresa tu primera medicion.");
  }

  async function loadMeasurements() {
    const response = await window.GymApp.api(`/api/client/${session.id}/measurements`);
    measurementsCache = Array.isArray(response.measurements) ? response.measurements : [];
    updateLatestMeasurementCard();
  }

  function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    dateInput.value = `${year}-${month}-${day}`;
  }

  function buildPayload() {
    return {
      fecha: dateInput.value,
      peso: inputMap.weight.value.trim(),
      pecho: inputMap.chest.value.trim(),
      cintura: inputMap.waist.value.trim(),
      cadera: inputMap.hips.value.trim(),
      brazos: inputMap.arms.value.trim(),
      piernas: inputMap.legs.value.trim()
    };
  }

  function hasAtLeastOneMeasure(payload) {
    return [payload.peso, payload.pecho, payload.cintura, payload.cadera, payload.brazos, payload.piernas]
      .some((value) => value !== "");
  }

  async function saveMeasurement(event) {
    event.preventDefault();

    const payload = buildPayload();

    if (!payload.fecha) {
      window.GymApp.toast("Selecciona una fecha para guardar el registro.", "error");
      return;
    }

    if (!hasAtLeastOneMeasure(payload)) {
      window.GymApp.toast("Debes ingresar al menos una medida.", "error");
      return;
    }

    try {
      await window.GymApp.api(`/api/client/${session.id}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      window.GymApp.toast("Registro guardado correctamente.", "success");
      await loadMeasurements();
      hydrateFormForDate(dateInput.value);
    } catch (error) {
      window.GymApp.toast(error.message || "No se pudo guardar el registro.", "error");
    }
  }

  async function initialize() {
    setTodayDate();

    try {
      await loadMeasurements();
      hydrateFormForDate(dateInput.value);
    } catch (error) {
      setPrefillHint("No se pudieron cargar las medidas previas en este momento.");
      window.GymApp.toast(error.message || "No se pudo cargar tu progreso.", "error");
    }
  }

  dateInput.addEventListener("change", () => {
    hydrateFormForDate(dateInput.value);
  });

  form.addEventListener("submit", saveMeasurement);
  initialize();
})();
