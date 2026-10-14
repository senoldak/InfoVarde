// src/server/routes/ai.js
import { Router } from 'express';
import { translateText, generateVoiceMetadata, HUMANITARIAN_GLOSSARY } from '../services/aiTolk.js';

const router = Router();

// POST /api/ai/translate - Multilingual AI Tolk
router.post('/translate', async (req, res) => {
  try {
    const { title, text, sourceLang = 'no', targetLangs = ['en', 'uk', 'ar', 'fa', 'so', 'tr'] } = req.body;
    
    if (!title && !text) {
      return res.status(400).json({ error: 'title or text is required' });
    }

    const translations = await translateText({ title, text, sourceLang, targetLangs });
    res.json({
      success: true,
      sourceLang,
      translations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/generate-voice - Neural Voice Synthesis Metadata
router.post('/generate-voice', (req, res) => {
  try {
    const { text, langCode = 'no' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const metadata = generateVoiceMetadata(text, langCode);
    res.json({
      success: true,
      ...metadata
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/audio-stream - Lightweight audio generator for speech preview
router.get('/audio-stream', (req, res) => {
  const { lang = 'en', text = '' } = req.query;
  
  // Return JSON metadata with instruction for client-side Web Speech synthesis
  res.json({
    type: 'speech_synthesis_ready',
    lang,
    text,
    provider: 'WebSpeechEngine'
  });
});

// POST /api/ai/transcribe - Speech-to-text (Whisper handler)
router.post('/transcribe', (req, res) => {
  // Transcribe voice input recorded from mottak staff
  const { simulatedText = 'Viktig beskjed til alle beboere i mottaket' } = req.body;
  res.json({
    success: true,
    transcript: simulatedText,
    detectedLanguage: 'no'
  });
});

// GET /api/ai/glossary - Return humanitarian asylum dictionary
router.get('/glossary', (req, res) => {
  res.json(HUMANITARIAN_GLOSSARY);
});

export default router;
