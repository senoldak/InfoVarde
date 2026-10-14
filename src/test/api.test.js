// src/test/api.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server/index.js';
import { getDb, initDatabase } from '../server/db.js';

describe('InfoVarde REST API & SSE Endpoints', () => {
  let server;
  let baseUrl;
  let db;

  before(async () => {
    // Setup in-memory db for testing
    process.env.DATABASE_PATH = ':memory:';
    db = getDb(':memory:');
    initDatabase(db);

    const appObj = createServer();
    server = appObj.server;
    
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });

  it('POST /api/channels should create a new channel', async () => {
    const res = await fetch(`${baseUrl}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'TEST-CHAN',
        name: 'Test Reception Channel',
        location_name: 'Bergen',
        latitude: 60.39,
        longitude: 5.32
      })
    });
    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.code, 'TEST-CHAN');
    assert.strictEqual(data.name, 'Test Reception Channel');
  });

  it('GET /api/channels should list channels', async () => {
    const res = await fetch(`${baseUrl}/api/channels`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.some(c => c.code === 'TEST-CHAN'));
  });

  it('POST /api/announcements should create announcement with multilingual translations', async () => {
    const channelRes = await fetch(`${baseUrl}/api/channels/TEST-CHAN`);
    const channel = await channelRes.json();

    const res = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: channel.id,
        category: 'health',
        priority: 'urgent',
        content_type: 'event',
        event_date: '2026-10-20',
        event_time: '10:00',
        event_location: 'Room 5',
        translations: [
          { lang_code: 'no', title: 'Vaksinering', content: 'Influensavaksine tilbys i rom 5' },
          { lang_code: 'en', title: 'Vaccination', content: 'Flu vaccines available in room 5' },
          { lang_code: 'ar', title: 'تطعيم الإنفلونزا', content: 'لقاحات الإنفلونزا متوفرة في الغرفة 5', is_rtl: true }
        ]
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.priority, 'urgent');
    assert.strictEqual(data.translations.length, 3);
  });

  it('GET /api/channels/:code/feed?lang=ar should return Arabic translation with is_rtl=true', async () => {
    const res = await fetch(`${baseUrl}/api/channels/TEST-CHAN/feed?lang=ar`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.channel.code, 'TEST-CHAN');
    assert.strictEqual(data.items.length, 1);
    
    const item = data.items[0];
    assert.strictEqual(item.title, 'تطعيم الإنفلونزا');
    assert.strictEqual(item.is_rtl, true);
    assert.strictEqual(item.lang_code, 'ar');
  });

  it('POST /api/channels/:code/broadcast-alert should trigger emergency broadcast payload', async () => {
    const res = await fetch(`${baseUrl}/api/channels/TEST-CHAN/broadcast-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'BRANNALARM / FIRE ALARM',
        message: 'Evakuer bygningen umiddelbart / Evacuate immediately',
        severity: 'critical'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.alert.title, 'BRANNALARM / FIRE ALARM');
  });
});
