// src/test/db.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { getDb, initDatabase, cleanupExpiredSessions } from '../server/db.js';

describe('SQLite Database Schema & Operations', () => {
  let db;

  before(() => {
    db = getDb(':memory:');
    initDatabase(db);
  });

  it('should create tables without errors', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;").all();
    const tableNames = tables.map(t => t.name);
    assert.ok(tableNames.includes('channels'));
    assert.ok(tableNames.includes('announcements'));
    assert.ok(tableNames.includes('announcement_translations'));
    assert.ok(tableNames.includes('lifeline_sessions'));
    assert.ok(tableNames.includes('lifeline_messages'));
  });

  it('should insert a channel and read it back', () => {
    const insertChannel = db.prepare(`
      INSERT INTO channels (code, name, location_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = insertChannel.run('TEST-01', 'Test Channel', 'Oslo', 59.91, 10.75);
    assert.strictEqual(typeof res.lastInsertRowid, 'number');

    const channel = db.prepare('SELECT * FROM channels WHERE code = ?').get('TEST-01');
    assert.strictEqual(channel.name, 'Test Channel');
    assert.strictEqual(channel.code, 'TEST-01');
  });

  it('should support cascade delete from channel to announcements and translations', () => {
    const channel = db.prepare('SELECT id FROM channels WHERE code = ?').get('TEST-01');
    const insertAnn = db.prepare(`
      INSERT INTO announcements (channel_id, category, priority)
      VALUES (?, ?, ?)
    `);
    const annRes = insertAnn.run(channel.id, 'health', 'normal');
    const annId = annRes.lastInsertRowid;

    const insertTrans = db.prepare(`
      INSERT INTO announcement_translations (announcement_id, lang_code, title, content, is_rtl)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertTrans.run(annId, 'en', 'Doctor Visit', 'Doctor is arriving tomorrow', 0);
    insertTrans.run(annId, 'ar', 'زيارة الطبيب', 'سيصل الطبيب غدا', 1);

    const transBefore = db.prepare('SELECT COUNT(*) as c FROM announcement_translations WHERE announcement_id = ?').get(annId);
    assert.strictEqual(transBefore.c, 2);

    // Delete channel
    db.prepare('DELETE FROM channels WHERE id = ?').run(channel.id);

    // Check announcements and translations are gone
    const annAfter = db.prepare('SELECT COUNT(*) as c FROM announcements WHERE id = ?').get(annId);
    assert.strictEqual(annAfter.c, 0);

    const transAfter = db.prepare('SELECT COUNT(*) as c FROM announcement_translations WHERE announcement_id = ?').get(annId);
    assert.strictEqual(transAfter.c, 0);
  });

  it('should cleanup expired lifeline sessions and their messages', () => {
    // Insert new channel for lifeline test
    const channelRes = db.prepare('INSERT INTO channels (code, name) VALUES (?, ?)').run('LIFELINE-CH', 'Life Channel');
    const channelId = channelRes.lastInsertRowid;

    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour later

    const insertSession = db.prepare(`
      INSERT INTO lifeline_sessions (session_token, channel_id, room_tag, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    const expiredSessionRes = insertSession.run('token-expired', channelId, 'Room 101', pastDate);
    const validSessionRes = insertSession.run('token-valid', channelId, 'Room 102', futureDate);

    // Insert message into expired session
    db.prepare(`
      INSERT INTO lifeline_messages (session_id, sender_type, original_text)
      VALUES (?, ?, ?)
    `).run(expiredSessionRes.lastInsertRowid, 'resident', 'Emergency help needed');

    // Run cleanup
    cleanupExpiredSessions(db);

    const expiredAfter = db.prepare('SELECT * FROM lifeline_sessions WHERE session_token = ?').get('token-expired');
    assert.strictEqual(expiredAfter, undefined);

    const validAfter = db.prepare('SELECT * FROM lifeline_sessions WHERE session_token = ?').get('token-valid');
    assert.ok(validAfter !== undefined);
  });
});
