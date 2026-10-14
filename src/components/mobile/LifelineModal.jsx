// src/components/mobile/LifelineModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Send, Bot, User, PhoneCall, PhoneOff, Mic, MicOff,
  Volume2, VolumeX, ShieldCheck, CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  getMicrophoneStream, createPeerConnection, startSpeechToText, speakText
} from '../../shared/webrtcHelper.js';

export default function LifelineModal({ channelCode = 'MYTI-01', langCode = 'no', isRtl = false, onClose }) {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('ai'); // 'ai' | 'duty'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isEscalated, setIsEscalated] = useState(false);
  const [queuePosition, setQueuePosition] = useState(1);
  const [loading, setLoading] = useState(false);

  // Audio VoIP Call States
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'connected' | 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Speech Recognition States (Sesli Konuşarak Yazma)
  const [isRecording, setIsRecording] = useState(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const callTimerRef = useRef(null);
  const speechRecRef = useRef(null);

  // 1. Initialize anonymous session on open (Zero PII)
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch('/api/lifeline/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelCode })
        });
        if (!res.ok) throw new Error('Session creation failed');
        const data = await res.json();
        setSession(data);

        // Connect WebSocket for signaling & instant messaging
        connectWebSocket(data.roomTag);

        // Add welcome message from AI
        setMessages([
          {
            id: 'welcome',
            sender_type: 'ai',
            text: getWelcomeMessage(langCode),
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch (err) {
        console.error('Failed to initialize Lifeline session:', err);
      }
    }

    initSession();

    return () => {
      cleanupCall();
      if (wsRef.current) wsRef.current.close();
      if (speechRecRef.current) speechRecRef.current.stop();
    };
  }, [channelCode, langCode]);

  // Connect WebSocket
  function connectWebSocket(roomTag) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lifeline`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: roomTag,
        role: 'resident'
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSignalingMessage(data);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
  }

  // Handle WebRTC Signaling and Real-Time Messages
  async function handleSignalingMessage(data) {
    const { type, sdp, candidate, message } = data;

    if (type === 'call-accepted') {
      // Staff accepted call, start WebRTC offer
      initiateWebRtcCall();
    } else if (type === 'call-rejected' || type === 'hangup') {
      cleanupCall();
    } else if (type === 'offer') {
      // Receive offer from staff
      handleRemoteOffer(sdp);
    } else if (type === 'answer') {
      // Receive answer from staff
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
    } else if (type === 'chat-message') {
      // Instant chat message from staff
      if (message && message.sender_type !== 'resident') {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    }
  }

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getWelcomeMessage(lang) {
    switch (lang) {
      case 'uk':
        return 'Вітаємо в InfoVarde Lifeline! Це безпечний і анонімний чат. Чим ми можемо вам допомогти? (Ви можете говорити або писати)';
      case 'ar':
        return 'مرحباً بك في خط InfoVarde للطوارئ. هذا خط آمن ومجهول الهوية بالكامل. يمكنك الكتابة أو التحدث صوتياً عبر الميكروفون.';
      case 'fa':
        return 'به سامانه لایف‌لاین خوش آمدید. این ارتباط کاملاً محرمانه است. می‌توانید بنویسید یا با میکروفون صحبت کنید.';
      case 'so':
        return 'Ku soo dhawoow InfoVarde Lifeline! Waa adeeg bilaash ah oo qarsoodi ah. Waad qori kartaa ama cod ahaan waad u hadli kartaa.';
      case 'tr':
        return 'InfoVarde Acil Destek Hattına hoş geldiniz. Bu hat tamamen anonimdir. Yazabilir veya mikrofon simgesine basıp konuşarak mesaj gönderebilirsiniz.';
      case 'en':
        return 'Welcome to InfoVarde Lifeline! This is a zero-registration, anonymous humanitarian helpline. You can type or tap the mic to speak.';
      default:
        return 'Velkommen til InfoVarde Lifeline. Dette er en sikker og anonym hjelpelinje. Du kan skrive eller trykke på mikrofonen for å snakke.';
    }
  }

  // --- WebRTC Audio Call Engine ---
  async function startCall() {
    if (!session || !wsRef.current) return;
    setInCall(true);
    setCallStatus('calling');

    try {
      // Notify staff duty desk of incoming call request
      wsRef.current.send(JSON.stringify({
        type: 'call-request',
        room: session.roomTag,
        role: 'resident'
      }));

      // In case duty desk is already in the room, prepare local audio
      await prepareLocalAudio();
    } catch (err) {
      alert('Kunne ikke starte samtale: ' + err.message);
      cleanupCall();
    }
  }

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
            room: session.roomTag,
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

  async function initiateWebRtcCall() {
    const pc = pcRef.current || (await prepareLocalAudio());
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsRef.current.send(JSON.stringify({
      type: 'offer',
      room: session.roomTag,
      sdp: offer
    }));
  }

  async function handleRemoteOffer(sdp) {
    const pc = pcRef.current || (await prepareLocalAudio());
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current.send(JSON.stringify({
      type: 'answer',
      room: session.roomTag,
      sdp: answer
    }));

    setCallStatus('connected');
    startCallTimer();
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
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
        room: session?.roomTag
      }));
    }
    setInCall(false);
    setCallStatus('idle');
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

  // --- Sesli Konuşma (Speech-to-Text) ---
  function handleToggleDictation() {
    if (isRecording) {
      if (speechRecRef.current) speechRecRef.current.stop();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const rec = startSpeechToText({
      langCode,
      onResult: (transcript) => {
        setInputText(prev => transcript);
      },
      onEnd: () => {
        setIsRecording(false);
      },
      onError: (err) => {
        console.warn('Speech recognition warning:', err);
        setIsRecording(false);
      }
    });

    speechRecRef.current = rec;
  }

  // --- Sesli Okuma (Text-to-Speech) ---
  function handlePlayMessageAudio(msgId, text) {
    if (activeSpeechMessageId === msgId) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setActiveSpeechMessageId(null);
      return;
    }

    setActiveSpeechMessageId(msgId);
    speakText(text, langCode, () => {
      setActiveSpeechMessageId(null);
    });
  }

  // --- Send Message ---
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!inputText.trim() || !session) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsgObj = {
      id: Date.now(),
      sender_type: 'resident',
      text: userText,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsgObj]);

    setLoading(true);
    try {
      if (mode === 'ai') {
        const res = await fetch('/api/lifeline/chat/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: session.sessionToken,
            message: userText,
            langCode
          })
        });
        const data = await res.json();
        if (data.reply) {
          const aiMsg = {
            id: Date.now() + 1,
            sender_type: 'ai',
            text: data.reply,
            isEmergency: data.isEmergency,
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiMsg]);

          // Auto-read aloud if emergency
          if (data.isEmergency) {
            handlePlayMessageAudio(aiMsg.id, aiMsg.text);
          }
        }
      } else {
        // Staff duty desk mode
        const res = await fetch('/api/lifeline/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken: session.sessionToken,
            senderType: 'resident',
            text: userText,
            langCode,
            targetLang: 'no'
          })
        });
        const data = await res.json();

        // Broadcast over WS for instant zero-latency view
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'chat-message',
            room: session.roomTag,
            message: userMsgObj
          }));
        }
      }
    } catch (err) {
      console.error('Failed sending message:', err);
    } finally {
      setLoading(false);
    }
  }

  // Escalate to human staff
  async function handleEscalate() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/lifeline/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: session.sessionToken })
      });
      const data = await res.json();
      setIsEscalated(true);
      setQueuePosition(data.queuePosition || 1);
      setMode('duty');

      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender_type: 'system',
          text: `🔔 Du er koblet til Nöbetçi Masası. Din posisjon i køen er #${data.queuePosition || 1}. En ansatt svarer straks.`,
          created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Escalation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(11, 17, 32, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      {/* Remote Audio Element */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '92vh',
          maxHeight: '760px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(249, 115, 22, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Top Header Bar */}
        <div style={{
          padding: '14px 18px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>InfoVarde Lifeline</span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(249, 115, 22, 0.2)', color: '#F97316', padding: '2px 8px', borderRadius: '6px' }}>
                  {session?.roomTag || 'Laster...'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="#10B981" />
                <span>Zero-PII • KVKK / GDPR Uyumlu Anonym Hjelp</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Real WebRTC VoIP Audio Call Button */}
            {!inCall ? (
              <button
                onClick={startCall}
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
                title="Ring mottaksvakten direkte via mikrofon (WebRTC samtale)"
              >
                <PhoneCall size={16} />
                <span>Ring vakt</span>
              </button>
            ) : (
              <button
                onClick={cleanupCall}
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                <PhoneOff size={16} />
                <span>Legg på</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Live Audio Call Control Bar (Shows when calling/connected) */}
        {inCall && (
          <div style={{
            background: callStatus === 'connected' ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.2))' : 'rgba(249, 115, 22, 0.25)',
            padding: '12px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ animation: 'pulse 1.2s infinite', fontSize: '1.2rem' }}>
                {callStatus === 'connected' ? '🎙️' : '📞'}
              </div>
              <div>
                <strong style={{ color: '#FFFFFF' }}>
                  {callStatus === 'calling' && 'Ringer mottaksvakt...'}
                  {callStatus === 'connected' && `Tilkoblet samtale (${formatDuration(callDuration)})`}
                </strong>
                <div style={{ fontSize: '0.75rem', color: '#CBD5E1' }}>
                  {callStatus === 'connected' ? 'Sikker toveis WebRTC VoIP lydlinje' : 'Venter på at ansatt svarer...'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {callStatus === 'connected' && (
                <button
                  onClick={toggleMute}
                  style={{
                    background: isMuted ? '#EF4444' : 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem'
                  }}
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  <span>{isMuted ? 'Mikrofon av' : 'Demp'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mode Switcher Banner */}
        <div style={{
          padding: '10px 16px',
          background: 'rgba(30, 41, 59, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#CBD5E1' }}>
            <span>Modus:</span>
            <strong style={{ color: mode === 'ai' ? '#06B6D4' : '#F97316' }}>
              {mode === 'ai' ? '🤖 24/7 AI Førstehjelp' : '👤 Nöbetçi Memur Masası'}
            </strong>
          </div>

          {mode === 'ai' && (
            <button
              onClick={handleEscalate}
              className="btn-beacon"
              style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Koble til vakt / Speak with staff
            </button>
          )}

          {mode === 'duty' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>Køplass #{queuePosition}</span>
            </div>
          )}
        </div>

        {/* Chat Message Stream */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {messages.map((m, i) => {
            const isResident = m.sender_type === 'resident';
            const isAi = m.sender_type === 'ai';
            const isSystem = m.sender_type === 'system';

            if (isSystem) {
              return (
                <div key={i} style={{ textAlign: 'center', padding: '6px 12px', background: 'rgba(249, 115, 22, 0.1)', color: '#FDBA74', borderRadius: '8px', fontSize: '0.8rem' }}>
                  {m.text}
                </div>
              );
            }

            const isSpeakingThis = activeSpeechMessageId === m.id;

            return (
              <div
                key={m.id || i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isResident ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isResident ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.75rem', color: '#94A3B8' }}>
                  {isAi && <Bot size={14} color="#06B6D4" />}
                  {isResident && <User size={14} color="#F97316" />}
                  <span>{isResident ? 'Deg' : isAi ? 'AI Tolk' : 'Mottaksvakt'}</span>
                  <span>• {m.created_at}</span>

                  {/* Text-to-Speech Button on Messages */}
                  {!isResident && (
                    <button
                      type="button"
                      onClick={() => handlePlayMessageAudio(m.id, m.text)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isSpeakingThis ? '#F97316' : '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={isSpeakingThis ? 'Stopp lyd' : 'Lytt til meldingen (TTS)'}
                    >
                      {isSpeakingThis ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  )}
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: isResident
                      ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
                      : isAi
                      ? 'rgba(6, 182, 212, 0.15)'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: '#FFFFFF',
                    border: isAi ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.95rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word'
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Voice-to-Text Microphone Dictation */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}
        >
          {/* Microphone Dictation Button (Sesli Konuşarak Yazma) */}
          <button
            type="button"
            onClick={handleToggleDictation}
            style={{
              background: isRecording ? '#EF4444' : 'rgba(255, 255, 255, 0.1)',
              border: isRecording ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isRecording ? 'pulse 1s infinite' : 'none'
            }}
            title={isRecording ? 'Stopper opptak...' : 'Snakk inn melding (Mikrofon)'}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isRecording
                ? '🎙️ Snakker inn... (lytter på mikrofon)'
                : mode === 'ai'
                ? 'Still spørsmål eller trykk på mikrofonen...'
                : 'Skriv eller snakk inn melding...'
            }
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              border: isRecording ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#FFFFFF',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="btn-beacon"
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              opacity: loading || !inputText.trim() ? 0.6 : 1
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
