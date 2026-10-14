// src/server/routes/announcements.js
import { Router } from 'express';
import { getDb } from '../db.js';
import { sseManager } from '../sse.js';

const router = Router();

// GET single announcement with all translations
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!ann) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const translations = db.prepare('SELECT * FROM announcement_translations WHERE announcement_id = ?').all(ann.id);
    res.json({
      ...ann,
      translations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new announcement with translations
router.post('/', (req, res) => {
  try {
    const {
      channel_id,
      category = 'general',
      priority = 'normal',
      content_type = 'standard',
      image_url = null,
      audio_url = null,
      event_date = null,
      event_time = null,
      event_location = null,
      start_date = null,
      end_date = null,
      slide_duration = null,
      is_active = 1,
      translations = []
    } = req.body;

    if (!channel_id) {
      return res.status(400).json({ error: 'channel_id is required' });
    }

    const db = getDb();
    const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channel_id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel does not exist' });
    }

    const stmt = db.prepare(`
      INSERT INTO announcements (
        channel_id, category, priority, content_type, image_url, audio_url,
        event_date, event_time, event_location, start_date, end_date,
        slide_duration, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      channel_id,
      category,
      priority,
      content_type,
      image_url,
      audio_url,
      event_date,
      event_time,
      event_location,
      start_date,
      end_date,
      slide_duration,
      is_active ? 1 : 0
    );

    const announcementId = result.lastInsertRowid;

    // Insert translations
    const insertTransStmt = db.prepare(`
      INSERT INTO announcement_translations (
        announcement_id, lang_code, title, content, audio_url, is_rtl
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const t of translations) {
      if (t.title && t.lang_code) {
        const isRtl = t.is_rtl !== undefined ? (t.is_rtl ? 1 : 0) : (['ar', 'fa'].includes(t.lang_code) ? 1 : 0);
        insertTransStmt.run(
          announcementId,
          t.lang_code,
          t.title,
          t.content || '',
          t.audio_url || null,
          isRtl
        );
      }
    }

    // Broadcast SSE update to connected screens
    sseManager.broadcast(channel.code, 'feed_updated', {
      action: 'created',
      announcement_id: announcementId
    });

    const created = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
    const createdTranslations = db.prepare('SELECT * FROM announcement_translations WHERE announcement_id = ?').all(announcementId);

    res.status(201).json({
      ...created,
      translations: createdTranslations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update announcement
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!ann) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const {
      category = ann.category,
      priority = ann.priority,
      content_type = ann.content_type,
      image_url = ann.image_url,
      audio_url = ann.audio_url,
      event_date = ann.event_date,
      event_time = ann.event_time,
      event_location = ann.event_location,
      slide_duration = ann.slide_duration,
      is_active = ann.is_active,
      translations
    } = req.body;

    const updateStmt = db.prepare(`
      UPDATE announcements SET
        category = ?, priority = ?, content_type = ?, image_url = ?, audio_url = ?,
        event_date = ?, event_time = ?, event_location = ?, slide_duration = ?, is_active = ?
      WHERE id = ?
    `);

    updateStmt.run(
      category,
      priority,
      content_type,
      image_url,
      audio_url,
      event_date,
      event_time,
      event_location,
      slide_duration,
      is_active ? 1 : 0,
      ann.id
    );

    // If translations array provided, update them
    if (Array.isArray(translations)) {
      db.prepare('DELETE FROM announcement_translations WHERE announcement_id = ?').run(ann.id);
      const insertTransStmt = db.prepare(`
        INSERT INTO announcement_translations (
          announcement_id, lang_code, title, content, audio_url, is_rtl
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const t of translations) {
        if (t.title && t.lang_code) {
          const isRtl = t.is_rtl !== undefined ? (t.is_rtl ? 1 : 0) : (['ar', 'fa'].includes(t.lang_code) ? 1 : 0);
          insertTransStmt.run(
            ann.id,
            t.lang_code,
            t.title,
            t.content || '',
            t.audio_url || null,
            isRtl
          );
        }
      }
    }

    const channel = db.prepare('SELECT code FROM channels WHERE id = ?').get(ann.channel_id);
    if (channel) {
      sseManager.broadcast(channel.code, 'feed_updated', {
        action: 'updated',
        announcement_id: ann.id
      });
    }

    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(ann.id);
    const updatedTrans = db.prepare('SELECT * FROM announcement_translations WHERE announcement_id = ?').all(ann.id);

    res.json({
      ...updated,
      translations: updatedTrans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE announcement
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
    if (!ann) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const channel = db.prepare('SELECT code FROM channels WHERE id = ?').get(ann.channel_id);

    db.prepare('DELETE FROM announcements WHERE id = ?').run(ann.id);

    if (channel) {
      sseManager.broadcast(channel.code, 'feed_updated', {
        action: 'deleted',
        announcement_id: ann.id
      });
    }

    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
