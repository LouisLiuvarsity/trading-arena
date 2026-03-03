import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { MATCH_DURATION_MS, STARTING_CAPITAL } from "./constants.js";

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return path.resolve(process.env.DATABASE_PATH);
  }
  return path.resolve(process.cwd(), "data", "trading-arena.db");
}

export function createDatabase() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      user_id INTEGER PRIMARY KEY,
      capital REAL NOT NULL DEFAULT ${STARTING_CAPITAL},
      season_points REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_number INTEGER NOT NULL,
      match_type TEXT NOT NULL DEFAULT 'regular',
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      direction TEXT NOT NULL,
      size REAL NOT NULL,
      entry_price REAL NOT NULL,
      open_time INTEGER NOT NULL,
      take_profit REAL,
      stop_loss REAL,
      trade_number INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      direction TEXT NOT NULL,
      size REAL NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL NOT NULL,
      pnl REAL NOT NULL,
      pnl_pct REAL NOT NULL,
      weighted_pnl REAL NOT NULL,
      hold_duration REAL NOT NULL,
      hold_weight REAL NOT NULL,
      close_reason TEXT NOT NULL,
      open_time INTEGER NOT NULL,
      close_time INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'user',
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS behavior_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_type TEXT NOT NULL,
      payload TEXT,
      source TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trades_match_user ON trades(match_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_ts ON chat_messages(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_behavior_events_ts ON behavior_events(timestamp DESC);
  `);

  const now = Date.now();
  const activeMatch = db
    .prepare("SELECT id FROM matches WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    .get() as { id: number } | undefined;

  if (!activeMatch) {
    db.prepare(
      "INSERT INTO matches (match_number, match_type, start_time, end_time, status) VALUES (?, 'regular', ?, ?, 'active')",
    ).run(1, now, now + MATCH_DURATION_MS);
  }

  return db;
}

export type ArenaDB = ReturnType<typeof createDatabase>;
