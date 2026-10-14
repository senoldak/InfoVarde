// src/components/tv/SlideView.jsx
import React from 'react';
import { Calendar, Clock, MapPin, AlertCircle, HeartPulse, Scale, Utensils, BookOpen, Info } from 'lucide-react';

export default function SlideView({ slide }) {
  if (!slide) {
    return (
      <div className="tv-slide-wrapper">
        <div className="tv-slide-card" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#94A3B8' }}>Ingen aktive meldinger for øyeblikket</h2>
        </div>
      </div>
    );
  }

  const {
    title,
    content,
    category,
    priority,
    content_type,
    image_url,
    event_date,
    event_time,
    event_location,
    secondary_translation,
    is_rtl
  } = slide;

  const isEmergency = priority === 'emergency';
  const isUrgent = priority === 'urgent';

  function getCategoryIcon() {
    switch (category) {
      case 'health':
        return <HeartPulse size={24} color="#06B6D4" />;
      case 'legal':
        return <Scale size={24} color="#F59E0B" />;
      case 'food':
        return <Utensils size={24} color="#10B981" />;
      case 'education':
        return <BookOpen size={24} color="#8B5CF6" />;
      default:
        return <Info size={24} color="#94A3B8" />;
    }
  }

  return (
    <div className="tv-slide-wrapper">
      <div className={`tv-slide-card ${isEmergency ? 'emergency-border' : ''}`}>
        {/* Top Badges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <span className={`badge badge-${category || 'general'}`} style={{ fontSize: '1.05rem', padding: '6px 16px' }}>
              {getCategoryIcon()}
              {category ? category.toUpperCase() : 'INFO'}
            </span>

            {isEmergency && (
              <span className="badge badge-emergency" style={{ fontSize: '1.05rem', padding: '6px 16px' }}>
                <AlertCircle size={22} color="#EF4444" />
                NØDVARSEL / EMERGENCY
              </span>
            )}

            {isUrgent && (
              <span className="badge badge-emergency" style={{ fontSize: '1.05rem', padding: '6px 16px' }}>
                <AlertCircle size={22} color="#F97316" />
                VIKTIG / URGENT
              </span>
            )}
          </div>

          {/* Main Title */}
          <h1 className="tv-slide-title" dir={is_rtl ? 'rtl' : 'ltr'}>
            {title}
          </h1>

          {/* Main Content */}
          <p className="tv-slide-content" dir={is_rtl ? 'rtl' : 'ltr'}>
            {content}
          </p>
        </div>

        {/* Secondary Subtitle Translation (Pintomind Multilingual Innovation) */}
        {secondary_translation && (
          <div
            className="tv-secondary-translation"
            dir={secondary_translation.is_rtl ? 'rtl' : 'ltr'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>{secondary_translation.flag || '🌐'}</span>
              <span className="tv-secondary-title">{secondary_translation.title}</span>
            </div>
            <p className="tv-secondary-body">
              {secondary_translation.content}
            </p>
          </div>
        )}

        {/* Event Details Row */}
        {(event_date || event_location) && (
          <div className="tv-meta-row">
            {event_date && (
              <div className="tv-meta-item">
                <Calendar size={28} color="#F97316" />
                <span>{event_date}</span>
                {event_time && <span>• {event_time}</span>}
              </div>
            )}
            {event_location && (
              <div className="tv-meta-item">
                <MapPin size={28} color="#06B6D4" />
                <span>{event_location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
