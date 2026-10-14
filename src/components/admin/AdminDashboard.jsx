// src/components/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import AnnouncementEditor from './AnnouncementEditor.jsx';
import DualScreenPreview from './DualScreenPreview.jsx';
import LifelineDutyDesk from './LifelineDutyDesk.jsx';
import ChannelManager from './ChannelManager.jsx';
import EmergencyBroadcastModal from './EmergencyBroadcastModal.jsx';
import { Plus, Tv, AlertTriangle, Layers, ShieldAlert, Monitor, Settings, Trash2, Edit2, CheckCircle2, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [channels, setChannels] = useState([]);
  const [selectedChannelCode, setSelectedChannelCode] = useState('MYTI-01');
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'dual' | 'duty' | 'channels'
  const [feedData, setFeedData] = useState({ channel: null, items: [] });
  const [editingItem, setEditingItem] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [waitingLifelineCount, setWaitingLifelineCount] = useState(0);

  // Load channels
  async function loadChannels() {
    try {
      const res = await fetch('/api/channels');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setChannels(data);
        if (!selectedChannelCode) {
          setSelectedChannelCode(data[0].code);
        }
      }
    } catch (e) {
      console.error('Error loading channels:', e);
    }
  }

  // Load feed for selected channel
  async function loadChannelFeed(code) {
    if (!code) return;
    try {
      const res = await fetch(`/api/channels/${code}/feed?lang=no`);
      const data = await res.json();
      setFeedData(data);
    } catch (e) {
      console.error('Error loading feed:', e);
    }
  }

  // Poll waiting sessions count for duty desk badge
  async function checkLifelineQueue() {
    try {
      const res = await fetch('/api/lifeline/sessions');
      const data = await res.json();
      if (data.sessions) {
        const waiting = data.sessions.filter(s => s.status === 'waiting_staff').length;
        setWaitingLifelineCount(waiting);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    loadChannels();
    checkLifelineQueue();
    const interval = setInterval(checkLifelineQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadChannelFeed(selectedChannelCode);
  }, [selectedChannelCode]);

  async function handleDeleteAnnouncement(id) {
    if (!confirm('Er du sikker på at du vil slette denne meldingen?')) return;
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      loadChannelFeed(selectedChannelCode);
    } catch (err) {
      alert('Sletting mislyktes: ' + err.message);
    }
  }

  function handleSaveAnnouncement() {
    setShowEditor(false);
    setEditingItem(null);
    loadChannelFeed(selectedChannelCode);
  }

  const currentChannel = channels.find(c => c.code === selectedChannelCode) || feedData.channel;

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', color: '#F8FAFC' }}>
      {/* Top Admin Navbar */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo & Channel Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="34" height="34" viewBox="0 0 100 100">
                <rect x="20" y="65" width="60" height="20" rx="10" fill="#1E293B" />
                <rect x="30" y="40" width="40" height="18" rx="9" fill="#334155" />
                <rect x="40" y="18" width="20" height="15" rx="7.5" fill="#F97316" />
              </svg>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                InfoVarde <span style={{ color: '#F97316', fontSize: '1rem', fontWeight: 600 }}>Studio</span>
              </span>
            </div>

            {/* Channel Switcher */}
            <select
              value={selectedChannelCode}
              onChange={(e) => setSelectedChannelCode(e.target.value)}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              {channels.map(c => (
                <option key={c.code} value={c.code}>
                  📺 {c.code} — {c.name} ({c.location_name})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="btn-danger"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              <AlertTriangle size={16} />
              <span>Send Felles Nødvarsel</span>
            </button>

            <a
              href={`/tv/${selectedChannelCode}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 14px', textDecoration: 'none' }}
            >
              <Tv size={16} />
              <span>Åpne TV</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            onClick={() => { setActiveTab('announcements'); setShowEditor(false); }}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'announcements' ? '2px solid #F97316' : '2px solid transparent',
              color: activeTab === 'announcements' ? '#F97316' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Layers size={18} />
            <span>Kunngjøringer & Slayter</span>
          </button>

          <button
            onClick={() => setActiveTab('dual')}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'dual' ? '2px solid #06B6D4' : '2px solid transparent',
              color: activeTab === 'dual' ? '#06B6D4' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Monitor size={18} />
            <span>Çift Ekran Önizleme (TV + Mobil)</span>
          </button>

          <button
            onClick={() => setActiveTab('duty')}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'duty' ? '2px solid #EF4444' : '2px solid transparent',
              color: activeTab === 'duty' ? '#EF4444' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <ShieldAlert size={18} />
            <span>Lifeline Nöbetçi Masası</span>
            {waitingLifelineCount > 0 && (
              <span style={{
                background: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '1px 8px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {waitingLifelineCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            style={{
              padding: '12px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'channels' ? '2px solid #10B981' : '2px solid transparent',
              color: activeTab === 'channels' ? '#10B981' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Settings size={18} />
            <span>Kanalinnstillinger</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'announcements' && (
          <div>
            {showEditor ? (
              <AnnouncementEditor
                channelId={currentChannel?.id || 1}
                channelCode={selectedChannelCode}
                initialData={editingItem}
                onSave={handleSaveAnnouncement}
                onCancel={() => { setShowEditor(false); setEditingItem(null); }}
              />
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Aktive Kunngjøringer ({feedData.items.length})
                    </h2>
                    <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
                      Slaytene roterer automatisk på TV-skjermen hvert {currentChannel?.slide_interval_sec || 12}. sekund.
                    </p>
                  </div>

                  <button
                    onClick={() => { setEditingItem(null); setShowEditor(true); }}
                    className="btn-beacon"
                  >
                    <Plus size={18} />
                    <span>Ny Kunngjøring</span>
                  </button>
                </div>

                {/* Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {feedData.items.map((item) => (
                    <div
                      key={item.id}
                      className="glass-card"
                      style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderLeft: item.priority === 'urgent' ? '4px solid #F97316' : item.priority === 'emergency' ? '4px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span className={`badge badge-${item.category || 'general'}`}>
                            {item.category ? item.category.toUpperCase() : 'INFO'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {item.slide_duration || 12}s
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                          {item.title}
                        </h3>

                        <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.45, marginBottom: '16px' }}>
                          {item.content}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#67E8F9' }}>
                          🌐 Flerspråklig (AI Tolk)
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => { setEditingItem(item); setShowEditor(true); }}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title="Rediger"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            className="btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title="Slett"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dual' && (
          <DualScreenPreview channelCode={selectedChannelCode} />
        )}

        {activeTab === 'duty' && (
          <LifelineDutyDesk channelCode={selectedChannelCode} />
        )}

        {activeTab === 'channels' && (
          <ChannelManager
            channels={channels}
            activeCode={selectedChannelCode}
            onSelectChannel={(code) => setSelectedChannelCode(code)}
            onChannelCreated={() => loadChannels()}
          />
        )}
      </main>

      {/* Emergency Broadcast Modal */}
      {showBroadcastModal && (
        <EmergencyBroadcastModal
          channelCode={selectedChannelCode}
          onClose={() => setShowBroadcastModal(false)}
          onBroadcastSuccess={() => loadChannelFeed(selectedChannelCode)}
        />
      )}
    </div>
  );
}
