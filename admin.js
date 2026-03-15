"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ── Seguridad: solo admins ──────────────────────────────────
  if (!GymApp.guardRoute("admin")) return;
  const session = GymApp.getSession();

  const searchInput   = document.querySelector(".search-bar input");
  const memberSection = document.querySelector(".members-grid");
  const memberTemplate= document.querySelector(".member-card");
  const statsValues   = document.querySelectorAll(".stat-card .stat-val");
  const welcomeTitle  = document.querySelector(".welcome-title");

  let members    = [];
  let filterPlan = "all";
  let filterStatus = "all";

  if (welcomeTitle)
    welcomeTitle.textContent = `¡Bienvenido, ${session.displayName || "administrador"}!`;

  // ─────────────────────────────────────────────
  // HELPERS DE INICIALES Y COLOR
  // ─────────────────────────────────────────────
  function getInitials(name) {
    return (name || "?").trim().split(/\s+/).slice(0, 2)
      .map(w => w[0].toUpperCase()).join("");
  }

  function avatarColor(initials) {
    const p = ["#c45e1a","#7b2d8b","#1a6fbf","#1a8f5a","#8a4f0d","#3d5a9e","#8b1a1a","#b0390e"];
    return p[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % p.length];
  }

  // ─────────────────────────────────────────────
  // SISTEMA DE MODALES
  // ─────────────────────────────────────────────
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
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
    { label: "Mensual",    days: 30,  price: "$35",  active: true  },
    { label: "Trimestral", days: 90,  price: "$90",  active: false },
    { label: "Semestral",  days: 180, price: "$160", active: false },
    { label: "Anual",      days: 365, price: "$300", active: false },
  ];

  function showRenewModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    const planCards = PLANES.map(p => `
      <button class="gm-plan-card ${p.active ? "" : "gm-plan-disabled"}"
        data-days="${p.days}" data-plan="${p.label}"
        ${p.active ? "" : "disabled"}>
        <span class="gm-plan-name">${p.label}</span>
        <span class="gm-plan-price">${p.price}</span>
        <span class="gm-plan-days">${p.days} días</span>
        ${p.active ? "" : '<span class="gm-plan-soon">Próximamente</span>'}
      </button>`).join("");
    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${avatarColor(initials)};">${initials}</div>
      <h3 class="gm-title">Renovar membresía</h3>
      <p class="gm-body">Selecciona el plan para <strong>${member.name}</strong>:</p>
      <div class="gm-plans-grid">${planCards}</div>
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
    const currentPlan   = member.membership?.plan   || "Mensual";
    const currentStatus = member.membership?.status || "Activo";
    box.innerHTML = `
      <h3 class="gm-title">Editar miembro</h3>
      <div class="gm-form">
        <div class="gm-field"><label>Nombre completo</label>
          <input id="gmName"   class="gm-input" type="text"  value="${member.name}" /></div>
        <div class="gm-field"><label>Correo electrónico</label>
          <input id="gmEmail"  class="gm-input" type="email" value="${member.email}" /></div>
        <div class="gm-field"><label>Plan</label>
          <select id="gmPlan" class="gm-input">
            ${["Mensual","Trimestral","Semestral","Anual"].map(p =>
              `<option value="${p}" ${p === currentPlan ? "selected" : ""}>${p}</option>`).join("")}
          </select></div>
        <div class="gm-field"><label>Estado</label>
          <select id="gmStatus" class="gm-input">
            ${["Activo","Inactivo"].map(s =>
              `<option value="${s}" ${s === currentStatus ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
        <span class="gm-error" id="gmError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel"  id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSave">Guardar cambios</button>
      </div>`;
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSave").onclick = () => {
      const name   = box.querySelector("#gmName").value.trim();
      const email  = box.querySelector("#gmEmail").value.trim();
      const plan   = box.querySelector("#gmPlan").value;
      const status = box.querySelector("#gmStatus").value;
      const errEl  = box.querySelector("#gmError");
      if (!name)  { errEl.textContent = "El nombre es obligatorio."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = "Correo inválido."; return; }
      overlay.remove();
      onConfirm({ name, email, plan, status });
    };
  }

  // ─────────────────────────────────────────────
  // BADGE DE ESTADO CON COLOR
  // daysRemaining: >15 verde, 8-15 amarillo, ≤7 rojo
  // ─────────────────────────────────────────────
  function statusBadge(days, status) {
    if (status === "Inactivo") return '<span class="member-badge badge-inactive">Inactivo</span>';
    if (days <= 0)  return '<span class="member-badge badge-expired">Vencido</span>';
    if (days <= 7)  return '<span class="member-badge badge-danger">' + days + ' días</span>';
    if (days <= 15) return '<span class="member-badge badge-warn">'   + days + ' días</span>';
    return '<span class="member-badge badge-ok">' + days + ' días</span>';
  }

  // ─────────────────────────────────────────────
  // TARJETA DE MIEMBRO
  // ─────────────────────────────────────────────
  function createBtn(label, color) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    Object.assign(b.style, { border:"none", borderRadius:"8px", padding:"6px 10px",
      cursor:"pointer", color:"#fff", fontSize:"12px", background:color });
    return b;
  }

  function memberToCard(member) {
    const card = document.createElement("div");
    card.className = "member-card";
    card.dataset.id = member.id;

    const days   = member.membership?.daysRemaining ?? 0;
    const plan   = member.membership?.plan   || "Sin plan";
    const status = member.membership?.status || "Activo";

    // Avatar iniciales
    const initials = getInitials(member.name);
    const avatarEl = document.createElement("div");
    avatarEl.className   = "member-avatar-initials";
    avatarEl.textContent = initials;
    avatarEl.style.background = avatarColor(initials);

    // Info
    const info = document.createElement("div");
    info.className = "member-info";
    info.innerHTML = `
      <div class="member-name">${member.name}</div>
      <div class="member-days">${member.email} | ${plan}</div>
      <div style="margin-top:4px;">${statusBadge(days, status)}</div>`;

    // Acciones normales (desktop)
    const actions = document.createElement("div");
    actions.className = "member-actions-desktop";

    const editBtn  = createBtn("Editar",   "#de7f2f");
    const renewBtn = createBtn("Renovar",  "#1f8f4f");
    const delBtn   = createBtn("Eliminar", "#b33a3a");

    // Menú ··· para móvil
    const kebab = document.createElement("button");
    kebab.className = "kebab-btn";
    kebab.innerHTML = "&#8942;"; // ⋮
    kebab.title = "Opciones";

    const kebabMenu = document.createElement("div");
    kebabMenu.className = "kebab-menu";
    kebabMenu.innerHTML = `
      <button class="kebab-item" data-action="edit">✏️ Editar</button>
      <button class="kebab-item" data-action="renew">🔄 Renovar</button>
      <button class="kebab-item kebab-item--danger" data-action="del">🗑️ Eliminar</button>`;

    kebab.addEventListener("click", e => {
      e.stopPropagation();
      // Cierra otros menús abiertos
      document.querySelectorAll(".kebab-menu.open").forEach(m => { if (m !== kebabMenu) m.classList.remove("open"); });
      kebabMenu.classList.toggle("open");
    });
    document.addEventListener("click", () => kebabMenu.classList.remove("open"));

    // Función central de acciones (la usan tanto desktop como kebab)
    function handleAction(action) {
      if (action === "edit") {
        showEditModal(member, async ({ name, email, plan, status }) => {
          try {
            await GymApp.api(`/api/admin/members/${member.id}`, {
              method: "PUT", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, plan, status })
            });
            GymApp.toast("Miembro actualizado correctamente.", "success");
            await loadMembers();
          } catch (err) { GymApp.toast(`No se pudo editar: ${err.message}`, "error"); }
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
          } catch (err) { GymApp.toast(`No se pudo renovar: ${err.message}`, "error"); }
        });
      } else if (action === "del") {
        showDeleteModal(member, async () => {
          // Animación fade-out antes de eliminar
          card.classList.add("card-fade-out");
          card.addEventListener("animationend", async () => {
            try {
              await GymApp.api(`/api/admin/members/${member.id}`, { method: "DELETE" });
              GymApp.toast(`${member.name} eliminado.`, "info");
              await loadMembers();
            } catch (err) {
              card.classList.remove("card-fade-out");
              GymApp.toast(`No se pudo eliminar: ${err.message}`, "error");
            }
          }, { once: true });
        });
      }
    }

    editBtn.onclick  = () => handleAction("edit");
    renewBtn.onclick = () => handleAction("renew");
    delBtn.onclick   = () => handleAction("del");

    kebabMenu.querySelectorAll(".kebab-item").forEach(item => {
      item.onclick = e => { e.stopPropagation(); kebabMenu.classList.remove("open"); handleAction(item.dataset.action); };
    });

    actions.appendChild(editBtn);
    actions.appendChild(renewBtn);
    actions.appendChild(delBtn);

    const kebabWrap = document.createElement("div");
    kebabWrap.className = "kebab-wrap";
    kebabWrap.appendChild(kebab);
    kebabWrap.appendChild(kebabMenu);

    card.appendChild(avatarEl);
    card.appendChild(info);
    card.appendChild(actions);
    card.appendChild(kebabWrap);
    return card;
  }

  // ─────────────────────────────────────────────
  // FILTROS
  // ─────────────────────────────────────────────
  function buildFilters() {
    const bar = document.querySelector(".search-bar");
    if (!bar || document.querySelector(".filter-row")) return;

    const row = document.createElement("div");
    row.className = "filter-row";

    const plans   = ["Todos", "Mensual", "Trimestral", "Semestral", "Anual"];
    const statuses = ["Todos", "Activo", "Inactivo"];

    function pill(label, key, value, activeVal, setter) {
      const btn = document.createElement("button");
      btn.className = "filter-pill" + (activeVal === value || (value === "Todos" && activeVal === "all") ? " active" : "");
      btn.textContent = label;
      btn.onclick = () => {
        setter(value === "Todos" ? "all" : value);
        row.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        // Reactiva los de su grupo
        btn.classList.add("active");
        applyFilters();
      };
      return btn;
    }

    const planGroup = document.createElement("div");
    planGroup.className = "filter-group";
    planGroup.innerHTML = '<span class="filter-label">Plan:</span>';
    plans.forEach(p => planGroup.appendChild(pill(p, "plan", p, filterPlan, v => { filterPlan = v; })));

    const statusGroup = document.createElement("div");
    statusGroup.className = "filter-group";
    statusGroup.innerHTML = '<span class="filter-label">Estado:</span>';
    statuses.forEach(s => statusGroup.appendChild(pill(s, "status", s, filterStatus, v => { filterStatus = v; })));

    row.appendChild(planGroup);
    row.appendChild(statusGroup);

    // Inserta la fila de filtros después del search-bar
    bar.insertAdjacentElement("afterend", row);
  }

  function applyFilters() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    let filtered = members;
    if (q) filtered = filtered.filter(m => `${m.name} ${m.email}`.toLowerCase().includes(q));
    if (filterPlan !== "all")   filtered = filtered.filter(m => m.membership?.plan === filterPlan);
    if (filterStatus !== "all") filtered = filtered.filter(m => (m.membership?.status || "Activo") === filterStatus);
    renderMembers(filtered);
  }

  // ─────────────────────────────────────────────
  // RENDER Y CARGA
  // ─────────────────────────────────────────────
  function renderMembers(list) {
    memberSection.querySelectorAll(".member-card").forEach(c => c.remove());
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "member-card member-card--empty";
      empty.textContent = "No hay miembros que coincidan.";
      memberSection.appendChild(empty);
      return;
    }
    list.forEach(m => memberSection.appendChild(memberToCard(m)));
  }

  function ensureCreateButton() {
    if (document.querySelector(".admin-create-member")) return;
    const bar = document.querySelector(".search-bar");
    if (!bar) return;
    const btn = createBtn("Agregar cliente", "#de7f2f");
    btn.className = "admin-create-member";
    Object.assign(btn.style, { marginLeft:"8px", whiteSpace:"nowrap",
      padding:"8px 14px", fontSize:"13px", borderRadius:"8px" });
    btn.addEventListener("click", () => { window.location.href = "form.html"; });
    bar.appendChild(btn);
  }

  // Skeleton loader mientras carga
  function showSkeletons(n = 4) {
    memberSection.querySelectorAll(".member-card").forEach(c => c.remove());
    for (let i = 0; i < n; i++) {
      const sk = document.createElement("div");
      sk.className = "member-card skeleton-card";
      sk.innerHTML = `
        <div class="sk-circle"></div>
        <div class="sk-lines"><div class="sk-line sk-line--w70"></div><div class="sk-line sk-line--w50"></div></div>`;
      memberSection.appendChild(sk);
    }
  }

  async function loadMembers() {
    showSkeletons();
    try {
      const data = await GymApp.api("/api/admin/members");
      members = data.members || [];
      if (statsValues[2]) statsValues[2].textContent = String(data.total ?? members.length);
      buildFilters();
      applyFilters();
    } catch (err) {
      memberSection.querySelectorAll(".skeleton-card").forEach(c => c.remove());
      GymApp.toast(`Error al cargar miembros: ${err.message}`, "error");
    }
  }

  if (searchInput)   searchInput.addEventListener("input", applyFilters);
  if (memberTemplate) memberTemplate.remove();

  ensureCreateButton();
  loadMembers();
});
