// src/test/aiTolk.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../server/index.js';
import { getDb, initDatabase } from '../server/db.js';

describe('InfoVarde AI Tolk & Neural Voice Engine', () => {
  let server;
  let baseUrl;
  let db;

  before(async () => {
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

  it('POST /api/ai/translate should translate humanitarian text into multiple target languages with RTL detection', async () => {
    const res = await fetch(`${baseUrl}/api/ai/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Gratis legeundersøkelse',
        text: 'Vennligst møt opp i Klinikktelt B. Tolk er til stede. Ta med mottakskortet.',
        sourceLang: 'no',
        targetLangs: ['en', 'uk', 'ar', 'fa', 'tr']
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.translations.en);
    assert.ok(data.translations.ar);
    assert.ok(data.translations.fa);
    assert.ok(data.translations.uk);
    assert.ok(data.translations.tr);

    // Verify Arabic & Farsi RTL detection
    assert.strictEqual(data.translations.ar.is_rtl, true);
    assert.strictEqual(data.translations.fa.is_rtl, true);
    assert.strictEqual(data.translations.en.is_rtl, false);

    // Verify terminology replacement
    assert.ok(data.translations.en.title.includes('Free') || data.translations.en.title.includes('medical exam'));
    assert.ok(data.translations.ar.title.includes('مجاني') || data.translations.ar.title.includes('فحص طبي'));
  });

  it('POST /api/ai/generate-voice should return voice synthesis metadata with language-specific neural voice', async () => {
    const res = await fetch(`${baseUrl}/api/ai/generate-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Viktig beskjed om vinterklær',
        langCode: 'ar'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.lang, 'ar');
    assert.strictEqual(data.voice, 'ar-SY-AmanyNeural');
    assert.strictEqual(data.isRtl, true);
    assert.ok(data.audioUrl.includes('/api/ai/audio-stream'));
  });

  it('GET /api/ai/glossary should return asylum terminology mappings', async () => {
    const res = await fetch(`${baseUrl}/api/ai/glossary`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.terms.asylintervju);
    assert.strictEqual(data.terms.asylintervju.no, 'asylintervju');
    assert.strictEqual(data.terms.asylintervju.ar, 'مقابلة اللجوء');
    assert.strictEqual(data.terms.asylintervju.uk, 'співбесіда щодо притулку');
  });

  it('POST /api/ai/transcribe should return simulated transcription for staff voice notes', async () => {
    const res = await fetch(`${baseUrl}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulatedText: 'Utdeling av varme jakker klokken tolv' })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.transcript, 'Utdeling av varme jakker klokken tolv');
    assert.strictEqual(data.detectedLanguage, 'no');
  });
});
