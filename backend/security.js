"use strict";

const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const TOKEN_SECRET = process.env.AUTH_SECRET || process.env.DB_PASSWORD || "fitness-evolution-dev-secret";
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 8 * 60 * 60 * 1000);

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signSegment(segment) {
  return crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(segment)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(String(password), salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(password, storedPassword) {
  const value = String(storedPassword || "");

  if (!value.startsWith("scrypt$")) {
    return String(password) === value;
  }

  const [, salt, expectedHash] = value.split("$");
  const derivedKey = await scryptAsync(String(password), salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(derivedKey);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function needsPasswordUpgrade(storedPassword) {
  return !String(storedPassword || "").startsWith("scrypt$");
}

function createToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const safePayload = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(safePayload));
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Token invalido");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = signSegment(`${encodedHeader}.${encodedPayload}`);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Firma invalida");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload.exp || Number(payload.exp) < Date.now()) {
    throw new Error("Token expirado");
  }

  return payload;
}

module.exports = {
  createToken,
  hashPassword,
  needsPasswordUpgrade,
  verifyPassword,
  verifyToken
};
