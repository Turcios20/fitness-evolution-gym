"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = GymApp.getSession();
  if (!session) { window.location.href = "login.html"; return; }
  if (session.role !== "admin") { window.location.href = "cliente.html"; return; }

  const searchInput  = document.querySelector(".search-bar input");
  const memberSection = document.querySelector(".members-grid");
  const memberTemplate = document.querySelector(".member-card");
  const statsValues  = document.querySelectorAll(".stat-card .stat-val");
  const welcomeTitle = document.querySelector(".welcome-title");

  let members = [];

  if (welcomeTitle) {
    welcomeTitle.textContent = `¡Bienvenido, ${session.displayName || "administrador"}!`;
  }

  // ─────────────────────────────────────────────
  // SISTEMA DE MODALES
  // ─────────────────────────────────────────────

  // Genera las dos letras del nombre (ej: "Jhoscar Ochoa" → "JO")
  function getInitials(name) {
    return (name || "?").trim().split(/\s+/).slice(0, 2)
      .map(w => w[0].toUpperCase()).join("");
  }

  // Color único por iniciales
  function avatarColor(initials) {
    const palette = ["#c45e1a","#7b2d8b","#1a6fbf","#1a8f5a","#8a4f0d","#3d5a9e","#8b1a1a","#b0390e"];
    return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
  }

  // Crea e inyecta el overlay del modal; devuelve { overlay, box }
  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // Click fuera cierra
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    return { overlay, box };
  }

  // ── MODAL ELIMINAR ──────────────────────────────────
  function showDeleteModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    const color    = avatarColor(initials);

    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${color};">${initials}</div>
      <h3 class="gm-title">¿Eliminar miembro?</h3>
      <p class="gm-body">
        Vas a eliminar a <strong>${member.name}</strong>.<br>
        Esta acción <span style="color:#e05555;">no se puede deshacer</span>.
      </p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmConfirm">Sí, eliminar</button>
      </div>
    `;
    box.querySelector("#gmCancel").onclick  = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = () => { overlay.remove(); onConfirm(); };
  }

  // ── MODAL RENOVAR ───────────────────────────────────
  // Solo Mensual está conectado a la DB; el resto se muestra deshabilitado
  const PLANES = [
    { label: "Mensual",    days: 30,  price: "$35", active: true  },
    { label: "Trimestral", days: 90,  price: "$90", active: false },
    { label: "Semestral",  days: 180, price: "$160",active: false },
    { label: "Anual",      days: 365, price: "$300",active: false },
  ];

  function showRenewModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    const color    = avatarColor(initials);

    const planCards = PLANES.map(p => `
      <button
        class="gm-plan-card ${p.active ? "" : "gm-plan-disabled"}"
        data-days="${p.days}"
        data-plan="${p.label}"
        ${p.active ? "" : "disabled"}
        title="${p.active ? "" : "Próximamente disponible"}"
      >
        <span class="gm-plan-name">${p.label}</span>
        <span class="gm-plan-price">${p.price}</span>
        <span class="gm-plan-days">${p.days} días</span>
        ${p.active ? "" : '<span class="gm-plan-soon">Próximamente</span>'}
      </button>
    `).join("");

    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${color};">${initials}</div>
      <h3 class="gm-title">Renovar membresía</h3>
      <p class="gm-body">Selecciona el plan para <strong>${member.name}</strong>:</p>
      <div class="gm-plans-grid">${planCards}</div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();

    // Al hacer clic en un plan activo, confirma y cierra
    box.querySelectorAll(".gm-plan-card:not([disabled])").forEach(card => {
      card.onclick = () => {
        overlay.remove();
        onConfirm(Number(card.dataset.days), card.dataset.plan);
      };
    });
  }

  // ── MODAL EDITAR ────────────────────────────────────
  function showEditModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const currentPlan = member.membership?.plan || "Mensual";
    const currentStatus = member.membership?.status || "Activo";

    box.innerHTML = `
      <h3 class="gm-title">Editar miembro</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Nombre completo</label>
          <input id="gmName"   class="gm-input" type="text"  value="${member.name}"  />
        </div>
        <div class="gm-field">
          <label>Correo electrónico</label>
          <input id="gmEmail"  class="gm-input" type="email" value="${member.email}" />
        </div>
        <div class="gm-field">
          <label>Plan</label>
          <select id="gmPlan" class="gm-input">
            ${["Mensual","Trimestral","Semestral","Anual"].map(p =>
              `<option value="${p}" ${p === currentPlan ? "selected" : ""}>${p}</option>`
            ).join("")}
          </select>
        </div>
        <div class="gm-field">
          <label>Estado</label>
          <select id="gmStatus" class="gm-input">
            ${["Activo","Inactivo"].map(s =>
              `<option value="${s}" ${s === currentStatus ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </div>
        <span class="gm-error" id="gmError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel"  id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSave">Guardar cambios</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSave").onclick = () => {
      const name   = box.querySelector("#gmName").value.trim();
      const email  = box.querySelector("#gmEmail").value.trim();
      const plan   = box.querySelector("#gmPlan").value;
      const status = box.querySelector("#gmStatus").value;
      const errEl  = box.querySelector("#gmError");

      if (!name)  { errEl.textContent = "El nombre es obligatorio."; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Correo inválido."; return;
      }

      overlay.remove();
      onConfirm({ name, email, plan, status });
    };
  }

  // ─────────────────────────────────────────────
  // CONSTRUIR TARJETA DE MIEMBRO
  // ─────────────────────────────────────────────
  function createButton(label, bgColor) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.textContent = label;
    Object.assign(btn.style, {
      border: "none", borderRadius: "8px", padding: "6px 10px",
      cursor: "pointer", color: "#fff", fontSize: "12px", background: bgColor
    });
    return btn;
  }

  function memberToCard(member) {
    const card = document.createElement("div");
    card.className = "member-card";

    const days = member.membership?.daysRemaining ?? 0;
    const plan = member.membership?.plan || "Sin plan";

    // Avatar con iniciales en lugar de icono genérico
    const initials = getInitials(member.name);
    const avatarEl = document.createElement("div");
    avatarEl.className = "member-avatar-initials";
    avatarEl.textContent = initials;
    avatarEl.style.background = avatarColor(initials);

    const info = document.createElement("div");
    info.className = "member-info";

    const nameEl = document.createElement("div");
    nameEl.className = "member-name";
    nameEl.textContent = member.name;

    const sub = document.createElement("div");
    sub.className = "member-days";
    sub.textContent = `${member.email} | ${plan} | ${days} días`;

    info.appendChild(nameEl);
    info.appendChild(sub);

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:6px;margin-left:auto;flex-shrink:0;";

    const editBtn  = createButton("Editar",   "#de7f2f");
    const renewBtn = createButton("Renovar",  "#1f8f4f");
    const delBtn   = createButton("Eliminar", "#b33a3a");

    // ── Editar ──
    editBtn.addEventListener("click", () => {
      showEditModal(member, async ({ name, email, plan, status }) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, plan, status })
          });
          await loadMembers();
        } catch (err) {
          showInfoModal("Error", `No se pudo editar: ${err.message}`);
        }
      });
    });

    // ── Renovar ──
    renewBtn.addEventListener("click", () => {
      showRenewModal(member, async (days, plan) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}/renew`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days, plan })
          });
          await loadMembers();
        } catch (err) {
          showInfoModal("Error", `No se pudo renovar: ${err.message}`);
        }
      });
    });

    // ── Eliminar ──
    delBtn.addEventListener("click", () => {
      showDeleteModal(member, async () => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}`, { method: "DELETE" });
          await loadMembers();
        } catch (err) {
          showInfoModal("Error", `No se pudo eliminar: ${err.message}`);
        }
      });
    });

    actions.appendChild(editBtn);
    actions.appendChild(renewBtn);
    actions.appendChild(delBtn);

    card.appendChild(avatarEl);
    card.appendChild(info);
    card.appendChild(actions);
    return card;
  }

  // Modal informativo genérico (reemplaza alert/confirm)
  function showInfoModal(title, msg) {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">${title}</h3>
      <p class="gm-body">${msg}</p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-primary" id="gmOk">Aceptar</button>
      </div>
    `;
    box.querySelector("#gmOk").onclick = () => overlay.remove();
  }

  // ─────────────────────────────────────────────
  // RENDER Y CARGA
  // ─────────────────────────────────────────────
  function renderMembers(list) {
    memberSection.querySelectorAll(".member-card").forEach(c => c.remove());
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "member-card";
      empty.textContent = "No hay clientes registrados.";
      memberSection.appendChild(empty);
      return;
    }
    list.forEach(m => memberSection.appendChild(memberToCard(m)));
  }

  function applySearch() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    renderMembers(q ? members.filter(m =>
      `${m.name} ${m.email}`.toLowerCase().includes(q)
    ) : members);
  }

  function ensureCreateButton() {
    if (document.querySelector(".admin-create-member")) return;
    const searchBar = document.querySelector(".search-bar");
    if (!searchBar) return;
    const btn = createButton("Agregar cliente", "#de7f2f");
    btn.className = "admin-create-member";
    Object.assign(btn.style, {
      marginLeft: "8px", whiteSpace: "nowrap",
      padding: "8px 14px", fontSize: "13px", borderRadius: "8px"
    });
    btn.addEventListener("click", () => { window.location.href = "form.html"; });
    searchBar.appendChild(btn);
  }

  async function loadMembers() {
    try {
      const data = await GymApp.api("/api/admin/members");
      members = data.members || [];
      if (statsValues[2]) statsValues[2].textContent = String(data.total ?? members.length);
      applySearch();
    } catch (err) {
      showInfoModal("Error", `No se pudieron cargar miembros: ${err.message}`);
    }
  }

  if (searchInput) searchInput.addEventListener("input", applySearch);
  if (memberTemplate) memberTemplate.remove();

  ensureCreateButton();
  loadMembers();
});
