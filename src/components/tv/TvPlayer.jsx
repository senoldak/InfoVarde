// src/components/tv/TvPlayer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import WeatherClockWidget from './WeatherClockWidget.jsx';
import QrCodeWidget from './QrCodeWidget.jsx';
import SlideView from './SlideView.jsx';
import EmergencyTakeover from './EmergencyTakeover.jsx';
import { WifiOff, Radio } from 'lucide-react';
import './TvPlayer.css';

export default function TvPlayer() {
  const { code = 'MYTI-01' } = useParams();
  const [channel, setChannel] = useState(null);
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef(null);
  const progressTimerRef = useRef(null);

  // 1. Fetch channel feed with offline cache resilience
  async function loadFeed() {
    const cacheKey = `infovarde_tv_cache_${code}`;
    try {
      const res = await fetch(`/api/channels/${code}/feed?lang=no`, {
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      setChannel(data.channel);
      setSlides(data.items || []);
      setIsOffline(false);

      // Persist in localStorage for zero-blackout offline durability
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
        console.warn('Storage quota exceeded:', e);
      }
    } catch (err) {
      console.warn('Network issue fetching feed, falling back to cache:', err.message);
      setIsOffline(true);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const data = JSON.parse(cached);
          setChannel(data.channel);
          setSlides(data.items || []);
        } catch {
          // ignore cache parse failure
        }
      }
    }
  }

  // Initial load
  useEffect(() => {
    loadFeed();
  }, [code]);

  // 2. Real-time SSE Connection
  useEffect(() => {
    let eventSource;
    function connectSSE() {
      eventSource = new EventSource(`/api/channels/${code}/stream`);

      eventSource.addEventListener('feed_updated', () => {
        loadFeed();
      });

      eventSource.addEventListener('emergency_alert', (e) => {
        try {
          const alertData = JSON.parse(e.data);
          setEmergencyAlert(alertData);
        } catch (err) {
          console.error('Failed to parse emergency alert SSE:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource.close();
        // Reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    }

    connectSSE();
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [code]);

  // 3. Slide Rotation & Progress Bar Cycle
  const currentSlide = slides[currentIndex] || null;
  const slideDurationSec = currentSlide?.slide_duration || channel?.slide_interval_sec || 12;

  useEffect(() => {
    if (!slides.length) return;

    setProgress(0);
    const totalDurationMs = slideDurationSec * 1000;
    const intervalStepMs = 100;
    const stepIncrement = (intervalStepMs / totalDurationMs) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + stepIncrement;
      });
    }, intervalStepMs);

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, totalDurationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentIndex, slides.length, slideDurationSec]);

  return (
    <div className="tv-container">
      {/* Emergency Broadcast Takeover */}
      {emergencyAlert && (
        <EmergencyTakeover
          alert={emergencyAlert}
          onDismiss={() => setEmergencyAlert(null)}
        />
      )}

      {/* Top Header Bar */}
      <header className="tv-header">
        <div className="tv-logo-area">
          <svg width="42" height="42" viewBox="0 0 100 100">
            <rect x="20" y="65" width="60" height="20" rx="10" fill="#1E293B" />
            <rect x="30" y="40" width="40" height="18" rx="9" fill="#334155" />
            <rect x="40" y="18" width="20" height="15" rx="7.5" fill="#F97316" />
          </svg>
          <span className="tv-brand">InfoVarde</span>
          <span className="tv-channel-tag">{code}</span>
          {channel && (
            <span className="tv-location-pill">
              {channel.name} • {channel.location_name}
            </span>
          )}
        </div>

        <WeatherClockWidget
          latitude={channel?.latitude || 59.91}
          longitude={channel?.longitude || 10.75}
          locationName={channel?.location_name || 'Mottak'}
        />
      </header>

      {/* Main Slide Stage */}
      <main className="tv-stage">
        <SlideView slide={currentSlide} />
      </main>

      {/* Bottom Footer Bar */}
      <footer className="tv-footer">
        {/* Dynamic Progress Bar */}
        <div className="tv-progress-container">
          <div className="tv-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        {/* Left: Slide Index Counter & Online State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '1.25rem', fontWeight: 600 }}>
            <Radio size={22} color="#10B981" />
            <span>Slayt {slides.length > 0 ? currentIndex + 1 : 0} av {slides.length}</span>
          </div>

          {isOffline && (
            <div className="tv-offline-badge">
              <WifiOff size={18} />
              <span>Frakoblet — Viser bufret innhold</span>
            </div>
          )}
        </div>

        {/* Right: Dynamic QR Code Box */}
        <QrCodeWidget channelCode={code} />
      </footer>
    </div>
  );
}
