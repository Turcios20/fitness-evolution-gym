"use strict";

const mysql = require("mysql2/promise");
const { URL } = require("url");

function envFlag(value, defaultValue = false) {
  if (value == null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function buildSslConfig() {
  if (!envFlag(process.env.DB_SSL, false)) {
    return undefined;
  }

  return {
    rejectUnauthorized: envFlag(process.env.DB_SSL_REJECT_UNAUTHORIZED, true)
  };
}

function buildConnectionConfig() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DB_URL || process.env.MYSQL_URL;

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    const sslMode = String(url.searchParams.get("ssl-mode") || "").trim().toUpperCase();
    const useSsl = sslMode === "REQUIRED" || sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY"
      || envFlag(process.env.DB_SSL, false);

    return {
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
      waitForConnections: true,
      connectionLimit: 10
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fit_focus_db",
    ssl: buildSslConfig(),
    waitForConnections: true,
    connectionLimit: 10
  };
}

const pool = mysql.createPool(buildConnectionConfig());

module.exports = { pool };
