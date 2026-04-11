"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ── Solo admins ──────────────────────────────────────────────
  if (!GymApp.guardRoute("admin")) return;

  // ── Estado de la página ──────────────────────────────────────
  let allMembers   = [];     // todos los miembros del backend
  let filtered     = [];     // después de buscar + tab
  let sortCol      = "name"; // columna activa de ordenamiento
  let sortAsc      = true;
  let activeTab    = "todos";
  let currentPage  = 1;
  const PAGE_SIZE  = 12;

  // ── Referencias al DOM ───────────────────────────────────────
  const tbody      = document.getElementById("mbTbody");
  const searchEl   = document.getElementById("mbSearch");
  const pageInfo   = document.getElementById("mbPageInfo");
  const pageBtns   = document.getElementById("mbPageBtns");
  const tabs       = document.querySelectorAll(".mb-tab");
  const ths        = document.querySelectorAll("thead th[data-col]");

  // Stats
  const stTotal    = document.getElementById("stTotal");
  const stActivo   = document.getElementById("stActivo");
  const stPorVencer= document.getElementById("stPorVencer");
  const stVencido  = document.getElementById("stVencido");

  // ── Helpers ──────────────────────────────────────────────────
  function getInitials(name) {
    return (name || "?").trim().split(/\s+/).slice(0,2)
      .map(w => w[0].toUpperCase()).join("");
  }

  function avatarColor(initials) {
    const p = ["#c45e1a","#7b2d8b","#1a6fbf","#1a8f5a","#8a4f0d","#3d5a9e","#8b1a1a","#b0390e"];
    return p[(initials.charCodeAt(0)+(initials.charCodeAt(1)||0)) % p.length];
  }

  function memberStatus(m) {
    const status = m.membership?.status || "Activo";
    const days   = m.membership?.daysRemaining ?? 0;
    if (status === "Inactivo") return "inactivo";
    if (days <= 0)  return "vencido";
    if (days <= 7)  return "porvencer";
    return "activo";
  }

  function badgeHtml(m) {
    const status = m.membership?.status || "Activo";
    const days   = m.membership?.daysRemaining ?? 0;
    if (status === "Inactivo")
      return '<span class="member-badge badge-inactive">Inactivo</span>';
    if (days <= 0)
      return '<span class="member-badge badge-expired">Vencido</span>';
    if (days <= 7)
      return `<span class="member-badge badge-danger">${days} días</span>`;
    if (days <= 15)
      return `<span class="member-badge badge-warn">${days} días</span>`;
    return `<span class="member-badge badge-ok">${days} días</span>`;
  }

  // ── Sistema de modales (igual que admin.js) ──────────────────
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove(); });
    return { overlay, box };
  }

  function showDeleteModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${avatarColor(initials)};">${initials}</div>
      <h3 class="gm-title">¿Eliminar miembro?</h3>
      <p class="gm-body">Vas a eliminar a <strong>${member.name}</strong>.<br>
      Esta acción <span style="color:#e05555;">no se puede deshacer</span>.</p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmConfirm">Sí, eliminar</button>
      </div>`;
    box.querySelector("#gmCancel").onclick  = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = () => { overlay.remove(); onConfirm(); };
  }

  const PLANES = [
    { label:"Mensual",    days:30,  price:"$35",  active:true  },
    { label:"Trimestral", days:90,  price:"$90",  active:false },
    { label:"Semestral",  days:180, price:"$160", active:false },
    { label:"Anual",      days:365, price:"$300", active:false },
  ];

  function showRenewModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${avatarColor(initials)};">${initials}</div>
      <h3 class="gm-title">Renovar membresía</h3>
      <p class="gm-body">Selecciona el plan para <strong>${member.name}</strong>:</p>
      <div class="gm-plans-grid">
        ${PLANES.map(p => `
          <button class="gm-plan-card ${p.active?"":"gm-plan-disabled"}"
            data-days="${p.days}" data-plan="${p.label}" ${p.active?"":"disabled"}>
            <span class="gm-plan-name">${p.label}</span>
            <span class="gm-plan-price">${p.price}</span>
            <span class="gm-plan-days">${p.days} días</span>
            ${p.active?"":"<span class='gm-plan-soon'>Próximamente</span>"}
          </button>`).join("")}
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
      </div>`;
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelectorAll(".gm-plan-card:not([disabled])").forEach(card => {
      card.onclick = () => { overlay.remove(); onConfirm(Number(card.dataset.days), card.dataset.plan); };
    });
  }

  function showEditModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const cp = member.membership?.plan   || "Mensual";
    const cs = member.membership?.status || "Activo";
    box.innerHTML = `
      <h3 class="gm-title">Editar miembro</h3>
      <div class="gm-form">
        <div class="gm-field"><label>Nombre completo</label>
          <input id="gmName"  class="gm-input" type="text"  value="${member.name}"></div>
        <div class="gm-field"><label>Correo electrónico</label>
          <input id="gmEmail" class="gm-input" type="email" value="${member.email}"></div>
        <div class="gm-field"><label>Plan</label>
          <select id="gmPlan" class="gm-input">
            ${["Mensual","Trimestral","Semestral","Anual"].map(p =>
              `<option value="${p}" ${p===cp?"selected":""}>${p}</option>`).join("")}
          </select></div>
        <div class="gm-field"><label>Estado</label>
          <select id="gmStatus" class="gm-input">
            ${["Activo","Inactivo"].map(s =>
              `<option value="${s}" ${s===cs?"selected":""}>${s}</option>`).join("")}
          </select></div>
        <span class="gm-error" id="gmError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel"  id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSave">Guardar cambios</button>
      </div>`;
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSave").onclick   = () => {
      const name   = box.querySelector("#gmName").value.trim();
      const email  = box.querySelector("#gmEmail").value.trim();
      const plan   = box.querySelector("#gmPlan").value;
      const status = box.querySelector("#gmStatus").value;
      const errEl  = box.querySelector("#gmError");
      if (!name) { errEl.textContent = "El nombre es obligatorio."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = "Correo inválido."; return; }
      overlay.remove();
      onConfirm({ name, email, plan, status });
    };
  }

  // ── Estadísticas superiores ──────────────────────────────────
  function updateStats() {
    const total     = allMembers.length;
    const activos   = allMembers.filter(m => memberStatus(m) === "activo").length;
    const porVencer = allMembers.filter(m => memberStatus(m) === "porvencer").length;
    const vencidos  = allMembers.filter(m => memberStatus(m) === "vencido" || memberStatus(m) === "inactivo").length;

    stTotal.textContent     = total;
    stActivo.textContent    = activos;
    stPorVencer.textContent = porVencer;
    stVencido.textContent   = vencidos;
  }

  // ── Ordenamiento ─────────────────────────────────────────────
  function sortMembers(list) {
    return [...list].sort((a, b) => {
      let va, vb;
      if (sortCol === "name")   { va = a.name.toLowerCase();                   vb = b.name.toLowerCase(); }
      if (sortCol === "plan")   { va = a.membership?.plan   || "";             vb = b.membership?.plan   || ""; }
      if (sortCol === "days")   { va = a.membership?.daysRemaining ?? -1;      vb = b.membership?.daysRemaining ?? -1; }
      if (sortCol === "status") { va = memberStatus(a);                        vb = memberStatus(b); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });
  }

  // ── Render de filas ──────────────────────────────────────────
  function showSkeletons() {
    tbody.innerHTML = Array(6).fill(0).map(() => `
      <tr class="tr-skeleton">
        <td><div class="sk-cell" style="width:60%;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:70px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:50px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:60px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:120px;height:14px;border-radius:6px;"></div></td>
      </tr>`).join("");
  }

  function renderRows() {
    const sorted   = sortMembers(filtered);
    const total    = sorted.length;
    const pages    = Math.ceil(total / PAGE_SIZE) || 1;
    currentPage    = Math.min(currentPage, pages);
    const start    = (currentPage - 1) * PAGE_SIZE;
    const page     = sorted.slice(start, start + PAGE_SIZE);

    // Info de paginación
    const from = total ? start + 1 : 0;
    const to   = Math.min(start + PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${from}–${to} de ${total} miembros`;

    // Botones de página
    renderPagination(pages);

    if (!page.length) {
      tbody.innerHTML = `<tr class="tr-empty"><td colspan="5">No hay miembros que coincidan.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    page.forEach(member => tbody.appendChild(buildRow(member)));
  }

  function buildRow(member) {
    const tr   = document.createElement("tr");
    const days = member.membership?.daysRemaining ?? 0;
    const plan = member.membership?.plan || "Sin plan";
    const initials = getInitials(member.name);
    const color    = avatarColor(initials);

    tr.innerHTML = `
      <td>
        <div class="td-member">
          <div class="td-avatar" style="background:${color};">${initials}</div>
          <div>
            <div class="td-name">${member.name}</div>
            <div class="td-email">${member.email}</div>
          </div>
        </div>
      </td>
      <td><span class="td-plan">${plan}</span></td>
      <td>${days > 0 ? days + " días" : "—"}</td>
      <td>${badgeHtml(member)}</td>
      <td>
        <div class="td-actions">
          <button class="td-btn td-btn--edit"   data-action="edit">Editar</button>
          <button class="td-btn td-btn--renew"  data-action="renew">Renovar</button>
          <button class="td-btn td-btn--delete" data-action="del">Eliminar</button>
        </div>
      </td>`;

    // Acciones de la fila
    tr.querySelectorAll(".td-btn").forEach(btn => {
      btn.onclick = () => handleAction(btn.dataset.action, member, tr);
    });

    return tr;
  }

  function handleAction(action, member, tr) {
    if (action === "edit") {
      showEditModal(member, async ({ name, email, plan, status }) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, plan, status })
          });
          GymApp.toast("Miembro actualizado.", "success");
          await loadMembers();
        } catch (err) { GymApp.toast(`Error: ${err.message}`, "error"); }
      });
    } else if (action === "renew") {
      showRenewModal(member, async (days, plan) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}/renew`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days, plan })
          });
          GymApp.toast(`Membresía de ${member.name} renovada.`, "success");
          await loadMembers();
        } catch (err) { GymApp.toast(`Error: ${err.message}`, "error"); }
      });
    } else if (action === "del") {
      showDeleteModal(member, async () => {
        tr.classList.add("card-fade-out");
        tr.addEventListener("animationend", async () => {
          try {
            await GymApp.api(`/api/admin/members/${member.id}`, { method: "DELETE" });
            GymApp.toast(`${member.name} eliminado.`, "info");
            await loadMembers();
          } catch (err) {
            tr.classList.remove("card-fade-out");
            GymApp.toast(`Error: ${err.message}`, "error");
          }
        }, { once: true });
      });
    }
  }

  // ── Paginación ───────────────────────────────────────────────
  function renderPagination(pages) {
    pageBtns.innerHTML = "";

    const addBtn = (label, page, disabled, active) => {
      const btn = document.createElement("button");
      btn.className = "mb-page-btn" + (active ? " active" : "");
      btn.textContent = label;
      btn.disabled = disabled;
      btn.onclick = () => { currentPage = page; renderRows(); };
      pageBtns.appendChild(btn);
    };

    addBtn("‹", currentPage - 1, currentPage === 1, false);

    // Mostrar máximo 5 páginas centradas en la actual
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, currentPage - delta); i <= Math.min(pages, currentPage + delta); i++) range.push(i);
    if (range[0] > 1) { addBtn("1", 1, false, false); if (range[0] > 2) { const e = document.createElement("span"); e.textContent = "…"; e.style.cssText="color:var(--text-dim);padding:0 4px;"; pageBtns.appendChild(e); } }
    range.forEach(p => addBtn(p, p, false, p === currentPage));
    if (range[range.length-1] < pages) { if (range[range.length-1] < pages-1) { const e = document.createElement("span"); e.textContent = "…"; e.style.cssText="color:var(--text-dim);padding:0 4px;"; pageBtns.appendChild(e); } addBtn(pages, pages, false, false); }

    addBtn("›", currentPage + 1, currentPage === pages, false);
  }

  // ── Filtro y búsqueda ────────────────────────────────────────
  function applyFilters() {
    const q = (searchEl.value || "").trim().toLowerCase();
    filtered = allMembers.filter(m => {
      const matchSearch = !q || `${m.name} ${m.email}`.toLowerCase().includes(q);
      const status      = memberStatus(m);
      const matchTab    = activeTab === "todos" || status === activeTab;
      return matchSearch && matchTab;
    });
    currentPage = 1;
    renderRows();
  }

  // ── Exportar CSV ─────────────────────────────────────────────
  document.getElementById("btnExport").addEventListener("click", () => {
    const rows  = [["Nombre","Correo","Plan","Días restantes","Estado"]];
    const data  = sortMembers(filtered);
    data.forEach(m => {
      rows.push([
        m.name,
        m.email,
        m.membership?.plan || "Sin plan",
        m.membership?.daysRemaining ?? 0,
        m.membership?.status || "Activo"
      ]);
    });
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href  = URL.createObjectURL(blob);
    link.download = "miembros.csv";
    link.click();
    GymApp.toast("CSV exportado correctamente.", "success");
  });

  // ── Ordenamiento por columna ─────────────────────────────────
  ths.forEach(th => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) { sortAsc = !sortAsc; }
      else { sortCol = col; sortAsc = true; }
      ths.forEach(t => { t.classList.remove("sorted"); t.querySelector(".sort-icon").textContent = "↕"; });
      th.classList.add("sorted");
      th.querySelector(".sort-icon").textContent = sortAsc ? "↑" : "↓";
      renderRows();
    });
  });

  // ── Tabs ─────────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.filter;
      applyFilters();
    });
  });

  // ── Búsqueda en tiempo real ───────────────────────────────────
  searchEl.addEventListener("input", applyFilters);

  // ── Carga inicial ─────────────────────────────────────────────
  async function loadMembers() {
    showSkeletons();
    try {
      const data   = await GymApp.api("/api/admin/members");
      allMembers   = data.members || [];
      updateStats();
      applyFilters();
    } catch (err) {
      tbody.innerHTML = `<tr class="tr-empty"><td colspan="5">Error al cargar: ${err.message}</td></tr>`;
      GymApp.toast(`Error: ${err.message}`, "error");
    }
  }

  loadMembers();
});
