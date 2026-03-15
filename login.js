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

  // Soporte para Enter en cualquiera de los dos campos
  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") await doLogin();
    });
  });

  async function doLogin() {

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      alert("Completa usuario y contraseña.");
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

      window.location.href = role === "admin" ? "admin.html" : "cliente.html";
      return;
    } catch {
      // Fallback local mientras no exista API activa.
    }

    const localUsers = [
      { username: "admin@victorsgym.com", password: "admin123", role: "admin", displayName: "Victor Administrator" },
      { username: "jhoscar@correo.com", password: "cliente123", role: "cliente", displayName: "Jhoscar Ochoa" },
      { username: "admin", password: "admin123", role: "admin", displayName: "Administrador" },
      { username: "cliente", password: "cliente123", role: "cliente", displayName: "Jhoscar" }
    ];

    const matchedUser = localUsers.find(
      (user) => user.username === username && user.password === password
    );

    if (!matchedUser) {
      alert("Credenciales inválidas.");
      return;
    }

    GymApp.setSession({
      username: matchedUser.username,
      displayName: matchedUser.displayName,
      role: matchedUser.role,
      token: null
    });

    window.location.href = matchedUser.role === "admin" ? "admin.html" : "cliente.html";
  }

  // ── Sistema de modales (igual al del admin) ──
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

  // Modal de "Olvidé mi contraseña" — campo de correo
  function showForgotModal() {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <h3 class="gm-title">Recuperar contraseña</h3>
      <p class="gm-body">Ingresa tu correo y el administrador te enviará las instrucciones de recuperación.</p>
      <div class="gm-form" style="text-align:left;">
        <div class="gm-field">
          <label>Correo electrónico</label>
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
    const errEl      = box.querySelector("#gmForgotErr");
    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    box.querySelector("#gmSend").onclick = () => {
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Ingresa un correo válido.";
        return;
      }
      overlay.remove();
      // Confirmación
      const { overlay: o2, box: b2 } = createOverlay();
      b2.innerHTML = `
        <div style="font-size:36px;margin-bottom:12px;">✉️</div>
        <h3 class="gm-title">Solicitud enviada</h3>
        <p class="gm-body">Se notificará al administrador para restablecer la contraseña de <strong>${email}</strong>.</p>
        <div class="gm-actions">
          <button class="gm-btn gm-btn-primary" id="gmOk">Aceptar</button>
        </div>
      `;
      b2.querySelector("#gmOk").onclick = () => o2.remove();
    };
  }

  // Modal de "Regístrate" — informa que el registro lo hace el admin
  function showRegisterModal() {
    const { overlay, box } = createOverlay();
    box.innerHTML = `
      <div style="font-size:36px;margin-bottom:12px;">🏋️</div>
      <h3 class="gm-title">¿Nuevo miembro?</h3>
      <p class="gm-body">
        El registro de nuevos miembros lo realiza el administrador del gimnasio.<br><br>
        Visita <strong>FITNESS EVOLUTIONS GYM</strong> y el staff te dará acceso a tu cuenta.
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
      // Distingue por el texto del link
      if (link.textContent.toLowerCase().includes("contraseña")) {
        showForgotModal();
      } else {
        showRegisterModal();
      }
    });
  });
});
