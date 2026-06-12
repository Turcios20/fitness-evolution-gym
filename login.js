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

    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const requestResetCode = async (email) => {
      return GymApp.api("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
    };

    const renderRequestStep = (initialEmail = "") => {
      box.innerHTML = `
        <h3 class="gm-title">Recuperar contrasena</h3>
        <p class="gm-body">Ingresa tu correo y enviaremos un codigo de 6 digitos si la cuenta existe.</p>
        <div class="gm-form" style="text-align:left;">
          <div class="gm-field">
            <label>Correo electronico</label>
            <input id="gmForgotEmail" class="gm-input" type="email" placeholder="tucorreo@ejemplo.com" />
          </div>
          <span class="gm-error" id="gmForgotErr"></span>
        </div>
        <div class="gm-actions">
          <button class="gm-btn gm-btn-cancel" id="gmCancel">Cancelar</button>
          <button class="gm-btn gm-btn-primary" id="gmSend">Enviar codigo</button>
        </div>
      `;

      const emailInput = box.querySelector("#gmForgotEmail");
      const errEl = box.querySelector("#gmForgotErr");
      const sendButton = box.querySelector("#gmSend");

      emailInput.value = initialEmail;
      box.querySelector("#gmCancel").onclick = () => overlay.remove();

      const submit = async () => {
        const email = emailInput.value.trim();
        if (!isValidEmail(email)) {
          errEl.textContent = "Ingresa un correo valido.";
          return;
        }

        errEl.textContent = "";
        sendButton.disabled = true;

        try {
          const response = await requestResetCode(email);
          GymApp.toast(response?.message || "Revisa tu correo para continuar.", "success");
          renderResetStep(email);
        } catch (error) {
          errEl.textContent = error.message || "No se pudo procesar la recuperacion.";
          sendButton.disabled = false;
        }
      };

      sendButton.onclick = submit;
      emailInput.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          await submit();
        }
      });
      emailInput.focus();
    };

    const renderResetStep = (email) => {
      box.innerHTML = `
        <h3 class="gm-title">Codigo de recuperacion</h3>
        <p class="gm-body">Escribe el codigo de 6 digitos que enviamos a tu correo y define tu nueva contrasena.</p>
        <div class="gm-form" style="text-align:left;">
          <div class="gm-field">
            <label>Correo electronico</label>
            <input id="gmResetEmail" class="gm-input" type="email" readonly />
          </div>
          <div class="gm-field">
            <label>Codigo</label>
            <input id="gmResetCode" class="gm-input" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="123456" />
          </div>
          <div class="gm-field">
            <label>Nueva contrasena</label>
            <div class="password-field">
              <input id="gmResetPassword" class="gm-input" type="password" autocomplete="new-password" placeholder="Minimo 6 caracteres" />
              <button type="button" data-password-toggle="gmResetPassword"></button>
            </div>
          </div>
          <div class="gm-field">
            <label>Confirmar contrasena</label>
            <div class="password-field">
              <input id="gmResetPasswordConfirm" class="gm-input" type="password" autocomplete="new-password" placeholder="Repite tu contrasena" />
              <button type="button" data-password-toggle="gmResetPasswordConfirm"></button>
            </div>
          </div>
          <span class="gm-error" id="gmResetErr"></span>
        </div>
        <div class="gm-actions">
          <button class="gm-btn gm-btn-cancel" id="gmBack">Volver</button>
          <button class="gm-btn" id="gmResend">Reenviar codigo</button>
          <button class="gm-btn gm-btn-primary" id="gmResetSubmit">Guardar contrasena</button>
        </div>
      `;

      const emailInput = box.querySelector("#gmResetEmail");
      const codeInput = box.querySelector("#gmResetCode");
      const passwordField = box.querySelector("#gmResetPassword");
      const passwordConfirmField = box.querySelector("#gmResetPasswordConfirm");
      const errEl = box.querySelector("#gmResetErr");
      const resendButton = box.querySelector("#gmResend");
      const submitButton = box.querySelector("#gmResetSubmit");

      emailInput.value = email;
      GymApp.setupPasswordToggles(box);

      box.querySelector("#gmBack").onclick = () => renderRequestStep(email);

      resendButton.onclick = async () => {
        resendButton.disabled = true;
        errEl.textContent = "";

        try {
          const response = await requestResetCode(email);
          GymApp.toast(response?.message || "Te enviamos un nuevo codigo.", "success");
          codeInput.focus();
        } catch (error) {
          errEl.textContent = error.message || "No se pudo reenviar el codigo.";
        } finally {
          resendButton.disabled = false;
        }
      };

      const submit = async () => {
        const code = codeInput.value.trim();
        const newPassword = passwordField.value;
        const confirmPassword = passwordConfirmField.value;

        if (!/^\d{6}$/.test(code)) {
          errEl.textContent = "Ingresa un codigo valido de 6 digitos.";
          return;
        }

        if (newPassword.length < 6) {
          errEl.textContent = "La nueva contrasena debe tener al menos 6 caracteres.";
          return;
        }

        if (newPassword !== confirmPassword) {
          errEl.textContent = "Las contrasenas no coinciden.";
          return;
        }

        errEl.textContent = "";
        submitButton.disabled = true;

        try {
          const response = await GymApp.api("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword })
          });
          overlay.remove();
          usernameInput.value = email;
          passwordInput.value = "";
          GymApp.toast(response?.message || "Contrasena actualizada correctamente.", "success");
          passwordInput.focus();
        } catch (error) {
          errEl.textContent = error.message || "No se pudo actualizar la contrasena.";
          submitButton.disabled = false;
        }
      };

      submitButton.onclick = submit;
      [codeInput, passwordField, passwordConfirmField].forEach((input) => {
        input.addEventListener("keydown", async (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            await submit();
          }
        });
      });

      codeInput.focus();
    };

    renderRequestStep(usernameInput.value.trim());
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

  async function loadGymFooter() {
    const footer = document.getElementById("loginFooter");
    if (!footer) return;

    try {
      const response = await GymApp.api("/api/gym-settings");
      const gym = response.gym || {};

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "";
      };

      const direccion = [gym.direccion, gym.ciudad, gym.pais]
        .map((part) => (part || "").trim())
        .filter(Boolean)
        .join(", ");

      setText("footerEslogan", gym.eslogan);
      setText("footerTelefono", gym.telefono ? `Tel: ${gym.telefono}` : "");
      setText("footerCorreo", gym.correo);
      setText("footerDireccion", direccion);

      footer.hidden = false;
    } catch (error) {
      console.error("No se pudieron cargar los datos del gimnasio:", error);
    }
  }

  loadGymFooter();

  forgotPasswordLink?.addEventListener("click", (event) => {
    event.preventDefault();
    showForgotModal();
  });

  registerInfoLink?.addEventListener("click", (event) => {
    event.preventDefault();
    showRegisterModal();
  });
});
