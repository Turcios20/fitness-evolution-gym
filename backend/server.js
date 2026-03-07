"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

function roleToFrontend(role) {
  const value = String(role || "").toLowerCase();
  if (value === "administrador" || value === "admin") return "admin";
  return "cliente";
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "DB conectada" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "login.html"));
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({ error: "username y password requeridos" });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT id_usuario, nombre_completo, correo, password, rol
       FROM usuarios
       WHERE correo = ?
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    const user = rows[0];
    if (String(user.password) !== String(password)) {
      res.status(401).json({ error: "Credenciales invalidas" });
      return;
    }

    res.json({
      id: user.id_usuario,
      username: user.correo,
      name: user.nombre_completo,
      role: roleToFrontend(user.rol)
    });
  } catch (error) {
    res.status(500).json({ error: "Error en login", detail: error.message });
  }
});

app.post("/api/subscription/renew", async (req, res) => {
  const { username } = req.body || {};

  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userRows] = await connection.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1",
      [username]
    );

    if (!userRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const userId = userRows[0].id_usuario;

    const [membershipRows] = await connection.query(
      `SELECT id_membresia, fecha_vencimiento
       FROM membresias
       WHERE id_usuario = ?
       ORDER BY fecha_vencimiento DESC
       LIMIT 1`,
      [userId]
    );

    if (!membershipRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Membresia no encontrada" });
      return;
    }

    const membershipId = membershipRows[0].id_membresia;

    await connection.query(
      `UPDATE membresias
       SET fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL 30 DAY),
           estado = 'Activo'
       WHERE id_membresia = ?`,
      [membershipId]
    );

    await connection.commit();
    res.json({ ok: true, message: "Suscripcion renovada 30 dias" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error renovando membresia", detail: error.message });
  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
