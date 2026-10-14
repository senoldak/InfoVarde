import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import PortalHome from './components/portal/PortalHome.jsx';
import TvPlayer from './components/tv/TvPlayer.jsx';
import MobileFeed from './components/mobile/MobileFeed.jsx';
import AdminDashboard from './components/admin/AdminDashboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0B1120] text-[#F8FAFC]">
      <Routes>
        <Route path="/" element={<PortalHome />} />
        <Route path="/tv/:code" element={<TvPlayer />} />
        <Route path="/m/:code" element={<MobileFeed />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 — Siden ble ikke funnet</h2>
      <p style={{ color: '#94A3B8', marginBottom: '1.5rem' }}>Den etterspurte kanalen eller siden eksisterer ikke.</p>
      <Link to="/" className="btn-beacon" style={{ textDecoration: 'none' }}>Tilbake til forsiden</Link>
    </div>
  );
}
