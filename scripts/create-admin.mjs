/**
 * Create admin account in arena_accounts table.
 *
 * Usage:
 *   DATABASE_URL="mysql://user:pass@host:3306/dbname" node scripts/create-admin.mjs
 */

import crypto from "node:crypto";
import mysql from "mysql2/promise";

// ─── Config ──────────────────────────────────────────────────
const USERNAME = "Louis123";
const PASSWORD = "louis001226!";
const ROLE = "admin";
const STARTING_CAPITAL = 5000;

// ─── Scrypt hash (same params as server/db.ts) ──────────────
const SCRYPT_KEYLEN = 64;
const SCRYPT_COST = 16384;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_COST }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${salt}:${hash.toString("hex")}`;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    console.error('Usage: DATABASE_URL="mysql://..." node scripts/create-admin.mjs');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: true } });

  try {
    // Check if username already exists
    const [existing] = await conn.execute(
      "SELECT id, role FROM arena_accounts WHERE username = ?",
      [USERNAME]
    );
    if (existing.length > 0) {
      console.log(`User "${USERNAME}" already exists (id=${existing[0].id}, role=${existing[0].role}).`);
      // Update to admin + reset password
      const hashed = await hashPassword(PASSWORD);
      await conn.execute(
        "UPDATE arena_accounts SET role = ?, passwordHash = ?, updatedAt = ? WHERE username = ?",
        [ROLE, hashed, Date.now(), USERNAME]
      );
      console.log(`Updated to role="${ROLE}" and reset password.`);
    } else {
      const now = Date.now();
      const hashed = await hashPassword(PASSWORD);
      const inviteCode = `admin-${crypto.randomBytes(4).toString("hex")}`;

      await conn.execute(
        `INSERT INTO arena_accounts
         (userId, username, inviteCode, passwordHash, inviteConsumed, role, capital, seasonPoints, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [0, USERNAME, inviteCode, hashed, 1, ROLE, STARTING_CAPITAL, 0, now, now]
      );
      console.log(`Admin account created: username="${USERNAME}", role="${ROLE}"`);
    }

    // Verify
    const [rows] = await conn.execute(
      "SELECT id, username, role, capital FROM arena_accounts WHERE username = ?",
      [USERNAME]
    );
    console.log("Verification:", rows[0]);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
