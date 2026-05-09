"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

  const fmt = (n) => "$" + Number(n || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const METODO_COLOR = { Efectivo: "#4cdb8e", Tarjeta: "#e87c2a", Transferencia: "#5b9cf6" };
  const METODO_ICON  = { Efectivo: "💵", Tarjeta: "💳", Transferencia: "🔄" };

  async function loadSummary() {
    try {
      const data = await GymApp.api("/api/admin/finance/summary");

      document.getElementById("finIngresosMes").textContent  = fmt(data.summary.ingresos_mes);
      document.getElementById("finIngresosHoy").textContent  = fmt(data.summary.ingresos_hoy);
      document.getElementById("finIngresosTotal").textContent = fmt(data.summary.ingresos_total);
      document.getElementById("finTotalPagos").textContent   = data.summary.total_pagos;

      renderByMethod(data.byMethod);
      renderMonthly(data.monthly);
    } catch (e) {
      GymApp.toast("Error cargando resumen financiero", "error");
    }
  }

  function renderByMethod(byMethod) {
    const wrap = document.getElementById("finByMethod");
    if (!byMethod || !byMethod.length) {
      wrap.innerHTML = `<p class="fin-empty">Sin registros de pagos aún.</p>`;
      return;
    }
    wrap.innerHTML = byMethod.map((m) => `
      <div class="fin-method-row">
        <span class="fin-method-icon">${METODO_ICON[m.metodo_pago] || "💰"}</span>
        <div class="fin-method-info">
          <span class="fin-method-name">${m.metodo_pago || "—"}</span>
          <span class="fin-method-count">${m.cantidad} pago${m.cantidad !== 1 ? "s" : ""}</span>
        </div>
        <span class="fin-method-total" style="color:${METODO_COLOR[m.metodo_pago] || "#e87c2a"}">${fmt(m.subtotal)}</span>
      </div>
    `).join("");
  }

  function renderMonthly(monthly) {
    const wrap = document.getElementById("finMonthly");
    if (!monthly || !monthly.length) {
      wrap.innerHTML = `<p class="fin-empty">Sin datos de los últimos 6 meses.</p>`;
      return;
    }
    const maxVal = Math.max(...monthly.map((m) => Number(m.total)), 1);
    const mesLabel = (ym) => {
      const [y, mo] = ym.split("-");
      return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("es-HN", { month: "short", year: "2-digit" });
    };
    wrap.innerHTML = `
      <div class="fin-bars">
        ${monthly.map((m) => {
          const pct = Math.max((Number(m.total) / maxVal) * 100, 4);
          return `
            <div class="fin-bar-col">
              <span class="fin-bar-val">${fmt(m.total)}</span>
              <div class="fin-bar" style="height:${pct}%"></div>
              <span class="fin-bar-lbl">${mesLabel(m.mes)}</span>
            </div>`;
        }).join("")}
      </div>`;
  }

  async function loadPayments() {
    const tbody = document.getElementById("finTbody");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:24px">Cargando...</td></tr>`;
    try {
      const data = await GymApp.api("/api/admin/payments");
      if (!data.payments.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:32px">Sin pagos registrados.</td></tr>`;
        return;
      }
      tbody.innerHTML = data.payments.map((p) => `
        <tr>
          <td>
            <div class="td-member">
              <div class="td-avatar" style="background:var(--orange)">${(p.nombre_completo || "?")[0].toUpperCase()}</div>
              <div>
                <div class="td-name">${p.nombre_completo}</div>
                <div class="td-email">${p.correo}</div>
              </div>
            </div>
          </td>
          <td><strong style="color:var(--orange)">${fmt(p.monto)}</strong></td>
          <td>
            <span style="color:${METODO_COLOR[p.metodo_pago] || "#aaa"}">${METODO_ICON[p.metodo_pago] || ""} ${p.metodo_pago || "—"}</span>
          </td>
          <td>${fmtDate(p.fecha_pago)}</td>
        </tr>
      `).join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#e07070;padding:24px">Error cargando pagos.</td></tr>`;
    }
  }

  // Modal para registrar pago manual
  document.getElementById("btnNuevoPago").addEventListener("click", () => {
    showPagoModal();
  });

  function showPagoModal() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    box.innerHTML = `
      <h3 class="gm-title">Registrar pago</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>ID de usuario</label>
          <input id="gmUserId" class="gm-input" type="number" placeholder="Ej: 2" min="1" />
        </div>
        <div class="gm-field">
          <label>Monto ($)</label>
          <input id="gmMonto" class="gm-input" type="number" placeholder="Ej: 35" min="0.01" step="0.01" />
        </div>
        <div class="gm-field">
          <label>Método de pago</label>
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

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmGuardar").onclick = async () => {
      const userId = box.querySelector("#gmUserId").value.trim();
      const monto  = box.querySelector("#gmMonto").value.trim();
      const metodo = box.querySelector("#gmMetodo").value;
      const errEl  = box.querySelector("#gmErr");

      if (!userId || !monto || Number(monto) <= 0) {
        errEl.textContent = "ID de usuario y monto válido son requeridos.";
        return;
      }

      try {
        await GymApp.api("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: Number(userId), monto: Number(monto), metodoPago: metodo })
        });
        overlay.remove();
        GymApp.toast("Pago registrado correctamente", "success");
        loadSummary();
        loadPayments();
      } catch (e) {
        errEl.textContent = "Error al registrar el pago.";
      }
    };
  }

  loadSummary();
  loadPayments();
});
