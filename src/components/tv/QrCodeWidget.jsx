// src/components/tv/QrCodeWidget.jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QrCodeWidget({ channelCode = 'MYTI-01' }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const targetUrl = `${origin}/m/${channelCode}`;

    QRCode.toDataURL(targetUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0B1120',
        light: '#FFFFFF'
      }
    })
      .then(url => setQrUrl(url))
      .catch(err => console.error('Failed generating QR code:', err));
  }, [channelCode]);

  return (
    <div className="tv-qr-box">
      {qrUrl ? (
        <img src={qrUrl} alt={`QR Code for ${channelCode}`} className="tv-qr-image" />
      ) : (
        <div className="tv-qr-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          📱
        </div>
      )}
      <div className="tv-qr-text">
        <span className="tv-qr-title">📱 InfoVarde Mobil</span>
        <span className="tv-qr-subtitle">Skann for oppdateringer & Lifeline</span>
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', fontSize: '1rem' }}>
          <span>🇳🇴</span>
          <span>🇬🇧</span>
          <span>🇺🇦</span>
          <span>🇸🇾</span>
          <span>🇦🇫</span>
        </div>
      </div>
    </div>
  );
}
