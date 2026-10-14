// src/components/mobile/EventCalendarView.jsx
import React from 'react';
import { Calendar, Clock, MapPin, Tag } from 'lucide-react';

export default function EventCalendarView({ items = [], isRtl = false }) {
  const events = items
    .filter(item => item.event_date || item.content_type === 'event')
    .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''));

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94A3B8' }}>
        <Calendar size={48} color="#475569" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.2rem', color: '#CBD5E1', marginBottom: '8px' }}>Ingen planlagte hendelser</h3>
        <p style={{ fontSize: '0.95rem' }}>Det er ingen oppførte legetimer, utdelinger eller kurs akkurat nå.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {events.map((ev, index) => (
        <div
          key={ev.id || index}
          className="glass-card"
          style={{
            padding: '16px',
            marginBottom: '12px',
            borderRight: isRtl ? '3px solid #06B6D4' : 'none',
            borderLeft: !isRtl ? '3px solid #06B6D4' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#67E8F9',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {ev.category ? ev.category.toUpperCase() : 'HENDELSE'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F97316', fontSize: '0.9rem', fontWeight: 700 }}>
              <Calendar size={16} />
              <span>{ev.event_date}</span>
            </div>
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
            {ev.title}
          </h3>

          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '10px', lineHeight: 1.4 }}>
            {ev.content}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem', color: '#CBD5E1' }}>
            {ev.event_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} color="#F97316" />
                <span>{ev.event_time}</span>
              </div>
            )}
            {ev.event_location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="#06B6D4" />
                <span>{ev.event_location}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
