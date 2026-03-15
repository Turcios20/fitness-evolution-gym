"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Redirige al login si no hay sesión activa
  const session = GymApp.getSession();
  if (!session || session.role !== "admin") {
    window.location.href = "login.html";
    return;
  }

  // Referencias a los campos del formulario
  const campos = {
    nombre:   document.getElementById("nombre"),
    correo:   document.getElementById("correo"),
    password: document.getElementById("password"),
    plan:     document.getElementById("plan"),
    precio:   document.getElementById("precio"),
  };

  const errores = {
    nombre:   document.getElementById("err-nombre"),
    correo:   document.getElementById("err-correo"),
    password: document.getElementById("err-password"),
    plan:     document.getElementById("err-plan"),
    precio:   document.getElementById("err-precio"),
  };

  const btnGuardar = document.getElementById("btn-guardar");
  const formMsg    = document.getElementById("form-msg");

  // Muestra u oculta el mensaje global del formulario
  function mostrarMensaje(texto, tipo) {
    formMsg.textContent = texto;
    formMsg.className   = `form-msg form-msg--${tipo}`;
    formMsg.style.display = "block";
  }

  // Limpia los mensajes de error de todos los campos
  function limpiarErrores() {
    Object.values(errores).forEach((el) => { el.textContent = ""; });
    formMsg.style.display = "none";
  }

  // Valida todos los campos y devuelve true si todo está bien
  function validar() {
    let valido = true;

    if (!campos.nombre.value.trim()) {
      errores.nombre.textContent = "El nombre es obligatorio.";
      valido = false;
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailReg.test(campos.correo.value.trim())) {
      errores.correo.textContent = "Ingresa un correo válido.";
      valido = false;
    }

    if (campos.password.value.length < 6) {
      errores.password.textContent = "La contraseña debe tener mínimo 6 caracteres.";
      valido = false;
    }

    if (!campos.plan.value) {
      errores.plan.textContent = "Selecciona un plan.";
      valido = false;
    }

    const precio = Number(campos.precio.value);
    if (!precio || precio <= 0) {
      errores.precio.textContent = "Ingresa un precio válido mayor a 0.";
      valido = false;
    }

    return valido;
  }

  // Envía los datos al backend cuando el admin hace clic en "Agregar cliente"
  btnGuardar.addEventListener("click", async () => {
    limpiarErrores();

    if (!validar()) return;

    btnGuardar.disabled     = true;
    btnGuardar.textContent  = "Guardando...";

    try {
      await GymApp.api("/api/admin/members", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     campos.nombre.value.trim(),
          email:    campos.correo.value.trim(),
          password: campos.password.value,
          role:     "cliente",
          plan:     campos.plan.value,
          price:    Number(campos.precio.value),
        }),
      });

      // Éxito: regresa al panel admin después de 1.5s
      mostrarMensaje("✔ Cliente agregado correctamente. Redirigiendo...", "ok");
      setTimeout(() => { window.location.href = "admin.html"; }, 1500);

    } catch (error) {
      mostrarMensaje(`Error: ${error.message}`, "error");
      btnGuardar.disabled    = false;
      btnGuardar.textContent = "Agregar cliente";
    }
  });
});
