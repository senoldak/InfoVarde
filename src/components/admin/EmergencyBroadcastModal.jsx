// src/components/admin/EmergencyBroadcastModal.jsx
import React, { useState } from 'react';
import { AlertTriangle, Bell, X, Send } from 'lucide-react';

export default function EmergencyBroadcastModal({ channelCode = 'MYTI-01', onClose, onBroadcastSuccess }) {
  const [title, setTitle] = useState('BRANNALARM / FIRE ALARM');
  const [message, setMessage] = useState('Evakuer bygningen umiddelbart. Møt opp ved samlingspunkt C. / Evacuate the building immediately.');
  const [severity, setSeverity] = useState('critical');
  const [loading, setLoading] = useState(false);

  const presets = [
    {
      name: '🔥 Brannalarm / Fire Alarm',
      title: 'BRANNALARM / FIRE ALARM',
      message: 'Evakuer bygningen umiddelbart og gå til samlingspunkt C. Følg instruksene fra mottaksledelsen.'
    },
    {
      name: '❄️ Ekstremvær / Storm Alert',
      title: 'EKSTREMT VÆR / SEVERE WEATHER',
      message: 'Kraftig storm og kulde. Alle beboere må holde seg innendørs inntil videre.'
    },
    {
      name: '📢 Akutt Fellesmøte / Urgent Meeting',
      title: 'VIKTIG FELLESINFORMASJON',
      message: 'Møt opp i felleskantinen kl. 15:00 for viktig oppdatering fra UDI og mottaksledelsen.'
    }
  ];

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelCode}/broadcast-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, severity })
      });
      if (!res.ok) throw new Error('Broadcast failed');
      const data = await res.json();
      if (onBroadcastSuccess) onBroadcastSuccess(data);
      onClose();
    } catch (err) {
      alert('Feil ved sending av nødvarsel: ' + err.message);
    } finally {
      setLoading(false);
    }
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
        maxWidth: '560px',
        border: '2px solid rgba(239, 68, 68, 0.6)',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="#EF4444" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FEF2F2' }}>
              Send Felles Nødvarsel (Broadcast Alert)
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSend} style={{ padding: '20px' }}>
          <p style={{ fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '16px' }}>
            Dette varselet overstyrer alle TV-skjermer og sender umiddelbar lyd- og skjermtakeover til kanal <strong style={{ color: '#F97316' }}>{channelCode}</strong>.
          </p>

          {/* Quick Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              HURTIGVALG (MALER):
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {presets.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => { setTitle(p.title); setMessage(p.message); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: '#F8FAFC',
                    cursor: 'pointer'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              VARSELTITTEL (STOR TEKST PÅ TV):
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              INSTRUKSER / MELDING:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-danger"
              style={{ padding: '10px 24px', fontWeight: 700 }}
            >
              <Bell size={18} />
              <span>{loading ? 'Kringkaster...' : 'Send Felles Nødvarsel NÅ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
