"use strict";

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const sqlPath = path.join(__dirname, "..", "database.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true
  });

  try {
    await connection.query(sql);
    console.log("Base de datos creada correctamente.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Error creando base de datos:", error.message);
  if (error.code) {
    console.error("Codigo:", error.code);
  }
  console.error(
    "Conexion usada:",
    `${process.env.DB_USER || "root"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}`
  );
  process.exit(1);
});
