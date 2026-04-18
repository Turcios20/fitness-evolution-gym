"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute("admin")) return;

  let allMembers = [];
  let filtered = [];
  let trainers = [];
  let sortCol = "name";
  let sortAsc = true;
  let activeTab = "todos";
  let currentPage = 1;
  const PAGE_SIZE = 12;

  const tbody = document.getElementById("mbTbody");
  const searchEl = document.getElementById("mbSearch");
  const pageInfo = document.getElementById("mbPageInfo");
  const pageBtns = document.getElementById("mbPageBtns");
  const tabs = document.querySelectorAll(".mb-tab");
  const ths = document.querySelectorAll("thead th[data-col]");
  const btnExport = document.getElementById("btnExport");
  const btnLogout = document.getElementById("btnAdminLogout");
  const stTotal = document.getElementById("stTotal");
  const stActivo = document.getElementById("stActivo");
  const stPorVencer = document.getElementById("stPorVencer");
  const stVencido = document.getElementById("stVencido");

  function getInitials(name) {
    return (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  }

  function avatarColor(initials) {
    const palette = ["#c45e1a", "#7b2d8b", "#1a6fbf", "#1a8f5a", "#8a4f0d", "#3d5a9e", "#8b1a1a", "#b0390e"];
    return palette[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length];
  }

  function memberStatus(member) {
    const status = member.membership?.status || "Activo";
    const days = member.membership?.daysRemaining ?? 0;
    if (status === "Inactivo") return "inactivo";
    if (days <= 0) return "vencido";
    if (days <= 7) return "porvencer";
    return "activo";
  }

  function badgeHtml(member) {
    const status = member.membership?.status || "Activo";
    const days = member.membership?.daysRemaining ?? 0;
    if (status === "Inactivo") return '<span class="member-badge badge-inactive">Inactivo</span>';
    if (days <= 0) return '<span class="member-badge badge-expired">Vencido</span>';
    if (days <= 7) return `<span class="member-badge badge-danger">${days} dias</span>`;
    if (days <= 15) return `<span class="member-badge badge-warn">${days} dias</span>`;
    return `<span class="member-badge badge-ok">${days} dias</span>`;
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "gym-modal-overlay";
    const box = document.createElement("div");
    box.className = "gym-modal-box fadein";
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    return { overlay, box };
  }

  function trainerOptions(selectedTrainerId) {
    const selectedId = Number(selectedTrainerId || 0);
    return ['<option value="">Sin asignar</option>']
      .concat(
        trainers.map((trainer) => `
          <option value="${trainer.id}" ${trainer.id === selectedId ? "selected" : ""}>
            ${trainer.name}
          </option>
        `)
      )
      .join("");
  }

  function showEditModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const currentPlan = member.membership?.plan || "Mensual";
    const currentStatus = member.membership?.status || "Activo";
    box.innerHTML = `
      <h3 class="gm-title">Editar miembro</h3>
      <div class="gm-form">
        <div class="gm-field">
          <label>Nombre completo</label>
          <input id="gmName" class="gm-input" type="text" value="${member.name}">
        </div>
        <div class="gm-field">
          <label>Correo electronico</label>
          <input id="gmEmail" class="gm-input" type="email" value="${member.email}">
        </div>
        <div class="gm-field">
          <label>Plan</label>
          <select id="gmPlan" class="gm-input">
            ${["Mensual", "Trimestral", "Semestral", "Anual"].map((plan) => `
              <option value="${plan}" ${plan === currentPlan ? "selected" : ""}>${plan}</option>
            `).join("")}
          </select>
        </div>
        <div class="gm-field">
          <label>Estado</label>
          <select id="gmStatus" class="gm-input">
            ${["Activo", "Inactivo"].map((status) => `
              <option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>
            `).join("")}
          </select>
        </div>
        <div class="gm-field">
          <label>Entrenador asignado</label>
          <select id="gmTrainer" class="gm-input">${trainerOptions(member.assignedTrainer?.id)}</select>
        </div>
        <span class="gm-error" id="gmError"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSave">Guardar cambios</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSave").onclick = () => {
      const name = box.querySelector("#gmName").value.trim();
      const email = box.querySelector("#gmEmail").value.trim();
      const plan = box.querySelector("#gmPlan").value;
      const status = box.querySelector("#gmStatus").value;
      const trainerIdValue = box.querySelector("#gmTrainer").value;
      const errEl = box.querySelector("#gmError");

      if (!name) {
        errEl.textContent = "El nombre es obligatorio.";
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Correo invalido.";
        return;
      }

      overlay.remove();
      onConfirm({
        name,
        email,
        plan,
        status,
        trainerId: trainerIdValue ? Number(trainerIdValue) : null
      });
    };
  }

  function showDeleteModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${avatarColor(initials)};">${initials}</div>
      <h3 class="gm-title">Eliminar miembro</h3>
      <p class="gm-body">Vas a eliminar a <strong>${member.name}</strong>. Esta accion no se puede deshacer.</p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-danger" id="gmConfirm">Si, eliminar</button>
      </div>
    `;
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmConfirm").onclick = () => {
      overlay.remove();
      onConfirm();
    };
  }

  function showRenewModal(member, onConfirm) {
    const { overlay, box } = createOverlay();
    const initials = getInitials(member.name);
    const plans = [
      { label: "Mensual", days: 30, price: "$35" },
      { label: "Trimestral", days: 90, price: "$90" },
      { label: "Semestral", days: 180, price: "$160" },
      { label: "Anual", days: 365, price: "$300" }
    ];

    box.innerHTML = `
      <div class="gm-avatar-big" style="background:${avatarColor(initials)};">${initials}</div>
      <h3 class="gm-title">Renovar membresia</h3>
      <p class="gm-body">Selecciona el plan para <strong>${member.name}</strong>:</p>
      <div class="gm-plans-grid">
        ${plans.map((plan) => `
          <button class="gm-plan-card" data-days="${plan.days}" data-plan="${plan.label}">
            <span class="gm-plan-name">${plan.label}</span>
            <span class="gm-plan-price">${plan.price}</span>
            <span class="gm-plan-days">${plan.days} dias</span>
          </button>
        `).join("")}
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
      </div>
    `;

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelectorAll(".gm-plan-card").forEach((card) => {
      card.addEventListener("click", () => {
        overlay.remove();
        onConfirm(Number(card.dataset.days), card.dataset.plan);
      });
    });
  }

  function updateStats() {
    stTotal.textContent = String(allMembers.length);
    stActivo.textContent = String(allMembers.filter((member) => memberStatus(member) === "activo").length);
    stPorVencer.textContent = String(allMembers.filter((member) => memberStatus(member) === "porvencer").length);
    stVencido.textContent = String(allMembers.filter((member) => ["vencido", "inactivo"].includes(memberStatus(member))).length);
  }

  function sortMembers(list) {
    return [...list].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      if (sortCol === "name") {
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
      }
      if (sortCol === "plan") {
        valueA = a.membership?.plan || "";
        valueB = b.membership?.plan || "";
      }
      if (sortCol === "days") {
        valueA = a.membership?.daysRemaining ?? -1;
        valueB = b.membership?.daysRemaining ?? -1;
      }
      if (sortCol === "status") {
        valueA = memberStatus(a);
        valueB = memberStatus(b);
      }

      if (valueA < valueB) return sortAsc ? -1 : 1;
      if (valueA > valueB) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  function showSkeletons() {
    tbody.innerHTML = Array(6).fill(0).map(() => `
      <tr class="tr-skeleton">
        <td><div class="sk-cell" style="width:60%;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:70px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:90px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:50px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:60px;height:14px;border-radius:6px;"></div></td>
        <td><div class="sk-cell" style="width:120px;height:14px;border-radius:6px;"></div></td>
      </tr>
    `).join("");
  }

  function renderPagination(pages) {
    pageBtns.innerHTML = "";

    function addBtn(label, page, disabled, active) {
      const button = document.createElement("button");
      button.className = `mb-page-btn${active ? " active" : ""}`;
      button.textContent = label;
      button.disabled = disabled;
      button.onclick = () => {
        currentPage = page;
        renderRows();
      };
      pageBtns.appendChild(button);
    }

    addBtn("‹", currentPage - 1, currentPage === 1, false);
    for (let page = 1; page <= pages; page += 1) {
      addBtn(String(page), page, false, page === currentPage);
    }
    addBtn("›", currentPage + 1, currentPage === pages, false);
  }

  function buildRow(member) {
    const tr = document.createElement("tr");
    const initials = getInitials(member.name);
    const days = member.membership?.daysRemaining ?? 0;
    const plan = member.membership?.plan || "Sin plan";

    tr.innerHTML = `
      <td>
        <div class="td-member">
          <div class="td-avatar" style="background:${avatarColor(initials)};">${initials}</div>
          <div>
            <div class="td-name">${member.name}</div>
            <div class="td-email">${member.email}</div>
          </div>
        </div>
      </td>
      <td><span class="td-plan">${plan}</span></td>
      <td><span class="td-trainer">${member.assignedTrainer?.name || "Sin asignar"}</span></td>
      <td>${days > 0 ? `${days} dias` : "-"}</td>
      <td>${badgeHtml(member)}</td>
      <td>
        <div class="td-actions">
          <button class="td-btn td-btn--edit" data-action="edit">Editar</button>
          <button class="td-btn td-btn--renew" data-action="renew">Renovar</button>
          <button class="td-btn td-btn--delete" data-action="del">Eliminar</button>
        </div>
      </td>
    `;

    tr.querySelectorAll(".td-btn").forEach((button) => {
      button.addEventListener("click", () => handleAction(button.dataset.action, member, tr));
    });

    return tr;
  }

  function renderRows() {
    const sorted = sortMembers(filtered);
    const total = sorted.length;
    const pages = Math.ceil(total / PAGE_SIZE) || 1;
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = sorted.slice(start, start + PAGE_SIZE);

    const from = total ? start + 1 : 0;
    const to = Math.min(start + PAGE_SIZE, total);
    pageInfo.textContent = `Mostrando ${from}-${to} de ${total} miembros`;
    renderPagination(pages);

    if (!page.length) {
      tbody.innerHTML = '<tr class="tr-empty"><td colspan="6">No hay miembros que coincidan.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    page.forEach((member) => tbody.appendChild(buildRow(member)));
  }

  function applyFilters() {
    const query = String(searchEl.value || "").trim().toLowerCase();
    filtered = allMembers.filter((member) => {
      const matchSearch = !query || `${member.name} ${member.email} ${member.assignedTrainer?.name || ""}`.toLowerCase().includes(query);
      const matchTab = activeTab === "todos" || memberStatus(member) === activeTab;
      return matchSearch && matchTab;
    });
    currentPage = 1;
    renderRows();
  }

  async function loadMembers() {
    showSkeletons();
    try {
      const [memberData, trainerData] = await Promise.all([
        GymApp.api("/api/admin/members"),
        GymApp.api("/api/trainers")
      ]);
      allMembers = memberData.members || [];
      trainers = trainerData.trainers || [];
      updateStats();
      applyFilters();
    } catch (error) {
      tbody.innerHTML = `<tr class="tr-empty"><td colspan="6">Error al cargar: ${error.message}</td></tr>`;
      GymApp.toast(`Error: ${error.message}`, "error");
    }
  }

  async function handleAction(action, member, rowElement) {
    if (action === "edit") {
      showEditModal(member, async (payload) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          GymApp.toast("Miembro actualizado.", "success");
          await loadMembers();
        } catch (error) {
          GymApp.toast(`Error: ${error.message}`, "error");
        }
      });
      return;
    }

    if (action === "renew") {
      showRenewModal(member, async (days, plan) => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}/renew`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days, plan })
          });
          GymApp.toast(`Membresia de ${member.name} renovada.`, "success");
          await loadMembers();
        } catch (error) {
          GymApp.toast(`Error: ${error.message}`, "error");
        }
      });
      return;
    }

    showDeleteModal(member, async () => {
      rowElement.classList.add("card-fade-out");
      rowElement.addEventListener("animationend", async () => {
        try {
          await GymApp.api(`/api/admin/members/${member.id}`, { method: "DELETE" });
          GymApp.toast(`${member.name} eliminado.`, "info");
          await loadMembers();
        } catch (error) {
          rowElement.classList.remove("card-fade-out");
          GymApp.toast(`Error: ${error.message}`, "error");
        }
      }, { once: true });
    });
  }

  btnLogout.addEventListener("click", () => {
    GymApp.clearSession();
    window.location.href = "login.html";
  });

  btnExport.addEventListener("click", () => {
    const rows = [["Nombre", "Correo", "Plan", "Entrenador", "Dias restantes", "Estado"]];
    sortMembers(filtered).forEach((member) => {
      rows.push([
        member.name,
        member.email,
        member.membership?.plan || "Sin plan",
        member.assignedTrainer?.name || "Sin asignar",
        member.membership?.daysRemaining ?? 0,
        member.membership?.status || "Activo"
      ]);
    });

    const csv = rows.map((row) => row.map((value) => `"${value}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "miembros.csv";
    link.click();
    GymApp.toast("CSV exportado correctamente.", "success");
  });

  ths.forEach((th) => {
    th.addEventListener("click", () => {
      const col = th.dataset.col;
      if (sortCol === col) sortAsc = !sortAsc;
      else {
        sortCol = col;
        sortAsc = true;
      }

      ths.forEach((header) => {
        header.classList.remove("sorted");
        const icon = header.querySelector(".sort-icon");
        if (icon) icon.textContent = "↕";
      });

      th.classList.add("sorted");
      const icon = th.querySelector(".sort-icon");
      if (icon) icon.textContent = sortAsc ? "↑" : "↓";
      renderRows();
    });
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.filter;
      applyFilters();
    });
  });

  searchEl.addEventListener("input", applyFilters);
  loadMembers();
});
