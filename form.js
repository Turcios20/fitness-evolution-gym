"use strict";

document.addEventListener("DOMContentLoaded", () => {
  if (!GymApp.guardRoute(["admin", "recepcionista"])) return;

  let PLAN_PRICES = {};

  const session = GymApp.getSession();
  const homePage = GymApp.getHomeByRole(session.role);
  let trainers = [];
  let lastSuggestedPrice = null;

  const campos = {
    nombre: document.getElementById("nombre"),
    correo: document.getElementById("correo"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirmPassword"),
    rol: document.getElementById("rol"),
    plan: document.getElementById("plan"),
    precio: document.getElementById("precio"),
    metodoPago: document.getElementById("metodoPago"),
    trainerId: document.getElementById("trainerId")
  };

  const errores = {
    nombre: document.getElementById("err-nombre"),
    correo: document.getElementById("err-correo"),
    password: document.getElementById("err-password"),
    confirmPassword: document.getElementById("err-confirm-password"),
    plan: document.getElementById("err-plan"),
    precio: document.getElementById("err-precio"),
    metodoPago: document.getElementById("err-metodo-pago")
  };

  const btnGuardar = document.getElementById("btn-guardar");
  const formMsg = document.getElementById("form-msg");
  const formTitle = document.getElementById("formTitle");
  const formSubtitle = document.getElementById("formSubtitle");
  const membershipFields = document.querySelectorAll("[data-membership-field]");
  const trainerFields = document.querySelectorAll("[data-trainer-field]");

  document.getElementById("linkHome").href = homePage;
  document.getElementById("btnBack").href = homePage;
  document.getElementById("btnCancel").href = homePage;

  GymApp.setupPasswordToggles(document);

  if (session.role === "recepcionista") {
    campos.rol.innerHTML = '<option value="cliente">Cliente</option>';
    campos.rol.value = "cliente";
    campos.rol.disabled = true;
    document.getElementById("linkMembers").href = "recepcionista.html";
    document.getElementById("linkSettings").href = "ajustes-recepcion.html";
    formSubtitle.textContent = "Recepcion";

    GymApp.setupUserMenu({ anchorId: "receptionAvatar", avatarId: "receptionAvatar" });
    document.getElementById("btnReceptionLogout")?.addEventListener("click", () => {
      GymApp.clearSession();
      window.location.href = "login.html";
    });
  }

  function mostrarMensaje(texto, tipo) {
    formMsg.textContent = texto;
    formMsg.className = `form-msg form-msg--${tipo}`;
    formMsg.style.display = "block";
  }

  function limpiarErrores() {
    Object.values(errores).forEach((el) => {
      if (el) el.textContent = "";
    });
    formMsg.style.display = "none";
  }

  function selectedRole() {
    return String(campos.rol.value || "cliente").toLowerCase();
  }

  function isClientRole() {
    return selectedRole() === "cliente";
  }

  function renderTrainerOptions() {
    if (!campos.trainerId) return;

    campos.trainerId.innerHTML = ['<option value="">Sin asignar</option>']
      .concat(trainers.map((trainer) => `<option value="${trainer.id}">${trainer.name}</option>`))
      .join("");
  }

  function syncSuggestedPrice(force = false) {
    if (!isClientRole()) return;

    const suggestedPrice = PLAN_PRICES[campos.plan.value] || null;
    if (!suggestedPrice) return;

    const currentValue = Number(campos.precio.value);
    if (
      force ||
      !campos.precio.value.trim() ||
      (Number.isFinite(currentValue) && currentValue === lastSuggestedPrice)
    ) {
      campos.precio.value = String(suggestedPrice);
    }

    lastSuggestedPrice = suggestedPrice;
  }

  function syncFormByRole() {
    const clientRole = isClientRole();
    membershipFields.forEach((field) => {
      field.style.display = clientRole ? "block" : "none";
    });
    trainerFields.forEach((field) => {
      field.style.display = clientRole && session.role === "admin" ? "block" : "none";
    });

    if (campos.trainerId) {
      campos.trainerId.disabled = !clientRole || session.role !== "admin";
      if (campos.trainerId.disabled) campos.trainerId.value = "";
    }

    if (!clientRole) {
      campos.plan.value = "";
      campos.precio.value = "";
      campos.metodoPago.value = "Efectivo";
    } else {
      syncSuggestedPrice();
    }

    formTitle.textContent = clientRole ? "Agregar nuevo cliente" : "Agregar nuevo colaborador";
    btnGuardar.textContent = clientRole ? "Agregar cliente" : "Agregar usuario";
  }

  async function loadTrainers() {
    if (session.role !== "admin") return;

    try {
      const data = await GymApp.api("/api/trainers");
      trainers = data.trainers || [];
      renderTrainerOptions();
    } catch (error) {
      GymApp.toast(`No se pudo cargar entrenadores: ${error.message}`, "error");
    }
  }

  async function loadPlans() {
    if (!campos.plan) return;

    try {
      const planList = await GymApp.getPlans({ activeOnly: true });
      PLAN_PRICES = {};
      campos.plan.innerHTML = ['<option value="">Seleccionar plan...</option>']
        .concat(planList.map((plan) => {
          PLAN_PRICES[plan.nombre] = Number(plan.precio);
          return `<option value="${plan.nombre}">${plan.nombre}</option>`;
        }))
        .join("");
    } catch (error) {
      GymApp.toast(`No se pudieron cargar los planes: ${error.message}`, "error");
    }
  }

  function validar() {
    let valido = true;

    if (!campos.nombre.value.trim()) {
      errores.nombre.textContent = "El nombre es obligatorio.";
      valido = false;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(campos.correo.value.trim())) {
      errores.correo.textContent = "Ingresa un correo valido.";
      valido = false;
    }

    if (campos.password.value.length < 6) {
      errores.password.textContent = "La contrasena debe tener minimo 6 caracteres.";
      valido = false;
    }

    if (campos.password.value !== campos.confirmPassword.value) {
      errores.confirmPassword.textContent = "Las contrasenas no coinciden.";
      valido = false;
    }

    if (isClientRole()) {
      if (!campos.plan.value) {
        errores.plan.textContent = "Selecciona un plan.";
        valido = false;
      }

      const precio = Number(campos.precio.value);
      if (!precio || precio <= 0) {
        errores.precio.textContent = "Ingresa un precio valido mayor a 0.";
        valido = false;
      }

      if (!campos.metodoPago.value) {
        errores.metodoPago.textContent = "Selecciona un metodo de pago.";
        valido = false;
      }
    }

    return valido;
  }

  btnGuardar.addEventListener("click", async () => {
    limpiarErrores();
    if (!validar()) return;

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
      const response = await GymApp.api("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campos.nombre.value.trim(),
          email: campos.correo.value.trim(),
          password: campos.password.value,
          role: selectedRole(),
          plan: isClientRole() ? campos.plan.value : undefined,
          price: isClientRole() ? Number(campos.precio.value) : undefined,
          metodoPago: isClientRole() ? campos.metodoPago.value : undefined,
          trainerId: isClientRole() && session.role === "admin" && campos.trainerId.value
            ? Number(campos.trainerId.value)
            : undefined
        })
      });

      const invoiceText = response?.invoiceNumber
        ? ` Factura: ${response.invoiceNumber}.`
        : "";

      mostrarMensaje(
        isClientRole()
          ? `Cliente agregado correctamente.${invoiceText} Redirigiendo...`
          : "Usuario agregado correctamente. Redirigiendo...",
        "ok"
      );

      setTimeout(() => {
        window.location.href = homePage;
      }, 1500);
    } catch (error) {
      mostrarMensaje(`Error: ${error.message}`, "error");
      btnGuardar.disabled = false;
      syncFormByRole();
    }
  });

  campos.rol.addEventListener("change", syncFormByRole);
  campos.plan.addEventListener("change", () => syncSuggestedPrice());

  loadTrainers();
  loadPlans().then(() => syncFormByRole());
  syncFormByRole();
});
