// src/server/services/lifelineService.js
import crypto from 'node:crypto';
import { getDb, cleanupExpiredSessions } from '../db.js';
import { translateText } from './aiTolk.js';

/**
 * Creates an anonymous, zero-PII session valid for 1 hour.
 */
export function createLifelineSession(channelCode) {
  const db = getDb();
  const channel = db.prepare('SELECT id, code, name FROM channels WHERE code = ?').get(channelCode);
  if (!channel) {
    throw new Error(`Channel with code '${channelCode}' not found`);
  }

  const sessionToken = crypto.randomUUID();
  const roomTag = `room-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO lifeline_sessions (session_token, channel_id, room_tag, status, created_at, expires_at)
    VALUES (?, ?, ?, 'ai_active', ?, ?)
  `);
  stmt.run(sessionToken, channel.id, roomTag, now.toISOString(), expiresAt);

  return {
    sessionToken,
    channelCode: channel.code,
    channelName: channel.name,
    roomTag,
    status: 'ai_active',
    expiresAt
  };
}

/**
 * Get session by token.
 */
export function getSession(sessionToken) {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, c.code as channel_code, c.name as channel_name 
    FROM lifeline_sessions s
    JOIN channels c ON s.channel_id = c.id
    WHERE s.session_token = ?
  `).get(sessionToken);
}

/**
 * AI First-Response Emergency Triage Assistant.
 * Answers resident queries 24/7 in their native language with guidance.
 */
export async function handleAiChat({ sessionToken, message, langCode = 'en' }) {
  const db = getDb();
  const session = getSession(sessionToken);
  if (!session) {
    throw new Error('Invalid or expired lifeline session');
  }

  // 1. Record resident message (Zero PII - only message content & language)
  const insertStmt = db.prepare(`
    INSERT INTO lifeline_messages (session_id, sender_type, lang_code, original_text, created_at)
    VALUES (?, 'resident', ?, ?, ?)
  `);
  insertStmt.run(session.id, langCode, message, new Date().toISOString());

  // 2. Triage urgency detection
  const lowerMsg = message.toLowerCase();
  const emergencyKeywords = ['blod', 'blood', 'hjerte', 'heart', 'pust', 'breath', 'brann', 'fire', 'akutt', 'ambulance', 'politi', 'police', 'دم', 'نار', 'اسعاف', 'خون', 'آتش', 'شفاخانه', 'help', 'hjelp'];
  const isEmergency = emergencyKeywords.some(kw => lowerMsg.includes(kw));

  // 3. Generate contextual humanitarian response based on resident language
  const responsesByLang = {
    no: {
      urgent: '⚠️ Dette høres akutt ut! Hvis det er livsfare, ring 113 umiddelbart. Jeg har sendt varsel til vakthavende mottaksansatt.',
      normal: 'Takk for henvendelsen. InfoVarde Lifeline hjelper deg med spørsmål om mottaket, legetimer, advokat og aktiviteter. Trenger du å snakke med en ansatt, trykk "Koble til vakt".'
    },
    en: {
      urgent: '⚠️ This sounds like an urgent emergency! If in immediate danger, call 113. An alert has been prepared for the reception duty officer.',
      normal: 'Thank you for reaching out. InfoVarde Lifeline helps with reception inquiries, doctor appointments, legal aid, and distributions. To speak with staff, click "Connect to Duty Desk".'
    },
    uk: {
      urgent: '⚠️ Це термінова ситуація! Якщо є загроза життю, негайно телефонуйте 113. Черговому працівнику центру надіслано сповіщення.',
      normal: 'Дякуємо за звернення. InfoVarde Lifeline допоможе з питаннями щодо лікаря, юридичної допомоги та розкладу. Якщо потрібно зв’язатися з черговим, натисніть "Викликати чергового".'
    },
    ar: {
      urgent: '⚠️ هذا يبدو كحالة طارئة عاجلة! إذا كان هناك خطر على الحياة، اتصل برقم 113 فوراً. تم تجهيز تنبيه للموظف المناوب.',
      normal: 'شكراً لتواصلك. يساعدك خط InfoVarde في الاستفسارات عن المركز، المواعيد الطبية، والمساعدات القانونية. للتحدث مع الموظف المناوب، اضغط "الاتصال بالمناوب".'
    },
    fa: {
      urgent: '⚠️ این وضعیت اضطراری به نظر می‌رسد! اگر خطر جانی وجود دارد، فوراً با شماره 113 تماس بگیرید. به مسئول شیفت مرکز اطلاع داده شد.',
      normal: 'تشکر از تماس شما. سامانه لایف‌لاین برای کمک در امور نوبت داکتر، کمک حقوقی و برنامه‌های مرکز در خدمت شماست. برای صحبت با کارمند، دکمه "اتصال به شیفت" را فشار دهید.'
    },
    so: {
      urgent: '⚠️ Tani waxay u muuqataa xaalad degdeg ah! Haddii naftu halis ku jirto, wac 113 isla markiiba. Digniin ayaa loo diray qofka heeganka ah.',
      normal: 'Waad ku mahadsan tahay la soo xiriirkaaga. InfoVarde Lifeline waxay kugu caawinaysaa su\'aalaha xarunta, ballamaha dhaqtarka, iyo kaalmada sharciga.'
    },
    tr: {
      urgent: '⚠️ Bu acil bir durum gibi görünüyor! Hayati tehlike varsa lütfen derhal 113\'ü arayın. Nöbetçi memura bildirim hazırlandı.',
      normal: 'İletişime geçtiğiniz için teşekkürler. InfoVarde Lifeline; sağlık randevuları, hukuki danışmanlık ve merkez kuralları konusunda 7/24 yanınızda. Bir görevliyle görüşmek için "Nöbetçiye Bağlan" butonuna basabilirsiniz.'
    }
  };

  const langPack = responsesByLang[langCode] || responsesByLang.en;
  const replyText = isEmergency ? langPack.urgent : langPack.normal;

  // 4. Record AI response
  const aiStmt = db.prepare(`
    INSERT INTO lifeline_messages (session_id, sender_type, lang_code, original_text, created_at)
    VALUES (?, 'ai', ?, ?, ?)
  `);
  aiStmt.run(session.id, langCode, replyText, new Date().toISOString());

  // 5. If emergency, auto-escalate
  if (isEmergency && session.status !== 'waiting_staff') {
    db.prepare("UPDATE lifeline_sessions SET status = 'waiting_staff' WHERE id = ?").run(session.id);
  }

  return {
    reply: replyText,
    langCode,
    isEmergency,
    status: isEmergency ? 'waiting_staff' : session.status
  };
}

/**
 * Escalate session from AI to human staff duty desk.
 */
export function escalateSession(sessionToken) {
  const db = getDb();
  const session = getSession(sessionToken);
  if (!session) {
    throw new Error('Invalid or expired lifeline session');
  }

  db.prepare("UPDATE lifeline_sessions SET status = 'waiting_staff' WHERE id = ?").run(session.id);

  // Calculate position in queue
  const queueRow = db.prepare(`
    SELECT COUNT(*) as queue_position 
    FROM lifeline_sessions 
    WHERE status = 'waiting_staff' AND id <= ?
  `).get(session.id);

  return {
    sessionToken,
    status: 'waiting_staff',
    queuePosition: queueRow ? queueRow.queue_position : 1,
    roomTag: session.room_tag
  };
}

/**
 * Send bidirectional translated message between Resident and Duty Staff.
 */
export async function sendSessionMessage({ sessionToken, senderType, text, langCode = 'no', targetLang = 'en' }) {
  const db = getDb();
  const session = getSession(sessionToken);
  if (!session) {
    throw new Error('Invalid or expired lifeline session');
  }

  let translatedText = text;
  try {
    const translationResult = await translateText({
      text,
      sourceLang: langCode,
      targetLangs: [targetLang]
    });
    if (translationResult[targetLang]?.content) {
      translatedText = translationResult[targetLang].content;
    }
  } catch (err) {
    console.error('Translation error in lifeline message:', err.message);
  }

  const stmt = db.prepare(`
    INSERT INTO lifeline_messages (session_id, sender_type, lang_code, original_text, translated_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  stmt.run(session.id, senderType, langCode, text, translatedText, now);

  return {
    senderType,
    langCode,
    originalText: text,
    translatedText,
    createdAt: now
  };
}

/**
 * Retrieve message history for a session.
 */
export function getSessionMessages(sessionToken) {
  const db = getDb();
  const session = getSession(sessionToken);
  if (!session) {
    throw new Error('Invalid or expired lifeline session');
  }

  return db.prepare(`
    SELECT id, sender_type, lang_code, original_text, translated_text, created_at 
    FROM lifeline_messages 
    WHERE session_id = ? 
    ORDER BY id ASC
  `).all(session.id);
}

/**
 * Retrieve active sessions list for Duty Staff Dashboard.
 */
export function getActiveDutySessions(channelCode = null) {
  const db = getDb();
  let query = `
    SELECT s.*, c.code as channel_code, c.name as channel_name,
      (SELECT original_text FROM lifeline_messages WHERE session_id = s.id ORDER BY id DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM lifeline_messages WHERE session_id = s.id) as message_count
    FROM lifeline_sessions s
    JOIN channels c ON s.channel_id = c.id
    WHERE s.expires_at > CURRENT_TIMESTAMP
  `;
  const params = [];

  if (channelCode) {
    query += ' AND c.code = ?';
    params.push(channelCode);
  }

  query += ' ORDER BY CASE s.status WHEN \'waiting_staff\' THEN 1 WHEN \'in_call\' THEN 2 ELSE 3 END, s.created_at DESC';

  return db.prepare(query).all(...params);
}

/**
 * Resolve / close session.
 */
export function resolveSession(sessionToken) {
  const db = getDb();
  const session = getSession(sessionToken);
  if (!session) return null;

  db.prepare("UPDATE lifeline_sessions SET status = 'resolved' WHERE id = ?").run(session.id);
  return { sessionToken, status: 'resolved' };
}

/**
 * Periodic cleaner for GDPR ephemeral lifetime compliance.
 */
export function purgeExpiredSessions() {
  return cleanupExpiredSessions();
}
