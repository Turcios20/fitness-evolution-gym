"use strict";

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
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
const OBJECTIVE_MAX_LENGTH = 255;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "progress");
const PHOTO_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png"
};
const OBJECTIVE_PRESETS = [
  "Bajar de peso",
  "Ganar masa muscular",
  "Mejorar resistencia"
];

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
app.use(express.json({ limit: "10mb" }));
app.get(["/", "/index.html"], (_req, res) => {
  res.redirect("/login.html");
});
app.use(express.static(path.join(__dirname, ".."), { index: false }));

function roleToFrontend(role) {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_DB_TO_FRONTEND[value] || "cliente";
}

function roleToDb(role) {
  const value = String(role || "").trim().toLowerCase();
  return ROLE_FRONTEND_TO_DB[value] || "Cliente";
}

async function tableExists(executor, tableName) {
  const [rows] = await executor.query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
}

// Keep production databases compatible with the trainer features used by the web app.
async function ensureTrainerFeatureSchema() {
  const connection = await pool.getConnection();

  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS planes_entrenamiento (
        id_plan INT AUTO_INCREMENT PRIMARY KEY,
        id_entrenador INT NOT NULL,
        id_cliente INT NOT NULL,
        nombre_plan VARCHAR(150) NOT NULL,
        objetivo TEXT,
        fecha_inicio DATE,
        fecha_fin DATE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_planes_entrenamiento_entrenador
          FOREIGN KEY (id_entrenador)
          REFERENCES usuarios(id_usuario)
          ON DELETE CASCADE,
        CONSTRAINT fk_planes_entrenamiento_cliente
          FOREIGN KEY (id_cliente)
          REFERENCES usuarios(id_usuario)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    await connection.query(
      `CREATE TABLE IF NOT EXISTS rutinas_entrenamiento (
        id_rutina INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        nombre_ejercicio VARCHAR(100) NOT NULL,
        descripcion TEXT,
        dia_semana VARCHAR(20),
        series INT,
        repeticiones INT,
        duracion INT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_rutinas_entrenamiento_usuario
          FOREIGN KEY (id_usuario)
          REFERENCES usuarios(id_usuario)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    if (await tableExists(connection, "rutinas")) {
      await connection.query(
        `INSERT INTO rutinas_entrenamiento (
          id_rutina,
          id_usuario,
          nombre_ejercicio,
          descripcion,
          dia_semana,
          series,
          repeticiones,
          duracion
        )
        SELECT
          legacy.id_rutina,
          legacy.id_usuario,
          legacy.nombre_ejercicio,
          NULL,
          legacy.dia_semana,
          legacy.series,
          legacy.repeticiones,
          NULL
        FROM rutinas legacy
        LEFT JOIN rutinas_entrenamiento current
          ON current.id_rutina = legacy.id_rutina
        WHERE current.id_rutina IS NULL`
      );
    }
  } finally {
    connection.release();
  }
}

function serializeSettingValue(value) {
  if (value == null) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// RUTINAS
// Obtener rutinas de un cliente
app.get(
  "/api/client/:clientId/routines",
  authenticate,
  async (req, res) => {

    const clientId = Number(req.params.clientId);

    if (!Number.isFinite(clientId)) {
      return res.status(400).json({
        error: "clientId invalido"
      });
    }

    try {

      const [rows] = await pool.query(
        `SELECT
          id_rutina,
          nombre_ejercicio,
          descripcion,
          series,
          repeticiones,
          duracion,
          dia_semana
        FROM rutinas_entrenamiento
        WHERE id_usuario = ?
        ORDER BY id_rutina DESC`,
        [clientId]
      );

      res.json({
        routines: rows
      });

    } catch (error) {

      res.status(500).json({
        error: "Error cargando rutinas",
        detail: error.message
      });

    }
  }
);

// Crear rutina
app.post(
  "/api/client/:clientId/routines",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {

    const clientId = Number(req.params.clientId);

    const {
      ejercicio,
      descripcion,
      series,
      repeticiones,
      duracion,
      dia
    } = req.body || {};

    if (!Number.isFinite(clientId)) {
      return res.status(400).json({
        error: "clientId invalido"
      });
    }

    if (!ejercicio) {
      return res.status(400).json({
        error: "Ejercicio requerido"
      });
    }

    try {

      await pool.query(
        `INSERT INTO rutinas_entrenamiento (
          id_usuario,
          nombre_ejercicio,
          descripcion,
          series,
          repeticiones,
          duracion,
          dia_semana
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          ejercicio,
          descripcion || null,
          series || null,
          repeticiones || null,
          duracion || null,
          dia || null
        ]
      );

      res.status(201).json({
        ok: true,
        message: "Rutina creada correctamente"
      });

    } catch (error) {

      res.status(500).json({
        error: "Error creando rutina",
        detail: error.message
      });

    }
  }
);

// Editar rutina
app.put(
  "/api/routines/:routineId",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {

    const routineId = Number(req.params.routineId);

    const {
      ejercicio,
      descripcion,
      series,
      repeticiones,
      duracion,
      dia
    } = req.body || {};

    if (!Number.isFinite(routineId)) {
      return res.status(400).json({
        error: "routineId invalido"
      });
    }

    if (!ejercicio) {
      return res.status(400).json({
        error: "Ejercicio requerido"
      });
    }

    try {

      const [result] = await pool.query(
        `UPDATE rutinas_entrenamiento
        SET nombre_ejercicio = ?,
            descripcion      = ?,
            series           = ?,
            repeticiones     = ?,
            duracion         = ?,
            dia_semana       = ?
        WHERE id_rutina = ?`,
        [
          ejercicio,
          descripcion || null,
          series || null,
          repeticiones || null,
          duracion || null,
          dia || null,
          routineId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Rutina no encontrada"
        });
      }

      res.json({
        ok: true,
        message: "Rutina actualizada correctamente"
      });

    } catch (error) {

      res.status(500).json({
        error: "Error actualizando rutina",
        detail: error.message
      });

    }
  }
);

// Eliminar rutina
app.delete(
  "/api/routines/:routineId",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {

    const routineId = Number(req.params.routineId);

    if (!Number.isFinite(routineId)) {
      return res.status(400).json({
        error: "routineId invalido"
      });
    }

    try {

      await pool.query(
        `DELETE FROM rutinas_entrenamiento
        WHERE id_rutina = ?`,
        [routineId]
      );

      res.json({
        ok: true
      });

    } catch (error) {

      res.status(500).json({
        error: "Error eliminando rutina",
        detail: error.message
      });

    }
  }
);

// ===============================
// PLANES
// ===============================

// Obtener planes
app.get(
  "/api/client/:clientId/plans",
  authenticate,
  async (req, res) => {

    const clientId = Number(req.params.clientId);

    if (!Number.isFinite(clientId)) {
      return res.status(400).json({
        error: "clientId invalido"
      });
    }

    try {

      const [rows] = await pool.query(
        `SELECT
          p.id_plan,
          p.nombre_plan,
          p.objetivo,
          p.fecha_inicio,
          p.fecha_fin,
          p.id_entrenador,
          e.nombre_completo AS entrenador_nombre
        FROM planes_entrenamiento p
        LEFT JOIN usuarios e ON e.id_usuario = p.id_entrenador
        WHERE p.id_cliente = ?
        ORDER BY p.id_plan DESC`,
        [clientId]
      );

      res.json({
        plans: rows
      });

    } catch (error) {

      res.status(500).json({
        error: "Error cargando planes",
        detail: error.message
      });

    }
  }
);

// Crear plan
app.post(
  "/api/client/:clientId/plans",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {

    const clientId = Number(req.params.clientId);

    const {
      nombre,
      objetivo,
      fechaInicio,
      fechaFin
    } = req.body || {};

    if (!Number.isFinite(clientId)) {
      return res.status(400).json({
        error: "clientId invalido"
      });
    }

    if (!nombre) {
      return res.status(400).json({
        error: "Nombre requerido"
      });
    }

    try {

      await pool.query(
        `INSERT INTO planes_entrenamiento (
          id_entrenador,
          id_cliente,
          nombre_plan,
          objetivo,
          fecha_inicio,
          fecha_fin
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.auth.id,
          clientId,
          nombre,
          objetivo || null,
          fechaInicio || null,
          fechaFin || null
        ]
      );

      res.status(201).json({
        ok: true,
        message: "Plan creado correctamente"
      });

    } catch (error) {

      res.status(500).json({
        error: "Error creando plan",
        detail: error.message
      });

    }
  }
);

// Eliminar plan
app.delete(
  "/api/plans/:planId",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {

    const planId = Number(req.params.planId);

    if (!Number.isFinite(planId)) {
      return res.status(400).json({
        error: "planId invalido"
      });
    }

    try {

      await pool.query(
        `DELETE FROM planes_entrenamiento
        WHERE id_plan = ?`,
        [planId]
      );

      res.json({
        ok: true
      });

    } catch (error) {

      res.status(500).json({
        error: "Error eliminando plan",
        detail: error.message
      });

    }
  }
);

async function ensureProgressSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS medidas_progreso (
       id_medida INT AUTO_INCREMENT PRIMARY KEY,
       id_usuario INT NOT NULL,
       fecha DATE NOT NULL,
       peso DECIMAL(10,2),
       pecho DECIMAL(10,2),
       cintura DECIMAL(10,2),
       cadera DECIMAL(10,2),
       brazos DECIMAL(10,2),
       piernas DECIMAL(10,2),
       fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       CONSTRAINT fk_medidas_usuario
         FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
       UNIQUE KEY unique_medida_fecha (id_usuario, fecha)
     )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS progreso_fotos (
       id_foto INT AUTO_INCREMENT PRIMARY KEY,
       id_medida INT NOT NULL,
       ruta_archivo VARCHAR(255) NOT NULL,
       nombre_archivo VARCHAR(255) NOT NULL,
       mime_type VARCHAR(50) NOT NULL,
       tamano_bytes INT NOT NULL,
       fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       CONSTRAINT fk_progreso_fotos_medida
         FOREIGN KEY (id_medida) REFERENCES medidas_progreso(id_medida) ON DELETE CASCADE,
       UNIQUE KEY unique_foto_medida (id_medida)
     )`
  );

  fs.mkdirSync(PHOTO_UPLOAD_ROOT, { recursive: true });
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

function normalizeMembershipSnapshot(row) {
  if (!row?.id_membresia) {
    return null;
  }

  return {
    id: row.id_membresia,
    plan: row.tipo_plan || "Sin plan",
    status: row.membresia_estado || row.estado || "Inactivo",
    endDate: row.fecha_vencimiento || null,
    daysRemaining: Number(row.dias_restantes || 0)
  };
}

function getMembershipIndicator(membership) {
  if (!membership) {
    return {
      label: "Sin membresia",
      tone: "danger",
      expired: true
    };
  }

  if (membership.status !== "Activo") {
    return {
      label: "Membresia inactiva",
      tone: "danger",
      expired: true
    };
  }

  if (membership.daysRemaining <= 0) {
    return {
      label: "Membresia vencida",
      tone: "danger",
      expired: true
    };
  }

  if (membership.daysRemaining <= 7) {
    return {
      label: `Membresia por vencer (${membership.daysRemaining} dias)`,
      tone: "warn",
      expired: false
    };
  }

  return {
    label: `Membresia activa (${membership.daysRemaining} dias)`,
    tone: "ok",
    expired: false
  };
}

function canManageClientEvolution(auth, client) {
  if (!auth || !client) return false;
  if (auth.role === "admin") return true;
  return auth.role === "entrenador" && client.id_entrenador_asignado === auth.id;
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

function mapMeasurementRow(row) {
  const toNumberOrNull = (value) => (value == null ? null : Number(value));

  return {
    id: row.id_medida,
    date: row.fecha,
    weight: toNumberOrNull(row.peso),
    chest: toNumberOrNull(row.pecho),
    waist: toNumberOrNull(row.cintura),
    hips: toNumberOrNull(row.cadera),
    arms: toNumberOrNull(row.brazos),
    legs: toNumberOrNull(row.piernas),
    registeredAt: row.fecha_registro,
    photo: row.id_foto
      ? {
          id: row.id_foto,
          url: row.ruta_archivo.startsWith("/") ? row.ruta_archivo : `/${row.ruta_archivo}`,
          name: row.nombre_archivo,
          mimeType: row.mime_type,
          sizeBytes: Number(row.tamano_bytes || 0),
          updatedAt: row.foto_actualizada
        }
      : null
  };
}

async function getClientById(clientId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT id_usuario, nombre_completo, correo, rol, id_entrenador_asignado
     FROM usuarios
     WHERE id_usuario = ?
     LIMIT 1`,
    [clientId]
  );

  return rows[0] || null;
}

async function ensureClientEvolutionAccess(clientId, auth, executor = pool) {
  const client = await getClientById(clientId, executor);

  if (!client || client.rol !== "Cliente") {
    const error = new Error("Cliente no encontrado");
    error.status = 404;
    throw error;
  }

  if (auth.role === "admin" || auth.id === clientId) {
    return client;
  }

  if (auth.role === "entrenador" && client.id_entrenador_asignado === auth.id) {
    return client;
  }

  const error = new Error(
    auth.role === "entrenador"
      ? "No eres el entrenador asignado de este cliente"
      : "No autorizado"
  );
  error.status = 403;
  throw error;
}

async function ensureClientEvolutionManagementAccess(clientId, auth, executor = pool) {
  const client = await ensureClientEvolutionAccess(clientId, auth, executor);

  if (canManageClientEvolution(auth, client)) {
    return client;
  }

  const error = new Error("No autorizado");
  error.status = 403;
  throw error;
}

async function getClientMeasurements(clientId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT
       mp.id_medida,
       mp.id_usuario,
       mp.fecha,
       mp.peso,
       mp.pecho,
       mp.cintura,
       mp.cadera,
       mp.brazos,
       mp.piernas,
       mp.fecha_registro,
       pf.id_foto,
       pf.ruta_archivo,
       pf.nombre_archivo,
       pf.mime_type,
       pf.tamano_bytes,
       pf.fecha_actualizacion AS foto_actualizada
     FROM medidas_progreso mp
     LEFT JOIN progreso_fotos pf ON pf.id_medida = mp.id_medida
     WHERE mp.id_usuario = ?
     ORDER BY mp.fecha DESC`,
    [clientId]
  );

  return rows.map(mapMeasurementRow);
}

async function getClientObjective(clientId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT valor
     FROM ajustes
     WHERE id_usuario = ?
       AND clave = 'objetivo_personal'
     LIMIT 1`,
    [clientId]
  );

  return rows[0]?.valor || null;
}

async function getClientEvolutionPayload(clientId, auth, executor = pool) {
  const client = await ensureClientEvolutionAccess(clientId, auth, executor);
  const [measurements, objective] = await Promise.all([
    getClientMeasurements(clientId, executor),
    getClientObjective(clientId, executor)
  ]);

  return {
    client: {
      id: client.id_usuario,
      name: client.nombre_completo,
      email: client.correo
    },
    objective,
    objectivePresets: OBJECTIVE_PRESETS,
    canManage: canManageClientEvolution(auth, client),
    measurements,
    total: measurements.length
  };
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value, label) {
  const input = String(value || "").trim();
  if (!input) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw createHttpError(400, `${label} invalida`);
  }

  const [year, month, day] = input.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw createHttpError(400, `${label} invalida`);
  }

  return parsed;
}

function addDays(date, amount) {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function normalizeAttendanceRange(fromValue, toValue) {
  const today = new Date();
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const toDate = parseDateOnly(toValue, "Fecha final") || defaultTo;
  const fromDate = parseDateOnly(fromValue, "Fecha inicial") || addDays(toDate, -29);

  if (fromDate > toDate) {
    throw createHttpError(400, "El rango de fechas es invalido");
  }

  return {
    from: formatDateOnly(fromDate),
    to: formatDateOnly(toDate)
  };
}

function mapAttendanceRow(row) {
  const membership = normalizeMembershipSnapshot(row);
  return {
    id: row.id_asistencia,
    member: {
      id: row.id_usuario,
      name: row.nombre_completo,
      email: row.correo
    },
    checkInAt: row.fecha_entrada,
    date: row.fecha_registro,
    time: row.hora_registro,
    membership,
    indicator: getMembershipIndicator(membership)
  };
}

async function listAttendanceEntries({ from, to, memberId = null, executor = pool }) {
  const where = [
    "u.rol = 'Cliente'",
    "a.fecha_entrada >= ?",
    "a.fecha_entrada < DATE_ADD(?, INTERVAL 1 DAY)"
  ];
  const params = [from, to];

  if (memberId != null) {
    where.unshift("u.id_usuario = ?");
    params.unshift(memberId);
  }

  const [rows] = await executor.query(
    `SELECT
       a.id_asistencia,
       a.id_usuario,
       u.nombre_completo,
       u.correo,
       a.fecha_entrada,
       DATE_FORMAT(a.fecha_entrada, '%Y-%m-%d') AS fecha_registro,
       TIME_FORMAT(a.fecha_entrada, '%H:%i:%s') AS hora_registro,
       m.id_membresia,
       m.tipo_plan,
       m.estado AS membresia_estado,
       m.fecha_vencimiento,
       GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
     FROM asistencia a
     INNER JOIN usuarios u
       ON u.id_usuario = a.id_usuario
     LEFT JOIN membresias m ON m.id_membresia = (
       SELECT m2.id_membresia
       FROM membresias m2
       WHERE m2.id_usuario = u.id_usuario
       ORDER BY m2.fecha_vencimiento DESC
       LIMIT 1
     )
     WHERE ${where.join("\n       AND ")}
     ORDER BY a.fecha_entrada DESC`,
    params
  );

  return rows.map(mapAttendanceRow);
}

function summarizeAttendance(entries) {
  const uniqueMembers = new Set(entries.map((entry) => entry.member.id)).size;
  const entriesWithExpiredMembership = entries.filter((entry) => entry.indicator.expired).length;

  return {
    totalEntries: entries.length,
    uniqueMembers,
    entriesWithExpiredMembership,
    latestCheckIn: entries[0]?.checkInAt || null,
    earliestCheckIn: entries.length ? entries[entries.length - 1].checkInAt : null
  };
}

function buildAttendanceBreakdown(entries) {
  const totalsByDate = new Map();

  entries.forEach((entry) => {
    totalsByDate.set(entry.date, (totalsByDate.get(entry.date) || 0) + 1);
  });

  return Array.from(totalsByDate.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, total]) => ({ date, total }));
}

function normalizeObjectiveValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    throw createHttpError(400, "Selecciona un objetivo valido");
  }

  if (value.length > OBJECTIVE_MAX_LENGTH) {
    throw createHttpError(400, `El objetivo no puede exceder ${OBJECTIVE_MAX_LENGTH} caracteres`);
  }

  return value;
}

async function upsertClientObjective(clientId, objective, executor = pool) {
  await executor.query(
    `INSERT INTO ajustes (id_usuario, clave, valor)
     VALUES (?, 'objetivo_personal', ?)
     ON DUPLICATE KEY UPDATE
       valor = VALUES(valor),
       fecha_actualizacion = CURRENT_TIMESTAMP`,
    [clientId, objective]
  );
}

async function getMeasurementForClient(clientId, measurementId, executor = pool) {
  const [rows] = await executor.query(
    `SELECT
       mp.id_medida,
       mp.id_usuario,
       mp.fecha,
       pf.id_foto,
       pf.ruta_archivo
     FROM medidas_progreso mp
     LEFT JOIN progreso_fotos pf ON pf.id_medida = mp.id_medida
     WHERE mp.id_medida = ?
       AND mp.id_usuario = ?
     LIMIT 1`,
    [measurementId, clientId]
  );

  return rows[0] || null;
}

function isValidPng(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => buffer[index] === value);
}

function isValidJpeg(buffer) {
  return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function decodeProgressPhotoUpload(imageDataUrl, fileName) {
  const match = /^data:(image\/(?:jpeg|png));base64,([a-z0-9+/=\s]+)$/i.exec(String(imageDataUrl || "").trim());
  if (!match) {
    throw createHttpError(400, "La fotografia debe enviarse como imagen JPG o PNG valida");
  }

  const mimeType = match[1].toLowerCase();
  const extension = PHOTO_MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw createHttpError(400, "Solo se permiten imagenes JPG o PNG");
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], "base64");
  } catch {
    throw createHttpError(400, "No se pudo procesar la imagen enviada");
  }

  if (!buffer.length) {
    throw createHttpError(400, "La imagen enviada esta vacia");
  }

  if (buffer.length > PHOTO_MAX_BYTES) {
    throw createHttpError(400, "La imagen supera el limite de 5 MB");
  }

  if (mimeType === "image/png" && !isValidPng(buffer)) {
    throw createHttpError(400, "El archivo PNG enviado no es valido");
  }

  if (mimeType === "image/jpeg" && !isValidJpeg(buffer)) {
    throw createHttpError(400, "El archivo JPG enviado no es valido");
  }

  const safeBaseName = String(fileName || "progreso")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.[^.]+$/, "")
    .slice(0, 60) || "progreso";

  return {
    buffer,
    mimeType,
    extension,
    originalName: `${safeBaseName}.${extension}`,
    sizeBytes: buffer.length
  };
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
  const payload = req.body || {};

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "id invalido" });
    return;
  }

  if (req.auth.role !== "admin") {
    if (Object.prototype.hasOwnProperty.call(payload, "trainerId")) {
      res.status(403).json({ error: "Solo admin puede asignar entrenador" });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "role") && roleToDb(payload.role) !== "Cliente") {
      res.status(403).json({ error: "Solo admin puede cambiar roles" });
      return;
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await updateClientMember(connection, memberId, payload);
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

app.get("/api/reception/history", authenticate, requireRoles("admin", "recepcionista"), async (req, res) => {
  const memberId = Number(req.query.memberId);

  if (!Number.isFinite(memberId)) {
    res.status(400).json({ error: "memberId invalido" });
    return;
  }

  try {
    const range = normalizeAttendanceRange(req.query.from, req.query.to);
    const client = await getClientById(memberId);

    if (!client || client.rol !== "Cliente") {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const entries = await listAttendanceEntries({
      memberId,
      from: range.from,
      to: range.to
    });

    res.json({
      member: {
        id: client.id_usuario,
        name: client.nombre_completo,
        email: client.correo
      },
      range,
      summary: summarizeAttendance(entries),
      entries
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "Error cargando historial de asistencia",
      detail: error.status ? undefined : error.message
    });
  }
});

app.get("/api/admin/attendance-report", authenticate, requireRoles("admin"), async (req, res) => {
  try {
    const range = normalizeAttendanceRange(req.query.from, req.query.to);
    const entries = await listAttendanceEntries({
      from: range.from,
      to: range.to
    });

    res.json({
      range,
      summary: summarizeAttendance(entries),
      breakdown: buildAttendanceBreakdown(entries),
      entries
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "Error cargando reporte de asistencia",
      detail: error.status ? undefined : error.message
    });
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
      `SELECT
         u.id_usuario,
         u.nombre_completo,
         u.correo,
         m.id_membresia,
         m.tipo_plan,
         m.estado AS membresia_estado,
         m.fecha_vencimiento,
         GREATEST(DATEDIFF(m.fecha_vencimiento, CURDATE()), 0) AS dias_restantes
       FROM usuarios
       u
       LEFT JOIN membresias m ON m.id_membresia = (
         SELECT m2.id_membresia
         FROM membresias m2
         WHERE m2.id_usuario = u.id_usuario
         ORDER BY m2.fecha_vencimiento DESC
         LIMIT 1
       )
       WHERE u.id_usuario = ?
         AND u.rol = 'Cliente'
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
      const membership = normalizeMembershipSnapshot(memberRows[0]);
      const indicator = getMembershipIndicator(membership);
      res.json({
        ok: true,
        alreadyRegistered: true,
        message: "La entrada de hoy ya estaba registrada",
        checkInTime: todayRows[0].fecha_entrada,
        member: {
          id: memberRows[0].id_usuario,
          name: memberRows[0].nombre_completo,
          email: memberRows[0].correo
        },
        membership,
        indicator
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
    const membership = normalizeMembershipSnapshot(memberRows[0]);
    const indicator = getMembershipIndicator(membership);
    res.status(201).json({
      ok: true,
      alreadyRegistered: false,
      message: `Entrada registrada para ${memberRows[0].nombre_completo}`,
      checkInTime: insertedRows[0]?.fecha_entrada || null,
      member: {
        id: memberRows[0].id_usuario,
        name: memberRows[0].nombre_completo,
        email: memberRows[0].correo
      },
      membership,
      indicator
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

app.get("/api/client/:clientId/evolution", authenticate, async (req, res) => {
  const clientId = Number(req.params.clientId);

  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId invalido" });
    return;
  }

  try {
    const payload = await getClientEvolutionPayload(clientId, req.auth);
    res.json(payload);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Error cargando evolucion", detail: error.message });
  }
});

app.put("/api/client/:clientId/objective", authenticate, requireRoles("admin", "entrenador"), async (req, res) => {
  const clientId = Number(req.params.clientId);

  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId invalido" });
    return;
  }

  try {
    const objective = normalizeObjectiveValue(req.body?.objective);
    await ensureClientEvolutionManagementAccess(clientId, req.auth);
    await upsertClientObjective(clientId, objective);
    res.json({ ok: true, objective });
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Error guardando objetivo", detail: error.message });
  }
});

// Endpoints para medidas de progreso
app.get("/api/client/:clientId/measurements", authenticate, async (req, res) => {
  const clientId = Number(req.params.clientId);

  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId invalido" });
    return;
  }

  try {
    await ensureClientEvolutionAccess(clientId, req.auth);
    const measurements = await getClientMeasurements(clientId);
    res.json({ measurements, total: measurements.length });
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Error cargando medidas", detail: error.message });
  }
});

app.post("/api/client/:clientId/measurements", authenticate, async (req, res) => {
  const clientId = Number(req.params.clientId);
  const { fecha, peso, pecho, cintura, cadera, brazos, piernas } = req.body || {};
  const rawMeasurements = { peso, pecho, cintura, cadera, brazos, piernas };
  const measurementLabels = {
    peso: "peso",
    pecho: "pecho",
    cintura: "cintura",
    cadera: "cadera",
    brazos: "brazos",
    piernas: "piernas"
  };

  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId invalido" });
    return;
  }

  if (!fecha) {
    res.status(400).json({ error: "fecha requerida" });
    return;
  }

  // Validar que al menos una medida se proporcione
  if (!Object.values(rawMeasurements).some((value) => String(value ?? "").trim() !== "")) {
    res.status(400).json({ error: "Debe proporcionar al menos una medida" });
    return;
  }

  // Solo el cliente puede registrar sus propias medidas
  if (req.auth.role !== "admin" && req.auth.id !== clientId) {
    res.status(403).json({ error: "No autorizado" });
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const parsedMeasurements = Object.fromEntries(
      Object.entries(rawMeasurements).map(([key, value]) => {
        const normalized = String(value ?? "").trim();

        if (!normalized) {
          return [key, null];
        }

        const numericValue = Number(normalized);
        if (!Number.isFinite(numericValue)) {
          throw createHttpError(400, `El valor de ${measurementLabels[key]} no es valido`);
        }

        return [key, numericValue];
      })
    );

    const pesoVal = parsedMeasurements.peso;
    const pechoVal = parsedMeasurements.pecho;
    const cinturaVal = parsedMeasurements.cintura;
    const caderaVal = parsedMeasurements.cadera;
    const brazosVal = parsedMeasurements.brazos;
    const piernasVal = parsedMeasurements.piernas;

    // Usar la nueva sintaxis de ON DUPLICATE KEY UPDATE (MySQL 8.0.20+)
    await connection.query(
      `INSERT INTO medidas_progreso (id_usuario, fecha, peso, pecho, cintura, cadera, brazos, piernas, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         peso = COALESCE(?, peso),
         pecho = COALESCE(?, pecho),
         cintura = COALESCE(?, cintura),
         cadera = COALESCE(?, cadera),
         brazos = COALESCE(?, brazos),
         piernas = COALESCE(?, piernas),
         fecha_registro = CURRENT_TIMESTAMP`,
      [
        clientId, fecha, pesoVal, pechoVal, cinturaVal, caderaVal, brazosVal, piernasVal,
        pesoVal, pechoVal, cinturaVal, caderaVal, brazosVal, piernasVal
      ]
    );

    await connection.commit();
    res.status(201).json({ ok: true, message: "Medidas registradas correctamente" });
  } catch (error) {
    await connection.rollback();
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Error guardando medidas:", error);
    res.status(500).json({ error: "Error guardando medidas", detail: error.message });
  } finally {
    connection.release();
  }
});

app.post("/api/client/:clientId/measurements/:measurementId/photo", authenticate, requireRoles("admin", "entrenador"), async (req, res) => {
  const clientId = Number(req.params.clientId);
  const measurementId = Number(req.params.measurementId);

  if (!Number.isFinite(clientId) || !Number.isFinite(measurementId)) {
    res.status(400).json({ error: "Parametros invalidos" });
    return;
  }

  let savedFilePath = null;
  let previousFilePath = null;

  try {
    const upload = decodeProgressPhotoUpload(req.body?.imageDataUrl, req.body?.fileName);
    await ensureClientEvolutionManagementAccess(clientId, req.auth);

    const measurement = await getMeasurementForClient(clientId, measurementId);
    if (!measurement) {
      res.status(404).json({ error: "Registro de seguimiento no encontrado" });
      return;
    }

    const clientFolder = path.join(PHOTO_UPLOAD_ROOT, `client-${clientId}`);
    fs.mkdirSync(clientFolder, { recursive: true });

    const fileName = `measurement-${measurementId}-${Date.now()}.${upload.extension}`;
    savedFilePath = path.join(clientFolder, fileName);
    await fs.promises.writeFile(savedFilePath, upload.buffer);

    const relativePath = path.relative(path.join(__dirname, ".."), savedFilePath).split(path.sep).join("/");
    await pool.query(
      `INSERT INTO progreso_fotos (id_medida, ruta_archivo, nombre_archivo, mime_type, tamano_bytes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ruta_archivo = VALUES(ruta_archivo),
         nombre_archivo = VALUES(nombre_archivo),
         mime_type = VALUES(mime_type),
         tamano_bytes = VALUES(tamano_bytes),
         fecha_actualizacion = CURRENT_TIMESTAMP`,
      [measurementId, relativePath, upload.originalName, upload.mimeType, upload.sizeBytes]
    );

    if (measurement.ruta_archivo) {
      previousFilePath = path.join(__dirname, "..", String(measurement.ruta_archivo).replace(/^\/+/, ""));
    }

    res.json({
      ok: true,
      photo: {
        url: `/${relativePath}`,
        name: upload.originalName,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes
      }
    });
  } catch (error) {
    if (savedFilePath) {
      await fs.promises.unlink(savedFilePath).catch(() => {});
    }

    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Error guardando fotografia", detail: error.message });
  }

  if (previousFilePath && previousFilePath !== savedFilePath) {
    await fs.promises.unlink(previousFilePath).catch(() => {});
  }
});

// Endpoint para que el entrenador obtenga medidas de sus clientes
app.get("/api/trainer/clients/:clientId/measurements", authenticate, requireRoles("entrenador"), async (req, res) => {
  const clientId = Number(req.params.clientId);

  if (!Number.isFinite(clientId)) {
    res.status(400).json({ error: "clientId invalido" });
    return;
  }

  try {
    const payload = await getClientEvolutionPayload(clientId, req.auth);

    res.json({
      clientId,
      clientName: payload.client.name,
      objective: payload.objective,
      measurements: payload.measurements,
      total: payload.total
    });
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Error cargando medidas del cliente", detail: error.message });
  }
});

// ── PAGOS ────────────────────────────────────────────────────────────────────

app.get("/api/admin/payments", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.id_pago,
         p.id_usuario,
         u.nombre_completo,
         u.correo,
         p.monto,
         p.fecha_pago,
         p.metodo_pago
       FROM pagos p
       JOIN usuarios u ON u.id_usuario = p.id_usuario
       ORDER BY p.fecha_pago DESC
       LIMIT 200`
    );
    res.json({ payments: rows, total: rows.length });
  } catch (error) {
    res.status(500).json({ error: "Error cargando pagos", detail: error.message });
  }
});

app.post("/api/admin/payments", async (req, res) => {
  const { userId, monto, metodoPago } = req.body || {};
  if (!userId || !monto) {
    res.status(400).json({ error: "userId y monto son requeridos" });
    return;
  }
  const metodos = ["Efectivo", "Tarjeta", "Transferencia"];
  const metodo = metodos.includes(metodoPago) ? metodoPago : "Efectivo";

  try {
    const [result] = await pool.query(
      `INSERT INTO pagos (id_usuario, monto, metodo_pago) VALUES (?, ?, ?)`,
      [userId, Number(monto), metodo]
    );
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "Error registrando pago", detail: error.message });
  }
});

app.get("/api/admin/finance/summary", async (_req, res) => {
  try {
    const [totals] = await pool.query(
      `SELECT
         COUNT(*)                                          AS total_pagos,
         COALESCE(SUM(monto), 0)                          AS ingresos_total,
         COALESCE(SUM(CASE WHEN DATE(fecha_pago) = CURDATE() THEN monto ELSE 0 END), 0) AS ingresos_hoy,
         COALESCE(SUM(CASE WHEN YEAR(fecha_pago) = YEAR(CURDATE()) AND MONTH(fecha_pago) = MONTH(CURDATE()) THEN monto ELSE 0 END), 0) AS ingresos_mes
       FROM pagos`
    );

    const [byMethod] = await pool.query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS subtotal
       FROM pagos
       GROUP BY metodo_pago`
    );

    const [monthly] = await pool.query(
      `SELECT
         DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
         COALESCE(SUM(monto), 0)          AS total
       FROM pagos
       WHERE fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY mes
       ORDER BY mes ASC`
    );

    res.json({
      summary: totals[0],
      byMethod,
      monthly
    });
  } catch (error) {
    res.status(500).json({ error: "Error cargando resumen financiero", detail: error.message });
  }
});

// ── CLASES Y RESERVAS ────────────────────────────────────────────────────────

app.get("/api/clases", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_clase, nombre, descripcion, entrenador, fecha_hora, duracion_min, capacidad, disponibles
       FROM clases
       WHERE fecha_hora >= NOW()
       ORDER BY fecha_hora ASC`
    );
    res.json({ clases: rows });
  } catch (error) {
    res.status(500).json({ error: "Error cargando clases", detail: error.message });
  }
});

app.get("/api/clases/mis-reservas", async (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "username requerido" });
    return;
  }

  try {
    const [userRows] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1",
      [username]
    );
    if (!userRows.length) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    const userId = userRows[0].id_usuario;

    const [rows] = await pool.query(
      `SELECT
         r.id_reserva,
         r.estado,
         r.fecha_reserva,
         r.asignada_por,
         a.nombre_completo AS asignada_por_nombre,
         c.id_clase,
         c.nombre,
         c.descripcion,
         c.entrenador,
         c.fecha_hora,
         c.duracion_min
       FROM reservas r
       JOIN clases c ON c.id_clase = r.id_clase
       LEFT JOIN usuarios a ON a.id_usuario = r.asignada_por
       WHERE r.id_usuario = ?
       ORDER BY c.fecha_hora ASC`,
      [userId]
    );
    res.json({ reservas: rows });
  } catch (error) {
    res.status(500).json({ error: "Error cargando reservas", detail: error.message });
  }
});

// Entrenador/admin asigna una clase a un cliente
app.post(
  "/api/trainer/clientes/:clientId/reservas",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {
    const clientId = Number(req.params.clientId);
    const claseId = Number(req.body?.claseId);

    if (!Number.isFinite(clientId) || !Number.isFinite(claseId)) {
      return res.status(400).json({ error: "clientId y claseId requeridos" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [userRows] = await connection.query(
        "SELECT id_usuario FROM usuarios WHERE id_usuario = ? LIMIT 1",
        [clientId]
      );
      if (!userRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      const [claseRows] = await connection.query(
        "SELECT id_clase, disponibles FROM clases WHERE id_clase = ? LIMIT 1 FOR UPDATE",
        [claseId]
      );
      if (!claseRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Clase no encontrada" });
      }
      if (claseRows[0].disponibles <= 0) {
        await connection.rollback();
        return res.status(409).json({ error: "No hay cupos disponibles" });
      }

      await connection.query(
        `INSERT INTO reservas (id_usuario, id_clase, asignada_por) VALUES (?, ?, ?)`,
        [clientId, claseId, req.auth.id]
      );
      await connection.query(
        `UPDATE clases SET disponibles = disponibles - 1 WHERE id_clase = ?`,
        [claseId]
      );

      await connection.commit();
      res.status(201).json({ ok: true, message: "Reserva asignada al cliente" });
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "El cliente ya tiene una reserva para esta clase" });
      }
      res.status(500).json({ error: "Error al asignar reserva", detail: error.message });
    } finally {
      connection.release();
    }
  }
);

// Entrenador/admin cancela una reserva (puede cancelar las asignadas también)
app.delete(
  "/api/trainer/reservas/:id",
  authenticate,
  requireRoles("entrenador", "admin"),
  async (req, res) => {
    const reservaId = Number(req.params.id);
    if (!Number.isFinite(reservaId)) {
      return res.status(400).json({ error: "id de reserva invalido" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [reservaRows] = await connection.query(
        "SELECT id_clase, estado FROM reservas WHERE id_reserva = ? LIMIT 1",
        [reservaId]
      );
      if (!reservaRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Reserva no encontrada" });
      }
      if (reservaRows[0].estado === "Cancelada") {
        await connection.rollback();
        return res.status(409).json({ error: "La reserva ya estaba cancelada" });
      }

      const claseId = reservaRows[0].id_clase;
      await connection.query(
        "UPDATE reservas SET estado = 'Cancelada' WHERE id_reserva = ?",
        [reservaId]
      );
      await connection.query(
        "UPDATE clases SET disponibles = disponibles + 1 WHERE id_clase = ?",
        [claseId]
      );

      await connection.commit();
      res.json({ ok: true, message: "Reserva cancelada" });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ error: "Error cancelando reserva", detail: error.message });
    } finally {
      connection.release();
    }
  }
);

app.post("/api/clases/:id/reservar", async (req, res) => {
  const claseId = Number(req.params.id);
  const { username } = req.body || {};

  if (!Number.isFinite(claseId) || !username) {
    res.status(400).json({ error: "id de clase y username requeridos" });
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

    const [claseRows] = await connection.query(
      "SELECT id_clase, disponibles FROM clases WHERE id_clase = ? LIMIT 1 FOR UPDATE",
      [claseId]
    );
    if (!claseRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }
    if (claseRows[0].disponibles <= 0) {
      await connection.rollback();
      res.status(409).json({ error: "No hay cupos disponibles" });
      return;
    }

    await connection.query(
      `INSERT INTO reservas (id_usuario, id_clase) VALUES (?, ?)`,
      [userId, claseId]
    );
    await connection.query(
      `UPDATE clases SET disponibles = disponibles - 1 WHERE id_clase = ?`,
      [claseId]
    );

    await connection.commit();
    res.status(201).json({ ok: true, message: "Reserva confirmada" });
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Ya tienes una reserva para esta clase" });
      return;
    }
    res.status(500).json({ error: "Error al reservar", detail: error.message });
  } finally {
    connection.release();
  }
});

app.delete("/api/clases/reservas/:id", async (req, res) => {
  const reservaId = Number(req.params.id);
  const { username } = req.body || {};

  if (!Number.isFinite(reservaId) || !username) {
    res.status(400).json({ error: "id de reserva y username requeridos" });
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

    const [reservaRows] = await connection.query(
      "SELECT id_clase, asignada_por FROM reservas WHERE id_reserva = ? AND id_usuario = ? LIMIT 1",
      [reservaId, userId]
    );
    if (!reservaRows.length) {
      await connection.rollback();
      res.status(404).json({ error: "Reserva no encontrada" });
      return;
    }

    if (reservaRows[0].asignada_por != null) {
      await connection.rollback();
      res.status(403).json({ error: "Esta reserva fue asignada por tu entrenador y no puedes cancelarla" });
      return;
    }

    const claseId = reservaRows[0].id_clase;
    await connection.query(
      "UPDATE reservas SET estado = 'Cancelada' WHERE id_reserva = ?",
      [reservaId]
    );
    await connection.query(
      "UPDATE clases SET disponibles = disponibles + 1 WHERE id_clase = ?",
      [claseId]
    );

    await connection.commit();
    res.json({ ok: true, message: "Reserva cancelada" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Error cancelando reserva", detail: error.message });
  } finally {
    connection.release();
  }
});


async function startServer() {
  try {
    await ensureTrainerFeatureSchema();
    app.listen(PORT, () => {
      console.log(`API corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error preparando la base de datos:", error.message);
    process.exit(1);
  }
}

startServer();
