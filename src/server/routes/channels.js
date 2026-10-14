// src/server/routes/channels.js
import { Router } from 'express';
import { getDb } from '../db.js';
import { sseManager } from '../sse.js';

const router = Router();

// GET all channels
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const channels = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM announcements a WHERE a.channel_id = c.id AND a.is_active = 1) as active_announcements_count
      FROM channels c
      ORDER BY c.name ASC
    `).all();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new channel
router.post('/', (req, res) => {
  try {
    const { code, name, location_name, latitude, longitude, slide_interval_sec, theme_color } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO channels (code, name, location_name, latitude, longitude, slide_interval_sec, theme_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cleanCode,
      name.trim(),
      location_name || null,
      latitude !== undefined ? Number(latitude) : 59.9139,
      longitude !== undefined ? Number(longitude) : 10.7522,
      slide_interval_sec ? Number(slide_interval_sec) : 12,
      theme_color || '#F97316'
    );

    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(channel);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'A channel with this code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET single channel by code
router.get('/:code', (req, res) => {
  try {
    const db = getDb();
    const channel = db.prepare('SELECT * FROM channels WHERE code = ?').get(req.params.code.toUpperCase());
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET channel feed (for TV player and Mobile client)
router.get('/:code/feed', (req, res) => {
  try {
    const db = getDb();
    const channel = db.prepare('SELECT * FROM channels WHERE code = ?').get(req.params.code.toUpperCase());
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const lang = req.query.lang || 'no';
    const category = req.query.category;

    let query = `
      SELECT a.* 
      FROM announcements a
      WHERE a.channel_id = ? AND a.is_active = 1
    `;
    const params = [channel.id];

    if (category && category !== 'all') {
      query += ` AND a.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY CASE WHEN a.priority = 'urgent' THEN 0 ELSE 1 END, a.id DESC`;

    const announcements = db.prepare(query).all(...params);

    // Fetch translations for all announcements
    const feedItems = announcements.map(ann => {
      // Find all translations
      const translations = db.prepare(`
        SELECT * FROM announcement_translations WHERE announcement_id = ?
      `).all(ann.id);

      // Preferred translation or fallback
      let activeTranslation = translations.find(t => t.lang_code === lang);
      if (!activeTranslation && translations.length > 0) {
        // Fallback to English, then Norwegian, then first available
        activeTranslation = translations.find(t => t.lang_code === 'en') || 
                            translations.find(t => t.lang_code === 'no') || 
                            translations[0];
      }

      return {
        ...ann,
        title: activeTranslation ? activeTranslation.title : '(Uten tittel)',
        content: activeTranslation ? activeTranslation.content : '',
        audio_url: activeTranslation?.audio_url || ann.audio_url || null,
        is_rtl: activeTranslation ? Boolean(activeTranslation.is_rtl) : false,
        lang_code: activeTranslation ? activeTranslation.lang_code : 'no',
        available_languages: translations.map(t => t.lang_code)
      };
    });

    res.json({
      channel,
      lang,
      items: feedItems
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST emergency broadcast alert to a channel
router.post('/:code/broadcast-alert', (req, res) => {
  try {
    const { title, message, priority, severity } = req.body;
    const channelCode = req.params.code.toUpperCase();

    const alertPayload = {
      type: 'emergency_alert',
      title: title || 'NØDVARSEL / EMERGENCY ALERT',
      message: message || '',
      severity: severity || 'high',
      timestamp: new Date().toISOString()
    };

    const count = sseManager.broadcast(channelCode, 'emergency_alert', alertPayload);
    res.json({ success: true, clientsNotified: count, alert: alertPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE endpoint for live screen and mobile sync
router.get('/:code/stream', (req, res) => {
  const channelCode = req.params.code.toUpperCase();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseManager.addClient(channelCode, res);
});

export default router;
