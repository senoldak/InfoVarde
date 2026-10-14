// src/components/tv/WeatherClockWidget.jsx
import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, Clock } from 'lucide-react';

export default function WeatherClockWidget({ latitude = 59.91, longitude = 10.75, locationName = 'Oslo' }) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState({ temp: 12, condition: 'partly_cloudy', isFallback: true });

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Open-Meteo weather
  useEffect(() => {
    let mounted = true;
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        if (mounted && data.current) {
          const code = data.current.weather_code;
          let cond = 'partly_cloudy';
          if (code === 0) cond = 'clear';
          else if ([1, 2, 3].includes(code)) cond = 'partly_cloudy';
          else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) cond = 'rain';
          else if ([71, 73, 75, 85, 86].includes(code)) cond = 'snow';

          setWeather({
            temp: Math.round(data.current.temperature_2m),
            condition: cond,
            isFallback: false
          });
        }
      } catch (err) {
        // Safe offline fallback
        if (mounted) {
          setWeather({ temp: 14, condition: 'partly_cloudy', isFallback: true });
        }
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [latitude, longitude]);

  const timeString = time.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = time.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });

  function renderWeatherIcon() {
    switch (weather.condition) {
      case 'clear':
        return <Sun size={28} color="#FBBF24" />;
      case 'rain':
        return <CloudRain size={28} color="#60A5FA" />;
      case 'snow':
        return <CloudSnow size={28} color="#E2E8F0" />;
      default:
        return <CloudSun size={28} color="#38BDF8" />;
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
      {/* Weather Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '10px 20px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {renderWeatherIcon()}
        <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F8FAFC' }}>
          {weather.temp}°C
        </span>
        <span style={{ fontSize: '1.05rem', color: '#94A3B8', fontWeight: 500 }}>
          {locationName}
        </span>
      </div>

      {/* Clock Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Clock size={24} color="#F97316" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1 }}>
            {timeString}
          </span>
          <span style={{ fontSize: '0.9rem', color: '#94A3B8', textTransform: 'capitalize', marginTop: '4px' }}>
            {dateString}
          </span>
        </div>
      </div>
    </div>
  );
}
