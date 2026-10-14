// src/test/e2e.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server/index.js';
import { getDb, initDatabase, closeDb } from '../server/db.js';

describe('InfoVarde Platform - End-to-End (E2E) Integration Lifecycle', () => {
  let appObj;
  let server;
  let baseUrl;
  let db;

  const testChannelCode = 'E2E-CAMP-01';

  before(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = getDb(':memory:');
    initDatabase(db);

    appObj = createServer();
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
    if (appObj && appObj.close) {
      appObj.close();
    } else if (server) {
      server.close();
    }
    closeDb();
  });

  let createdChannelId;
  let createdAnnouncementId;
  let lifelineSessionToken;

  it('Step 1: Should create a reception center channel via REST API', async () => {
    const res = await fetch(`${baseUrl}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: testChannelCode,
        name: 'Trondheim Integrasjonssenter',
        location_name: 'Trondheim',
        latitude: 63.43,
        longitude: 10.39,
        slide_interval_sec: 10
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.code, testChannelCode);
    assert.strictEqual(data.name, 'Trondheim Integrasjonssenter');
    createdChannelId = data.id;
  });

  it('Step 2: Should use AI Tolk to translate a Norwegian health announcement into Arabic and Ukrainian with RTL detection', async () => {
    const res = await fetch(`${baseUrl}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Gratis legeundersøkelse',
        text: 'Vennligst møt opp i Klinikktelt B. Tolk er til stede.',
        sourceLang: 'no',
        targetLangs: ['en', 'uk', 'ar']
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.translations.ar);
    assert.strictEqual(data.translations.ar.is_rtl, true);
    assert.ok(data.translations.uk);
    assert.strictEqual(data.translations.uk.is_rtl, false);
  });

  it('Step 3: Should save announcement with translations to the channel', async () => {
    const res = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: createdChannelId,
        category: 'health',
        priority: 'urgent',
        content_type: 'event',
        event_date: '2026-10-25',
        event_time: '14:00',
        event_location: 'Klinikktelt B',
        slide_duration: 12,
        translations: [
          { lang_code: 'no', title: 'Gratis legeundersøkelse', content: 'Vennligst møt opp i Klinikktelt B. Tolk er til stede.' },
          { lang_code: 'en', title: 'Free medical checkup', content: 'Please arrive at Clinic Tent B. Translators present.' },
          { lang_code: 'ar', title: 'فحص طبي مجاني', content: 'يرجى الحضور إلى خيمة العيادة ب. المترجمون متواجدون.', is_rtl: true }
        ]
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    createdAnnouncementId = data.id;
  });

  it('Step 4: Should retrieve feed for TV screen and Mobile PWA with RTL support', async () => {
    // TV Feed (Norwegian)
    const tvRes = await fetch(`${baseUrl}/api/channels/${testChannelCode}/feed?lang=no`);
    assert.strictEqual(tvRes.status, 200);
    const tvData = await tvRes.json();
    assert.strictEqual(tvData.channel.code, testChannelCode);
    assert.strictEqual(tvData.items.length, 1);
    assert.strictEqual(tvData.items[0].title, 'Gratis legeundersøkelse');

    // Mobile Feed (Arabic RTL)
    const mRes = await fetch(`${baseUrl}/api/channels/${testChannelCode}/feed?lang=ar`);
    assert.strictEqual(mRes.status, 200);
    const mData = await mRes.json();
    assert.strictEqual(mData.items[0].title, 'فحص طبي مجاني');
    assert.strictEqual(mData.items[0].is_rtl, true);
  });

  it('Step 5: Should execute Lifeline anonymous lifecycle (Zero-PII Session -> AI Triage -> Escalation -> Translated Chat)', async () => {
    // 5a. Anonymous session
    const sessRes = await fetch(`${baseUrl}/api/lifeline/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelCode: testChannelCode })
    });
    assert.strictEqual(sessRes.status, 201);
    const sessData = await sessRes.json();
    lifelineSessionToken = sessData.sessionToken;

    // 5b. Resident asks AI question
    const aiRes = await fetch(`${baseUrl}/api/lifeline/chat/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: lifelineSessionToken,
        message: 'Where is the doctor clinic today?',
        langCode: 'en'
      })
    });
    assert.strictEqual(aiRes.status, 200);
    const aiData = await aiRes.json();
    assert.ok(aiData.reply);

    // 5c. Escalate to duty desk
    const escRes = await fetch(`${baseUrl}/api/lifeline/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: lifelineSessionToken })
    });
    assert.strictEqual(escRes.status, 200);
    const escData = await escRes.json();
    assert.strictEqual(escData.status, 'waiting_staff');

    // 5d. Staff replies
    const msgRes = await fetch(`${baseUrl}/api/lifeline/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: lifelineSessionToken,
        senderType: 'staff',
        text: 'Legen er i telt B frem til kl 16:00',
        langCode: 'no',
        targetLang: 'en'
      })
    });
    assert.strictEqual(msgRes.status, 201);
  });

  it('Step 6: Should broadcast emergency flash alert across the camp', async () => {
    const alertRes = await fetch(`${baseUrl}/api/channels/${testChannelCode}/broadcast-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'EVAKUERING / EVACUATION',
        message: 'Vennligst evakuer til samlingsplass / Please evacuate to assembly area.',
        severity: 'critical'
      })
    });
    assert.strictEqual(alertRes.status, 200);
    const alertData = await alertRes.json();
    assert.strictEqual(alertData.success, true);
    assert.strictEqual(alertData.alert.title, 'EVAKUERING / EVACUATION');
  });
});
