// src/components/mobile/AudioVoicePlayer.jsx
import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square } from 'lucide-react';

export default function AudioVoicePlayer({ text, title, langCode = 'no' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
    }
  }, []);

  function handleTogglePlay() {
    if (!isSupported) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    const fullText = `${title || ''}. ${text || ''}`;
    const utterance = new SpeechSynthesisUtterance(fullText);

    // Map language code to standard locale
    const localeMap = {
      no: 'nb-NO',
      en: 'en-US',
      uk: 'uk-UA',
      ar: 'ar-SA',
      fa: 'fa-IR',
      so: 'so-SO',
      tr: 'tr-TR',
      el: 'el-GR',
      ru: 'ru-RU'
    };

    utterance.lang = localeMap[langCode] || 'en-US';
    utterance.rate = ['ar', 'fa'].includes(langCode) ? 0.9 : 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <button
      onClick={handleTogglePlay}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(249, 115, 22, 0.15)',
        border: isPlaying ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(249, 115, 22, 0.3)',
        color: isPlaying ? '#FCA5A5' : '#F97316',
        fontSize: '0.85rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      title={isPlaying ? 'Stopp opplesing' : 'Lytt til opplesing (TTS)'}
    >
      {isPlaying ? (
        <>
          <Square size={16} fill="#EF4444" color="#EF4444" />
          <span>Stopp lyd</span>
        </>
      ) : (
        <>
          <Volume2 size={16} />
          <span>Hør opplesing</span>
        </>
      )}
    </button>
  );
}
