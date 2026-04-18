"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".input-field");
  const loginButton = document.querySelector(".btn-orange");
  const helperLinks = document.querySelectorAll(".login-links a");

  if (!loginButton || inputs.length < 2) {
    return;
  }

  const usernameInput = inputs[0];
  const passwordInput = inputs[1];

  loginButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await doLogin();
  });

  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") await doLogin();
    });
  });

  async function doLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      alert("Completa usuario y contrasena.");
      return;
    }

    try {
      const data = await GymApp.api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const role = String(data.role || "").toLowerCase();
      const displayName = data.name || username;

      GymApp.setSession({
        username,
        displayName,
        role,
        token: data.token || null
      });

      window.location.href = GymApp.getHomeByRole(role);
      return;
    } catch (error) {
      alert(error.message || "No se pudo iniciar sesion.");
    }
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

  function showForgotModal() {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Recuperar contrasena</h3>
      <p class="gm-body">Ingresa tu correo y el administrador te enviara las instrucciones de recuperacion.</p>
      <div class="gm-form" style="text-align:left;">
        <div class="gm-field">
          <label>Correo electronico</label>
          <input id="gmForgotEmail" class="gm-input" type="email" placeholder="tucorreo@ejemplo.com" />
        </div>
        <span class="gm-error" id="gmForgotErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSend">Enviar solicitud</button>
      </div>
    `;
    const emailInput = box.querySelector("#gmForgotEmail");
    const errEl = box.querySelector("#gmForgotErr");
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSend").onclick = () => {
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Ingresa un correo valido.";
        return;
      }
      overlay.remove();
      const { overlay: confirmOverlay, box: confirmBox } = createOverlay();
      confirmBox.innerHTML = `
        <h3 class="gm-title">Solicitud enviada</h3>
        <p class="gm-body">Se notificara al administrador para restablecer la contrasena de <strong>${email}</strong>.</p>
        <div class="gm-actions">
          <button class="gm-btn gm-btn-primary" id="gmOk">Aceptar</button>
        </div>
      `;
      confirmBox.querySelector("#gmOk").onclick = () => confirmOverlay.remove();
    };
  }

  function showRegisterModal() {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Nuevo miembro</h3>
      <p class="gm-body">
        El registro de nuevos miembros lo realiza el equipo del gimnasio.<br><br>
        Visita <strong>FITNESS EVOLUTIONS GYM</strong> y el staff te dara acceso a tu cuenta.
      </p>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-primary" id="gmOk">Entendido</button>
      </div>
    `;
    box.querySelector("#gmOk").onclick = () => overlay.remove();
  }

  helperLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (link.textContent.toLowerCase().includes("contras")) {
        showForgotModal();
      } else {
        showRegisterModal();
      }
    });
  });
});
