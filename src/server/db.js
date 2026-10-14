// src/server/db.js
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDb(customPath = null) {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || path.join(__dirname, '../../infovarde.db');
  
  // Ensure directory exists if needed
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);
  
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  
  if (!customPath || !dbInstance) {
    dbInstance = db;
  }

  return db;
}

export function initDatabase(db = null) {
  const targetDb = db || getDb();

  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      location_name TEXT,
      latitude REAL DEFAULT 59.9139,
      longitude REAL DEFAULT 10.7522,
      slide_interval_sec INTEGER DEFAULT 12,
      theme_color TEXT DEFAULT '#F97316',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'normal',
      content_type TEXT DEFAULT 'standard',
      image_url TEXT,
      audio_url TEXT,
      event_date TEXT,
      event_time TEXT,
      event_location TEXT,
      start_date DATETIME,
      end_date DATETIME,
      slide_duration INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcement_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      lang_code TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      audio_url TEXT,
      is_rtl INTEGER DEFAULT 0,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lifeline_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT UNIQUE NOT NULL,
      channel_id INTEGER NOT NULL,
      room_tag TEXT,
      status TEXT DEFAULT 'ai_active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lifeline_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      lang_code TEXT DEFAULT 'en',
      original_text TEXT NOT NULL,
      translated_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES lifeline_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_channels_code ON channels(code);
    CREATE INDEX IF NOT EXISTS idx_announcements_channel ON announcements(channel_id);
    CREATE INDEX IF NOT EXISTS idx_translations_announcement ON announcement_translations(announcement_id);
    CREATE INDEX IF NOT EXISTS idx_lifeline_sessions_token ON lifeline_sessions(session_token);
  `);

  return targetDb;
}

export function cleanupExpiredSessions(db = null) {
  const targetDb = db || getDb();
  const now = new Date().toISOString();
  const stmt = targetDb.prepare('DELETE FROM lifeline_sessions WHERE expires_at < ?');
  return stmt.run(now);
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
