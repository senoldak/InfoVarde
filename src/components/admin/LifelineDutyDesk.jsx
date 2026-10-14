// src/components/admin/LifelineDutyDesk.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, PhoneCall, PhoneOff, Send, CheckCircle2, User, Bot, RefreshCw, MessageSquare } from 'lucide-react';

export default function LifelineDutyDesk({ channelCode = 'MYTI-01' }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Poll sessions list
  async function fetchSessions() {
    try {
      const res = await fetch(`/api/lifeline/sessions?channelCode=${channelCode}`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        // If selected session exists in list, update it
        if (selectedSession) {
          const updated = data.sessions.find(s => s.session_token === selectedSession.session_token);
          if (updated) setSelectedSession(updated);
        } else if (data.sessions.length > 0) {
          setSelectedSession(data.sessions[0]);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 4000);
    return () => clearInterval(interval);
  }, [channelCode]);

  // Fetch messages for selected session
  async function fetchMessages() {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/lifeline/messages/${selectedSession.session_token}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedSession?.session_token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send staff reply with automatic bidirectional translation
  async function handleSendReply(e) {
    e?.preventDefault();
    if (!staffReplyText.trim() || !selectedSession) return;

    const text = staffReplyText.trim();
    setStaffReplyText('');
    setLoading(true);

    try {
      const res = await fetch('/api/lifeline/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: selectedSession.session_token,
          senderType: 'staff',
          text,
          langCode: 'no',
          targetLang: 'en' // or resident's detected lang
        })
      });
      if (!res.ok) throw new Error('Reply failed');
      fetchMessages();
    } catch (err) {
      alert('Feil ved sending: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Resolve session
  async function handleResolve() {
    if (!selectedSession) return;
    try {
      await fetch(`/api/lifeline/session/${selectedSession.session_token}/resolve`, { method: 'PUT' });
      fetchSessions();
    } catch (e) {
      // ignore
    }
  }

  // Staff WebRTC audio receiver
  function handleToggleCall() {
    if (inCall) {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'hangup', room: selectedSession?.room_tag }));
        wsRef.current.close();
      }
      setInCall(false);
      setCallStatus('idle');
      return;
    }

    setInCall(true);
    setCallStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lifeline`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setCallStatus('connected');
      ws.send(JSON.stringify({
        type: 'join',
        room: selectedSession?.room_tag,
        role: 'staff'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'offer') {
          // Send simulated answer
          ws.send(JSON.stringify({
            type: 'answer',
            room: selectedSession?.room_tag,
            sdp: { type: 'answer', sdp: 'simulated-staff-answer-sdp' }
          }));
        } else if (msg.type === 'hangup' || msg.type === 'peer-left') {
          setInCall(false);
          setCallStatus('idle');
        }
      } catch (e) {
        // ignore
      }
    };
  }

  const waitingCount = sessions.filter(s => s.status === 'waiting_staff').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={24} color="#EF4444" />
            <span>Nöbetçi Memur Masası (Lifeline Duty Desk)</span>
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Mültecilerden gelen acil yardım taleplerini ve canlı çevirili mesajları yönetin.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: waitingCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: waitingCount > 0 ? '#FCA5A5' : '#10B981',
            border: '1px solid ' + (waitingCount > 0 ? '#EF4444' : '#10B981'),
            padding: '6px 14px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            {waitingCount > 0 ? `⚠️ ${waitingCount} beboere venter på vakt` : '✓ Ingen i akuttkø'}
          </div>

          <button onClick={fetchSessions} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} />
            <span>Oppdater</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '20px', height: '650px' }}>
        {/* Left: Active Queue List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 700 }}>
            Aktive Samtaler ({sessions.length})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
                Ingen aktive henvendelser for øyeblikket.
              </div>
            ) : (
              sessions.map(s => {
                const isSelected = selectedSession?.id === s.id;
                const isWaiting = s.status === 'waiting_staff';

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #F97316' : '1px solid rgba(255, 255, 255, 0.06)',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFFFFF' }}>
                        {s.room_tag}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isWaiting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                        color: isWaiting ? '#FCA5A5' : '#67E8F9'
                      }}>
                        {isWaiting ? 'VENTER PÅ VAKT' : 'AI-AKTIV'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.last_message || 'Ingen meldinger'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Session Chat & WebRTC VoIP */}
        {selectedSession ? (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Chat Header */}
            <div style={{
              padding: '14px 20px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
                  Henvendelse: {selectedSession.room_tag}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Kanal: {selectedSession.channel_name || channelCode} • Opprettet: {new Date(selectedSession.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleToggleCall}
                  style={{
                    background: inCall ? '#EF4444' : 'rgba(16, 185, 129, 0.2)',
                    color: inCall ? '#FFFFFF' : '#10B981',
                    border: '1px solid ' + (inCall ? '#EF4444' : 'rgba(16, 185, 129, 0.4)'),
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {inCall ? <PhoneOff size={16} /> : <PhoneCall size={16} />}
                  <span>{inCall ? 'Legg på samtale' : 'Ring beboer'}</span>
                </button>

                <button
                  onClick={handleResolve}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>Avslutt sak</span>
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((m, i) => {
                const isStaff = m.sender_type === 'staff';
                const isAi = m.sender_type === 'ai';

                return (
                  <div
                    key={m.id || i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isStaff ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      alignSelf: isStaff ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>
                      {isStaff ? '🧑‍💼 Deg (Ansatt)' : isAi ? '🤖 AI Førstehjelp' : '👤 Beboer (Mottak)'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isStaff ? 'rgba(249, 115, 22, 0.25)' : 'rgba(30, 41, 59, 0.8)',
                      border: isStaff ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.95rem'
                    }}>
                      <div>{m.original_text}</div>
                      {m.translated_text && m.translated_text !== m.original_text && (
                        <div style={{ fontSize: '0.8rem', color: '#67E8F9', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                          🔄 Oversettelse: {m.translated_text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Form */}
            <form
              onSubmit={handleSendReply}
              style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '8px'
              }}
            >
              <input
                type="text"
                value={staffReplyText}
                onChange={(e) => setStaffReplyText(e.target.value)}
                placeholder="Skriv svar på norsk (oversettes automatisk til beboerens språk)..."
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={loading || !staffReplyText.trim()}
                className="btn-beacon"
              >
                <Send size={18} />
                <span>Send</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            Velg en samtale fra venstre for å svare.
          </div>
        )}
      </div>
    </div>
  );
}
