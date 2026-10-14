// src/shared/webrtcHelper.js

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const LANG_LOCALE_MAP = {
  no: 'nb-NO',
  en: 'en-US',
  uk: 'uk-UA',
  ar: 'ar-SA',
  fa: 'fa-IR',
  so: 'so-SO',
  ti: 'ti-ET',
  tr: 'tr-TR',
  el: 'el-GR',
  ru: 'ru-RU'
};

/**
 * Capture microphone audio stream
 */
export async function getMicrophoneStream() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Nettleseren støtter ikke mikrofontilgang');
  }

  return await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });
}

/**
 * Create RTCPeerConnection for VoIP Audio Calling
 */
export function createPeerConnection({ onRemoteStream, onIceCandidate, onStateChange }) {
  if (typeof window === 'undefined' || !window.RTCPeerConnection) {
    throw new Error('WebRTC støttes ikke i denne nettleseren');
  }

  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      if (onRemoteStream) onRemoteStream(event.streams[0]);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.onconnectionstatechange = () => {
    if (onStateChange) onStateChange(pc.connectionState);
  };

  return pc;
}

/**
 * Speech Recognition (Sesli Konuşma / Speech-to-Text)
 * Listens to microphone and transcribes words directly into text.
 */
export function startSpeechToText({ langCode = 'no', onResult, onEnd, onError }) {
  if (typeof window === 'undefined') return null;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    if (onError) onError(new Error('Nettleseren din støtter ikke talegjenkjenning (SpeechRecognition). Prøv Chrome eller Edge.'));
    return null;
  }

  try {
    const recognition = new SpeechRec();
    recognition.lang = LANG_LOCALE_MAP[langCode] || 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      if (onError) onError(event);
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();
    return recognition;
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}

/**
 * Text-to-Speech (Sesli Yanıt Dinleme)
 */
export function speakText(text, langCode = 'no', onEnd) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_LOCALE_MAP[langCode] || 'en-US';
  utterance.rate = ['ar', 'fa'].includes(langCode) ? 0.95 : 1.0;

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}
