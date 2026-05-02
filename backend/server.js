const { enviarCorreoRegistro } = require('./mailer');

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

function roleToDb(role) {
  const value = String(role || "").toLowerCase();
  if (value === "administrador" || value === "admin") return "Administrador";
  return "Cliente";
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

app.get("/api/client/dashboard", async (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.correo,
         u.rol,
         m.tipo_plan,
         m.fecha_vencimiento,
         m.estado,
         GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
       FROM usuarios u
       LEFT JOIN membresias m ON m.id_membresia = (
         SELECT m2.id_membresia
         FROM membresias m2
         WHERE m2.id_usuario = u.id_usuario
         ORDER BY m2.fecha_vencimiento DESC
         LIMIT 1
       )
       WHERE u.correo = ?
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const row = rows[0];
    res.json({
      id: row.id_usuario,
      name: row.nombre_completo,
      username: row.correo,
      role: roleToFrontend(row.rol),
      subscription: {
        plan: row.tipo_plan || "Sin plan",
        status: row.estado || "Inactivo",
        daysRemaining: Number(row.dias_restantes || 0),
        endDate: row.fecha_vencimiento || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error cargando dashboard", detail: error.message });
  }
});

app.get("/api/admin/members", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.correo,
         u.rol,
         m.id_membresia,
         m.tipo_plan,
         m.precio,
         m.estado,
         m.fecha_inicio,
         m.fecha_vencimiento,
         GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
       FROM usuarios u
       LEFT JOIN membresias m ON m.id_membresia = (
         SELECT m2.id_membresia
         FROM membresias m2
         WHERE m2.id_usuario = u.id_usuario
         ORDER BY m2.fecha_vencimiento DESC
         LIMIT 1
       )
       WHERE u.rol = 'Cliente'
       ORDER BY u.id_usuario DESC`
    );

    const members = rows.map((row) => ({
      id: row.id_usuario,
      name: row.nombre_completo,
      email: row.correo,
      role: roleToFrontend(row.rol),
      membership: row.id_membresia
        ? {
            id: row.id_membresia,
            plan: row.tipo_plan,
            price: Number(row.precio || 0),
            status: row.estado,
            startDate: row.fecha_inicio,
            endDate: row.fecha_vencimiento,
            daysRemaining: Number(row.dias_restantes || 0)
          }
        : null
    }));

    res.json({ members, total: members.length });
  } catch (error) {
    res.status(500).json({ error: "Error cargando miembros", detail: error.message });
  }
});

app.post("/api/admin/members", async (req, res) => {
  const { name, email, password, role, plan, price } = req.body || {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email y password son requeridos" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const dbRole = roleToDb(role);
    const [insertUser] = await connection.query(
      `INSERT INTO usuarios (nombre_completo, correo, password, rol)
       VALUES (?, ?, ?, ?)`,
      [name, email, password, dbRole]
    );

    if (dbRole === "Cliente") {
      await connection.query(
        `INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
         VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Activo')`,
        [insertUser.insertId, plan || "Mensual", Number(price || 20)]
      );
    }

    await connection.commit();

        // ENVÍO DE CORREO
        try {
            await enviarFacturaRegistro(email, {
                nombre: name,
                monto: price,
                plan: plan
            });
        } catch (mailError) {
            console.error("El usuario se guardó, pero falló el correo:", mailError);
        }

    res.status(201).json({ ok: true, id: insertUser.insertId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error creando miembro", detail: error.message });
  } finally {
    connection.release();
  }
});

app.put("/api/admin/members/:id", async (req, res) => {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  const { name, email, password, role, plan, price, status } = req.body || {};
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const updates = [];
    const values = [];

    if (name) {
      updates.push("nombre_completo = ?");
      values.push(name);
    }
    if (email) {
      updates.push("correo = ?");
      values.push(email);
    }
    if (password) {
      updates.push("password = ?");
      values.push(password);
    }
    if (role) {
      updates.push("rol = ?");
      values.push(roleToDb(role));
    }

    if (updates.length) {
      values.push(memberId);
      await connection.query(
        `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
        values
      );
    }

    if (plan || price != null || status) {
      const [membRows] = await connection.query(
        `SELECT id_membresia FROM membresias WHERE id_usuario = ? ORDER BY fecha_vencimiento DESC LIMIT 1`,
        [memberId]
      );

      if (membRows.length) {
        const mUpdates = [];
        const mValues = [];
        if (plan) {
          mUpdates.push("tipo_plan = ?");
          mValues.push(plan);
        }
        if (price != null) {
          mUpdates.push("precio = ?");
          mValues.push(Number(price));
        }
        if (status) {
          mUpdates.push("estado = ?");
          mValues.push(status);
        }
        if (mUpdates.length) {
          mValues.push(membRows[0].id_membresia);
          await connection.query(
            `UPDATE membresias SET ${mUpdates.join(", ")} WHERE id_membresia = ?`,
            mValues
          );
        }
      }
    }

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error editando miembro", detail: error.message });
  } finally {
    connection.release();
  }
});

app.post("/api/admin/members/:id/renew", async (req, res) => {
  const memberId = Number(req.params.id);
  const days = Number(req.body?.days || 30);
  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [membRows] = await connection.query(
      `SELECT id_membresia FROM membresias WHERE id_usuario = ? ORDER BY fecha_vencimiento DESC LIMIT 1`,
      [memberId]
    );

    if (membRows.length) {
      await connection.query(
        `UPDATE membresias
         SET fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL ? DAY),
             estado = 'Activo'
         WHERE id_membresia = ?`,
        [days, membRows[0].id_membresia]
      );
    } else {
      await connection.query(
        `INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
         VALUES (?, 'Mensual', 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'Activo')`,
        [memberId, days]
      );
    }

    await connection.commit();
    res.json({ ok: true, message: `Membresia renovada ${days} dias` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error renovando miembro", detail: error.message });
  } finally {
    connection.release();
  }
});

app.delete("/api/admin/members/:id", async (req, res) => {
  const memberId = Number(req.params.id);
  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM usuarios WHERE id_usuario = ? AND rol = 'Cliente'`,
      [memberId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error eliminando miembro", detail: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
