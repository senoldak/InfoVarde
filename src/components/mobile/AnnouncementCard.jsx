// src/components/mobile/AnnouncementCard.jsx
import React, { useState } from 'react';
import AudioVoicePlayer from './AudioVoicePlayer.jsx';
import { Calendar, Clock, MapPin, Share2, Check, AlertCircle, HeartPulse, Scale, Utensils, BookOpen, Info } from 'lucide-react';

export default function AnnouncementCard({ item, langCode = 'no' }) {
  const [copied, setCopied] = useState(false);

  const {
    title,
    content,
    category,
    priority,
    image_url,
    event_date,
    event_time,
    event_location,
    is_rtl
  } = item;

  const isEmergency = priority === 'emergency';
  const isUrgent = priority === 'urgent';

  function handleShare() {
    const textToShare = `${title}\n\n${content}\n${event_location ? 'Sted: ' + event_location : ''}`;
    if (navigator.share) {
      navigator.share({
        title,
        text: textToShare,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(textToShare);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getCategoryIcon() {
    switch (category) {
      case 'health':
        return <HeartPulse size={16} color="#06B6D4" />;
      case 'legal':
        return <Scale size={16} color="#F59E0B" />;
      case 'food':
        return <Utensils size={16} color="#10B981" />;
      case 'education':
        return <BookOpen size={16} color="#8B5CF6" />;
      default:
        return <Info size={16} color="#94A3B8" />;
    }
  }

  return (
    <article
      className="glass-card"
      style={{
        padding: '20px',
        marginBottom: '16px',
        borderLeft: isEmergency ? '4px solid #EF4444' : isUrgent ? '4px solid #F97316' : '1px solid rgba(255, 255, 255, 0.08)'
      }}
      dir={is_rtl ? 'rtl' : 'ltr'}
    >
      {/* Top Meta Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className={`badge badge-${category || 'general'}`}>
            {getCategoryIcon()}
            {category ? category.toUpperCase() : 'INFO'}
          </span>

          {isEmergency && (
            <span className="badge badge-emergency">
              <AlertCircle size={14} color="#EF4444" />
              NØDVARSEL
            </span>
          )}

          {isUrgent && (
            <span className="badge badge-emergency" style={{ color: '#FDBA74', borderColor: 'rgba(249, 115, 22, 0.4)' }}>
              <AlertCircle size={14} color="#F97316" />
              VIKTIG
            </span>
          )}
        </div>

        <button
          onClick={handleShare}
          style={{
            background: 'transparent',
            border: 'none',
            color: copied ? '#10B981' : '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.8rem'
          }}
          title="Del melding"
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
        </button>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '1.35rem',
        fontWeight: 700,
        color: '#FFFFFF',
        lineHeight: 1.3,
        marginBottom: '10px'
      }}>
        {title}
      </h2>

      {/* Content */}
      <p style={{
        fontSize: '1rem',
        lineHeight: 1.5,
        color: '#CBD5E1',
        marginBottom: '16px',
        whiteSpace: 'pre-line'
      }}>
        {content}
      </p>

      {/* Image if provided */}
      {image_url && (
        <img
          src={image_url}
          alt={title}
          style={{ width: '100%', borderRadius: '10px', marginBottom: '16px', maxHeight: '240px', objectFit: 'cover' }}
        />
      )}

      {/* Event Details Badge Bar */}
      {(event_date || event_location) && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 14px',
          background: 'rgba(11, 17, 32, 0.5)',
          borderRadius: '10px',
          marginBottom: '14px',
          fontSize: '0.85rem',
          color: '#E2E8F0'
        }}>
          {event_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#F97316" />
              <span>{event_date}</span>
              {event_time && <span>({event_time})</span>}
            </div>
          )}

          {event_location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} color="#06B6D4" />
              <span>{event_location}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <AudioVoicePlayer text={content} title={title} langCode={langCode} />
      </div>
    </article>
  );
}
