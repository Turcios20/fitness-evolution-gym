"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const loginButton = document.getElementById("btnLogin");
  const loginFeedback = document.getElementById("loginFeedback");
  const forgotPasswordLink = document.getElementById("linkForgotPassword");
  const registerInfoLink = document.getElementById("linkRegisterInfo");

  if (!loginButton || !usernameInput || !passwordInput) {
    return;
  }

  GymApp.setupPasswordToggles(document);

  function setFeedback(message, type = "") {
    loginFeedback.textContent = message || "";
    loginFeedback.className = "login-feedback";
    if (type) {
      loginFeedback.classList.add(`is-${type}`);
    }
  }

  loginButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await doLogin();
  });

  [usernameInput, passwordInput].forEach((input) => {
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await doLogin();
      }
    });
  });

  async function doLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      setFeedback("Completa correo y contrasena.", "error");
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Ingresando...";
    setFeedback("");

    try {
      const data = await GymApp.api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const role = String(data.role || "").toLowerCase();
      const displayName = data.name || username;

      GymApp.setSession({
        id: data.id,
        username,
        displayName,
        role,
        token: data.token || null
      });

      setFeedback("Acceso correcto. Redirigiendo...", "success");
      window.location.href = GymApp.getHomeByRole(role);
    } catch (error) {
      setFeedback(error.message || "No se pudo iniciar sesion.", "error");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Iniciar sesion";
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
      <p class="gm-body">Ingresa tu correo y enviaremos una contrasena temporal si la cuenta existe.</p>
      <div class="gm-form" style="text-align:left;">
        <div class="gm-field">
          <label>Correo electronico</label>
          <input id="gmForgotEmail" class="gm-input" type="email" placeholder="tucorreo@ejemplo.com" />
        </div>
        <span class="gm-error" id="gmForgotErr"></span>
      </div>
      <div class="gm-actions">
        <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
        <button class="gm-btn gm-btn-primary" id="gmSend">Enviar</button>
      </div>
    `;

    const emailInput = box.querySelector("#gmForgotEmail");
    const errEl = box.querySelector("#gmForgotErr");
    const sendButton = box.querySelector("#gmSend");

    box.querySelector("#gmCancel").onclick = () => overlay.remove();
    sendButton.onclick = async () => {
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = "Ingresa un correo valido.";
        return;
      }

      errEl.textContent = "";
      sendButton.disabled = true;

      try {
        const response = await GymApp.api("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        overlay.remove();
        GymApp.toast(response?.message || "Revisa tu correo para continuar.", "success");
      } catch (error) {
        errEl.textContent = error.message || "No se pudo procesar la recuperacion.";
        sendButton.disabled = false;
      }
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

  forgotPasswordLink?.addEventListener("click", (event) => {
    event.preventDefault();
    showForgotModal();
  });

  registerInfoLink?.addEventListener("click", (event) => {
    event.preventDefault();
    showRegisterModal();
  });
});
