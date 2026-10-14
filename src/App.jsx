import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import TvPlayer from './components/tv/TvPlayer.jsx';
import MobileFeed from './components/mobile/MobileFeed.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC]">
      <Routes>
        <Route path="/" element={<PortalPlaceholder />} />
        <Route path="/tv/:code" element={<TvPlayer />} />
        <Route path="/m/:code" element={<MobileFeed />} />
        <Route path="/admin" element={<AdminPlaceholder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function PortalPlaceholder() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="48" height="48" viewBox="0 0 100 100">
          <rect x="20" y="65" width="60" height="20" rx="10" fill="#1E293B" />
          <rect x="30" y="40" width="40" height="18" rx="9" fill="#334155" />
          <rect x="40" y="18" width="20" height="15" rx="7.5" fill="#F97316" />
        </svg>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>InfoVarde</h1>
      </div>
      <p style={{ color: '#94A3B8', fontSize: '1.25rem', maxWidth: '600px', marginBottom: '2rem' }}>
        Trygg informasjon som viser vei — på veggen og i lomma.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/tv/MYTI-01" className="btn-beacon">📺 InfoVarde Skjerm (TV)</Link>
        <Link to="/m/MYTI-01" className="btn-secondary">📱 InfoVarde Mobil (Feed)</Link>
        <Link to="/admin" className="btn-secondary">⚙️ InfoVarde Studio (Admin)</Link>
      </div>
    </div>
  );
}

function TvPlaceholder() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>InfoVarde Skjerm (Loading...)</h2></div>;
}

function MobilePlaceholder() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>InfoVarde Mobil (Loading...)</h2></div>;
}

function AdminPlaceholder() {
  return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>InfoVarde Studio (Loading...)</h2></div>;
}

function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h2>404 — Siden ble ikke funnet</h2>
      <Link to="/" className="btn-beacon" style={{ marginTop: '1rem', display: 'inline-block' }}>Tilbake til forsiden</Link>
    </div>
  );
}
