"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const session = GymApp.getSession();
  if (!session || !["admin", "recepcionista"].includes(session.role)) {
    window.location.href = "login.html";
    return;
  }

  const homePage = GymApp.getHomeByRole(session.role);
  const campos = {
    nombre: document.getElementById("nombre"),
    correo: document.getElementById("correo"),
    password: document.getElementById("password"),
    rol: document.getElementById("rol"),
    plan: document.getElementById("plan"),
    precio: document.getElementById("precio")
  };

  const errores = {
    nombre: document.getElementById("err-nombre"),
    correo: document.getElementById("err-correo"),
    password: document.getElementById("err-password"),
    plan: document.getElementById("err-plan"),
    precio: document.getElementById("err-precio")
  };

  const btnGuardar = document.getElementById("btn-guardar");
  const formMsg = document.getElementById("form-msg");
  const formTitle = document.getElementById("formTitle");
  const formSubtitle = document.getElementById("formSubtitle");
  const membershipFields = document.querySelectorAll("[data-membership-field]");

  document.getElementById("linkHome").href = homePage;
  document.getElementById("btnBack").href = homePage;
  document.getElementById("btnCancel").href = homePage;

  if (session.role === "recepcionista") {
    campos.rol.innerHTML = '<option value="cliente">Cliente</option>';
    campos.rol.value = "cliente";
    campos.rol.disabled = true;
    document.getElementById("linkMembers").href = "recepcionista.html";
    document.getElementById("linkSettings").href = "recepcionista.html#ajustes";
    formSubtitle.textContent = "Recepcion";
  }

  function mostrarMensaje(texto, tipo) {
    formMsg.textContent = texto;
    formMsg.className = `form-msg form-msg--${tipo}`;
    formMsg.style.display = "block";
  }

  function limpiarErrores() {
    Object.values(errores).forEach((el) => {
      el.textContent = "";
    });
    formMsg.style.display = "none";
  }

  function selectedRole() {
    return String(campos.rol.value || "cliente").toLowerCase();
  }

  function isClientRole() {
    return selectedRole() === "cliente";
  }

  function syncFormByRole() {
    const clientRole = isClientRole();
    membershipFields.forEach((field) => {
      field.style.display = clientRole ? "block" : "none";
    });
    formTitle.textContent = clientRole ? "Agregar nuevo cliente" : "Agregar nuevo colaborador";
    btnGuardar.textContent = clientRole ? "Agregar cliente" : "Agregar usuario";
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
    }

    return valido;
  }

  btnGuardar.addEventListener("click", async () => {
    limpiarErrores();
    if (!validar()) return;

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";

    try {
      await GymApp.api("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campos.nombre.value.trim(),
          email: campos.correo.value.trim(),
          password: campos.password.value,
          role: selectedRole(),
          plan: isClientRole() ? campos.plan.value : undefined,
          price: isClientRole() ? Number(campos.precio.value) : undefined
        })
      });

      mostrarMensaje(
        isClientRole()
          ? "Cliente agregado correctamente. Redirigiendo..."
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
  syncFormByRole();
});
