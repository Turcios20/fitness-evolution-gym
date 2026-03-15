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

  helperLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      alert("Esta opción se conectará al backend más adelante.");
    });
  });
});
