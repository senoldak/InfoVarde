// src/components/tv/EmergencyTakeover.jsx
import React from 'react';
import { AlertTriangle, BellRing } from 'lucide-react';

export default function EmergencyTakeover({ alert, onDismiss }) {
  if (!alert) return null;

  return (
    <div className="tv-emergency-takeover">
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <AlertTriangle size={80} color="#FEE2E2" />
        <BellRing size={80} color="#FEE2E2" />
      </div>

      <h1 className="tv-emergency-title">
        {alert.title || 'VIKTIG NØDVARSEL / EMERGENCY ALERT'}
      </h1>

      <p className="tv-emergency-body">
        {alert.message || 'Evakuer bygningen eller følg instruksjoner fra mottaksledelsen umiddelbart.'}
      </p>

      {/* Multilingual translations if available */}
      <div style={{
        marginTop: '40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '1200px'
      }}>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FCA5A5' }}>🇬🇧 ENGLISH</div>
          <div style={{ fontSize: '1.5rem', color: '#FFFFFF', marginTop: '6px' }}>
            Emergency alert in effect. Please follow instructions from staff immediately.
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '16px' }} dir="rtl">
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FCA5A5' }}>🇸🇾 العربية</div>
          <div style={{ fontSize: '1.5rem', color: '#FFFFFF', marginTop: '6px' }}>
            تنبيه طوارئ عاجل. يرجى اتباع تعليمات موظفي المركز فوراً.
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FCA5A5' }}>🇺🇦 УКРАЇНСЬКА</div>
          <div style={{ fontSize: '1.5rem', color: '#FFFFFF', marginTop: '6px' }}>
            Термінове сповіщення про небезпеку. Негайно дотримуйтесь інструкцій персоналу.
          </div>
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            marginTop: '48px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            color: '#FFFFFF',
            padding: '12px 32px',
            fontSize: '1.2rem',
            fontWeight: 700,
            borderRadius: '12px',
            cursor: 'pointer'
          }}
        >
          Lukk varsel / Dismiss
        </button>
      )}
    </div>
  );
}
