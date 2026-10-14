// src/shared/tokens.js
export const TOKENS = {
  colors: {
    fjordDark: '#0B1120',
    fjordSlate: '#1E293B',
    fjordSurface: '#162032',
    surfaceGlass: 'rgba(255, 255, 255, 0.05)',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.10)',
    surfaceGlassHover: 'rgba(255, 255, 255, 0.08)',
    beaconOrange: '#F97316',
    beaconOrangeHover: '#EA580C',
    emergencyRed: '#EF4444',
    auroraCyan: '#06B6D4',
    sageGreen: '#10B981',
    polarWhite: '#F8FAFC',
    slateMuted: '#94A3B8'
  },
  languages: [
    { code: 'no', label: 'Norsk', nativeName: 'Norsk', flag: '🇳🇴', isRtl: false },
    { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧', isRtl: false },
    { code: 'uk', label: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', isRtl: false },
    { code: 'ar', label: 'Arabic', nativeName: 'العربية', flag: '🇸🇾', isRtl: true },
    { code: 'fa', label: 'Dari / Farsi', nativeName: 'فارسی / دری', flag: '🇦🇫', isRtl: true },
    { code: 'so', label: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴', isRtl: false },
    { code: 'ti', label: 'Tigrinya', nativeName: 'ትግርኛ', flag: '🇪🇷', isRtl: false },
    { code: 'tr', label: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', isRtl: false },
    { code: 'el', label: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', isRtl: false },
    { code: 'ru', label: 'Russian', nativeName: 'Русский', flag: '🇷🇺', isRtl: false }
  ],
  categories: [
    { id: 'all', label: 'Alle', icon: 'Layers', color: '#94A3B8' },
    { id: 'emergency', label: 'Nødvarsel', icon: 'AlertTriangle', color: '#EF4444' },
    { id: 'health', label: 'Helse', icon: 'HeartPulse', color: '#06B6D4' },
    { id: 'legal', label: 'Juridisk', icon: 'Scale', color: '#F59E0B' },
    { id: 'food', label: 'Maten & Utdeling', icon: 'Utensils', color: '#10B981' },
    { id: 'education', label: 'Kurs & Skole', icon: 'GraduationCap', color: '#8B5CF6' },
    { id: 'general', label: 'Generelt', icon: 'Info', color: '#64748B' }
  ]
};
