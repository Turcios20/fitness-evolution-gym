"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

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

  let financeMembers = [];
  let financeMembersPromise = null;

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

  async function loadSummary() {
    try {
      const data = await GymApp.api("/api/admin/finance/summary");

      document.getElementById("finIngresosMes").textContent = fmt(data.summary.ingresos_mes);
      document.getElementById("finIngresosHoy").textContent = fmt(data.summary.ingresos_hoy);
      document.getElementById("finIngresosTotal").textContent = fmt(data.summary.ingresos_total);
      document.getElementById("finTotalPagos").textContent = data.summary.total_pagos;

      renderByMethod(data.byMethod);
      renderMonthly(data.monthly);
    } catch (_error) {
      GymApp.toast("Error cargando resumen financiero", "error");
    }
  }

  function renderByMethod(byMethod) {
    const wrap = document.getElementById("finByMethod");
    if (!byMethod || !byMethod.length) {
      wrap.innerHTML = '<p class="fin-empty">Sin ingresos registrados aun.</p>';
      return;
    }

    wrap.innerHTML = byMethod.map((methodRow) => `
      <div class="fin-method-row">
        <span class="fin-method-icon">${METHOD_ICON[methodRow.metodo_pago] || "--"}</span>
        <div class="fin-method-info">
          <span class="fin-method-name">${escapeHtml(methodRow.metodo_pago || "--")}</span>
          <span class="fin-method-count">${methodRow.cantidad} registro${methodRow.cantidad !== 1 ? "s" : ""}</span>
        </div>
        <span class="fin-method-total" style="color:${METHOD_COLOR[methodRow.metodo_pago] || "#e87c2a"}">${fmt(methodRow.subtotal)}</span>
      </div>
    `).join("");
  }

  function renderMonthly(monthly) {
    const wrap = document.getElementById("finMonthly");
    if (!monthly || !monthly.length) {
      wrap.innerHTML = '<p class="fin-empty">Sin datos de los ultimos 6 meses.</p>';
      return;
    }

    const maxVal = Math.max(...monthly.map((item) => Number(item.total)), 1);
    const mesLabel = (ym) => {
      const [year, month] = ym.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("es-HN", {
        month: "short",
        year: "2-digit"
      });
    };

    wrap.innerHTML = `
      <div class="fin-bars">
        ${monthly.map((item) => {
          const pct = Math.max((Number(item.total) / maxVal) * 100, 4);
          return `
            <div class="fin-bar-col">
              <span class="fin-bar-val">${fmt(item.total)}</span>
              <div class="fin-bar" style="height:${pct}%"></div>
              <span class="fin-bar-lbl">${mesLabel(item.mes)}</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  async function loadPayments() {
    const tbody = document.getElementById("finTbody");
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:24px">Cargando...</td></tr>';

    try {
      const data = await GymApp.api("/api/admin/payments");
      if (!data.payments.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:32px">Sin ingresos registrados.</td></tr>';
        return;
      }

      tbody.innerHTML = data.payments.map((payment) => `
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
          <td><strong style="color:var(--orange)">${fmt(payment.monto)}</strong></td>
          <td>
            <span style="color:${METHOD_COLOR[payment.metodo_pago] || "#aaa"}">${METHOD_ICON[payment.metodo_pago] || "--"} ${escapeHtml(payment.metodo_pago || "--")}</span>
          </td>
          <td>${fmtDate(payment.fecha_pago)}</td>
        </tr>
      `).join("");
    } catch (_error) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#e07070;padding:24px">Error cargando ingresos.</td></tr>';
    }
  }

  async function showIncomeModal() {
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
      <h3 class="gm-title">Registrar ingreso</h3>
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
        <h3 class="gm-title">Registrar ingreso</h3>
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
      <h3 class="gm-title">Registrar ingreso</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Cliente</label>
          <select id="gmUserId" class="gm-input">
            ${renderMemberOptions()}
          </select>
          <span id="gmMemberHint" style="display:block;margin-top:6px;color:var(--text-dim);font-size:12px;"></span>
        </div>
        <div class="gm-field">
          <label>Monto ($)</label>
          <input id="gmMonto" class="gm-input" type="number" placeholder="Ej: 35" min="0.01" step="0.01" />
        </div>
        <div class="gm-field">
          <label>Metodo de pago</label>
          <select id="gmMetodo" class="gm-input">
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Transferencia">Transferencia</option>
          </select>
        </div>
        <span class="gm-error" id="gmErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmGuardar">Registrar</button>
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
        await GymApp.api("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(userId),
            monto: Number(amountValue),
            metodoPago: metodo
          })
        });

        overlay.remove();
        GymApp.toast("Ingreso registrado correctamente", "success");
        await Promise.all([loadSummary(), loadPayments()]);
      } catch (error) {
        errEl.textContent = error?.message || "Error al registrar el ingreso.";
      }
    };
  }

  document.getElementById("btnNuevoPago").addEventListener("click", () => {
    showIncomeModal().catch(() => {
      GymApp.toast("No se pudo abrir el registro de ingresos", "error");
    });
  });

  await Promise.all([
    loadSummary(),
    loadPayments(),
    loadFinanceMembers().catch(() => [])
  ]);
});
