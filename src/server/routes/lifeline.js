// src/server/routes/lifeline.js
import { Router } from 'express';
import {
  createLifelineSession,
  getSession,
  handleAiChat,
  escalateSession,
  sendSessionMessage,
  getSessionMessages,
  getActiveDutySessions,
  resolveSession,
  purgeExpiredSessions
} from '../services/lifelineService.js';
import { broadcastToChannel } from '../sse.js';

const router = Router();

// POST /api/lifeline/session - Create anonymous, zero-PII session
router.post('/session', (req, res) => {
  try {
    const { channelCode } = req.body;
    if (!channelCode) {
      return res.status(400).json({ error: 'channelCode is required' });
    }

    const session = createLifelineSession(channelCode);
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/lifeline/session/:token - Get session state
router.get('/session/:token', (req, res) => {
  try {
    const session = getSession(req.params.token);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lifeline/chat/ai - AI Triage response in native language
router.post('/chat/ai', async (req, res) => {
  try {
    const { sessionToken, message, langCode = 'en' } = req.body;
    if (!sessionToken || !message) {
      return res.status(400).json({ error: 'sessionToken and message are required' });
    }

    const result = await handleAiChat({ sessionToken, message, langCode });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lifeline/escalate - Escalate to Duty Desk
router.post('/escalate', (req, res) => {
  try {
    const { sessionToken } = req.body;
    if (!sessionToken) {
      return res.status(400).json({ error: 'sessionToken is required' });
    }

    const escalated = escalateSession(sessionToken);
    
    // Broadcast notification to channel SSE listeners (Duty staff)
    const session = getSession(sessionToken);
    if (session) {
      broadcastToChannel(session.channel_code, 'lifeline_escalation', {
        sessionToken,
        roomTag: session.room_tag,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, ...escalated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lifeline/message - Bidirectional live chat message with auto-translation
router.post('/message', async (req, res) => {
  try {
    const { sessionToken, senderType = 'resident', text, langCode = 'no', targetLang = 'en' } = req.body;
    if (!sessionToken || !text) {
      return res.status(400).json({ error: 'sessionToken and text are required' });
    }

    const message = await sendSessionMessage({
      sessionToken,
      senderType,
      text,
      langCode,
      targetLang
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lifeline/messages/:token - Message history
router.get('/messages/:token', (req, res) => {
  try {
    const messages = getSessionMessages(req.params.token);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/lifeline/sessions - Active queue for Duty Desk
router.get('/sessions', (req, res) => {
  try {
    const { channelCode } = req.query;
    const sessions = getActiveDutySessions(channelCode);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/lifeline/session/:token/resolve - Mark session resolved
router.put('/session/:token/resolve', (req, res) => {
  try {
    const result = resolveSession(req.params.token);
    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/lifeline/purge - Explicit trigger for GDPR ephemeral purge
router.delete('/purge', (req, res) => {
  try {
    const changes = purgeExpiredSessions();
    res.json({ success: true, purged: changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
