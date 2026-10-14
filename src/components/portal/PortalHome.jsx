// src/components/portal/PortalHome.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tv, Smartphone, Settings, ShieldAlert, Sparkles, WifiOff, Globe, ArrowRight, HeartPulse, Scale, CheckCircle2 } from 'lucide-react';

export default function PortalHome() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('MYTI-01');

  useEffect(() => {
    fetch('/api/channels')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setChannels(data);
          setActiveChannel(data[0].code);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 10%, #162032 0%, #0B1120 60%, #050811 100%)', color: '#F8FAFC' }}>
      {/* Top Glass Navbar */}
      <nav style={{
        padding: '18px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <svg width="40" height="40" viewBox="0 0 100 100">
            <rect x="20" y="65" width="60" height="20" rx="10" fill="#1E293B" />
            <rect x="30" y="40" width="40" height="18" rx="9" fill="#334155" />
            <rect x="40" y="18" width="20" height="15" rx="7.5" fill="#F97316" />
          </svg>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            InfoVarde
          </span>
          <span style={{
            background: 'rgba(249, 115, 22, 0.15)',
            color: '#F97316',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            padding: '2px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            MVP v1.0
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/admin" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
            <Settings size={16} />
            <span>InfoVarde Studio</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ maxWidth: '1200px', margin: '0 auto', padding: '70px 24px 50px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '30px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontSize: '0.9rem',
          color: '#CBD5E1',
          marginBottom: '24px'
        }}>
          <Sparkles size={16} color="#F97316" />
          <span>Inspirert av Pintomind (Infoskjermen) • Skreddersydd for Mottak og Humanitære Sentre</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #FFFFFF 40%, #94A3B8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Trygg informasjon som viser vei — på veggen og i lomma.
        </h1>

        <p style={{
          fontSize: '1.25rem',
          color: '#94A3B8',
          maxWidth: '780px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          Duvarda TV ekranı, cepte sıfır kayıt mobil PWA, AI destekli çok dilli tercüme/seslendirme motoru ve KVKK/GDPR uyumlu 24/7 acil nöbetçi masası.
        </p>

        {/* Quick Launch Hub */}
        <div className="glass-card" style={{
          maxWidth: '820px',
          margin: '0 auto',
          padding: '28px',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: '#CBD5E1', fontWeight: 600 }}>Aktiv Mottakskanal:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {channels.map(c => (
                <button
                  key={c.code}
                  onClick={() => setActiveChannel(c.code)}
                  style={{
                    background: activeChannel === c.code ? '#F97316' : 'rgba(255, 255, 255, 0.08)',
                    color: activeChannel === c.code ? '#FFFFFF' : '#CBD5E1',
                    border: '1px solid ' + (activeChannel === c.code ? '#F97316' : 'rgba(255, 255, 255, 0.12)'),
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {c.code} ({c.location_name})
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to={`/tv/${activeChannel}`}
              target="_blank"
              className="btn-beacon"
              style={{ padding: '14px 28px', fontSize: '1.05rem', textDecoration: 'none' }}
            >
              <Tv size={20} />
              <span>Åpne TV-Skjerm (/tv/{activeChannel})</span>
            </Link>

            <Link
              to={`/m/${activeChannel}`}
              target="_blank"
              className="btn-secondary"
              style={{ padding: '14px 28px', fontSize: '1.05rem', textDecoration: 'none' }}
            >
              <Smartphone size={20} />
              <span>Åpne Mobil PWA (/m/{activeChannel})</span>
            </Link>

            <Link
              to="/admin"
              className="btn-secondary"
              style={{ padding: '14px 28px', fontSize: '1.05rem', textDecoration: 'none' }}
            >
              <Settings size={20} />
              <span>Studio Kontrollpanel</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Feature Pillars Grid */}
      <section style={{ maxWidth: '1200px', margin: '40px auto 80px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Pillar 1 */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Tv size={26} color="#F97316" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
              InfoVarde Skjerm
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Pintomind modelinde 10-foot UI slayt döngüsü, canlı hava durumu & saat bandı, mobil yönlendirici dinamik QR kod ve internet kesilse dahi kararmayan <code>localStorage</code> offline tamponu.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Smartphone size={26} color="#06B6D4" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
              InfoVarde Mobil
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Sıfır kayıt (Zero-PII) tek tıkla açılan PWA feed'i. 8+ dilde anında RTL adaptasyonu (Arapça & Farsça), Web Speech sesli okuma ve yaklaşan randevu takvimi.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Sparkles size={26} color="#8B5CF6" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
              InfoVarde AI Tolk
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Mottak ve iltica terminolojisiyle eğitilmiş akıllı çeviri motoru (UDI, helsesjekk, asylintervju). 1-Click ile tüm dillere aynı anda tercüme ve seslendirme.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card" style={{ padding: '28px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <ShieldAlert size={26} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '10px' }}>
              InfoVarde Lifeline
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              KVKK & GDPR uyumlu anonim yardım hattı. 24/7 AI ilk yardım triyajı, nöbetçi memur masasına canlı eskalasyon, iki dilli çevirili sohbet ve WebRTC sesli VoIP çağrısı.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 48px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: '#64748B'
      }}>
        <div>InfoVarde MVP Platform © 2026 • Mottak & Humanitarian Digital Signage</div>
        <div>Bygget med Node.js, Express, React, SQLite, WebRTC og SSE</div>
      </footer>
    </div>
  );
}
