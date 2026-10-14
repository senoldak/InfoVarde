// src/test/lifeline.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.js';
import { getDb, initDatabase } from '../server/db.js';

describe('InfoVarde Lifeline (GDPR-Compliant Emergency Desk & WebRTC Signaling)', () => {
  let appObj;
  let server;
  let baseUrl;
  let wsUrl;
  let db;
  let testChannelCode = 'LIFELINE-TEST';

  before(async () => {
    process.env.DATABASE_PATH = ':memory:';
    db = getDb(':memory:');
    initDatabase(db);

    // Seed test channel
    db.prepare(`
      INSERT INTO channels (code, name, location_name)
      VALUES (?, 'Lifeline Test Reception', 'Oslo')
    `).run(testChannelCode);

    appObj = createServer();
    server = appObj.server;

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        wsUrl = `ws://localhost:${port}/ws/lifeline`;
        resolve();
      });
    });
  });

  after(async () => {
    if (appObj && appObj.close) {
      appObj.close();
    } else if (server) {
      server.close();
    }
  });

  let sessionToken;
  let roomTag;

  it('POST /api/lifeline/session should create an anonymous, zero-PII session', async () => {
    const res = await fetch(`${baseUrl}/api/lifeline/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelCode: testChannelCode })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.ok(data.sessionToken);
    assert.strictEqual(typeof data.sessionToken, 'string');
    assert.strictEqual(data.channelCode, testChannelCode);
    assert.ok(data.roomTag.startsWith('room-'));
    assert.strictEqual(data.status, 'ai_active');
    assert.ok(data.expiresAt);

    sessionToken = data.sessionToken;
    roomTag = data.roomTag;
  });

  it('POST /api/lifeline/chat/ai should provide native language AI first-response triage', async () => {
    const res = await fetch(`${baseUrl}/api/lifeline/chat/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        message: 'أين يمكنني مقابلة الطبيب؟',
        langCode: 'ar'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.langCode, 'ar');
    assert.ok(data.reply.length > 10);
  });

  it('POST /api/lifeline/escalate should update status to waiting_staff with queue position', async () => {
    const res = await fetch(`${baseUrl}/api/lifeline/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'waiting_staff');
    assert.strictEqual(data.queuePosition, 1);
  });

  it('POST /api/lifeline/message should save and translate bidirectional chat between resident & staff', async () => {
    // Resident sends message in Arabic
    const resResident = await fetch(`${baseUrl}/api/lifeline/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        senderType: 'resident',
        text: 'هل يوجد حليب للأطفال اليوم؟',
        langCode: 'ar',
        targetLang: 'en'
      })
    });

    assert.strictEqual(resResident.status, 201);
    const resResidentData = await resResident.json();
    assert.strictEqual(resResidentData.success, true);
    assert.strictEqual(resResidentData.message.senderType, 'resident');

    // Staff replies in English
    const resStaff = await fetch(`${baseUrl}/api/lifeline/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        senderType: 'staff',
        text: 'Yes, baby formula is distributed at Tent B at 14:00.',
        langCode: 'en',
        targetLang: 'ar'
      })
    });

    assert.strictEqual(resStaff.status, 201);
    const resStaffData = await resStaff.json();
    assert.strictEqual(resStaffData.success, true);
    assert.strictEqual(resStaffData.message.senderType, 'staff');

    // Verify messages list
    const historyRes = await fetch(`${baseUrl}/api/lifeline/messages/${sessionToken}`);
    const historyData = await historyRes.json();
    assert.strictEqual(historyData.success, true);
    assert.ok(historyData.messages.length >= 3); // AI interaction + resident msg + staff msg
  });

  it('GET /api/lifeline/sessions should list active sessions for duty desk', async () => {
    const res = await fetch(`${baseUrl}/api/lifeline/sessions?channelCode=${testChannelCode}`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.sessions));
    const current = data.sessions.find(s => s.session_token === sessionToken);
    assert.ok(current);
    assert.strictEqual(current.status, 'waiting_staff');
  });

  it('WebRTC Signaling over WebSocket should allow resident and staff to join room and exchange SDP offer/answer', async () => {
    const residentWs = new WebSocket(wsUrl);
    const staffWs = new WebSocket(wsUrl);

    await Promise.all([
      new Promise(r => residentWs.on('open', r)),
      new Promise(r => staffWs.on('open', r))
    ]);

    let staffReceivedOffer = false;
    let residentReceivedAnswer = false;

    // Staff listens for offer
    staffWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'offer') {
        staffReceivedOffer = true;
        // Staff responds with answer
        staffWs.send(JSON.stringify({
          type: 'answer',
          room: roomTag,
          sdp: { type: 'answer', sdp: 'fake-sdp-answer-data' }
        }));
      }
    });

    // Resident listens for answer
    residentWs.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'answer') {
        residentReceivedAnswer = true;
      }
    });

    // Join room
    residentWs.send(JSON.stringify({ type: 'join', room: roomTag, role: 'resident' }));
    staffWs.send(JSON.stringify({ type: 'join', room: roomTag, role: 'staff' }));

    await new Promise(r => setTimeout(r, 50));

    // Resident sends offer
    residentWs.send(JSON.stringify({
      type: 'offer',
      room: roomTag,
      sdp: { type: 'offer', sdp: 'fake-sdp-offer-data' }
    }));

    // Wait for exchange
    for (let i = 0; i < 20; i++) {
      if (staffReceivedOffer && residentReceivedAnswer) break;
      await new Promise(r => setTimeout(r, 25));
    }

    assert.strictEqual(staffReceivedOffer, true);
    assert.strictEqual(residentReceivedAnswer, true);

    residentWs.close();
    staffWs.close();
  });

  it('DELETE /api/lifeline/purge should trigger ephemeral GDPR purge', async () => {
    const res = await fetch(`${baseUrl}/api/lifeline/purge`, { method: 'DELETE' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
  });
});
