// src/components/admin/AnnouncementEditor.jsx
import React, { useState } from 'react';
import AiTolkModal from './AiTolkModal.jsx';
import { Sparkles, Save, X, Calendar, MapPin, Clock, Languages, Plus, Trash2 } from 'lucide-react';
import { TOKENS } from '../../shared/tokens.js';

export default function AnnouncementEditor({ channelId, channelCode, initialData, onSave, onCancel }) {
  const [category, setCategory] = useState(initialData?.category || 'general');
  const [priority, setPriority] = useState(initialData?.priority || 'normal');
  const [contentType, setContentType] = useState(initialData?.content_type || 'standard');
  const [slideDuration, setSlideDuration] = useState(initialData?.slide_duration || 12);
  const [eventDate, setEventDate] = useState(initialData?.event_date || '');
  const [eventTime, setEventTime] = useState(initialData?.event_time || '');
  const [eventLocation, setEventLocation] = useState(initialData?.event_location || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');

  // Multilingual translations map
  const [translations, setTranslations] = useState(initialData?.translations || [
    { lang_code: 'no', title: '', content: '', is_rtl: false }
  ]);
  const [activeLangTab, setActiveLangTab] = useState('no');
  const [showAiModal, setShowAiModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active translation being edited
  const currentTranslation = translations.find(t => t.lang_code === activeLangTab) || {
    lang_code: activeLangTab,
    title: '',
    content: '',
    is_rtl: ['ar', 'fa'].includes(activeLangTab)
  };

  function updateCurrentTranslation(field, val) {
    setTranslations(prev => {
      const existing = prev.find(t => t.lang_code === activeLangTab);
      if (existing) {
        return prev.map(t => t.lang_code === activeLangTab ? { ...t, [field]: val } : t);
      } else {
        return [...prev, {
          lang_code: activeLangTab,
          title: '',
          content: '',
          is_rtl: ['ar', 'fa'].includes(activeLangTab),
          [field]: val
        }];
      }
    });
  }

  // Handle AI Tolk apply
  function handleApplyAiTranslations(newTranslations) {
    setTranslations(newTranslations);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const primaryNo = translations.find(t => t.lang_code === 'no');
    if (!primaryNo?.title || !primaryNo?.content) {
      alert('Vennligst fyll ut norsk tittel og innhold som minimum.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        channel_id: channelId,
        category,
        priority,
        content_type: contentType,
        slide_duration: Number(slideDuration),
        event_date: contentType === 'event' ? eventDate : null,
        event_time: contentType === 'event' ? eventTime : null,
        event_location: contentType === 'event' ? eventLocation : null,
        image_url: imageUrl || null,
        translations: translations.filter(t => t.title && t.content)
      };

      const url = initialData?.id ? `/api/announcements/${initialData.id}` : '/api/announcements';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed saving announcement');
      const savedData = await res.json();
      onSave(savedData);
    } catch (err) {
      alert('Feil ved lagring: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
          {initialData?.id ? 'Rediger Melding' : 'Opprett Ny Melding / Kunngjøring'}
        </h2>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Meta Row: Category, Priority, Type, Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              KATEGORI
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            >
              {TOKENS.categories.filter(c => c.id !== 'all').map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              PRIORITET
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="normal">Normal</option>
              <option value="urgent">Viktig (Høy)</option>
              <option value="emergency">Nødvarsel (Kritisk)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              INNHOLDSTYPE
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="standard">Standard Slayt</option>
              <option value="event">Hendelse / Møte / Utdeling</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              SLAYT VARIGHET (SEK)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={slideDuration}
              onChange={(e) => setSlideDuration(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#FFFFFF',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Event Fields if contentType === 'event' */}
        {contentType === 'event' && (
          <div style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#67E8F9', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                DATO
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '8px', color: '#FFFFFF' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#67E8F9', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                KLOKKESLETT
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '8px', color: '#FFFFFF' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#67E8F9', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                STED / ROM
              </label>
              <input
                type="text"
                placeholder="F.eks. Klinikktelt B, Rom 104"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '8px', color: '#FFFFFF' }}
              />
            </div>
          </div>
        )}

        {/* Multilingual Tabs & 1-Click AI Tolk Action */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Languages size={16} color="#F97316" />
              <span>SPRÅKVERSJONER</span>
            </label>

            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="btn-beacon"
              style={{
                background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)',
                fontSize: '0.85rem',
                padding: '6px 14px'
              }}
            >
              <Sparkles size={16} />
              <span>1-Click AI Tolk (Oversett alle)</span>
            </button>
          </div>

          {/* Language Tabs Row */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }}>
            {TOKENS.languages.map(lang => {
              const hasContent = translations.some(t => t.lang_code === lang.code && t.title);
              const isActive = activeLangTab === lang.code;

              return (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => setActiveLangTab(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: isActive ? '1px solid #F97316' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#F97316' : '#CBD5E1',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {hasContent && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Translation Content Editor for Active Tab */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              TITTEL ({activeLangTab.toUpperCase()}):
            </label>
            <input
              type="text"
              value={currentTranslation.title || ''}
              onChange={(e) => updateCurrentTranslation('title', e.target.value)}
              dir={currentTranslation.is_rtl ? 'rtl' : 'ltr'}
              placeholder="Skriv tittel..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1.05rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              INNHOLD ({activeLangTab.toUpperCase()}):
            </label>
            <textarea
              rows={4}
              value={currentTranslation.content || ''}
              onChange={(e) => updateCurrentTranslation('content', e.target.value)}
              dir={currentTranslation.is_rtl ? 'rtl' : 'ltr'}
              placeholder="Skriv full beskjed..."
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#CBD5E1',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Avbryt
          </button>
          <button type="submit" disabled={loading} className="btn-beacon">
            <Save size={18} />
            <span>{loading ? 'Lagrer...' : 'Lagre og publiser til TV & Mobil'}</span>
          </button>
        </div>
      </form>

      {/* AI Tolk Modal */}
      {showAiModal && (
        <AiTolkModal
          sourceTitle={translations.find(t => t.lang_code === 'no')?.title || ''}
          sourceText={translations.find(t => t.lang_code === 'no')?.content || ''}
          onApply={handleApplyAiTranslations}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}
