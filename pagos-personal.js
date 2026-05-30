"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

  const ROLE_COLORS = {
    Administrador: "#ffbf70",
    Recepcionista: "#5fa8ff",
    Entrenador: "#3fddb0"
  };
  const METHOD_STYLES = {
    Transferencia: { code: "TR", color: "#5fa8ff" },
    Efectivo: { code: "EF", color: "#4cdb8e" },
    Cheque: { code: "CQ", color: "#ffbf70" }
  };
  const CONCEPT_SUGGESTIONS = [
    "Salario base",
    "Bono de rendimiento",
    "Horas extra",
    "Comision",
    "Viaticos"
  ];

  const periodInput = document.getElementById("staffPaymentPeriod");
  const searchInput = document.getElementById("staffHistorySearch");
  const roleFilter = document.getElementById("staffRoleFilter");
  const methodFilter = document.getElementById("staffMethodFilter");
  const newPaymentButton = document.getElementById("btnNewStaffPayment");
  const historyBody = document.getElementById("staffPaymentsBody");

  const state = {
    selectedPeriod: getCurrentYearMonth(),
    staffMembers: [],
    payments: []
  };

  function getCurrentYearMonth(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftYearMonth(yearMonth, delta) {
    const [year, month] = String(yearMonth).split("-").map(Number);
    const nextDate = new Date(year, month - 1 + delta, 1);
    return getCurrentYearMonth(nextDate);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtMoney(value) {
    return "$" + Number(value || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtDateTime(value) {
    if (!value) return "--";
    return new Date(value).toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function fmtPeriodLabel(period, options = { month: "long", year: "numeric" }) {
    const [year, month] = String(period).split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("es-HN", options);
  }

  function getRolePillClass(roleLabel) {
    const normalized = String(roleLabel || "").toLowerCase();
    if (normalized === "administrador") return "payroll-role-pill payroll-role-pill--administrador";
    if (normalized === "recepcionista") return "payroll-role-pill payroll-role-pill--recepcionista";
    return "payroll-role-pill payroll-role-pill--entrenador";
  }

  function getMethodStyle(method) {
    return METHOD_STYLES[method] || { code: "--", color: "#999999" };
  }

  function getInitials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((piece) => piece[0]?.toUpperCase() || "")
      .join("") || "?";
  }

  function getAvatarStyle(roleLabel) {
    return ROLE_COLORS[roleLabel] || "#e87c2a";
  }

  function buildMonthlySeries(monthlyRows) {
    const mapped = new Map((monthlyRows || []).map((item) => [item.mes, Number(item.total || 0)]));
    const items = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const mes = shiftYearMonth(state.selectedPeriod, -offset);
      items.push({
        mes,
        total: mapped.get(mes) || 0
      });
    }

    return items;
  }

  function setSummaryValues(summary, selectedPeriod) {
    document.getElementById("staffPaidPeriod").textContent = fmtMoney(summary.total_pagado_periodo);
    document.getElementById("staffPaidToday").textContent = fmtMoney(summary.pagado_hoy);
    document.getElementById("staffCoveredCount").textContent = summary.colaboradores_pagados_periodo;
    document.getElementById("staffAveragePayment").textContent = fmtMoney(summary.promedio_pago_periodo);
    document.getElementById("staffTotalHistoric").textContent = fmtMoney(summary.total_historico);
    document.getElementById("staffPaidPeriodLabel").textContent = `Pagado en ${fmtPeriodLabel(selectedPeriod, {
      month: "short",
      year: "numeric"
    })}`;
    document.getElementById("staffPeriodBadge").textContent = `Periodo activo: ${fmtPeriodLabel(selectedPeriod)}`;
  }

  function renderRoleChart(byRole, selectedPeriod, totalAmount) {
    const container = document.getElementById("staffRoleChart");

    if (!byRole.length || totalAmount <= 0) {
      container.innerHTML = '<p class="fin-empty">Sin pagos registrados para este periodo.</p>';
      return;
    }

    let current = 0;
    const segments = byRole.map((item) => {
      const start = current;
      const percentage = totalAmount ? (item.subtotal / totalAmount) * 100 : 0;
      current += percentage;
      return `${ROLE_COLORS[item.roleLabel] || "#999999"} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });

    if (current < 100) {
      segments.push(`rgba(255,255,255,0.08) ${current.toFixed(2)}% 100%`);
    }

    container.innerHTML = `
      <div class="payroll-donut-layout">
        <div class="payroll-donut" style="background: conic-gradient(${segments.join(", ")});">
          <div class="payroll-donut-center">
            <strong>${fmtMoney(totalAmount)}</strong>
            <span>Total ${escapeHtml(fmtPeriodLabel(selectedPeriod, { month: "short", year: "numeric" }))}</span>
          </div>
        </div>
        <div class="payroll-legend">
          ${byRole.map((item) => {
            const percentage = totalAmount ? Math.round((item.subtotal / totalAmount) * 100) : 0;
            return `
              <div class="payroll-legend-item">
                <span class="payroll-legend-swatch" style="background:${ROLE_COLORS[item.roleLabel] || "#999999"}"></span>
                <div>
                  <span class="payroll-legend-label">${escapeHtml(item.roleLabel)}</span>
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
    const container = document.getElementById("staffMethodList");

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
    const container = document.getElementById("staffMonthlyTrend");
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
              <span class="payroll-bar-lbl">${escapeHtml(fmtPeriodLabel(item.mes, { month: "short" }))}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTopRecipients(topRecipients) {
    const container = document.getElementById("staffTopRecipients");

    if (!topRecipients.length) {
      container.innerHTML = '<p class="fin-empty">Aun no hay personal con pagos en el periodo activo.</p>';
      return;
    }

    container.innerHTML = `
      <div class="payroll-top-list">
        ${topRecipients.map((item, index) => `
          <div class="payroll-top-item">
            <span class="payroll-top-rank">${index + 1}</span>
            <div>
              <span class="payroll-top-name">${escapeHtml(item.name)}</span>
              <span class="payroll-top-meta">${escapeHtml(item.roleLabel)} &middot; ${item.quantity} pago${item.quantity !== 1 ? "s" : ""} &middot; ultimo ${escapeHtml(fmtDateTime(item.lastPaymentAt))}</span>
            </div>
            <span class="payroll-top-amount">${fmtMoney(item.subtotal)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }

  function getFilteredPayments() {
    const searchTerm = String(searchInput.value || "").trim().toLowerCase();
    const selectedRole = roleFilter.value;
    const selectedMethod = methodFilter.value;

    return state.payments.filter((payment) => {
      const roleMatch = selectedRole === "all" || payment.role === selectedRole;
      const methodMatch = selectedMethod === "all" || payment.method === selectedMethod;
      const haystack = [
        payment.name,
        payment.email,
        payment.concept,
        payment.notes,
        payment.roleLabel
      ].join(" ").toLowerCase();
      const searchMatch = !searchTerm || haystack.includes(searchTerm);
      return roleMatch && methodMatch && searchMatch;
    });
  }

  function renderPaymentsTable() {
    const filteredPayments = getFilteredPayments();

    if (!filteredPayments.length) {
      const message = state.payments.length
        ? "No hay coincidencias con los filtros aplicados."
        : "No hay pagos registrados para este periodo.";
      historyBody.innerHTML = `<tr><td colspan="7" class="payroll-table-empty">${message}</td></tr>`;
      return;
    }

    historyBody.innerHTML = filteredPayments.map((payment) => {
      const methodStyle = getMethodStyle(payment.method);
      return `
        <tr>
          <td>
            <div class="payroll-person-cell">
              <span class="payroll-avatar" style="background:${getAvatarStyle(payment.roleLabel)}">${escapeHtml(getInitials(payment.name))}</span>
              <div>
                <span class="payroll-person-name">${escapeHtml(payment.name)}</span>
                <span class="payroll-person-email">${escapeHtml(payment.email)}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="${getRolePillClass(payment.roleLabel)}">${escapeHtml(payment.roleLabel)}</span>
          </td>
          <td>
            <span class="payroll-person-name">${escapeHtml(payment.concept)}</span>
            ${payment.notes ? `<span class="payroll-cell-note">${escapeHtml(payment.notes)}</span>` : ""}
          </td>
          <td>
            <span class="payroll-method-pill" style="color:${methodStyle.color}">
              <strong>${methodStyle.code}</strong>
              <span>${escapeHtml(payment.method)}</span>
            </span>
          </td>
          <td>${escapeHtml(fmtPeriodLabel(payment.period, { month: "short", year: "numeric" }))}</td>
          <td>${escapeHtml(fmtDateTime(payment.paidAt))}</td>
          <td><span class="payroll-amount">${fmtMoney(payment.amount)}</span></td>
        </tr>
      `;
    }).join("");
  }

  function renderStaffOptions(selectedId = "") {
    if (!state.staffMembers.length) {
      return '<option value="">No hay personal disponible</option>';
    }

    return [
      '<option value="">Selecciona un colaborador</option>',
      ...state.staffMembers.map((member) => `
        <option value="${member.id}" ${String(member.id) === String(selectedId) ? "selected" : ""}>
          ${escapeHtml(member.name)} - ${escapeHtml(member.roleLabel)}
        </option>
      `)
    ].join("");
  }

  async function ensureStaffMembersLoaded() {
    if (state.staffMembers.length) return state.staffMembers;
    const data = await GymApp.api("/api/admin/staff-members");
    state.staffMembers = Array.isArray(data.staff) ? data.staff : [];
    return state.staffMembers;
  }

  async function loadPeriodData() {
    const period = state.selectedPeriod;
    historyBody.innerHTML = '<tr><td colspan="7" class="payroll-table-empty">Cargando pagos del personal...</td></tr>';

    const [summaryData, historyData] = await Promise.all([
      GymApp.api(`/api/admin/staff-payments/summary?period=${encodeURIComponent(period)}`),
      GymApp.api(`/api/admin/staff-payments?period=${encodeURIComponent(period)}`)
    ]);

    state.payments = Array.isArray(historyData.payments) ? historyData.payments : [];

    setSummaryValues(summaryData.summary || {}, summaryData.period || period);
    renderRoleChart(summaryData.byRole || [], summaryData.period || period, Number(summaryData.summary?.total_pagado_periodo || 0));
    renderMethodList(summaryData.byMethod || []);
    renderMonthlyTrend(summaryData.monthly || []);
    renderTopRecipients(summaryData.topRecipients || []);
    renderPaymentsTable();
  }

  async function showPaymentModal() {
    await ensureStaffMembersLoaded();

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

    box.innerHTML = `
      <h3 class="gm-title">Registrar pago al personal</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Colaborador</label>
          <select id="spStaffId" class="gm-input">${renderStaffOptions()}</select>
          <span id="spStaffHint" class="payroll-modal-meta">Selecciona a quien deseas registrar el pago.</span>
        </div>
        <div class="payroll-modal-grid">
          <div class="gm-field">
            <label>Concepto</label>
            <input id="spConcept" class="gm-input" type="text" list="spConceptSuggestions" placeholder="Ej: Salario base">
            <datalist id="spConceptSuggestions">
              ${CONCEPT_SUGGESTIONS.map((item) => `<option value="${escapeHtml(item)}"></option>`).join("")}
            </datalist>
          </div>
          <div class="gm-field">
            <label>Periodo</label>
            <input id="spPeriod" class="gm-input" type="month" value="${escapeHtml(state.selectedPeriod)}">
          </div>
          <div class="gm-field">
            <label>Monto</label>
            <input id="spAmount" class="gm-input" type="number" min="0.01" step="0.01" placeholder="Ej: 320.00">
          </div>
          <div class="gm-field">
            <label>Metodo</label>
            <select id="spMethod" class="gm-input">
              <option value="Transferencia">Transferencia</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div class="gm-field">
          <label>Observaciones</label>
          <textarea id="spNotes" class="gm-input" placeholder="Comentario opcional para dejar evidencia del pago"></textarea>
        </div>
        <span class="gm-error" id="spError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="spCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="spSave">Guardar pago</button>
      </div>
    `;

    const staffSelect = box.querySelector("#spStaffId");
    const conceptInput = box.querySelector("#spConcept");
    const periodField = box.querySelector("#spPeriod");
    const amountField = box.querySelector("#spAmount");
    const methodField = box.querySelector("#spMethod");
    const notesField = box.querySelector("#spNotes");
    const hintElement = box.querySelector("#spStaffHint");
    const errorElement = box.querySelector("#spError");
    const saveButton = box.querySelector("#spSave");

    function syncStaffHint() {
      const selectedId = Number(staffSelect.value);
      const member = state.staffMembers.find((item) => item.id === selectedId);

      if (!member) {
        hintElement.textContent = state.staffMembers.length
          ? "Selecciona a quien deseas registrar el pago."
          : "No hay personal disponible para registrar pagos.";
        saveButton.disabled = !state.staffMembers.length;
        return;
      }

      hintElement.textContent = `${member.email} | ${member.roleLabel}`;
      saveButton.disabled = false;
    }

    syncStaffHint();
    staffSelect.addEventListener("change", syncStaffHint);

    box.querySelector("#spCancel").onclick = () => overlay.remove();
    box.querySelector("#spSave").onclick = async () => {
      const payload = {
        staffId: Number(staffSelect.value),
        concepto: conceptInput.value.trim(),
        periodo: periodField.value.trim(),
        monto: Number(amountField.value),
        metodoPago: methodField.value,
        observaciones: notesField.value.trim()
      };

      if (!payload.staffId || !payload.concepto || !payload.periodo || !Number.isFinite(payload.monto) || payload.monto <= 0) {
        errorElement.textContent = "Completa colaborador, concepto, periodo y un monto valido.";
        return;
      }

      saveButton.disabled = true;
      errorElement.textContent = "";

      try {
        await GymApp.api("/api/admin/staff-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        overlay.remove();
        GymApp.toast("Pago al personal registrado correctamente", "success");
        await loadPeriodData();
      } catch (error) {
        errorElement.textContent = error?.message || "No se pudo registrar el pago.";
        saveButton.disabled = false;
      }
    };
  }

  periodInput.value = state.selectedPeriod;

  periodInput.addEventListener("change", async () => {
    state.selectedPeriod = periodInput.value || getCurrentYearMonth();
    try {
      await loadPeriodData();
    } catch (error) {
      GymApp.toast(error?.message || "No se pudo actualizar el periodo", "error");
    }
  });

  [searchInput, roleFilter, methodFilter].forEach((element) => {
    element.addEventListener("input", renderPaymentsTable);
    element.addEventListener("change", renderPaymentsTable);
  });

  newPaymentButton.addEventListener("click", () => {
    showPaymentModal().catch((error) => {
      GymApp.toast(error?.message || "No se pudo abrir el registro de pagos", "error");
    });
  });

  try {
    await Promise.all([ensureStaffMembersLoaded(), loadPeriodData()]);
  } catch (error) {
    GymApp.toast(error?.message || "No se pudo cargar el modulo de pagos al personal", "error");
    historyBody.innerHTML = '<tr><td colspan="7" class="payroll-table-empty">Error cargando la informacion del modulo.</td></tr>';
  }
});
