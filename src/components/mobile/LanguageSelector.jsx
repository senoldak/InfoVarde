// src/components/mobile/LanguageSelector.jsx
import React from 'react';
import { TOKENS } from '../../shared/tokens.js';
import { Globe } from 'lucide-react';

export default function LanguageSelector({ currentLang = 'no', onSelectLanguage }) {
  return (
    <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>
        <Globe size={16} color="#F97316" />
        <span>Velg språk / Choose language / اختر اللغة:</span>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {TOKENS.languages.map((lang) => {
          const isActive = lang.code === currentLang;
          return (
            <button
              key={lang.code}
              onClick={() => onSelectLanguage(lang)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: isActive ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' : 'rgba(255, 255, 255, 0.06)',
                color: isActive ? '#FFFFFF' : '#CBD5E1',
                border: isActive ? '1px solid #F97316' : '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.9rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 4px 12px rgba(249, 115, 22, 0.35)' : 'none'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
