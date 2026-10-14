// src/components/admin/AiTolkModal.jsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, RefreshCw, Languages } from 'lucide-react';
import { TOKENS } from '../../shared/tokens.js';

export default function AiTolkModal({ sourceTitle, sourceText, onApply, onClose }) {
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState({});
  const [selectedLangs, setSelectedLangs] = useState(['en', 'uk', 'ar', 'fa', 'so', 'tr']);

  async function handleRunTranslate() {
    if (!sourceTitle && !sourceText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sourceTitle,
          text: sourceText,
          sourceLang: 'no',
          targetLangs: selectedLangs
        })
      });
      if (!res.ok) throw new Error('Translation API failed');
      const data = await res.json();
      setTranslations(data.translations || {});
    } catch (err) {
      alert('AI Tolk feil: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auto-translate on mount
  useEffect(() => {
    handleRunTranslate();
  }, []);

  function handleApply() {
    // Format translations array for parent
    const resultTranslations = [
      {
        lang_code: 'no',
        title: sourceTitle,
        content: sourceText,
        is_rtl: false
      }
    ];

    for (const [langCode, t] of Object.entries(translations)) {
      resultTranslations.push({
        lang_code: langCode,
        title: t.title || '',
        content: t.content || '',
        is_rtl: t.is_rtl || ['ar', 'fa'].includes(langCode)
      });
    }

    onApply(resultTranslations);
    onClose();
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1100,
      background: 'rgba(11, 17, 32, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        boxShadow: '0 0 50px rgba(6, 182, 212, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="#06B6D4" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                InfoVarde AI Tolk (1-Click Multilingual Engine)
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Kontekstuell oversettelse tilpasset mottak og asylterminologi
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Content Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Source Preview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#F97316', fontWeight: 700, marginBottom: '4px' }}>
              🇳🇴 KILDE (NORSK):
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF' }}>{sourceTitle}</div>
            <div style={{ color: '#CBD5E1', fontSize: '0.95rem', marginTop: '4px' }}>{sourceText}</div>
          </div>

          {/* Translations List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#06B6D4' }}>
              <RefreshCw size={36} className="spin" style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontWeight: 600 }}>Oversetter til {selectedLangs.length} språk med asylglossar...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedLangs.map(code => {
                const langObj = TOKENS.languages.find(l => l.code === code) || { flag: '🌐', nativeName: code };
                const t = translations[code] || {};
                const isRtl = ['ar', 'fa'].includes(code);

                return (
                  <div
                    key={code}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '14px 18px'
                    }}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{langObj.flag}</span>
                      <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>{langObj.nativeName}</strong>
                      {isRtl && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(6, 182, 212, 0.2)', color: '#67E8F9', padding: '2px 6px', borderRadius: '4px' }}>
                          RTL
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={t.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTranslations(prev => ({
                          ...prev,
                          [code]: { ...prev[code], title: val }
                        }));
                      }}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        marginBottom: '8px',
                        outline: 'none'
                      }}
                    />

                    <textarea
                      value={t.content || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTranslations(prev => ({
                          ...prev,
                          [code]: { ...prev[code], content: val }
                        }));
                      }}
                      rows={2}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#CBD5E1',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={handleRunTranslate}
            disabled={loading}
            className="btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} />
            <span>Oversett på nytt</span>
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              className="btn-beacon"
              style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)' }}
            >
              <Check size={18} />
              <span>Bruk alle oversettelser</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
