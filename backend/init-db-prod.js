"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { URL } = require("url");

function envFlag(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

async function main() {
  const sqlPath = path.join(__dirname, "..", "database.production.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.MYSQL_URL;

  let connectionConfig;

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    const sslMode = String(url.searchParams.get("ssl-mode") || "").trim().toUpperCase();
    const useSsl = sslMode === "REQUIRED" || sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY"
      || envFlag(process.env.DB_SSL, false);

    connectionConfig = {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      database: decodeURIComponent(url.pathname.replace(/^\//, "") || process.env.DB_NAME || "defaultdb"),
      ssl: useSsl
        ? {
            rejectUnauthorized: envFlag(process.env.DB_SSL_REJECT_UNAUTHORIZED, false)
          }
        : undefined,
      multipleStatements: true
    };
  } else {
    connectionConfig = {
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
    };
  }

  const connection = await mysql.createConnection(connectionConfig);

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
