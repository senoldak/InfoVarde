// src/components/admin/LifelineDutyDesk.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, PhoneCall, PhoneOff, Send, CheckCircle2, User, Bot,
  RefreshCw, MessageSquare, Mic, MicOff, Volume2, VolumeX, BellRing
} from 'lucide-react';
import {
  getMicrophoneStream, createPeerConnection, startSpeechToText, speakText
} from '../../shared/webrtcHelper.js';

export default function LifelineDutyDesk({ channelCode = 'MYTI-01' }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [staffReplyText, setStaffReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  // WebRTC VoIP Audio States
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'incoming' | 'connected' | 'ended'
  const [incomingCallRoom, setIncomingCallRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Speech-to-Text (Sesli Dikte) & TTS States
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const speechRecRef = useRef(null);

  // Poll sessions list
  async function fetchSessions() {
    try {
      const res = await fetch(`/api/lifeline/sessions?channelCode=${channelCode}`);
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
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

  // Connect to WebSocket room when session selected
  useEffect(() => {
    if (!selectedSession) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lifeline`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: selectedSession.room_tag,
        role: 'staff'
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSignalingMessage(data);
      } catch (e) {
        console.error('WS error:', e);
      }
    };

    fetchMessages();

    return () => {
      cleanupCall();
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedSession?.session_token]);

  async function handleSignalingMessage(data) {
    const { type, room, sdp, candidate, message } = data;

    if (type === 'call-request') {
      // Resident is ringing!
      setIncomingCallRoom(room);
      setCallStatus('incoming');
    } else if (type === 'offer') {
      // Receive offer from resident
      handleRemoteOffer(sdp);
    } else if (type === 'answer') {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallStatus('connected');
        startCallTimer();
      }
    } else if (type === 'ice-candidate') {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    } else if (type === 'hangup' || type === 'call-rejected') {
      cleanupCall();
    } else if (type === 'chat-message') {
      if (message) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    }
  }

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- WebRTC VoIP Call Handlers ---
  async function prepareLocalAudio() {
    const stream = await getMicrophoneStream();
    localStreamRef.current = stream;

    const pc = createPeerConnection({
      onRemoteStream: (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      },
      onIceCandidate: (candidate) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            room: selectedSession?.room_tag,
            candidate
          }));
        }
      },
      onStateChange: (state) => {
        if (state === 'connected') {
          setCallStatus('connected');
          startCallTimer();
        } else if (state === 'disconnected' || state === 'failed') {
          cleanupCall();
        }
      }
    });

    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pcRef.current = pc;
    return pc;
  }

  // Staff answers incoming call
  async function handleAcceptCall() {
    setInCall(true);
    setCallStatus('connecting');

    try {
      const pc = await prepareLocalAudio();
      wsRef.current.send(JSON.stringify({
        type: 'call-accepted',
        room: selectedSession?.room_tag
      }));
    } catch (err) {
      alert('Kunne ikke koble til mikrofon: ' + err.message);
      cleanupCall();
    }
  }

  // Staff calls resident
  async function handleStartCall() {
    if (!selectedSession || !wsRef.current) return;
    setInCall(true);
    setCallStatus('calling');

    try {
      const pc = await prepareLocalAudio();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: 'offer',
        room: selectedSession.room_tag,
        sdp: offer
      }));
    } catch (err) {
      alert('Kunne ikke starte samtale: ' + err.message);
      cleanupCall();
    }
  }

  async function handleRemoteOffer(sdp) {
    const pc = pcRef.current || (await prepareLocalAudio());
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current.send(JSON.stringify({
      type: 'answer',
      room: selectedSession?.room_tag,
      sdp: answer
    }));

    setInCall(true);
    setCallStatus('connected');
    startCallTimer();
  }

  function handleDeclineCall() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call-rejected',
        room: selectedSession?.room_tag
      }));
    }
    cleanupCall();
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  }

  function cleanupCall() {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (inCall && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'hangup',
        room: selectedSession?.room_tag
      }));
    }
    setInCall(false);
    setCallStatus('idle');
    setIncomingCallRoom(null);
    setCallDuration(0);
    setIsMuted(false);
  }

  function startCallTimer() {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Speech-to-Text (Sesli Dikte / Konuşarak Yanıt Yazma) ---
  function handleToggleDictation() {
    if (isRecording) {
      if (speechRecRef.current) speechRecRef.current.stop();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const rec = startSpeechToText({
      langCode: 'no', // staff dictates in Norwegian
      onResult: (transcript) => {
        setStaffReplyText(transcript);
      },
      onEnd: () => {
        setIsRecording(false);
      },
      onError: (err) => {
        console.warn('Speech rec err:', err);
        setIsRecording(false);
      }
    });

    speechRecRef.current = rec;
  }

  // --- Text-to-Speech (Sesli Dinleme) ---
  function handlePlayMessageAudio(msgId, text) {
    if (activeSpeechMessageId === msgId) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setActiveSpeechMessageId(null);
      return;
    }

    setActiveSpeechMessageId(msgId);
    speakText(text, 'no', () => {
      setActiveSpeechMessageId(null);
    });
  }

  // --- Send Staff Reply with Auto-Translation ---
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
          targetLang: 'en'
        })
      });
      if (!res.ok) throw new Error('Reply failed');
      const data = await res.json();

      // Broadcast over WS for instant delivery
      if (wsRef.current?.readyState === WebSocket.OPEN && data.message) {
        wsRef.current.send(JSON.stringify({
          type: 'chat-message',
          room: selectedSession.room_tag,
          message: data.message
        }));
      }

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

  const waitingCount = sessions.filter(s => s.status === 'waiting_staff').length;

  return (
    <div>
      {/* Remote Audio Element */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* Top Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={24} color="#EF4444" />
            <span>Nöbetçi Memur Masası (Lifeline Duty Desk)</span>
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
            Canlı iki dilli yazışma, sesli dikte (Speech-to-Text) ve WebRTC sesli VoIP çağrı merkezi.
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

      {/* Incoming Call Notification Banner */}
      {callStatus === 'incoming' && (
        <div style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
          padding: '16px 24px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.5)',
          animation: 'pulse 1s infinite alternate'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <BellRing size={28} color="#FFFFFF" />
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                📞 Gelen Acil Sesli Arama: {incomingCallRoom}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#FEE2E2' }}>
                Beboer ønsker direkte toveis samtale via mikrofon.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAcceptCall}
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <PhoneCall size={18} />
              <span>Svar (Koble til)</span>
            </button>

            <button
              onClick={handleDeclineCall}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Avvis
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Queue | Right Chat & Call */}
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
            {/* Chat & Call Header */}
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

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Audio VoIP Call button */}
                {!inCall ? (
                  <button
                    onClick={handleStartCall}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10B981',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Start toveis WebRTC VoIP lydsamtale med beboer"
                  >
                    <PhoneCall size={16} />
                    <span>Ring beboer</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>
                      📞 {callStatus === 'connected' ? formatDuration(callDuration) : 'Kobler...'}
                    </span>
                    <button
                      onClick={toggleMute}
                      style={{
                        background: isMuted ? '#EF4444' : 'rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button
                      onClick={cleanupCall}
                      style={{
                        background: '#EF4444',
                        color: '#FFFFFF',
                        border: 'none',
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
                      <PhoneOff size={16} />
                      <span>Legg på</span>
                    </button>
                  </div>
                )}

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
                const isSpeakingThis = activeSpeechMessageId === m.id;

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>
                      <span>{isStaff ? '🧑‍💼 Deg (Ansatt)' : isAi ? '🤖 AI Førstehjelp' : '👤 Beboer'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                      {/* Text to Speech Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayMessageAudio(m.id, m.translated_text || m.original_text)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isSpeakingThis ? '#F97316' : '#94A3B8',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Hør opplest på norsk (TTS)"
                      >
                        {isSpeakingThis ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
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

            {/* Reply Input Form with Voice Dictation */}
            <form
              onSubmit={handleSendReply}
              style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              {/* Microphone Speech Dictation */}
              <button
                type="button"
                onClick={handleToggleDictation}
                style={{
                  background: isRecording ? '#EF4444' : 'rgba(255, 255, 255, 0.1)',
                  border: isRecording ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: isRecording ? 'pulse 1s infinite' : 'none'
                }}
                title={isRecording ? 'Stopper diktering...' : 'Diktér svar på norsk via mikrofon'}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input
                type="text"
                value={staffReplyText}
                onChange={(e) => setStaffReplyText(e.target.value)}
                placeholder={
                  isRecording
                    ? '🎙️ Snakk inn svar (lytter på norsk)...'
                    : 'Skriv svar på norsk (oversettes automatisk)...'
                }
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: isRecording ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
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
