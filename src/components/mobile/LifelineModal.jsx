// src/components/mobile/LifelineModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, PhoneCall, PhoneOff, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LifelineModal({ channelCode = 'MYTI-01', langCode = 'no', isRtl = false, onClose }) {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('ai'); // 'ai' | 'duty' | 'call'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isEscalated, setIsEscalated] = useState(false);
  const [queuePosition, setQueuePosition] = useState(1);
  const [loading, setLoading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');

  const wsRef = useRef(null);
  const peerConnRef = useRef(null);
  const messagesEndRef = useRef(null);

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
  }, [channelCode, langCode]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getWelcomeMessage(lang) {
    switch (lang) {
      case 'uk':
        return 'Вітаємо в InfoVarde Lifeline! Це безпечний і анонімний чат. Чим ми можемо вам допомогти?';
      case 'ar':
        return 'مرحباً بك في خط InfoVarde للطوارئ. هذا خط آمن ومجهول الهوية بالكامل. كيف يمكننا مساعدتك؟';
      case 'fa':
        return 'به سامانه لایف‌لاین خوش آمدید. این ارتباط کاملاً محرمانه و بدون ثبت نام است. چگونه می‌توانیم کمک کنیم؟';
      case 'so':
        return 'Ku soo dhawoow InfoVarde Lifeline! Waa adeeg qarsoodi ah oo bilaash ah. Sideen kuugu caawinaa?';
      case 'tr':
        return 'InfoVarde Acil Destek Hattına hoş geldiniz. Bu hat tamamen anonimdir. Size nasıl yardımcı olabiliriz?';
      case 'en':
        return 'Welcome to InfoVarde Lifeline! This is a zero-registration, anonymous humanitarian helpline. How can we help you?';
      default:
        return 'Velkommen til InfoVarde Lifeline. Dette er en sikker og anonym hjelpelinje. Hva kan vi hjelpe deg med?';
    }
  }

  // Send message to AI Triage or Duty Staff
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!inputText.trim() || !session) return;

    const userText = inputText.trim();
    setInputText('');

    // Append user message locally
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
          setMessages(prev => [
            ...prev,
            {
              id: Date.now() + 1,
              sender_type: 'ai',
              text: data.reply,
              isEmergency: data.isEmergency,
              created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
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
        // Poll messages after send
        fetchMessages();
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

      // Start polling messages every 3s
      pollTimerRef.current = setInterval(fetchMessages, 3000);
    } catch (err) {
      console.error('Escalation failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const pollTimerRef = useRef(null);
  async function fetchMessages() {
    if (!session) return;
    try {
      const res = await fetch(`/api/lifeline/messages/${session.sessionToken}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map(m => ({
          id: m.id,
          sender_type: m.sender_type,
          text: m.translated_text || m.original_text,
          created_at: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // WebRTC VoIP Emergency Audio Call
  function handleToggleCall() {
    if (inCall) {
      // Hang up
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'hangup', room: session?.roomTag }));
        wsRef.current.close();
      }
      setInCall(false);
      setCallStatus('idle');
      return;
    }

    // Start call
    setInCall(true);
    setCallStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lifeline`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setCallStatus('ringing');
      ws.send(JSON.stringify({
        type: 'join',
        room: session?.roomTag,
        role: 'resident'
      }));

      // Simulate sending WebRTC audio offer
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'offer',
            room: session?.roomTag,
            sdp: { type: 'offer', sdp: 'simulated-resident-audio-offer' }
          }));
        }
      }, 500);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'answer' || msg.type === 'peer-joined') {
          setCallStatus('connected');
        } else if (msg.type === 'hangup' || msg.type === 'peer-left') {
          setCallStatus('ended');
          setTimeout(() => {
            setInCall(false);
            setCallStatus('idle');
          }, 1500);
        }
      } catch (e) {
        // ignore
      }
    };
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
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          height: '90vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                InfoVarde Lifeline
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="#10B981" />
                <span>Zero-PII / KVKK & GDPR Uyumlu Anonym Hjelp</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Audio Call button */}
            <button
              onClick={handleToggleCall}
              style={{
                background: inCall ? '#EF4444' : 'rgba(16, 185, 129, 0.2)',
                color: inCall ? '#FFFFFF' : '#10B981',
                border: '1px solid ' + (inCall ? '#EF4444' : 'rgba(16, 185, 129, 0.4)'),
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
              title="Sesli acil çağrı başlat / Start audio call"
            >
              {inCall ? <PhoneOff size={16} /> : <PhoneCall size={16} />}
              <span>{inCall ? 'Avslutt samtale' : 'Ring vakt'}</span>
            </button>

            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Call Banner if calling */}
        {inCall && (
          <div style={{
            background: callStatus === 'connected' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)',
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            color: '#F8FAFC'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ animation: 'pulse 1s infinite' }}>🎙️</div>
              <span>
                {callStatus === 'connecting' && 'Kobler til WebRTC VoIP...'}
                {callStatus === 'ringing' && 'Ringer mottaksvakt (Rom: ' + session?.roomTag + ')...'}
                {callStatus === 'connected' && 'Tilkoblet mottaksvakt (Sikker VoIP-linje)'}
                {callStatus === 'ended' && 'Samtale avsluttet'}
              </span>
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

        {/* Message Stream */}
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

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isResident ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: isResident ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontSize: '0.75rem', color: '#94A3B8' }}>
                  {isAi && <Bot size={12} color="#06B6D4" />}
                  {isResident && <User size={12} color="#F97316" />}
                  <span>{isResident ? 'Deg' : isAi ? 'AI Tolk' : 'Mottaksvakt'}</span>
                  <span>• {m.created_at}</span>
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

        {/* Input Bar */}
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
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              mode === 'ai'
                ? 'Still spørsmål på ditt språk / Ask in your language...'
                : 'Skriv melding til mottaksvakten...'
            }
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
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
