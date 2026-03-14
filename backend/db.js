"use strict";

const mysql = require("mysql2/promise");

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

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fit_focus_db",
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = { pool };
