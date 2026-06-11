"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

  document.getElementById("btnAdminLogout")?.addEventListener("click", () => {
    window.GymApp.clearSession();
    window.location.href = "login.html";
  });

  const fmt = (n) => "$" + Number(n || 0).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "--";

  const METHOD_COLOR = {
    Efectivo: "#4cdb8e",
    Tarjeta: "#e87c2a",
    Transferencia: "#5b9cf6"
  };
  const METHOD_ICON = {
    Efectivo: "EF",
    Tarjeta: "TJ",
    Transferencia: "TR"
  };

  function getCurrentYearMonth(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftYearMonth(yearMonth, delta) {
    const [year, month] = String(yearMonth).split("-").map(Number);
    const nextDate = new Date(year, month - 1 + delta, 1);
    return getCurrentYearMonth(nextDate);
  }

  let financeMembers = [];
  let financeMembersPromise = null;
  let financePayments = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMemberLabel(member) {
    const plan = member.membership?.plan || "Sin plan";
    const status = member.membership?.status || "Inactivo";
    return `${member.name} - ${member.email} (${plan}, ${status})`;
  }

  async function loadFinanceMembers(force = false) {
    if (!force && financeMembers.length) {
      return financeMembers;
    }

    if (!force && financeMembersPromise) {
      return financeMembersPromise;
    }

    financeMembersPromise = GymApp.api("/api/admin/members")
      .then((data) => {
        financeMembers = Array.isArray(data.members) ? data.members : [];
        return financeMembers;
      })
      .finally(() => {
        financeMembersPromise = null;
      });

    return financeMembersPromise;
  }

  function renderMemberOptions(selectedId = "") {
    if (!financeMembers.length) {
      return '<option value="">No hay clientes disponibles</option>';
    }

    return [
      '<option value="">Selecciona un cliente</option>',
      ...financeMembers.map((member) => `
        <option value="${member.id}" ${String(member.id) === String(selectedId) ? "selected" : ""}>
          ${escapeHtml(formatMemberLabel(member))}
        </option>
      `)
    ].join("");
  }

  function findPaymentById(paymentId) {
    return financePayments.find((payment) => Number(payment.id_pago) === Number(paymentId)) || null;
  }

  function showInvoiceModal(payment) {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";

    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    box.style.maxWidth = "560px";

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.remove();
      }
    });

    const registrationType = payment.tipo_registro || "Ingreso";
    const invoiceNumber = payment.numero_factura || "Sin numero";
    const concept = payment.concepto || "Sin detalle";
    const plan = payment.plan_nombre || "No aplica";
    const validUntil = payment.vigencia_hasta ? fmtDate(payment.vigencia_hasta) : "--";

    box.innerHTML = `
      <h3 class="gm-title">Factura ${escapeHtml(invoiceNumber)}</h3>
      <div class="gm-form" style="gap:14px;">
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
          <div class="gm-field">
            <label>Cliente</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(payment.nombre_completo || "--")}</div>
          </div>
          <div class="gm-field">
            <label>Correo</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(payment.correo || "--")}</div>
          </div>
          <div class="gm-field">
            <label>Concepto</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(concept)}</div>
          </div>
          <div class="gm-field">
            <label>Tipo</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(registrationType)}</div>
          </div>
          <div class="gm-field">
            <label>Plan</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(plan)}</div>
          </div>
          <div class="gm-field">
            <label>Vigencia</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(validUntil)}</div>
          </div>
          <div class="gm-field">
            <label>Metodo de pago</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(payment.metodo_pago || "--")}</div>
          </div>
          <div class="gm-field">
            <label>Fecha de pago</label>
            <div class="gm-input" style="display:flex;align-items:center;min-height:42px;">${escapeHtml(fmtDate(payment.fecha_pago))}</div>
          </div>
        </div>
        <div class="gm-field">
          <label>Total</label>
          <div class="gm-input" style="display:flex;align-items:center;justify-content:center;min-height:56px;font-size:22px;font-weight:700;color:var(--orange);">
            ${escapeHtml(fmt(payment.monto))}
          </div>
        </div>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-primary" id="gmCloseInvoice">Cerrar</button>
      </div>
    `;

    box.querySelector("#gmCloseInvoice").onclick = () => overlay.remove();
  }

  async function loadSummary() {
    try {
      const data = await GymApp.api("/api/admin/finance/summary");

      document.getElementById("finIngresosMes").textContent = fmt(data.summary.ingresos_mes);
      document.getElementById("finIngresosHoy").textContent = fmt(data.summary.ingresos_hoy);
      document.getElementById("finIngresosTotal").textContent = fmt(data.summary.ingresos_total);
      document.getElementById("finTotalPagos").textContent = data.summary.total_pagos;

      renderIncomeComposition(data.byMethod);
      renderIncomeTrend(data.monthly);
    } catch (_error) {
      GymApp.toast("Error cargando resumen financiero", "error");
    }
  }

  function renderIncomeComposition(byMethod) {
    const wrap = document.getElementById("finComposition");
    const items = Array.isArray(byMethod)
      ? byMethod
        .map((item) => ({
          metodo_pago: item.metodo_pago || "--",
          cantidad: Number(item.cantidad || 0),
          subtotal: Number(item.subtotal || 0)
        }))
        .filter((item) => item.subtotal > 0)
        .sort((a, b) => b.subtotal - a.subtotal)
      : [];

    if (!items.length) {
      wrap.innerHTML = '<p class="fin-empty">Sin ingresos registrados aun.</p>';
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    let current = 0;

    const segments = items.map((item) => {
      const start = current;
      const percentage = totalAmount ? (item.subtotal / totalAmount) * 100 : 0;
      current += percentage;
      return `${METHOD_COLOR[item.metodo_pago] || "#999999"} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });

    if (current < 100) {
      segments.push(`rgba(255,255,255,0.08) ${current.toFixed(2)}% 100%`);
    }

    wrap.innerHTML = `
      <div class="payroll-donut-layout">
        <div class="payroll-donut" style="background: conic-gradient(${segments.join(", ")});">
          <div class="payroll-donut-center">
            <strong>${fmt(totalAmount)}</strong>
            <span>Total historico</span>
          </div>
        </div>
        <div class="payroll-legend">
          ${items.map((item) => {
            const percentage = totalAmount ? Math.round((item.subtotal / totalAmount) * 100) : 0;
            return `
              <div class="payroll-legend-item">
                <span class="payroll-legend-swatch" style="background:${METHOD_COLOR[item.metodo_pago] || "#999999"}"></span>
                <div>
                  <span class="payroll-legend-label">${escapeHtml(item.metodo_pago)}</span>
                  <span class="payroll-legend-detail">${item.cantidad} registro${item.cantidad !== 1 ? "s" : ""} &middot; ${percentage}%</span>
                </div>
                <span class="payroll-legend-amount">${fmt(item.subtotal)}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderIncomeTrend(monthly) {
    const wrap = document.getElementById("finTrend");
    if (!monthly || !monthly.length) {
      wrap.innerHTML = '<p class="fin-empty">Sin datos de los ultimos 6 meses.</p>';
      return;
    }

    const monthMap = new Map((monthly || []).map((item) => [item.mes, Number(item.total || 0)]));
    const currentMonth = getCurrentYearMonth();
    const series = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const mes = shiftYearMonth(currentMonth, -offset);
      series.push({
        mes,
        total: monthMap.get(mes) || 0
      });
    }

    if (!series.some((item) => item.total > 0)) {
      wrap.innerHTML = '<p class="fin-empty">Sin datos de los ultimos 6 meses.</p>';
      return;
    }

    const maxVal = Math.max(...series.map((item) => Number(item.total)), 1);
    const totalAccumulated = series.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const average = totalAccumulated / series.length;
    const bestMonth = series.reduce((best, item) => (item.total > best.total ? item : best), series[0]);

    const mesLabel = (ym) => {
      const [year, month] = ym.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("es-HN", {
        month: "short",
        year: "2-digit"
      });
    };

    const getDeltaInfo = (current, previous) => {
      if (previous === null) {
        return { text: "Base", tone: "flat" };
      }

      if (previous === 0 && current === 0) {
        return { text: "Sin mov", tone: "flat" };
      }

      if (previous === 0 && current > 0) {
        return { text: "Nuevo", tone: "up" };
      }

      const diff = current - previous;
      if (diff === 0) {
        return { text: "Igual", tone: "flat" };
      }

      const percentage = Math.min(Math.round((Math.abs(diff) / previous) * 100), 999);
      return {
        text: `${diff > 0 ? "+" : "-"}${percentage}%`,
        tone: diff > 0 ? "up" : "down"
      };
    };

    wrap.innerHTML = `
      <div class="fin-monthly-summary">
        <div class="fin-monthly-kpi">
          <span class="fin-monthly-kpi-label">Mejor mes</span>
          <strong class="fin-monthly-kpi-value">${fmt(bestMonth.total)}</strong>
          <span class="fin-monthly-kpi-note">${mesLabel(bestMonth.mes)}</span>
        </div>
        <div class="fin-monthly-kpi">
          <span class="fin-monthly-kpi-label">Promedio mensual</span>
          <strong class="fin-monthly-kpi-value">${fmt(average)}</strong>
          <span class="fin-monthly-kpi-note">Ultimos 6 meses</span>
        </div>
        <div class="fin-monthly-kpi">
          <span class="fin-monthly-kpi-label">Acumulado</span>
          <strong class="fin-monthly-kpi-value">${fmt(totalAccumulated)}</strong>
          <span class="fin-monthly-kpi-note">Ventana analizada</span>
        </div>
      </div>
      <div class="fin-bars fin-bars--enhanced">
        ${series.map((item, index) => {
          const pct = item.total > 0 ? Math.max((Number(item.total) / maxVal) * 100, 12) : 0;
          const delta = getDeltaInfo(Number(item.total || 0), index > 0 ? Number(series[index - 1].total || 0) : null);
          const isBestMonth = item.mes === bestMonth.mes && item.total === bestMonth.total;
          return `
            <div class="fin-bar-col">
              <div class="fin-bar-top">
                <span class="fin-bar-val">${fmt(item.total)}</span>
                <span class="fin-bar-delta fin-bar-delta--${delta.tone}">${delta.text}</span>
              </div>
              <div class="fin-bar-track">
                <div class="fin-bar ${isBestMonth ? "fin-bar--peak" : ""}" style="height:${pct}%"></div>
              </div>
              <span class="fin-bar-lbl">${mesLabel(item.mes)}</span>
              <span class="fin-bar-note">${isBestMonth ? "Pico" : "Mes"}</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  async function loadPayments() {
    const tbody = document.getElementById("finTbody");
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:24px">Cargando...</td></tr>';

    try {
      const data = await GymApp.api("/api/admin/payments");
      financePayments = Array.isArray(data.payments) ? data.payments : [];

      if (!financePayments.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:32px">Sin ingresos registrados.</td></tr>';
        return;
      }

      tbody.innerHTML = financePayments.map((payment) => `
        <tr>
          <td>
            <div class="td-member">
              <div class="td-avatar" style="background:var(--orange)">${escapeHtml((payment.nombre_completo || "?")[0].toUpperCase())}</div>
              <div>
                <div class="td-name">${escapeHtml(payment.nombre_completo)}</div>
                <div class="td-email">${escapeHtml(payment.correo)}</div>
              </div>
            </div>
          </td>
          <td>
            <strong style="color:var(--orange)">${fmt(payment.monto)}</strong>
            <div class="td-email">${escapeHtml(payment.concepto || payment.tipo_registro || "Ingreso")}</div>
          </td>
          <td>
            <span style="color:${METHOD_COLOR[payment.metodo_pago] || "#aaa"}">${METHOD_ICON[payment.metodo_pago] || "--"} ${escapeHtml(payment.metodo_pago || "--")}</span>
          </td>
          <td>
            ${fmtDate(payment.fecha_pago)}
            <div class="td-email">${escapeHtml(payment.numero_factura || "Sin factura")}</div>
          </td>
          <td>
            <div class="fin-row-actions">
              ${payment.numero_factura ? `<button class="fin-action-btn" type="button" data-action="invoice" data-id="${payment.id_pago}">Factura</button>` : ""}
              <button class="fin-action-btn" type="button" data-action="edit" data-id="${payment.id_pago}">Editar</button>
              <button class="fin-action-btn fin-action-btn--danger" type="button" data-action="delete" data-id="${payment.id_pago}">Borrar</button>
            </div>
          </td>
        </tr>
      `).join("");
    } catch (_error) {
      financePayments = [];
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#e07070;padding:24px">Error cargando ingresos.</td></tr>';
    }
  }

  async function showIncomeModal(existingPayment = null) {
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

    const isEditing = Boolean(existingPayment);
    const modalTitle = isEditing ? "Editar ingreso" : "Registrar ingreso";
    const submitLabel = isEditing ? "Guardar cambios" : "Registrar";
    const submitMethod = isEditing ? "PUT" : "POST";
    const submitEndpoint = isEditing
      ? `/api/admin/payments/${existingPayment.id_pago}`
      : "/api/admin/payments";

    box.innerHTML = `
      <h3 class="gm-title">${modalTitle}</h3>
      <div class="gm-form">
        <p style="color:var(--text-dim);font-size:13px;margin:0;">Cargando clientes...</p>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmClose">Cancelar</button>
      </div>
    `;

    box.querySelector("#gmClose").onclick = () => overlay.remove();

    try {
      await loadFinanceMembers();
    } catch (_error) {
      box.innerHTML = `
        <h3 class="gm-title">${modalTitle}</h3>
        <div class="gm-form">
          <span class="gm-error">No se pudo cargar la lista de clientes.</span>
        </div>
        <div class="gm-actions">
          <button class="gm-btn gm-btn-cancel" id="gmCloseError">Cerrar</button>
        </div>
      `;
      box.querySelector("#gmCloseError").onclick = () => overlay.remove();
      return;
    }

    box.innerHTML = `
      <h3 class="gm-title">${modalTitle}</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Cliente</label>
          <select id="gmUserId" class="gm-input">
            ${renderMemberOptions(existingPayment?.id_usuario || "")}
          </select>
          <span id="gmMemberHint" style="display:block;margin-top:6px;color:var(--text-dim);font-size:12px;"></span>
        </div>
        <div class="gm-field">
          <label>Monto ($)</label>
          <input id="gmMonto" class="gm-input" type="number" placeholder="Ej: 35" min="0.01" step="0.01" value="${escapeHtml(existingPayment?.monto ?? "")}" />
        </div>
        <div class="gm-field">
          <label>Metodo de pago</label>
          <select id="gmMetodo" class="gm-input">
            <option value="Efectivo" ${existingPayment?.metodo_pago === "Efectivo" ? "selected" : ""}>Efectivo</option>
            <option value="Tarjeta" ${existingPayment?.metodo_pago === "Tarjeta" ? "selected" : ""}>Tarjeta</option>
            <option value="Transferencia" ${existingPayment?.metodo_pago === "Transferencia" ? "selected" : ""}>Transferencia</option>
          </select>
        </div>
        <span class="gm-error" id="gmErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmGuardar">${submitLabel}</button>
      </div>
    `;

    const memberSelect = box.querySelector("#gmUserId");
    const memberHint = box.querySelector("#gmMemberHint");
    const saveButton = box.querySelector("#gmGuardar");

    function syncSelectedMember() {
      const selectedId = Number(memberSelect.value);
      const member = financeMembers.find((item) => item.id === selectedId);

      if (!member) {
        memberHint.textContent = financeMembers.length
          ? "Selecciona un cliente para registrar el ingreso."
          : "No hay clientes disponibles para registrar ingresos.";
        saveButton.disabled = !financeMembers.length;
        return;
      }

      const plan = member.membership?.plan || "Sin plan";
      const status = member.membership?.status || "Inactivo";
      memberHint.textContent = `${member.email} | ${plan} | ${status}`;
      saveButton.disabled = false;
    }

    memberSelect.addEventListener("change", syncSelectedMember);
    syncSelectedMember();

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmGuardar").onclick = async () => {
      const userId = memberSelect.value.trim();
      const amountValue = box.querySelector("#gmMonto").value.trim();
      const metodo = box.querySelector("#gmMetodo").value;
      const errEl = box.querySelector("#gmErr");

      if (!userId || !amountValue || Number(amountValue) <= 0) {
        errEl.textContent = "Selecciona un cliente y escribe un monto valido.";
        return;
      }

      try {
        const response = await GymApp.api(submitEndpoint, {
          method: submitMethod,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(userId),
            monto: Number(amountValue),
            metodoPago: metodo
          })
        });

        overlay.remove();
        const invoiceText = response?.invoiceNumber ? ` | Factura: ${response.invoiceNumber}` : "";
        GymApp.toast(
          `${isEditing ? "Ingreso actualizado correctamente" : "Ingreso registrado correctamente"}${invoiceText}`,
          "success"
        );
        await Promise.all([loadSummary(), loadPayments()]);
      } catch (error) {
        errEl.textContent = error?.message || `Error al ${isEditing ? "actualizar" : "registrar"} el ingreso.`;
      }
    };
  }

  function showDeleteIncomeModal(payment) {
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
      <h3 class="gm-title">Eliminar ingreso</h3>
      <div class="gm-form">
        <p style="color:var(--text);margin:0 0 8px 0;">
          Vas a eliminar el ingreso de <strong>${escapeHtml(payment.nombre_completo)}</strong>.
        </p>
        <p style="color:var(--text-dim);font-size:13px;margin:0;">
          Monto: <strong>${fmt(payment.monto)}</strong> | Metodo: <strong>${escapeHtml(payment.metodo_pago)}</strong> | Fecha: <strong>${fmtDate(payment.fecha_pago)}</strong>
        </p>
        <span class="gm-error" id="gmDeleteErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmDeleteCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmDeleteConfirm">Borrar ingreso</button>
      </div>
    `;

    const errorElement = box.querySelector("#gmDeleteErr");
    const confirmButton = box.querySelector("#gmDeleteConfirm");

    box.querySelector("#gmDeleteCancel").onclick = () => overlay.remove();
    confirmButton.onclick = async () => {
      confirmButton.disabled = true;
      errorElement.textContent = "";

      try {
        await GymApp.api(`/api/admin/payments/${payment.id_pago}`, {
          method: "DELETE"
        });

        overlay.remove();
        GymApp.toast("Ingreso eliminado correctamente", "success");
        await Promise.all([loadSummary(), loadPayments()]);
      } catch (error) {
        errorElement.textContent = error?.message || "No se pudo eliminar el ingreso.";
        confirmButton.disabled = false;
      }
    };
  }

  document.getElementById("btnNuevoPago").addEventListener("click", () => {
    showIncomeModal().catch(() => {
      GymApp.toast("No se pudo abrir el registro de ingresos", "error");
    });
  });

  document.getElementById("finTbody").addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action][data-id]");
    if (!actionButton) return;

    const payment = findPaymentById(actionButton.dataset.id);
    if (!payment) {
      GymApp.toast("No se pudo encontrar el ingreso seleccionado", "error");
      return;
    }

    if (actionButton.dataset.action === "edit") {
      showIncomeModal(payment).catch(() => {
        GymApp.toast("No se pudo abrir la edicion del ingreso", "error");
      });
      return;
    }

    if (actionButton.dataset.action === "invoice") {
      showInvoiceModal(payment);
      return;
    }

    if (actionButton.dataset.action === "delete") {
      showDeleteIncomeModal(payment);
    }
  });

  await Promise.all([
    loadSummary(),
    loadPayments(),
    loadFinanceMembers().catch(() => [])
  ]);
});
