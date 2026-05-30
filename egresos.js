"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

  const CATEGORY_STYLES = {
    Servicios: { code: "SV", color: "#ff9a76", bg: "rgba(255, 154, 118, 0.12)", border: "rgba(255, 154, 118, 0.24)" },
    Mantenimiento: { code: "MT", color: "#ffd166", bg: "rgba(255, 209, 102, 0.12)", border: "rgba(255, 209, 102, 0.24)" },
    Equipamiento: { code: "EQ", color: "#6bb8ff", bg: "rgba(107, 184, 255, 0.12)", border: "rgba(107, 184, 255, 0.24)" },
    Suministros: { code: "SM", color: "#63e0c5", bg: "rgba(99, 224, 197, 0.12)", border: "rgba(99, 224, 197, 0.24)" },
    Marketing: { code: "MK", color: "#d8a8ff", bg: "rgba(216, 168, 255, 0.12)", border: "rgba(216, 168, 255, 0.24)" },
    Operacion: { code: "OP", color: "#ff8c5a", bg: "rgba(255, 140, 90, 0.12)", border: "rgba(255, 140, 90, 0.24)" },
    Imprevistos: { code: "IM", color: "#ff6b6b", bg: "rgba(255, 107, 107, 0.12)", border: "rgba(255, 107, 107, 0.24)" },
    Otros: { code: "OT", color: "#b4b4b4", bg: "rgba(180, 180, 180, 0.12)", border: "rgba(180, 180, 180, 0.24)" }
  };
  const METHOD_STYLES = {
    Transferencia: { code: "TR", color: "#6bb8ff" },
    Efectivo: { code: "EF", color: "#63e0c5" },
    Tarjeta: { code: "TJ", color: "#ff9a76" },
    Cheque: { code: "CQ", color: "#ffd166" }
  };
  const CATEGORY_OPTIONS = Object.keys(CATEGORY_STYLES);

  const monthInput = document.getElementById("expenseMonth");
  const searchInput = document.getElementById("expenseSearch");
  const categoryFilter = document.getElementById("expenseCategoryFilter");
  const methodFilter = document.getElementById("expenseMethodFilter");
  const newExpenseButton = document.getElementById("btnNewExpense");
  const historyBody = document.getElementById("expenseHistoryBody");

  const state = {
    selectedMonth: getCurrentYearMonth(),
    expenses: []
  };

  function getCurrentYearMonth(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftYearMonth(yearMonth, delta) {
    const [year, month] = String(yearMonth).split("-").map(Number);
    const nextDate = new Date(year, month - 1 + delta, 1);
    return getCurrentYearMonth(nextDate);
  }

  function parseDateOnly(value) {
    const normalized = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const [year, month, day] = normalized.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(normalized);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clipText(value, maxLength = 64) {
    const normalized = String(value || "").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1)}...`;
  }

  function fmtMoney(value) {
    return "$" + Number(value || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtDate(value) {
    if (!value) return "--";
    const parsed = parseDateOnly(value);
    if (Number.isNaN(parsed.getTime())) return "--";
    return parsed.toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function fmtMonthLabel(yearMonth, options = { month: "long", year: "numeric" }) {
    const [year, month] = String(yearMonth).split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("es-HN", options);
  }

  function getCategoryStyle(category) {
    return CATEGORY_STYLES[category] || CATEGORY_STYLES.Otros;
  }

  function getMethodStyle(method) {
    return METHOD_STYLES[method] || { code: "--", color: "#9f9f9f" };
  }

  function buildMonthlySeries(monthlyRows) {
    const mapped = new Map((monthlyRows || []).map((item) => [item.mes, Number(item.total || 0)]));
    const items = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const mes = shiftYearMonth(state.selectedMonth, -offset);
      items.push({
        mes,
        total: mapped.get(mes) || 0
      });
    }

    return items;
  }

  function setSummaryValues(summary, selectedMonth) {
    document.getElementById("expenseTotalPeriod").textContent = fmtMoney(summary.total_periodo);
    document.getElementById("expenseCountPeriod").textContent = summary.movimientos_periodo;
    document.getElementById("expenseAverage").textContent = fmtMoney(summary.promedio_periodo);
    document.getElementById("expenseHistoricTotal").textContent = fmtMoney(summary.total_historico);
    document.getElementById("expensePeriodBadge").textContent = `Periodo activo: ${fmtMonthLabel(selectedMonth)}`;
    document.getElementById("expenseCategoryBadge").textContent = `Categorias activas: ${summary.categorias_activas}`;
    document.getElementById("expenseTotalPeriodLabel").textContent = `Total ${fmtMonthLabel(selectedMonth, {
      month: "short",
      year: "numeric"
    })}`;
  }

  function renderCategoryChart(byCategory, selectedMonth, totalAmount) {
    const container = document.getElementById("expenseCategoryChart");

    if (!byCategory.length || totalAmount <= 0) {
      container.innerHTML = '<p class="fin-empty">Sin egresos registrados para este periodo.</p>';
      return;
    }

    let current = 0;
    const segments = byCategory.map((item) => {
      const categoryStyle = getCategoryStyle(item.category);
      const start = current;
      const percentage = totalAmount ? (item.subtotal / totalAmount) * 100 : 0;
      current += percentage;
      return `${categoryStyle.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });

    if (current < 100) {
      segments.push(`rgba(255,255,255,0.08) ${current.toFixed(2)}% 100%`);
    }

    container.innerHTML = `
      <div class="payroll-donut-layout">
        <div class="payroll-donut" style="background: conic-gradient(${segments.join(", ")});">
          <div class="payroll-donut-center">
            <strong>${fmtMoney(totalAmount)}</strong>
            <span>Total ${escapeHtml(fmtMonthLabel(selectedMonth, { month: "short", year: "numeric" }))}</span>
          </div>
        </div>
        <div class="payroll-legend">
          ${byCategory.map((item) => {
            const categoryStyle = getCategoryStyle(item.category);
            const percentage = totalAmount ? Math.round((item.subtotal / totalAmount) * 100) : 0;
            return `
              <div class="payroll-legend-item">
                <span class="payroll-legend-swatch" style="background:${categoryStyle.color}"></span>
                <div>
                  <span class="payroll-legend-label">${escapeHtml(item.category)}</span>
                  <span class="payroll-legend-detail">${item.quantity} registro${item.quantity !== 1 ? "s" : ""} &middot; ${percentage}%</span>
                </div>
                <span class="payroll-legend-amount">${fmtMoney(item.subtotal)}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderMethodList(byMethod) {
    const container = document.getElementById("expenseMethodList");

    if (!byMethod.length) {
      container.innerHTML = '<p class="fin-empty">Todavia no hay metodos registrados en este periodo.</p>';
      return;
    }

    container.innerHTML = `
      <div class="payroll-method-list">
        ${byMethod.map((item) => {
          const methodStyle = getMethodStyle(item.method);
          return `
            <div class="payroll-method-row">
              <span class="payroll-method-badge" style="background:${methodStyle.color};">${methodStyle.code}</span>
              <div>
                <span class="payroll-method-name">${escapeHtml(item.method)}</span>
                <span class="payroll-method-subtitle">${item.quantity} movimiento${item.quantity !== 1 ? "s" : ""}</span>
              </div>
              <span class="payroll-method-amount">${fmtMoney(item.subtotal)}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderMonthlyTrend(monthlyRows) {
    const container = document.getElementById("expenseMonthlyTrend");
    const series = buildMonthlySeries(monthlyRows);
    const maxValue = Math.max(...series.map((item) => item.total), 1);

    if (!series.some((item) => item.total > 0)) {
      container.innerHTML = '<p class="fin-empty">No existe historial suficiente para mostrar tendencia.</p>';
      return;
    }

    container.innerHTML = `
      <div class="payroll-bars">
        ${series.map((item) => {
          const height = Math.max((item.total / maxValue) * 100, 5);
          return `
            <div class="payroll-bar-col">
              <span class="payroll-bar-val">${fmtMoney(item.total)}</span>
              <div class="payroll-bar-track">
                <div class="payroll-bar" style="height:${height}%"></div>
              </div>
              <span class="payroll-bar-lbl">${escapeHtml(fmtMonthLabel(item.mes, { month: "short" }))}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTopExpenses(topExpenses) {
    const container = document.getElementById("expenseTopList");

    if (!topExpenses.length) {
      container.innerHTML = '<p class="fin-empty">Aun no existen movimientos destacados en el periodo activo.</p>';
      return;
    }

    container.innerHTML = `
      <div class="payroll-top-list">
        ${topExpenses.map((expense, index) => `
          <div class="payroll-top-item">
            <span class="payroll-top-rank">${index + 1}</span>
            <div>
              <span class="payroll-top-name">${escapeHtml(expense.concept)}</span>
              <span class="payroll-top-meta">${escapeHtml(expense.category)} &middot; ${escapeHtml(expense.method)} &middot; ${escapeHtml(fmtDate(expense.expenseDate))}${expense.notes ? ` &middot; ${escapeHtml(clipText(expense.notes, 46))}` : ""}</span>
            </div>
            <span class="payroll-top-amount">${fmtMoney(expense.amount)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function getFilteredExpenses() {
    const searchTerm = String(searchInput.value || "").trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedMethod = methodFilter.value;

    return state.expenses.filter((expense) => {
      const categoryMatch = selectedCategory === "all" || expense.category === selectedCategory;
      const methodMatch = selectedMethod === "all" || expense.method === selectedMethod;
      const haystack = [
        expense.concept,
        expense.category,
        expense.method,
        expense.notes,
        expense.expenseDate
      ].join(" ").toLowerCase();
      const searchMatch = !searchTerm || haystack.includes(searchTerm);
      return categoryMatch && methodMatch && searchMatch;
    });
  }

  function findExpenseById(expenseId) {
    return state.expenses.find((expense) => Number(expense.id) === Number(expenseId)) || null;
  }

  function renderExpenseTable() {
    const filteredExpenses = getFilteredExpenses();

    if (!filteredExpenses.length) {
      const message = state.expenses.length
        ? "No hay coincidencias con los filtros aplicados."
        : "No hay egresos registrados para este periodo.";
      historyBody.innerHTML = `<tr><td colspan="7" class="payroll-table-empty">${message}</td></tr>`;
      return;
    }

    historyBody.innerHTML = filteredExpenses.map((expense) => {
      const categoryStyle = getCategoryStyle(expense.category);
      const methodStyle = getMethodStyle(expense.method);
      return `
        <tr>
          <td>
            <span class="payroll-person-name">${escapeHtml(expense.concept)}</span>
            <span class="payroll-cell-note">Registrado el ${escapeHtml(fmtDate(expense.expenseDate))}</span>
          </td>
          <td>
            <span
              class="expense-category-pill"
              style="--pill-color:${categoryStyle.color};--pill-bg:${categoryStyle.bg};--pill-border:${categoryStyle.border};"
            >
              <strong>${categoryStyle.code}</strong>
              <span>${escapeHtml(expense.category)}</span>
            </span>
          </td>
          <td>
            <span class="payroll-method-pill" style="color:${methodStyle.color}">
              <strong>${methodStyle.code}</strong>
              <span>${escapeHtml(expense.method)}</span>
            </span>
          </td>
          <td>${escapeHtml(fmtDate(expense.expenseDate))}</td>
          <td><span class="payroll-amount">${fmtMoney(expense.amount)}</span></td>
          <td>${expense.notes ? escapeHtml(expense.notes) : '<span class="payroll-cell-note">Sin observaciones</span>'}</td>
          <td>
            <div class="finance-row-actions">
              <button class="finance-action-btn" type="button" data-action="edit" data-id="${expense.id}">Editar</button>
              <button class="finance-action-btn finance-action-btn--danger" type="button" data-action="delete" data-id="${expense.id}">Borrar</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadMonthData() {
    const month = state.selectedMonth;
    historyBody.innerHTML = '<tr><td colspan="7" class="payroll-table-empty">Cargando egresos financieros...</td></tr>';

    const [summaryData, historyData] = await Promise.all([
      GymApp.api(`/api/admin/expenses/summary?month=${encodeURIComponent(month)}`),
      GymApp.api(`/api/admin/expenses?month=${encodeURIComponent(month)}`)
    ]);

    state.expenses = Array.isArray(historyData.expenses) ? historyData.expenses : [];

    setSummaryValues(summaryData.summary || {}, summaryData.month || month);
    renderCategoryChart(summaryData.byCategory || [], summaryData.month || month, Number(summaryData.summary?.total_periodo || 0));
    renderMethodList(summaryData.byMethod || []);
    renderMonthlyTrend(summaryData.monthly || []);
    renderTopExpenses(summaryData.topExpenses || []);
    renderExpenseTable();
  }

  function renderCategoryOptions(selectedCategory = "") {
    return [
      '<option value="">Selecciona una categoria</option>',
      ...CATEGORY_OPTIONS.map((category) => `<option value="${category}" ${selectedCategory === category ? "selected" : ""}>${category}</option>`)
    ].join("");
  }

  async function showExpenseModal(existingExpense = null) {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";

    const box = document.createElement("div");
    box.className = "gym-modal-box payroll-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const isEditing = Boolean(existingExpense);
    const modalTitle = isEditing ? "Editar egreso" : "Registrar egreso";
    const submitLabel = isEditing ? "Guardar cambios" : "Guardar egreso";
    const submitMethod = isEditing ? "PUT" : "POST";
    const submitEndpoint = isEditing
      ? `/api/admin/expenses/${existingExpense.id}`
      : "/api/admin/expenses";

    box.innerHTML = `
      <h3 class="gm-title">${modalTitle}</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Concepto</label>
          <input id="expenseConcept" class="gm-input" type="text" maxlength="120" placeholder="Ej: Pago de energia electrica" value="${escapeHtml(existingExpense?.concept || "")}">
        </div>
        <div class="payroll-modal-grid">
          <div class="gm-field">
            <label>Categoria</label>
            <select id="expenseCategory" class="gm-input">
              ${renderCategoryOptions(existingExpense?.category || "")}
            </select>
          </div>
          <div class="gm-field">
            <label>Fecha</label>
            <input id="expenseDate" class="gm-input" type="date" value="${escapeHtml(existingExpense?.expenseDate || `${state.selectedMonth}-01`)}">
          </div>
          <div class="gm-field">
            <label>Monto</label>
            <input id="expenseAmount" class="gm-input" type="number" min="0.01" step="0.01" placeholder="Ej: 145.50" value="${escapeHtml(existingExpense?.amount ?? "")}">
          </div>
          <div class="gm-field">
            <label>Metodo</label>
            <select id="expenseMethod" class="gm-input">
              <option value="Transferencia" ${existingExpense?.method === "Transferencia" ? "selected" : ""}>Transferencia</option>
              <option value="Efectivo" ${existingExpense?.method === "Efectivo" ? "selected" : ""}>Efectivo</option>
              <option value="Tarjeta" ${existingExpense?.method === "Tarjeta" ? "selected" : ""}>Tarjeta</option>
              <option value="Cheque" ${existingExpense?.method === "Cheque" ? "selected" : ""}>Cheque</option>
            </select>
          </div>
        </div>
        <div class="gm-field">
          <label>Observaciones</label>
          <textarea id="expenseNotes" class="gm-input" maxlength="255" placeholder="Comentario opcional para respaldar el egreso">${escapeHtml(existingExpense?.notes || "")}</textarea>
        </div>
        <span class="gm-error" id="expenseError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="expenseCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="expenseSave">${submitLabel}</button>
      </div>
    `;

    const conceptField = box.querySelector("#expenseConcept");
    const categoryField = box.querySelector("#expenseCategory");
    const dateField = box.querySelector("#expenseDate");
    const amountField = box.querySelector("#expenseAmount");
    const methodField = box.querySelector("#expenseMethod");
    const notesField = box.querySelector("#expenseNotes");
    const errorElement = box.querySelector("#expenseError");
    const saveButton = box.querySelector("#expenseSave");

    box.querySelector("#expenseCancel").onclick = () => overlay.remove();
    box.querySelector("#expenseSave").onclick = async () => {
      const payload = {
        concepto: conceptField.value.trim(),
        categoria: categoryField.value,
        fechaEgreso: dateField.value.trim(),
        monto: Number(amountField.value),
        metodoPago: methodField.value,
        observaciones: notesField.value.trim()
      };

      if (
        !payload.concepto ||
        payload.concepto.length < 3 ||
        !payload.categoria ||
        !payload.fechaEgreso ||
        !Number.isFinite(payload.monto) ||
        payload.monto <= 0
      ) {
        errorElement.textContent = "Completa concepto, categoria, fecha y un monto valido.";
        return;
      }

      saveButton.disabled = true;
      errorElement.textContent = "";

      try {
        await GymApp.api(submitEndpoint, {
          method: submitMethod,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        overlay.remove();
        GymApp.toast(isEditing ? "Egreso actualizado correctamente" : "Egreso registrado correctamente", "success");
        await loadMonthData();
      } catch (error) {
        errorElement.textContent = error?.message || `No se pudo ${isEditing ? "actualizar" : "registrar"} el egreso.`;
        saveButton.disabled = false;
      }
    };
  }

  function showDeleteExpenseModal(expense) {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";

    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    box.innerHTML = `
      <h3 class="gm-title">Eliminar egreso</h3>
      <div class="gm-form">
        <p style="color:var(--text);margin:0 0 8px 0;">
          Vas a eliminar el egreso <strong>${escapeHtml(expense.concept)}</strong>.
        </p>
        <p style="color:var(--text-dim);font-size:13px;margin:0;">
          Categoria: <strong>${escapeHtml(expense.category)}</strong> | Metodo: <strong>${escapeHtml(expense.method)}</strong> | Monto: <strong>${fmtMoney(expense.amount)}</strong>
        </p>
        <span class="gm-error" id="expenseDeleteError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="expenseDeleteCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="expenseDeleteConfirm">Borrar egreso</button>
      </div>
    `;

    const errorElement = box.querySelector("#expenseDeleteError");
    const confirmButton = box.querySelector("#expenseDeleteConfirm");

    box.querySelector("#expenseDeleteCancel").onclick = () => overlay.remove();
    confirmButton.onclick = async () => {
      confirmButton.disabled = true;
      errorElement.textContent = "";

      try {
        await GymApp.api(`/api/admin/expenses/${expense.id}`, {
          method: "DELETE"
        });

        overlay.remove();
        GymApp.toast("Egreso eliminado correctamente", "success");
        await loadMonthData();
      } catch (error) {
        errorElement.textContent = error?.message || "No se pudo eliminar el egreso.";
        confirmButton.disabled = false;
      }
    };
  }

  monthInput.value = state.selectedMonth;

  monthInput.addEventListener("change", async () => {
    state.selectedMonth = monthInput.value || getCurrentYearMonth();
    try {
      await loadMonthData();
    } catch (error) {
      GymApp.toast(error?.message || "No se pudo actualizar el periodo", "error");
    }
  });

  [searchInput, categoryFilter, methodFilter].forEach((element) => {
    element.addEventListener("input", renderExpenseTable);
    element.addEventListener("change", renderExpenseTable);
  });

  newExpenseButton.addEventListener("click", () => {
    showExpenseModal().catch((error) => {
      GymApp.toast(error?.message || "No se pudo abrir el registro de egresos", "error");
    });
  });

  historyBody.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action][data-id]");
    if (!actionButton) return;

    const expense = findExpenseById(actionButton.dataset.id);
    if (!expense) {
      GymApp.toast("No se pudo encontrar el egreso seleccionado", "error");
      return;
    }

    if (actionButton.dataset.action === "edit") {
      showExpenseModal(expense).catch((error) => {
        GymApp.toast(error?.message || "No se pudo abrir la edicion del egreso", "error");
      });
      return;
    }

    if (actionButton.dataset.action === "delete") {
      showDeleteExpenseModal(expense);
    }
  });

  try {
    await loadMonthData();
  } catch (error) {
    GymApp.toast(error?.message || "No se pudo cargar el modulo de egresos", "error");
    historyBody.innerHTML = '<tr><td colspan="7" class="payroll-table-empty">Error cargando la informacion del modulo.</td></tr>';
  }
});
