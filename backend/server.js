"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DAY_MS = 24 * 60 * 60 * 1000;

const MEMBER_SELECT_SQL = `
  SELECT
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
`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

async function ensureAttendanceSchema() {
  await pool.query(
    `ALTER TABLE usuarios
     MODIFY rol VARCHAR(40) NOT NULL DEFAULT 'Cliente'`
  );

  await pool.query(
    `UPDATE usuarios
     SET rol = CASE
       WHEN LOWER(TRIM(rol)) IN ('administrador', 'admin') THEN 'Administrador'
       WHEN LOWER(TRIM(rol)) IN ('recepcionista', 'recepcion') THEN 'Recepcionista'
       ELSE 'Cliente'
     END`
  );

  await pool.query(
    `ALTER TABLE usuarios
     MODIFY rol ENUM('Administrador', 'Cliente', 'Recepcionista') NOT NULL DEFAULT 'Cliente'`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS asistencia (
       id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
       id_usuario INT,
       fecha_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
     )`
  );

  try {
    await pool.query(
      `CREATE INDEX idx_asistencia_usuario_fecha
       ON asistencia (id_usuario, fecha_entrada)`
    );
  } catch (error) {
    if (error?.code !== "ER_DUP_KEYNAME") {
      throw error;
    }
  }

  await pool.query(
    `INSERT INTO usuarios (nombre_completo, correo, password, rol)
     SELECT 'Maria Recepcion', 'recepcion@fitnessgym.com', 'recep123', 'Recepcionista'
     WHERE NOT EXISTS (
       SELECT 1 FROM usuarios WHERE correo = 'recepcion@fitnessgym.com'
     )`
  );
}

function roleToFrontend(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "administrador" || value === "admin") return "admin";
  if (value === "recepcionista" || value === "recepcion") return "recepcionista";
  return "cliente";
}

function roleToDb(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "administrador" || value === "admin") return "Administrador";
  if (value === "recepcionista" || value === "recepcion") return "Recepcionista";
  return "Cliente";
}

function formatDateValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeValue(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function startOfToday() {
  return formatDateValue(new Date());
}

function offsetDate(days) {
  return formatDateValue(new Date(Date.now() + (days * DAY_MS)));
}

function normalizeDateInput(value, label) {
  const normalized = formatDateValue(value);
  if (!normalized) {
    const error = new Error(`${label} invalida`);
    error.status = 400;
    throw error;
  }

  return normalized;
}

function resolveDateRange(fromInput, toInput, fallbackDays = 6) {
  const defaultTo = startOfToday();
  const defaultFrom = offsetDate(-fallbackDays);
  const from = normalizeDateInput(fromInput || defaultFrom, "Fecha inicial");
  const to = normalizeDateInput(toInput || defaultTo, "Fecha final");

  if (from > to) {
    const error = new Error("La fecha inicial no puede ser mayor que la fecha final");
    error.status = 400;
    throw error;
  }

  return { from, to };
}

function escapeLike(value) {
  return String(value || "").replace(/[\\%_]/g, "\\$&");
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildMembership(row) {
  if (!row || row.id_membresia == null) {
    return null;
  }

  const daysRemaining = Number(row.dias_restantes || 0);
  const status = row.estado || "Inactivo";

  return {
    id: row.id_membresia,
    plan: row.tipo_plan || "Sin plan",
    price: Number(row.precio || 0),
    status,
    startDate: formatDateValue(row.fecha_inicio),
    endDate: formatDateValue(row.fecha_vencimiento),
    daysRemaining,
    isExpired: status !== "Activo" || daysRemaining <= 0
  };
}

function getMembershipIndicator(membership) {
  if (!membership) {
    return {
      tone: "red",
      label: "Sin membresia",
      detail: "El miembro no tiene una membresia asignada."
    };
  }

  if (membership.daysRemaining <= 0) {
    return {
      tone: "red",
      label: "Vencida",
      detail: "La membresia ya vencio al momento del registro."
    };
  }

  if (membership.status !== "Activo") {
    return {
      tone: "orange",
      label: "Inactiva",
      detail: "La membresia esta inactiva."
    };
  }

  return {
    tone: "green",
    label: "Activa",
    detail: `Membresia vigente con ${membership.daysRemaining} dia(s) restante(s).`
  };
}

function mapMemberRow(row) {
  const membership = buildMembership(row);

  return {
    id: row.id_usuario,
    name: row.nombre_completo,
    email: row.correo,
    role: roleToFrontend(row.rol),
    membership,
    membershipIndicator: getMembershipIndicator(membership)
  };
}

function mapAttendanceRow(row) {
  const member = mapMemberRow(row);

  return {
    id: row.id_asistencia,
    checkedInAt: row.fecha_entrada,
    checkedInDate: formatDateValue(row.fecha_entrada),
    checkedInTime: formatTimeValue(row.fecha_entrada),
    member,
    membershipIndicator: member.membershipIndicator
  };
}

function buildCsv(entries) {
  const rows = [
    [
      "id_asistencia",
      "fecha",
      "hora",
      "id_miembro",
      "nombre",
      "correo",
      "membresia",
      "estado_membresia",
      "dias_restantes",
      "indicador"
    ]
  ];

  entries.forEach((entry) => {
    rows.push([
      entry.id,
      entry.checkedInDate || "",
      entry.checkedInTime || "",
      entry.member.id,
      entry.member.name,
      entry.member.email,
      entry.member.membership?.plan || "Sin membresia",
      entry.member.membership?.status || "Sin membresia",
      entry.member.membership?.daysRemaining ?? 0,
      entry.membershipIndicator.label
    ]);
  });

  return rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
}

function summarizeAttendance(entries) {
  const membersMap = new Map();
  let expiredCheckins = 0;
  let inactiveCheckins = 0;
  let activeCheckins = 0;

  entries.forEach((entry) => {
    if (entry.membershipIndicator.tone === "red") {
      expiredCheckins += 1;
    } else if (entry.membershipIndicator.tone === "orange") {
      inactiveCheckins += 1;
    } else {
      activeCheckins += 1;
    }

    const current = membersMap.get(entry.member.id) || {
      memberId: entry.member.id,
      name: entry.member.name,
      email: entry.member.email,
      count: 0,
      lastCheckIn: null,
      membershipIndicator: entry.membershipIndicator
    };

    current.count += 1;
    current.lastCheckIn = entry.checkedInAt;
    current.membershipIndicator = entry.membershipIndicator;
    membersMap.set(entry.member.id, current);
  });

  return {
    totalCheckins: entries.length,
    uniqueMembers: membersMap.size,
    expiredCheckins,
    inactiveCheckins,
    activeCheckins,
    members: Array.from(membersMap.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  };
}

async function findUserByUsername(username, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id_usuario, nombre_completo, correo, password, rol
     FROM usuarios
     WHERE correo = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function getMemberById(memberId, executor = pool) {
  const [rows] = await executor.query(
    `${MEMBER_SELECT_SQL}
     WHERE u.id_usuario = ?
       AND u.rol = 'Cliente'
     LIMIT 1`,
    [memberId]
  );

  return rows[0] ? mapMemberRow(rows[0]) : null;
}

async function listMembers({ query = "", limit = 25 } = {}, executor = pool) {
  const filters = ["u.rol = 'Cliente'"];
  const values = [];
  const normalizedQuery = String(query || "").trim();

  if (normalizedQuery) {
    const likeValue = `%${escapeLike(normalizedQuery)}%`;
    filters.push("(u.nombre_completo LIKE ? OR u.correo LIKE ? OR CAST(u.id_usuario AS CHAR) LIKE ?)");
    values.push(likeValue, likeValue, likeValue);
  }

  values.push(Number(limit) || 25);

  const [rows] = await executor.query(
    `${MEMBER_SELECT_SQL}
     WHERE ${filters.join(" AND ")}
     ORDER BY u.nombre_completo ASC
     LIMIT ?`,
    values
  );

  return rows.map(mapMemberRow);
}

async function getAttendanceEntries({ from, to, memberId = null, query = "" } = {}, executor = pool) {
  const filters = ["DATE(a.fecha_entrada) BETWEEN ? AND ?"];
  const values = [from, to];

  if (memberId != null) {
    filters.push("u.id_usuario = ?");
    values.push(memberId);
  }

  const normalizedQuery = String(query || "").trim();
  if (normalizedQuery) {
    const likeValue = `%${escapeLike(normalizedQuery)}%`;
    filters.push("(u.nombre_completo LIKE ? OR u.correo LIKE ? OR CAST(u.id_usuario AS CHAR) LIKE ?)");
    values.push(likeValue, likeValue, likeValue);
  }

  const [rows] = await executor.query(
    `SELECT
       a.id_asistencia,
       a.fecha_entrada,
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
       GREATEST(DATEDIFF(m.fecha_vencimiento, DATE(a.fecha_entrada)), 0) AS dias_restantes
     FROM asistencia a
     INNER JOIN usuarios u
       ON u.id_usuario = a.id_usuario
      AND u.rol = 'Cliente'
     LEFT JOIN membresias m ON m.id_membresia = (
       SELECT m2.id_membresia
       FROM membresias m2
       WHERE m2.id_usuario = u.id_usuario
         AND m2.fecha_inicio <= DATE(a.fecha_entrada)
       ORDER BY m2.fecha_inicio DESC, m2.fecha_vencimiento DESC
       LIMIT 1
     )
     WHERE ${filters.join(" AND ")}
     ORDER BY a.fecha_entrada DESC, u.nombre_completo ASC`,
    values
  );

  return rows.map(mapAttendanceRow);
}

async function getLatestAttendanceForToday(memberId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id_asistencia, fecha_entrada
     FROM asistencia
     WHERE id_usuario = ?
       AND DATE(fecha_entrada) = CURDATE()
     ORDER BY fecha_entrada DESC
     LIMIT 1`,
    [memberId]
  );

  return rows[0] || null;
}

async function getAttendanceEntryById(attendanceId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT
       a.id_asistencia,
       a.fecha_entrada,
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
       GREATEST(DATEDIFF(m.fecha_vencimiento, DATE(a.fecha_entrada)), 0) AS dias_restantes
     FROM asistencia a
     INNER JOIN usuarios u
       ON u.id_usuario = a.id_usuario
     LEFT JOIN membresias m ON m.id_membresia = (
       SELECT m2.id_membresia
       FROM membresias m2
       WHERE m2.id_usuario = u.id_usuario
         AND m2.fecha_inicio <= DATE(a.fecha_entrada)
       ORDER BY m2.fecha_inicio DESC, m2.fecha_vencimiento DESC
       LIMIT 1
     )
     WHERE a.id_asistencia = ?
     LIMIT 1`,
    [attendanceId]
  );

  return rows[0] ? mapAttendanceRow(rows[0]) : null;
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
    const user = await findUserByUsername(username);

    if (!user) {
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

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

    const user = await findUserByUsername(username, connection);
    if (!user) {
      await connection.rollback();
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const [membershipRows] = await connection.query(
      `SELECT id_membresia
       FROM membresias
       WHERE id_usuario = ?
       ORDER BY fecha_vencimiento DESC
       LIMIT 1`,
      [user.id_usuario]
    );

    if (!membershipRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Membresia no encontrada" });
      return;
    }

    await connection.query(
      `UPDATE membresias
       SET fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL 30 DAY),
           estado = 'Activo'
       WHERE id_membresia = ?`,
      [membershipRows[0].id_membresia]
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
    const user = await findUserByUsername(username);
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const member = await getMemberById(user.id_usuario);

    res.json({
      id: user.id_usuario,
      name: user.nombre_completo,
      username: user.correo,
      role: roleToFrontend(user.rol),
      subscription: member?.membership || {
        plan: "Sin plan",
        status: "Inactivo",
        daysRemaining: 0,
        endDate: null
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Error cargando dashboard", detail: error.message });
  }
});

app.get("/api/admin/members", async (_req, res) => {
  try {
    const members = await listMembers({ limit: 500 });
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
      const [membershipRows] = await connection.query(
        `SELECT id_membresia
         FROM membresias
         WHERE id_usuario = ?
         ORDER BY fecha_vencimiento DESC
         LIMIT 1`,
        [memberId]
      );

      if (membershipRows.length) {
        const membershipUpdates = [];
        const membershipValues = [];

        if (plan) {
          membershipUpdates.push("tipo_plan = ?");
          membershipValues.push(plan);
        }
        if (price != null) {
          membershipUpdates.push("precio = ?");
          membershipValues.push(Number(price));
        }
        if (status) {
          membershipUpdates.push("estado = ?");
          membershipValues.push(status);
        }

        if (membershipUpdates.length) {
          membershipValues.push(membershipRows[0].id_membresia);
          await connection.query(
            `UPDATE membresias
             SET ${membershipUpdates.join(", ")}
             WHERE id_membresia = ?`,
            membershipValues
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

    const [membershipRows] = await connection.query(
      `SELECT id_membresia
       FROM membresias
       WHERE id_usuario = ?
       ORDER BY fecha_vencimiento DESC
       LIMIT 1`,
      [memberId]
    );

    if (membershipRows.length) {
      await connection.query(
        `UPDATE membresias
         SET fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL ? DAY),
             estado = 'Activo'
         WHERE id_membresia = ?`,
        [days, membershipRows[0].id_membresia]
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
      `DELETE FROM usuarios
       WHERE id_usuario = ?
         AND rol = 'Cliente'`,
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

app.get("/api/reception/members", async (req, res) => {
  const query = String(req.query.query || req.query.q || "").trim();

  try {
    const members = await listMembers({ query, limit: 30 });
    res.json({ members, total: members.length, query });
  } catch (error) {
    res.status(500).json({ error: "Error buscando miembros", detail: error.message });
  }
});

app.get("/api/reception/dashboard", async (req, res) => {
  try {
    const date = normalizeDateInput(req.query.date || startOfToday(), "Fecha");
    const todayCheckins = await getAttendanceEntries({ from: date, to: date });
    const summary = summarizeAttendance(todayCheckins);

    res.json({
      date,
      summary,
      todayCheckins
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, detail: error.detail });
  }
});

app.get("/api/reception/attendance", async (req, res) => {
  try {
    const { from, to } = resolveDateRange(req.query.from, req.query.to, 6);
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    if (req.query.memberId && !Number.isFinite(memberId)) {
      res.status(400).json({ error: "memberId invalido" });
      return;
    }

    const entries = await getAttendanceEntries({
      from,
      to,
      memberId,
      query: req.query.query || req.query.q || ""
    });

    res.json({
      from,
      to,
      total: entries.length,
      summary: summarizeAttendance(entries),
      entries
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, detail: error.detail });
  }
});

app.post("/api/reception/checkins", async (req, res) => {
  const memberId = Number(req.body?.memberId);

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "memberId invalido" });
    return;
  }

  try {
    const member = await getMemberById(memberId);
    if (!member) {
      res.status(404).json({ error: "Miembro no encontrado" });
      return;
    }

    const existingEntry = await getLatestAttendanceForToday(memberId);
    if (existingEntry) {
      const attendance = await getAttendanceEntryById(existingEntry.id_asistencia);

      res.json({
        ok: true,
        alreadyRegistered: true,
        message: "La entrada de hoy ya estaba registrada",
        attendance,
        membershipIndicator: member.membershipIndicator
      });
      return;
    }

    const [insertResult] = await pool.query(
      `INSERT INTO asistencia (id_usuario)
       VALUES (?)`,
      [memberId]
    );

    const attendance = await getAttendanceEntryById(insertResult.insertId);

    res.status(201).json({
      ok: true,
      alreadyRegistered: false,
      message: "Entrada registrada correctamente",
      attendance,
      membershipIndicator: attendance?.membershipIndicator || member.membershipIndicator
    });
  } catch (error) {
    res.status(500).json({ error: "Error registrando asistencia", detail: error.message });
  }
});

app.get("/api/admin/attendance/report", async (req, res) => {
  try {
    const { from, to } = resolveDateRange(req.query.from, req.query.to, 29);
    const entries = await getAttendanceEntries({ from, to });
    const summary = summarizeAttendance(entries);
    const format = String(req.query.format || "json").trim().toLowerCase();

    if (format === "csv") {
      const csv = buildCsv(entries);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="reporte-asistencia-${from}-a-${to}.csv"`);
      res.send(csv);
      return;
    }

    res.json({
      from,
      to,
      summary,
      entries,
      members: summary.members
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, detail: error.detail });
  }
});

ensureAttendanceSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo preparar el esquema de asistencia:", error.message);
    process.exit(1);
  });
