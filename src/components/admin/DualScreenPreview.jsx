// src/components/admin/DualScreenPreview.jsx
import React, { useState } from 'react';
import { Tv, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';

export default function DualScreenPreview({ channelCode = 'MYTI-01' }) {
  const [tvKey, setTvKey] = useState(Date.now());
  const [mobileKey, setMobileKey] = useState(Date.now());

  function reloadAll() {
    setTvKey(Date.now());
    setMobileKey(Date.now());
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
            Çift Ekran Canlı Önizleme (Dual-Screen Simulator)
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Duvardaki TV ekranı ile mültecinin cebindeki mobil PWA akışını eşzamanlı test edin.
          </p>
        </div>

        <button onClick={reloadAll} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw size={16} />
          <span>Oppdater forhåndsvisning</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.8fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left: TV 16:9 Frame */}
        <div className="glass-card" style={{ padding: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#FFFFFF' }}>
              <Tv size={20} color="#F97316" />
              <span>Duvardaki TV Ekranı (/tv/{channelCode})</span>
            </div>
            <a
              href={`/tv/${channelCode}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06B6D4', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <span>Åpne fullskjerm</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 ratio
            background: '#0B1120',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <iframe
              key={tvKey}
              src={`/tv/${channelCode}`}
              title="TV Preview"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          </div>
        </div>

        {/* Right: Mobile Phone Frame */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#FFFFFF' }}>
              <Smartphone size={20} color="#06B6D4" />
              <span>Cepteki Mobil Akış (/m/{channelCode})</span>
            </div>
            <a
              href={`/m/${channelCode}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#06B6D4', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <span>Åpne i ny fane</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{
            width: '320px',
            height: '620px',
            background: '#0B1120',
            borderRadius: '36px',
            border: '8px solid #1E293B',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Phone Notch */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '120px',
              height: '18px',
              background: '#1E293B',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              zIndex: 10
            }} />

            <iframe
              key={mobileKey}
              src={`/m/${channelCode}`}
              title="Mobile Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
