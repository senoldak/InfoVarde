// src/components/mobile/MobileFeed.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LanguageSelector from './LanguageSelector.jsx';
import AnnouncementCard from './AnnouncementCard.jsx';
import EventCalendarView from './EventCalendarView.jsx';
import LifelineModal from './LifelineModal.jsx';
import { TOKENS } from '../../shared/tokens.js';
import { AlertTriangle, Calendar, Layers, ShieldAlert, WifiOff } from 'lucide-react';

export default function MobileFeed() {
  const { code = 'MYTI-01' } = useParams();
  const [currentLang, setCurrentLang] = useState('no');
  const [isRtl, setIsRtl] = useState(false);
  const [channel, setChannel] = useState(null);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'calendar'
  const [showLifeline, setShowLifeline] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Fetch feed with language and offline storage fallback
  async function fetchFeed(langCode) {
    const cacheKey = `infovarde_mobile_cache_${code}_${langCode}`;
    try {
      const res = await fetch(`/api/channels/${code}/feed?lang=${langCode}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setChannel(data.channel);
      setItems(data.items || []);
      setIsOffline(false);

      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setIsOffline(true);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setChannel(data.channel);
          setItems(data.items || []);
        } catch (e) {
          // ignore
        }
      }
    }
  }

  useEffect(() => {
    fetchFeed(currentLang);
  }, [code, currentLang]);

  function handleSelectLanguage(lang) {
    setCurrentLang(lang.code);
    setIsRtl(lang.isRtl);
    document.documentElement.setAttribute('dir', lang.isRtl ? 'rtl' : 'ltr');
  }

  // Filter items by category
  const filteredItems = items.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', minHeight: '100vh', background: '#0B1120', paddingBottom: '90px' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(11, 17, 32, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="28" height="28" viewBox="0 0 100 100">
              <rect x="20" y="65" width="60" height="20" rx="10" fill="#1E293B" />
              <rect x="30" y="40" width="40" height="18" rx="9" fill="#334155" />
              <rect x="40" y="18" width="20" height="15" rx="7.5" fill="#F97316" />
            </svg>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                InfoVarde
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                {channel?.name || code} • {channel?.location_name || 'Mottak'}
              </div>
            </div>
          </div>

          {isOffline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
              <WifiOff size={14} />
              <span>Frakoblet</span>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <LanguageSelector currentLang={currentLang} onSelectLanguage={handleSelectLanguage} />

        {/* Primary Navigation Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            onClick={() => setActiveTab('feed')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'feed' ? '2px solid #F97316' : '2px solid transparent',
              color: activeTab === 'feed' ? '#F97316' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Layers size={16} />
            <span>Nyheter ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'calendar' ? '2px solid #06B6D4' : '2px solid transparent',
              color: activeTab === 'calendar' ? '#06B6D4' : '#94A3B8',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} />
            <span>Hendelser</span>
          </button>
        </div>
      </header>

      {/* Main Feed Content Area */}
      <main style={{ padding: '16px' }}>
        {activeTab === 'feed' ? (
          <div>
            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
              {TOKENS.categories.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      border: '1px solid ' + (isSelected ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'),
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Announcements List */}
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94A3B8' }}>
                <p>Ingen meldinger funnet i denne kategorien.</p>
              </div>
            ) : (
              filteredItems.map(item => (
                <AnnouncementCard key={item.id} item={item} langCode={currentLang} />
              ))
            )}
          </div>
        ) : (
          <EventCalendarView items={items} isRtl={isRtl} />
        )}
      </main>

      {/* Floating Action Button: Lifeline Emergency Desk */}
      <div style={{ position: 'fixed', bottom: '20px', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 90 }}>
        <button
          onClick={() => setShowLifeline(true)}
          className="btn-danger"
          style={{
            pointerEvents: 'auto',
            padding: '14px 24px',
            borderRadius: '30px',
            fontSize: '1rem',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <ShieldAlert size={20} />
          <span>Nødhjelp & Lifeline (24/7)</span>
        </button>
      </div>

      {/* Lifeline Anonymous Modal */}
      {showLifeline && (
        <LifelineModal
          channelCode={code}
          langCode={currentLang}
          isRtl={isRtl}
          onClose={() => setShowLifeline(false)}
        />
      )}
    </div>
  );
}
