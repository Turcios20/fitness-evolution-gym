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

  // egresos 

   const STORAGE_KEY = "gymapp_egresos";
 
  function getEgresos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch { return []; }
  }
 
  function saveEgresos(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
 
  function getMesKey(fechaStr) {
    // Retorna "YYYY-MM" desde una fecha ISO
    return fechaStr.slice(0, 7);
  }
 
  function mesLabel(ym) {
    const [y, mo] = ym.split("-");
    return new Date(Number(y), Number(mo) - 1, 1)
      .toLocaleDateString("es-HN", { month: "long", year: "numeric" });
  }
 
  function mesLabelCorto(ym) {
    const [y, mo] = ym.split("-");
    return new Date(Number(y), Number(mo) - 1, 1)
      .toLocaleDateString("es-HN", { month: "short", year: "2-digit" });
  }
 
  function getCurrentMesKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
 
  // Llenar select de meses disponibles
  function buildMesFiltro(egresos) {
    const select = document.getElementById("egrMesFiltro");
    const meses = [...new Set(egresos.map(e => getMesKey(e.fecha)))].sort().reverse();
 
    // Incluir mes actual si no está
    const currentMes = getCurrentMesKey();
    if (!meses.includes(currentMes)) meses.unshift(currentMes);
 
    const prevValue = select.value;
    select.innerHTML = meses.map(m =>
      `<option value="${m}">${mesLabel(m)}</option>`
    ).join("");
 
    // Restaurar selección o poner mes actual
    if (prevValue && meses.includes(prevValue)) {
      select.value = prevValue;
    } else {
      select.value = currentMes;
    }
  }
 
  function renderEgresos() {
    const egresos = getEgresos();
    buildMesFiltro(egresos);
 
    const mesSel = document.getElementById("egrMesFiltro").value;
    const delMes = egresos.filter(e => getMesKey(e.fecha) === mesSel);
    const currentMes = getCurrentMesKey();
    const deEsteMes  = egresos.filter(e => getMesKey(e.fecha) === currentMes);
 
    // Stats
    const totalMes  = deEsteMes.reduce((s, e) => s + Number(e.monto), 0);
    const totalAcum = egresos.reduce((s, e) => s + Number(e.monto), 0);
    document.getElementById("egrTotalMes").textContent  = fmt(totalMes);
    document.getElementById("egrTotalAcum").textContent = fmt(totalAcum);
    document.getElementById("egrCantidad").textContent  = deEsteMes.length;
 
    renderEgresosMonthly(egresos);
    renderEgresosByCategoria(deEsteMes);
    renderEgresosTabla(delMes);
  }
 
  function renderEgresosMonthly(egresos) {
    const wrap = document.getElementById("egrMonthly");
    if (!egresos.length) {
      wrap.innerHTML = `<p class="fin-empty">Sin datos aún.</p>`;
      return;
    }
 
    // Agrupar por mes, últimos 6
    const grouped = {};
    egresos.forEach(e => {
      const k = getMesKey(e.fecha);
      grouped[k] = (grouped[k] || 0) + Number(e.monto);
    });
 
    // Generar los últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.push({ k, total: grouped[k] || 0 });
    }
 
    const maxVal = Math.max(...meses.map(m => m.total), 1);
    wrap.innerHTML = `
      <div class="fin-bars">
        ${meses.map(m => {
          const pct = Math.max((m.total / maxVal) * 100, 4);
          return `
            <div class="fin-bar-col">
              <span class="fin-bar-val">${fmt(m.total)}</span>
              <div class="fin-bar egreso-bar" style="height:${pct}%"></div>
              <span class="fin-bar-lbl">${mesLabelCorto(m.k)}</span>
            </div>`;
        }).join("")}
      </div>`;
  }
 
  function renderEgresosByCategoria(delMes) {
    const wrap = document.getElementById("egrByCategoria");
    if (!delMes.length) {
      wrap.innerHTML = `<p class="fin-empty">Sin egresos en este mes.</p>`;
      return;
    }
 
    const grouped = {};
    delMes.forEach(e => {
      grouped[e.categoria] = (grouped[e.categoria] || 0) + Number(e.monto);
    });
 
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    wrap.innerHTML = sorted.map(([cat, total]) => `
      <div class="fin-method-row">
        <span class="fin-method-icon">${CAT_ICON[cat] || "📦"}</span>
        <div class="fin-method-info">
          <span class="fin-method-name">${cat}</span>
          <span class="fin-method-count">${delMes.filter(e => e.categoria === cat).length} registro(s)</span>
        </div>
        <span class="fin-method-total" style="color:#e05555">${fmt(total)}</span>
      </div>
    `).join("");
  }
 
  function renderEgresosTabla(lista) {
    const tbody = document.getElementById("egrTbody");
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:32px">Sin egresos en este periodo.</td></tr>`;
      return;
    }
 
    // Ordenar por fecha más reciente
    const sorted = [...lista].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
 
    tbody.innerHTML = sorted.map(e => `
      <tr>
        <td>
          <div class="td-name">${e.descripcion || "—"}</div>
        </td>
        <td><span class="egr-cat-badge">${CAT_ICON[e.categoria] || ""} ${e.categoria}</span></td>
        <td><strong style="color:#e05555">${fmt(e.monto)}</strong></td>
        <td>${fmtDate(e.fecha)}</td>
        <td>
          <button onclick="window.__deleteEgreso('${e.id}')"
            style="background:none;border:none;color:#e05555;cursor:pointer;font-size:16px"
            title="Eliminar">🗑️</button>
        </td>
      </tr>
    `).join("");
  }
 
  // Eliminar egreso con confirmación
  window.__deleteEgreso = (id) => {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
 
    box.innerHTML = `
      <h3 class="gm-title">¿Eliminar egreso?</h3>
      <p class="gm-body">Esta acción <span style="color:#e05555;">no se puede deshacer</span>.</p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmConfirm">Sí, eliminar</button>
      </div>`;
 
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = () => {
      const list = getEgresos().filter(e => e.id !== id);
      saveEgresos(list);
      overlay.remove();
      GymApp.toast("Egreso eliminado.", "info");
      renderEgresos();
    };
  };
 
  // Modal registrar egreso
  document.getElementById("btnNuevoEgreso").addEventListener("click", () => showEgresoModal());
 
  function showEgresoModal() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
 
    const today = new Date().toISOString().slice(0, 10);
 
    box.innerHTML = `
      <h3 class="gm-title" style="color:#e05555">Registrar egreso</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Descripción</label>
          <input id="egrDesc" class="gm-input" type="text" placeholder="Ej: Pago de electricidad" />
        </div>
        <div class="gm-field">
          <label>Categoría</label>
          <select id="egrCat" class="gm-input">
            ${CATEGORIAS.map(c => `<option value="${c}">${CAT_ICON[c] || ""} ${c}</option>`).join("")}
          </select>
        </div>
        <div class="gm-field">
          <label>Monto ($)</label>
          <input id="egrMonto" class="gm-input" type="number" placeholder="Ej: 120.00" min="0.01" step="0.01" />
        </div>
        <div class="gm-field">
          <label>Fecha</label>
          <input id="egrFecha" class="gm-input" type="date" value="${today}" />
        </div>
        <span class="gm-error" id="egrErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="egrCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="egrGuardar">Registrar egreso</button>
      </div>
    `;
 
    box.querySelector("#egrCancel").onclick = () => overlay.remove();
    box.querySelector("#egrGuardar").onclick = () => {
      const desc   = box.querySelector("#egrDesc").value.trim();
      const cat    = box.querySelector("#egrCat").value;
      const monto  = box.querySelector("#egrMonto").value.trim();
      const fecha  = box.querySelector("#egrFecha").value;
      const errEl  = box.querySelector("#egrErr");
 
      if (!desc)               { errEl.textContent = "La descripción es obligatoria."; return; }
      if (!monto || Number(monto) <= 0) { errEl.textContent = "Ingresa un monto válido."; return; }
      if (!fecha)              { errEl.textContent = "Selecciona una fecha."; return; }
 
      const nuevo = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        descripcion: desc,
        categoria: cat,
        monto: Number(monto),
        fecha
      };
 
      const list = getEgresos();
      list.push(nuevo);
      saveEgresos(list);
 
      overlay.remove();
      GymApp.toast("Egreso registrado correctamente.", "success");
      renderEgresos();
    };
  }
 
  // Refrescar tabla cuando cambia el mes en el filtro
  document.getElementById("egrMesFiltro").addEventListener("change", () => {
    const egresos = getEgresos();
    const mesSel  = document.getElementById("egrMesFiltro").value;
    const delMes  = egresos.filter(e => getMesKey(e.fecha) === mesSel);
    renderEgresosByCategoria(delMes);
    renderEgresosTabla(delMes);
  });
 

  loadSummary();
  loadPayments();
});
