"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function envFlag(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

async function main() {
  const sqlPath = path.join(__dirname, "..", "database.production.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fit_focus_db",
    ssl: envFlag(process.env.DB_SSL, false)
      ? {
          rejectUnauthorized: envFlag(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
        }
      : undefined,
    multipleStatements: true
  });

  try {
    await connection.query(sql);
    console.log("Base de datos de produccion inicializada correctamente.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Error inicializando base de datos de produccion:", error.message);
  if (error.code) {
    console.error("Codigo:", error.code);
  }
  process.exit(1);
});
