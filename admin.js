"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = GymApp.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  if (session.role !== "admin") {
    window.location.href = "cliente.html";
    return;
  }

  const navLinks = document.querySelectorAll(".topnav .nav-link");
  const searchInput = document.querySelector(".search-bar input");
  const memberSection = document.querySelector(".fadein-3");
  const memberTemplate = document.querySelector(".member-card");
  const statsValues = document.querySelectorAll(".stat-card .stat-val");
  const welcomeTitle = document.querySelector(".welcome-title");

  let members = [];

  if (welcomeTitle) {
    welcomeTitle.textContent = `¡Bienvenido, ${session.displayName || "administrador"}!`;
  }

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === "#") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        alert("Modulo pendiente de implementacion.");
      });
    }
  });

  function createButton(label, bgColor) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.border = "none";
    button.style.borderRadius = "8px";
    button.style.padding = "6px 10px";
    button.style.cursor = "pointer";
    button.style.color = "#fff";
    button.style.fontSize = "12px";
    button.style.background = bgColor;
    return button;
  }

  function memberToCard(member) {
    const card = document.createElement("div");
    card.className = "member-card";

    const days = member.membership?.daysRemaining ?? 0;
    const plan = member.membership?.plan || "Sin plan";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = "assets/account_circle_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png";
    avatar.alt = "Avatar";

    const info = document.createElement("div");
    info.className = "member-info";

    const name = document.createElement("div");
    name.className = "member-name";
    name.textContent = member.name;

    const subtitle = document.createElement("div");
    subtitle.className = "member-days";
    subtitle.textContent = `${member.email} | ${plan} | ${days} dias`;

    info.appendChild(name);
    info.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginLeft = "auto";

    const editBtn = createButton("Editar", "#de7f2f");
    const renewBtn = createButton("Renovar", "#1f8f4f");
    const delBtn = createButton("Eliminar", "#b33a3a");

    editBtn.addEventListener("click", async () => {
      const nextName = prompt("Nombre", member.name);
      if (!nextName) return;
      const nextEmail = prompt("Correo", member.email);
      if (!nextEmail) return;
      const nextPlan = prompt("Plan", member.membership?.plan || "Mensual");
      if (!nextPlan) return;
      const nextStatus = prompt("Estado (Activo/Inactivo)", member.membership?.status || "Activo");
      if (!nextStatus) return;

      try {
        await GymApp.api(`/api/admin/members/${member.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nextName,
            email: nextEmail,
            plan: nextPlan,
            status: nextStatus
          })
        });
        await loadMembers();
      } catch (error) {
        alert(`No se pudo editar: ${error.message}`);
      }
    });

    renewBtn.addEventListener("click", async () => {
      const value = prompt("Dias a renovar", "30");
      if (!value) return;
      const daysToRenew = Number(value);
      if (!Number.isFinite(daysToRenew) || daysToRenew <= 0) {
        alert("Cantidad de dias invalida.");
        return;
      }

      try {
        await GymApp.api(`/api/admin/members/${member.id}/renew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days: daysToRenew })
        });
        await loadMembers();
      } catch (error) {
        alert(`No se pudo renovar: ${error.message}`);
      }
    });

    delBtn.addEventListener("click", async () => {
      const ok = confirm(`Eliminar a ${member.name}?`);
      if (!ok) return;
      try {
        await GymApp.api(`/api/admin/members/${member.id}`, { method: "DELETE" });
        await loadMembers();
      } catch (error) {
        alert(`No se pudo eliminar: ${error.message}`);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(renewBtn);
    actions.appendChild(delBtn);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  function renderMembers(list) {
    const allCards = memberSection.querySelectorAll(".member-card");
    allCards.forEach((card) => card.remove());

    list.forEach((member) => {
      memberSection.appendChild(memberToCard(member));
    });

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "member-card";
      empty.textContent = "No hay clientes registrados.";
      memberSection.appendChild(empty);
    }
  }

  function applySearch() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    if (!query) {
      renderMembers(members);
      return;
    }
    const filtered = members.filter((member) =>
      `${member.name} ${member.email}`.toLowerCase().includes(query)
    );
    renderMembers(filtered);
  }

  function ensureCreateButton() {
    if (!memberSection || memberSection.querySelector(".admin-create-member")) return;
    const searchBar = memberSection.querySelector(".search-bar");
    if (!searchBar) return;

    const createBtn = createButton("Agregar cliente", "#de7f2f");
    createBtn.className = "admin-create-member";
    createBtn.style.marginLeft = "8px";

    createBtn.addEventListener("click", async () => {
      const name = prompt("Nombre completo");
      if (!name) return;
      const email = prompt("Correo");
      if (!email) return;
      const password = prompt("Password");
      if (!password) return;
      const plan = prompt("Plan", "Mensual") || "Mensual";
      const priceRaw = prompt("Precio", "20");
      const price = Number(priceRaw || "20");

      try {
        await GymApp.api("/api/admin/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role: "cliente", plan, price })
        });
        await loadMembers();
      } catch (error) {
        alert(`No se pudo crear: ${error.message}`);
      }
    });

    searchBar.appendChild(createBtn);
  }

  async function loadMembers() {
    try {
      const data = await GymApp.api("/api/admin/members");
      members = data.members || [];

      if (statsValues[2]) {
        statsValues[2].textContent = String(data.total ?? members.length);
      }

      applySearch();
    } catch (error) {
      alert(`No se pudieron cargar miembros: ${error.message}`);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", applySearch);
  }

  if (memberTemplate) {
    memberTemplate.remove();
  }

  ensureCreateButton();
  loadMembers();
});
