// src/components/admin/ChannelManager.jsx
import React, { useState } from 'react';
import QRCode from 'qrcode';
import { Plus, Tv, Smartphone, QrCode, ExternalLink, MapPin } from 'lucide-react';

export default function ChannelManager({ channels = [], onChannelCreated, onSelectChannel, activeCode }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLat, setNewLat] = useState('59.91');
  const [newLng, setNewLng] = useState('10.75');
  const [intervalSec, setIntervalSec] = useState('12');
  const [loading, setLoading] = useState(false);
  const [qrModalChannel, setQrModalChannel] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  async function handleCreateChannel(e) {
    e.preventDefault();
    if (!newCode || !newName) return;
    setLoading(true);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.toUpperCase().trim(),
          name: newName.trim(),
          location_name: newLocation.trim(),
          latitude: Number(newLat),
          longitude: Number(newLng),
          slide_interval_sec: Number(intervalSec)
        })
      });
      if (!res.ok) throw new Error('Opprettelse mislyktes');
      const data = await res.json();
      setShowCreate(false);
      setNewCode('');
      setNewName('');
      setNewLocation('');
      if (onChannelCreated) onChannelCreated(data);
    } catch (err) {
      alert('Feil: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenQr(channel) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const mobileUrl = `${origin}/m/${channel.code}`;
    QRCode.toDataURL(mobileUrl, { width: 320, margin: 2 })
      .then(url => {
        setQrDataUrl(url);
        setQrModalChannel(channel);
      })
      .catch(console.error);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
            Mottakskanaler & Informasjonsskjermer
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Hver kanal representerer et mottakssenter eller en dedikert TV-skjermgruppe.
          </p>
        </div>

        <button onClick={() => setShowCreate(true)} className="btn-beacon">
          <Plus size={18} />
          <span>Opprett Ny Kanal</span>
        </button>
      </div>

      {/* Channels Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {channels.map(c => {
          const isActive = c.code === activeCode;
          return (
            <div
              key={c.id || c.code}
              className="glass-card"
              style={{
                padding: '20px',
                border: isActive ? '2px solid #F97316' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="tv-channel-tag" style={{ fontSize: '0.85rem' }}>
                  {c.code}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  {c.slide_interval_sec || 12}s intervall
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                {c.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.85rem', marginBottom: '16px' }}>
                <MapPin size={16} color="#06B6D4" />
                <span>{c.location_name || 'Ukjent lokasjon'}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`/tv/${c.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', textDecoration: 'none' }}
                >
                  <Tv size={14} />
                  <span>Åpne TV</span>
                </a>

                <a
                  href={`/m/${c.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', textDecoration: 'none' }}
                >
                  <Smartphone size={14} />
                  <span>Åpne Mobil</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleOpenQr(c)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <QrCode size={14} />
                  <span>Plakat QR</span>
                </button>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => onSelectChannel(c.code)}
                    className="btn-beacon"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    Velg kanal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Channel Modal */}
      {showCreate && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '16px' }}>
              Opprett Ny Mottakskanal
            </h3>

            <form onSubmit={handleCreateChannel}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  KANALKODE (F.eks. BERGEN-01):
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  KANALNAVN:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  LOKASJONSNAVN (BY / SENTER):
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    BREDDEGRAD (LAT):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    LENGDEGRAD (LNG):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '8px 12px', color: '#FFFFFF' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Avbryt
                </button>
                <button type="submit" disabled={loading} className="btn-beacon">
                  {loading ? 'Oppretter...' : 'Opprett kanal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Printable Modal */}
      {qrModalChannel && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              Plakat QR: {qrModalChannel.name}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '16px' }}>
              Skriv ut denne plakaten og heng opp på oppslagstavlen i mottaket.
            </p>

            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{ width: '220px', height: '220px', background: '#FFFFFF', padding: '12px', borderRadius: '16px', margin: '0 auto 16px' }}
            />

            <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '20px' }}>
              Lenke: <code>/m/{qrModalChannel.code}</code>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => window.print()} className="btn-beacon">
                Skriv ut plakat
              </button>
              <button onClick={() => setQrModalChannel(null)} className="btn-secondary">
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
