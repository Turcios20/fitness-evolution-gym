"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { pool } = require("./db");
const {
  createToken,
  hashPassword,
  needsPasswordUpgrade,
  verifyPassword,
  verifyToken
} = require("./security");

const app = express();
const PORT = Number(process.env.PORT || 3000);

const ROLE_FRONTEND_TO_DB = {
  admin: "Administrador",
  administrador: "Administrador",
  cliente: "Cliente",
  recepcion: "Recepcionista",
  recepcionista: "Recepcionista",
  entrenador: "Entrenador",
  coach: "Entrenador"
};

const ROLE_DB_TO_FRONTEND = {
  administrador: "admin",
  cliente: "cliente",
  recepcionista: "recepcionista",
  entrenador: "entrenador"
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

function roleToFrontend(role) {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_DB_TO_FRONTEND[value] || "cliente";
}

function roleToDb(role) {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_FRONTEND_TO_DB[value] || "Cliente";
}

function serializeSettingValue(value) {
  if (value == null) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authorization.slice(7).trim();
}

function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Token requerido" });
      return;
    }

    req.auth = verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ error: "Token invalido" });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    next();
  };
}

function normalizeMember(row) {
  return {
    id: row.id_usuario,
    name: row.nombre_completo,
    email: row.correo,
    role: roleToFrontend(row.rol),
    assignedTrainer: row.id_entrenador_asignado
      ? {
          id: row.id_entrenador_asignado,
          name: row.entrenador_nombre,
          email: row.entrenador_correo
        }
      : null,
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
  };
}

async function getUserByUsername(username, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id_usuario, nombre_completo, correo, password, rol, id_entrenador_asignado
     FROM usuarios
     WHERE correo = ?
     LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function getTrainerById(trainerId, executor = pool) {
  if (trainerId == null) return null;

  const [rows] = await executor.query(
    `SELECT id_usuario, nombre_completo, correo
     FROM usuarios
     WHERE id_usuario = ?
       AND rol = 'Entrenador'
     LIMIT 1`,
    [trainerId]
  );

  return rows[0] || null;
}

async function listTrainers(executor = pool) {
  const [rows] = await executor.query(
    `SELECT id_usuario, nombre_completo, correo
     FROM usuarios
     WHERE rol = 'Entrenador'
     ORDER BY nombre_completo ASC`
  );

  return rows.map((row) => ({
    id: row.id_usuario,
    name: row.nombre_completo,
    email: row.correo
  }));
}

async function listClientMembers(executor = pool) {
  const [rows] = await executor.query(
    `SELECT
       u.id_usuario,
       u.nombre_completo,
       u.correo,
       u.rol,
       u.id_entrenador_asignado,
       t.nombre_completo AS entrenador_nombre,
       t.correo AS entrenador_correo,
       m.id_membresia,
       m.tipo_plan,
       m.precio,
       m.estado,
       m.fecha_inicio,
       m.fecha_vencimiento,
       GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
     FROM usuarios u
     LEFT JOIN usuarios t
       ON t.id_usuario = u.id_entrenador_asignado
      AND t.rol = 'Entrenador'
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

  return rows.map(normalizeMember);
}

async function resolveTrainerId(connection, trainerId) {
  if (trainerId == null || trainerId === "") {
    return null;
  }

  const normalizedId = Number(trainerId);
  if (!Number.isFinite(normalizedId)) {
    throw new Error("Entrenador invalido");
  }

  const trainer = await getTrainerById(normalizedId, connection);
  if (!trainer) {
    throw new Error("Entrenador no encontrado");
  }

  return normalizedId;
}

async function createUserWithMembership(connection, payload) {
  const dbRole = roleToDb(payload.role);
  const safePlan = payload.plan || "Mensual";
  const safePrice = Number(payload.price);
  const price = Number.isFinite(safePrice) && safePrice > 0 ? safePrice : 20;
  const safeTrainerId = dbRole === "Cliente"
    ? await resolveTrainerId(connection, payload.trainerId)
    : null;
  const passwordHash = await hashPassword(payload.password);

  const [insertUser] = await connection.query(
    `INSERT INTO usuarios (nombre_completo, correo, password, rol, id_entrenador_asignado)
     VALUES (?, ?, ?, ?, ?)`,
    [payload.name, payload.email, passwordHash, dbRole, safeTrainerId]
  );

  if (dbRole === "Cliente") {
    await connection.query(
      `INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
       VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Activo')`,
      [insertUser.insertId, safePlan, price]
    );
  }

  return insertUser.insertId;
}

async function updateClientMember(connection, memberId, payload) {
  const [memberRows] = await connection.query(
    `SELECT rol
     FROM usuarios
     WHERE id_usuario = ?
     LIMIT 1`,
    [memberId]
  );

  if (!memberRows.length) {
    throw new Error("Miembro no encontrado");
  }

  const currentDbRole = String(memberRows[0].rol || "");
  const nextDbRole = payload.role ? roleToDb(payload.role) : currentDbRole;

  const updates = [];
  const values = [];

  if (payload.name) {
    updates.push("nombre_completo = ?");
    values.push(payload.name);
  }
  if (payload.email) {
    updates.push("correo = ?");
    values.push(payload.email);
  }
  if (payload.password) {
    updates.push("password = ?");
    values.push(await hashPassword(payload.password));
  }
  if (payload.role) {
    updates.push("rol = ?");
    values.push(nextDbRole);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "trainerId")) {
    updates.push("id_entrenador_asignado = ?");
    values.push(nextDbRole === "Cliente" ? await resolveTrainerId(connection, payload.trainerId) : null);
  } else if (nextDbRole !== "Cliente") {
    updates.push("id_entrenador_asignado = NULL");
  }

  if (updates.length) {
    values.push(memberId);
    await connection.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
      values
    );
  }

  if (payload.plan || payload.price != null || payload.status) {
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

      if (payload.plan) {
        membershipUpdates.push("tipo_plan = ?");
        membershipValues.push(payload.plan);
      }
      if (payload.price != null) {
        membershipUpdates.push("precio = ?");
        membershipValues.push(Number(payload.price));
      }
      if (payload.status) {
        membershipUpdates.push("estado = ?");
        membershipValues.push(payload.status);
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
}

async function renewClientMembership(connection, memberId, days, plan) {
  const renewalDays = Number.isFinite(Number(days)) ? Number(days) : 30;
  const safePlan = plan || "Mensual";

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
       SET tipo_plan = ?,
           fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL ? DAY),
           estado = 'Activo'
       WHERE id_membresia = ?`,
      [safePlan, renewalDays, membershipRows[0].id_membresia]
    );
    return;
  }

  await connection.query(
    `INSERT INTO membresias (id_usuario, tipo_plan, precio, fecha_inicio, fecha_vencimiento, estado)
     VALUES (?, ?, 20.00, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'Activo')`,
    [memberId, safePlan, renewalDays]
  );
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
    const user = await getUserByUsername(username);

    if (!user) {
      res.status(401).json({ error: "Credenciales invalidas" });
      return;
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      res.status(401).json({ error: "Credenciales invalidas" });
      return;
    }

    if (needsPasswordUpgrade(user.password)) {
      const passwordHash = await hashPassword(password);
      await pool.query(
        `UPDATE usuarios
         SET password = ?
         WHERE id_usuario = ?`,
        [passwordHash, user.id_usuario]
      );
    }

    const role = roleToFrontend(user.rol);
    const token = createToken({
      id: user.id_usuario,
      username: user.correo,
      name: user.nombre_completo,
      role
    });

    res.json({
      id: user.id_usuario,
      username: user.correo,
      name: user.nombre_completo,
      role,
      token
    });
  } catch (error) {
    res.status(500).json({ error: "Error en login" });
  }
});

app.post("/api/subscription/renew", authenticate, async (req, res) => {
  const { username } = req.body || {};

  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  if (req.auth.role !== "admin" && req.auth.username !== username) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const user = await getUserByUsername(username, connection);
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

app.get("/api/client/dashboard", authenticate, async (req, res) => {
  const username = String(req.query.username || "").trim();

  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  if (req.auth.role !== "admin" && req.auth.username !== username) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.correo,
         u.rol,
         t.id_usuario AS entrenador_id,
         t.nombre_completo AS entrenador_nombre,
         t.correo AS entrenador_correo,
         m.tipo_plan,
         m.fecha_vencimiento,
         m.estado,
         GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
       FROM usuarios u
       LEFT JOIN usuarios t
         ON t.id_usuario = u.id_entrenador_asignado
        AND t.rol = 'Entrenador'
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
      assignedTrainer: row.entrenador_id
        ? {
            id: row.entrenador_id,
            name: row.entrenador_nombre,
            email: row.entrenador_correo
          }
        : null,
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

app.get(["/api/members", "/api/admin/members"], authenticate, requireRoles("admin", "recepcionista"), async (_req, res) => {
  try {
    const members = await listClientMembers();
    res.json({ members, total: members.length });
  } catch (error) {
    res.status(500).json({ error: "Error cargando miembros", detail: error.message });
  }
});

app.post(["/api/members", "/api/admin/members"], authenticate, requireRoles("admin", "recepcionista"), async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email y password son requeridos" });
    return;
  }

  if (req.auth.role !== "admin" && roleToDb(req.body?.role) !== "Cliente") {
    res.status(403).json({ error: "Recepcion solo puede crear clientes" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = await createUserWithMembership(connection, req.body || {});
    await connection.commit();
    res.status(201).json({ ok: true, id });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error creando usuario", detail: error.message });
  } finally {
    connection.release();
  }
});

app.put(["/api/members/:id", "/api/admin/members/:id"], authenticate, requireRoles("admin", "recepcionista"), async (req, res) => {
  const memberId = Number(req.params.id);

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  if (req.auth.role !== "admin" && Object.prototype.hasOwnProperty.call(req.body || {}, "trainerId")) {
    res.status(403).json({ error: "Solo admin puede asignar entrenador" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await updateClientMember(connection, memberId, req.body || {});
    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error editando miembro", detail: error.message });
  } finally {
    connection.release();
  }
});

app.post(["/api/members/:id/renew", "/api/admin/members/:id/renew"], authenticate, requireRoles("admin", "recepcionista"), async (req, res) => {
  const memberId = Number(req.params.id);
  const days = Number(req.body?.days || 30);
  const plan = req.body?.plan || "Mensual";

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await renewClientMembership(connection, memberId, days, plan);
    await connection.commit();
    res.json({ ok: true, message: `Membresia renovada ${days} dias` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error renovando miembro", detail: error.message });
  } finally {
    connection.release();
  }
});

app.delete(["/api/members/:id", "/api/admin/members/:id"], authenticate, requireRoles("admin"), async (req, res) => {
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

app.get("/api/trainers", authenticate, requireRoles("admin"), async (_req, res) => {
  try {
    const trainers = await listTrainers();
    res.json({ trainers });
  } catch (error) {
    res.status(500).json({ error: "Error cargando entrenadores", detail: error.message });
  }
});

app.get("/api/trainer/dashboard", authenticate, requireRoles("entrenador"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.correo,
         m.tipo_plan,
         m.estado,
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
         AND u.id_entrenador_asignado = ?
       ORDER BY u.nombre_completo ASC`,
      [req.auth.id]
    );

    const clients = rows.map((row) => ({
      id: row.id_usuario,
      name: row.nombre_completo,
      email: row.correo,
      plan: row.tipo_plan || "Sin plan",
      status: row.estado || "Inactivo",
      daysRemaining: Number(row.dias_restantes || 0),
      endDate: row.fecha_vencimiento || null
    }));

    const activeClients = clients.filter((client) => client.status === "Activo").length;
    const expiringSoon = clients.filter((client) => client.status === "Activo" && client.daysRemaining <= 7).length;

    res.json({
      trainer: {
        id: req.auth.id,
        name: req.auth.name,
        username: req.auth.username
      },
      summary: {
        totalClients: clients.length,
        activeClients,
        expiringSoon
      },
      clients
    });
  } catch (error) {
    res.status(500).json({ error: "Error cargando panel de entrenador", detail: error.message });
  }
});

app.get("/api/reception/dashboard", authenticate, requireRoles("admin", "recepcionista"), async (_req, res) => {
  try {
    const [entriesTodayResult, newMembersResult, paymentsResult, presentMembersResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total
         FROM asistencia
         WHERE DATE(fecha_entrada) = CURDATE()`
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM usuarios
         WHERE rol = 'Cliente'
           AND DATE(fecha_registro) = CURDATE()`
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM pagos
         WHERE DATE(fecha_pago) = CURDATE()`
      ),
      pool.query(
        `SELECT
           u.id_usuario,
           u.nombre_completo,
           u.correo,
           a.fecha_entrada,
           m.estado,
           GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
         FROM usuarios u
         INNER JOIN asistencia a ON a.id_asistencia = (
           SELECT a2.id_asistencia
           FROM asistencia a2
           WHERE a2.id_usuario = u.id_usuario
             AND DATE(a2.fecha_entrada) = CURDATE()
           ORDER BY a2.fecha_entrada DESC
           LIMIT 1
         )
         LEFT JOIN membresias m ON m.id_membresia = (
           SELECT m2.id_membresia
           FROM membresias m2
           WHERE m2.id_usuario = u.id_usuario
           ORDER BY m2.fecha_vencimiento DESC
           LIMIT 1
         )
         WHERE u.rol = 'Cliente'
         ORDER BY a.fecha_entrada DESC`
      )
    ]);

    const entriesToday = Number(entriesTodayResult[0][0]?.total || 0);
    const newMembers = Number(newMembersResult[0][0]?.total || 0);
    const paymentsCollected = Number(paymentsResult[0][0]?.total || 0);
    const presentMembers = presentMembersResult[0].map((row) => ({
      id: row.id_usuario,
      name: row.nombre_completo,
      email: row.correo,
      checkInTime: row.fecha_entrada,
      membershipStatus: row.estado || "Inactivo",
      daysRemaining: Number(row.dias_restantes || 0)
    }));

    res.json({
      summary: {
        entriesToday,
        newMembers,
        paymentsCollected
      },
      presentMembers
    });
  } catch (error) {
    res.status(500).json({ error: "Error cargando recepcion", detail: error.message });
  }
});

app.post("/api/reception/checkins", authenticate, requireRoles("admin", "recepcionista"), async (req, res) => {
  const memberId = Number(req.body?.memberId);

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "memberId invalido" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [memberRows] = await connection.query(
      `SELECT id_usuario, nombre_completo
       FROM usuarios
       WHERE id_usuario = ?
         AND rol = 'Cliente'
       LIMIT 1`,
      [memberId]
    );

    if (!memberRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const [todayRows] = await connection.query(
      `SELECT fecha_entrada
       FROM asistencia
       WHERE id_usuario = ?
         AND DATE(fecha_entrada) = CURDATE()
       ORDER BY fecha_entrada DESC
       LIMIT 1`,
      [memberId]
    );

    if (todayRows.length) {
      await connection.commit();
      res.json({
        ok: true,
        alreadyRegistered: true,
        message: "La entrada de hoy ya estaba registrada",
        checkInTime: todayRows[0].fecha_entrada
      });
      return;
    }

    const [insertResult] = await connection.query(
      `INSERT INTO asistencia (id_usuario)
       VALUES (?)`,
      [memberId]
    );

    const [insertedRows] = await connection.query(
      `SELECT fecha_entrada
       FROM asistencia
       WHERE id_asistencia = ?`,
      [insertResult.insertId]
    );

    await connection.commit();
    res.status(201).json({
      ok: true,
      alreadyRegistered: false,
      message: `Entrada registrada para ${memberRows[0].nombre_completo}`,
      checkInTime: insertedRows[0]?.fecha_entrada || null
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error registrando entrada", detail: error.message });
  } finally {
    connection.release();
  }
});

app.get("/api/settings", authenticate, async (req, res) => {
  const username = String(req.query.username || "").trim();

  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  if (req.auth.role !== "admin" && req.auth.username !== username) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  try {
    const user = await getUserByUsername(username);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const [rows] = await pool.query(
      `SELECT clave, valor
       FROM ajustes
       WHERE id_usuario = ?`,
      [user.id_usuario]
    );

    const settings = rows.reduce((acc, row) => {
      acc[row.clave] = row.valor;
      return acc;
    }, {});

    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: "Error cargando ajustes", detail: error.message });
  }
});

app.put("/api/settings", authenticate, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const settings = req.body?.settings;

  if (!username || !settings || typeof settings !== "object") {
    res.status(400).json({ error: "username y settings requeridos" });
    return;
  }

  if (req.auth.role !== "admin" && req.auth.username !== username) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const entries = Object.entries(settings);
  if (!entries.length) {
    res.status(400).json({ error: "No hay ajustes para guardar" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const user = await getUserByUsername(username, connection);

    if (!user) {
      await connection.rollback();
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    for (const [key, value] of entries) {
      await connection.query(
        `INSERT INTO ajustes (id_usuario, clave, valor)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           valor = VALUES(valor),
           fecha_actualizacion = CURRENT_TIMESTAMP`,
        [user.id_usuario, key, serializeSettingValue(value)]
      );
    }

    await connection.commit();
    res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error guardando ajustes", detail: error.message });
  } finally {
    connection.release();
  }
});

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
