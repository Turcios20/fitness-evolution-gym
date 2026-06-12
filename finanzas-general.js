"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.GymApp?.guardRoute("admin")) return;

  document.getElementById("btnAdminLogout")?.addEventListener("click", () => {
    window.GymApp.clearSession();
    window.location.href = "/login";
  });

  const MODULE_STYLES = {
    ingresos: { color: "#63e0c5", label: "Ingresos" },
    pagos_personal: { color: "#6bb8ff", label: "Pagos al personal" },
    egresos: { color: "#ff8f7a", label: "Egresos" }
  };

  const state = {
    selectedMonth: getCurrentYearMonth()
  };

  const monthInput = document.getElementById("overviewMonth");

  function getCurrentYearMonth(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

  function fmtMonthLabel(yearMonth, options = { month: "long", year: "numeric" }) {
    const [year, month] = String(yearMonth).split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString("es-HN", options);
  }

  function fmtDate(value) {
    if (!value) return "--";
    const normalized = String(value);
    let parsed;

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      const [year, month, day] = normalized.split("-").map(Number);
      parsed = new Date(year, month - 1, day);
    } else {
      parsed = new Date(normalized);
    }

    if (Number.isNaN(parsed.getTime())) return "--";

    return parsed.toLocaleDateString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function setHeaderState(overview, selectedMonth) {
    const balanceBadge = document.getElementById("overviewBalanceBadge");
    const isPositive = overview.estado_balance === "positivo";

    document.getElementById("overviewPeriodBadge").textContent = `Periodo activo: ${fmtMonthLabel(selectedMonth)}`;
    balanceBadge.textContent = `Balance: ${isPositive ? "estable" : "presionado"} (${overview.cobertura_porcentaje}% de salida sobre ingreso)`;
    balanceBadge.classList.toggle("overview-balance-chip--good", isPositive);
    balanceBadge.classList.toggle("overview-balance-chip--alert", !isPositive);

    document.getElementById("overviewActivityHint").textContent = `Ultimos movimientos de ${fmtMonthLabel(selectedMonth, {
      month: "long",
      year: "numeric"
    })}`;
  }

  function renderStats(overview) {
    document.getElementById("overviewIncomeTotal").textContent = fmtMoney(overview.ingresos.total_periodo);
    document.getElementById("overviewOutflowTotal").textContent = fmtMoney(overview.salidas_totales);
    document.getElementById("overviewNetBalance").textContent = fmtMoney(overview.balance_neto);
    document.getElementById("overviewMovementCount").textContent = overview.movimientos_totales;
  }

  function renderComposition(composition, overview, selectedMonth) {
    const container = document.getElementById("overviewComposition");
    const totalVisible = composition.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    if (!composition.length || totalVisible <= 0) {
      container.innerHTML = '<p class="fin-empty">Todavia no hay datos suficientes para este periodo.</p>';
      return;
    }

    let current = 0;
    const segments = composition.map((item) => {
      const style = MODULE_STYLES[item.key] || MODULE_STYLES.ingresos;
      const start = current;
      const percentage = totalVisible ? (Number(item.subtotal || 0) / totalVisible) * 100 : 0;
      current += percentage;
      return `${style.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });

    if (current < 100) {
      segments.push(`rgba(255,255,255,0.08) ${current.toFixed(2)}% 100%`);
    }

    container.innerHTML = `
      <div class="payroll-donut-layout">
        <div class="payroll-donut" style="background: conic-gradient(${segments.join(", ")});">
          <div class="payroll-donut-center">
            <strong>${fmtMoney(overview.balance_neto)}</strong>
            <span>Neto ${escapeHtml(fmtMonthLabel(selectedMonth, { month: "short", year: "numeric" }))}</span>
          </div>
        </div>
        <div class="overview-composition-list">
          ${composition.map((item) => {
            const style = MODULE_STYLES[item.key] || MODULE_STYLES.ingresos;
            const percentage = totalVisible ? Math.round((Number(item.subtotal || 0) / totalVisible) * 100) : 0;
            return `
              <div class="overview-composition-row">
                <span class="overview-composition-swatch" style="background:${style.color}"></span>
                <div class="overview-composition-copy">
                  <span class="overview-composition-label">${escapeHtml(item.label)}</span>
                  <span class="overview-composition-detail">${percentage}% del flujo del periodo</span>
                </div>
                <span class="overview-composition-amount">${fmtMoney(item.subtotal)}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderHighlights(highlights, overview) {
    const container = document.getElementById("overviewHighlights");
    const topIncome = highlights.topIncomeMethod;
    const topStaff = highlights.topStaffRole;
    const topExpense = highlights.topExpenseCategory;
    const isPositive = overview.estado_balance === "positivo";

    container.innerHTML = `
      <div class="overview-highlight-grid">
        <div class="overview-highlight-card">
          <span class="overview-highlight-kicker">Metodo lider en ingresos</span>
          <span class="overview-highlight-value">${escapeHtml(topIncome?.label || "--")}</span>
          <span class="overview-highlight-amount">${fmtMoney(topIncome?.subtotal || 0)}</span>
          <p class="overview-highlight-text">${topIncome ? `${topIncome.quantity} registro${topIncome.quantity !== 1 ? "s" : ""} dentro del periodo.` : "Sin ingresos suficientes para destacar un metodo."}</p>
        </div>
        <div class="overview-highlight-card">
          <span class="overview-highlight-kicker">Rol con mas pagos internos</span>
          <span class="overview-highlight-value">${escapeHtml(topStaff?.label || "--")}</span>
          <span class="overview-highlight-amount">${fmtMoney(topStaff?.subtotal || 0)}</span>
          <p class="overview-highlight-text">${topStaff ? `${topStaff.quantity} pago${topStaff.quantity !== 1 ? "s" : ""} concentrados en este rol.` : "Aun no hay pagos al personal en el periodo activo."}</p>
        </div>
        <div class="overview-highlight-card overview-highlight-card--alert">
          <span class="overview-highlight-kicker">Categoria de egreso dominante</span>
          <span class="overview-highlight-value">${escapeHtml(topExpense?.label || "--")}</span>
          <span class="overview-highlight-amount">${fmtMoney(topExpense?.subtotal || 0)}</span>
          <p class="overview-highlight-text">${topExpense ? `${topExpense.quantity} movimiento${topExpense.quantity !== 1 ? "s" : ""} dentro del mes seleccionado.` : "Aun no hay egresos destacados para analizar."}</p>
        </div>
        <div class="overview-highlight-card ${isPositive ? "overview-highlight-card--good" : "overview-highlight-card--alert"}">
          <span class="overview-highlight-kicker">Cobertura del periodo</span>
          <span class="overview-highlight-value">${overview.cobertura_porcentaje}%</span>
          <span class="overview-highlight-amount">${fmtMoney(overview.salidas_totales)}</span>
          <p class="overview-highlight-text">${isPositive ? "Las salidas siguen cubiertas por los ingresos del periodo." : "Las salidas estan presionando mas fuerte que los ingresos del periodo."}</p>
        </div>
      </div>
    `;
  }

  function renderModules(overview) {
    const container = document.getElementById("overviewModules");

    container.innerHTML = `
      <div class="overview-module-list">
        <article class="overview-module-card overview-module-card--income">
          <div class="overview-module-header">
            <div>
              <span class="overview-module-kicker">HU-19</span>
              <h3 class="overview-module-title">Ingresos</h3>
            </div>
            <span class="overview-module-pill">Clientes</span>
          </div>
          <div class="overview-module-amount">${fmtMoney(overview.ingresos.total_periodo)}</div>
          <p class="overview-module-caption">Ingresos manuales y de membresias registrados en el periodo activo.</p>
          <div class="overview-module-meta">
            <div class="overview-module-stat">
              <strong>${overview.ingresos.movimientos_periodo}</strong>
              <span>Registros</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.ingresos.promedio_periodo)}</strong>
              <span>Promedio</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.ingresos.total_hoy)}</strong>
              <span>Hoy</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.ingresos.total_historico)}</strong>
              <span>Historico</span>
            </div>
          </div>
          <a href="/finanzas" class="overview-module-link">Abrir ingresos</a>
        </article>

        <article class="overview-module-card overview-module-card--staff">
          <div class="overview-module-header">
            <div>
              <span class="overview-module-kicker">HU-20</span>
              <h3 class="overview-module-title">Pagos al personal</h3>
            </div>
            <span class="overview-module-pill">Interno</span>
          </div>
          <div class="overview-module-amount">${fmtMoney(overview.pagosPersonal.total_periodo)}</div>
          <p class="overview-module-caption">Control de pagos operativos asignados a entrenadores, recepcion y administracion.</p>
          <div class="overview-module-meta">
            <div class="overview-module-stat">
              <strong>${overview.pagosPersonal.movimientos_periodo}</strong>
              <span>Registros</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.pagosPersonal.promedio_periodo)}</strong>
              <span>Promedio</span>
            </div>
            <div class="overview-module-stat">
              <strong>${overview.pagosPersonal.colaboradores_cubiertos}</strong>
              <span>Colaboradores</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.pagosPersonal.total_historico)}</strong>
              <span>Historico</span>
            </div>
          </div>
          <a href="/pagos-personal" class="overview-module-link">Abrir pagos al personal</a>
        </article>

        <article class="overview-module-card overview-module-card--expense">
          <div class="overview-module-header">
            <div>
              <span class="overview-module-kicker">HU-21</span>
              <h3 class="overview-module-title">Egresos</h3>
            </div>
            <span class="overview-module-pill">Gastos</span>
          </div>
          <div class="overview-module-amount">${fmtMoney(overview.egresos.total_periodo)}</div>
          <p class="overview-module-caption">Seguimiento de gastos operativos, imprevistos y consumos de soporte del gimnasio.</p>
          <div class="overview-module-meta">
            <div class="overview-module-stat">
              <strong>${overview.egresos.movimientos_periodo}</strong>
              <span>Registros</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.egresos.promedio_periodo)}</strong>
              <span>Promedio</span>
            </div>
            <div class="overview-module-stat">
              <strong>${overview.egresos.categorias_activas}</strong>
              <span>Categorias</span>
            </div>
            <div class="overview-module-stat">
              <strong>${fmtMoney(overview.egresos.total_historico)}</strong>
              <span>Historico</span>
            </div>
          </div>
          <a href="/egresos" class="overview-module-link">Abrir egresos</a>
        </article>
      </div>
    `;
  }

  function renderTrend(monthly) {
    const container = document.getElementById("overviewTrend");
    const maxValue = Math.max(
      1,
      ...monthly.flatMap((item) => [Number(item.ingresos || 0), Number(item.pagosPersonal || 0), Number(item.egresos || 0)])
    );

    if (!monthly.length || !monthly.some((item) => Number(item.ingresos || 0) > 0 || Number(item.pagosPersonal || 0) > 0 || Number(item.egresos || 0) > 0)) {
      container.innerHTML = '<p class="fin-empty">No existe historial suficiente para mostrar la comparativa mensual.</p>';
      return;
    }

    container.innerHTML = `
      <div class="overview-trend-grid">
        ${monthly.map((item) => {
          const incomeHeight = Math.max((Number(item.ingresos || 0) / maxValue) * 100, Number(item.ingresos || 0) ? 5 : 0);
          const staffHeight = Math.max((Number(item.pagosPersonal || 0) / maxValue) * 100, Number(item.pagosPersonal || 0) ? 5 : 0);
          const expenseHeight = Math.max((Number(item.egresos || 0) / maxValue) * 100, Number(item.egresos || 0) ? 5 : 0);
          const isPositive = Number(item.balanceNeto || 0) >= 0;
          return `
            <div class="overview-trend-col">
              <div class="overview-trend-bars">
                <div class="overview-trend-track">
                  <div class="overview-trend-bar overview-trend-bar--income" style="height:${incomeHeight}%"></div>
                </div>
                <div class="overview-trend-track">
                  <div class="overview-trend-bar overview-trend-bar--staff" style="height:${staffHeight}%"></div>
                </div>
                <div class="overview-trend-track">
                  <div class="overview-trend-bar overview-trend-bar--expense" style="height:${expenseHeight}%"></div>
                </div>
              </div>
              <div class="overview-trend-meta">
                <span class="overview-trend-label">${escapeHtml(fmtMonthLabel(item.mes, { month: "short", year: "2-digit" }))}</span>
                <span class="overview-trend-net ${isPositive ? "overview-trend-net--good" : "overview-trend-net--alert"}">${fmtMoney(item.balanceNeto)}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderRecentActivity(recentActivity) {
    const container = document.getElementById("overviewRecentActivity");

    if (!recentActivity.length) {
      container.innerHTML = '<p class="fin-empty">No hay actividad financiera registrada para el periodo seleccionado.</p>';
      return;
    }

    container.innerHTML = `
      <div class="overview-activity-list">
        ${recentActivity.map((item) => {
          const badgeClass = item.module === "ingresos"
            ? "overview-activity-badge--income"
            : item.module === "pagos_personal"
              ? "overview-activity-badge--staff"
              : "overview-activity-badge--expense";

          return `
            <article class="overview-activity-item">
              <span class="overview-activity-badge ${badgeClass}">${escapeHtml(item.label)}</span>
              <div class="overview-activity-copy">
                <span class="overview-activity-title">${escapeHtml(item.title)}</span>
                <span class="overview-activity-subtitle">${escapeHtml(item.subtitle)}</span>
                <span class="overview-activity-date">${escapeHtml(fmtDate(item.activityDate))}</span>
              </div>
              <span class="overview-activity-amount overview-activity-amount--${item.direction === "in" ? "in" : "out"}">
                ${item.direction === "in" ? "+" : "-"}${fmtMoney(item.amount).replace("$", "")}
              </span>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  async function loadOverview() {
    const month = state.selectedMonth;

    try {
      const data = await GymApp.api(`/api/admin/finance/overview?month=${encodeURIComponent(month)}`);
      setHeaderState(data.overview, data.month || month);
      renderStats(data.overview);
      renderComposition(data.composition || [], data.overview, data.month || month);
      renderHighlights(data.highlights || {}, data.overview);
      renderModules(data.overview);
      renderTrend(data.monthly || []);
      renderRecentActivity(data.recentActivity || []);
    } catch (_error) {
      GymApp.toast("No se pudo cargar la vista general de finanzas", "error");
      document.getElementById("overviewComposition").innerHTML = '<p class="fin-empty">Error cargando composicion financiera.</p>';
      document.getElementById("overviewHighlights").innerHTML = '<p class="fin-empty">Error cargando indicadores.</p>';
      document.getElementById("overviewModules").innerHTML = '<p class="fin-empty">Error cargando resumen operativo.</p>';
      document.getElementById("overviewTrend").innerHTML = '<p class="fin-empty">Error cargando tendencia consolidada.</p>';
      document.getElementById("overviewRecentActivity").innerHTML = '<p class="fin-empty">Error cargando actividad reciente.</p>';
    }
  }

  monthInput.value = state.selectedMonth;
  monthInput.addEventListener("change", async () => {
    state.selectedMonth = monthInput.value || getCurrentYearMonth();
    await loadOverview();
  });

  await loadOverview();
});
