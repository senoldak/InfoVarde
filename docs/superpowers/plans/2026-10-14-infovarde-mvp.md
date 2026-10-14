# InfoVarde MVP - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Norveç merkezli Pintomind (Infoskjermen) modelinde; kabul merkezleri, mülteci kampları ve sivil toplum kuruluşları için tek merkezden yönetilen, duvarda TV ekranı (`/tv`), cepte sıfır kayıt mobil PWA (`/m`), AI destekli çok dilli tercüme/seslendirme motoru (`InfoVarde AI Tolk`) ve KVKK/GDPR uyumlu acil iletişim hattı (`InfoVarde Lifeline`) barındıran tam teşekküllü MVP platformu geliştirmek.

**Architecture:** Node.js/Express arka yüzü (REST API + Server-Sent Events + WebRTC sinyalleşmesi + SQLite) ve React + Vite tek sayfa uygulaması (TV Player, Mobil PWA ve CMS Studio) monorepo mimarisinde bir araya getirilir. TV ekranı internet koptuğunda kararmadan `localStorage` önbelleği ile döngüye devam eder; mobil istemci kayıt gerektirmeden 8+ dilde RTL destekli dikey akış, sesli anlatım ve acil yardım masası sunar.

**Tech Stack:** Node.js, Express, React 18, Vite, SQLite (`better-sqlite3`), Server-Sent Events (SSE), WebRTC, TailwindCSS / Nordic Glass Tokens, Web Speech TTS, Lucide Icons.

## Global Constraints

- **Single Command Startup:** Tüm sistem tek bir `npm run dev` komutu ile hem backend API'yi hem Vite frontend'i başlatabilmelidir.
- **Zero Registration / Zero PII for End-Users:** TV ve mobil son kullanıcılar için hesap açma, e-posta veya telefon numarası gerektirilmemelidir (KVKK/GDPR tam uyumu).
- **Offline Resilience:** TV oynatıcısı internet kesildiğinde siyah ekrana düşmemeli, önbelleğe alınan son slaytları oynatmaya devam etmelidir.
- **RTL & Multilingual:** Arapça (`ar`) ve Farsça/Darice (`fa`) dillerinde arayüz otomatik `dir="rtl"` moduna geçmeli ve simgeler tersine çevrilmelidir.
- **Nordic Minimalist Aesthetic:** Tasarım token'ları (`#0B1120`, `#1E293B`, `#F97316`, `#EF4444`) ve buzlu cam (glassmorphism) stilleri kullanılmalıdır.

---

### Task 1: Project Scaffolding, Monorepo Configuration & Shared Design Tokens

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/index.css`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/shared/tokens.js`

**Interfaces:**
- Consumes: Node.js 18+, Vite
- Produces: Çalışan Vite dev server ve Express API başlangıç betiği, global CSS tasarım token'ları, temel React Router kurgusu.

- [ ] **Step 1: Write `package.json` with dependencies and run scripts**

```json
{
  "name": "infovarde",
  "version": "1.0.0",
  "description": "Digital Signage & Humanitarian Lifeline Platform inspired by Pintomind/Infoskjermen",
  "type": "module",
  "scripts": {
    "server": "node src/server/index.js",
    "client": "vite",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "build": "vite build",
    "seed": "node src/server/seed.js",
    "test": "node --test src/test/**/*.test.js"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "lucide-react": "^0.475.0",
    "qrcode": "^1.5.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.5",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "concurrently": "^9.1.2",
    "vite": "^6.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`  
Expected: Dependencies installed successfully, `package-lock.json` created.

- [ ] **Step 3: Create `vite.config.js` with API proxy**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 4: Create `src/shared/tokens.js` and `src/index.css` for Nordic Design System**

```javascript
// src/shared/tokens.js
export const TOKENS = {
  colors: {
    fjordDark: '#0B1120',
    fjordSlate: '#1E293B',
    surfaceGlass: 'rgba(255, 255, 255, 0.06)',
    surfaceGlassBorder: 'rgba(255, 255, 255, 0.12)',
    beaconOrange: '#F97316',
    beaconOrangeHover: '#EA580C',
    emergencyRed: '#EF4444',
    auroraCyan: '#06B6D4',
    polarWhite: '#F8FAFC',
    slateMuted: '#94A3B8'
  },
  languages: [
    { code: 'no', label: 'Norsk', flag: '🇳🇴', isRtl: false },
    { code: 'en', label: 'English', flag: '🇬🇧', isRtl: false },
    { code: 'uk', label: 'Українська', flag: '🇺🇦', isRtl: false },
    { code: 'ar', label: 'العربية', flag: '🇸🇾', isRtl: true },
    { code: 'fa', label: 'فارسی / دری', flag: '🇦🇫', isRtl: true },
    { code: 'so', label: 'Soomaali', flag: '🇸🇴', isRtl: false },
    { code: 'ti', label: 'ትግርኛ', flag: '🇪🇷', isRtl: false },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷', isRtl: false },
    { code: 'el', label: 'Ελληνικά', flag: '🇬🇷', isRtl: false }
  ]
};
```

- [ ] **Step 5: Setup `src/App.jsx` with routes (`/`, `/tv/:code`, `/m/:code`, `/admin`)**
- [ ] **Step 6: Commit Task 1**

```bash
git add .
git commit -m "feat: initialize project scaffolding, dependencies and design tokens"
```

---

### Task 2: SQLite Database Engine, Schema Definition & Realistic Multilingual Seeding

**Files:**
- Create: `src/server/db.js`
- Create: `src/server/seed.js`
- Create: `src/test/db.test.js`

**Interfaces:**
- Consumes: `better-sqlite3`
- Produces: `getDb()`, `initDatabase()`, `seedDemoData()` API functions.
  - `channels`: `id`, `code`, `name`, `location_name`, `latitude`, `longitude`, `slide_interval_sec`, `theme_color`
  - `announcements`: `id`, `channel_id`, `category`, `priority`, `content_type`, `image_url`, `event_date`, `event_time`, `event_location`, `start_date`, `end_date`, `slide_duration`, `is_active`
  - `announcement_translations`: `id`, `announcement_id`, `lang_code`, `title`, `content`, `audio_url`, `is_rtl`
  - `lifeline_sessions`: `id`, `session_token`, `channel_id`, `room_tag`, `status`, `created_at`, `expires_at`
  - `lifeline_messages`: `id`, `session_id`, `sender_type`, `lang_code`, `original_text`, `translated_text`, `created_at`

- [ ] **Step 1: Write DB initialization test `src/test/db.test.js`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `src/server/db.js` with table migrations and indices**
- [ ] **Step 4: Implement `src/server/seed.js` with realistic demo content:**
  - Channel 1: `MYTI-01` (Mytilene / Lesvos Humanitarian Hub)
  - Channel 2: `OSLO-01` (Oslo Mottak & Integrasjonssenter)
  - Announcements in 8 languages (Health clinic, Legal advice tent, Norwegian language class, Emergency winter coat distribution)
- [ ] **Step 5: Run tests and seed script**
- [ ] **Step 6: Commit Task 2**

```bash
git add src/server/db.js src/server/seed.js src/test/db.test.js
git commit -m "feat: add sqlite database engine, multilingual schema and seed data"
```

---

### Task 3: Backend REST API & Server-Sent Events (SSE) Engine

**Files:**
- Create: `src/server/sse.js`
- Create: `src/server/routes/channels.js`
- Create: `src/server/routes/announcements.js`
- Create: `src/server/index.js`
- Create: `src/test/api.test.js`

**Interfaces:**
- Consumes: `src/server/db.js`
- Produces: 
  - `GET /api/channels`: Kanalları listele.
  - `GET /api/channels/:code`: Kanal bilgisi ve ayarları.
  - `GET /api/channels/:code/feed?lang=no`: Filtrelenmiş aktif slaytlar ve çeviriler.
  - `POST /api/announcements`: Yeni duyuru ekle (tüm dillerle).
  - `PUT /api/announcements/:id`: Duyuru güncelle.
  - `DELETE /api/announcements/:id`: Duyuru sil.
  - `POST /api/channels/:code/broadcast-alert`: Acil durum flaş yayını fırlat.
  - `GET /api/channels/:code/stream`: SSE canlı akış bağlantısı.

- [ ] **Step 1: Write API tests in `src/test/api.test.js`**
- [ ] **Step 2: Implement SSE Manager (`src/server/sse.js`)**
  - Manages active client response objects per channel code.
  - Broadcasts `feed_updated` and `emergency_alert` events.
- [ ] **Step 3: Implement channel and announcement Express router endpoints**
- [ ] **Step 4: Connect everything into `src/server/index.js` on port 3001**
- [ ] **Step 5: Run tests and verify all endpoints pass**
- [ ] **Step 6: Commit Task 3**

```bash
git add src/server/sse.js src/server/routes/ src/server/index.js src/test/api.test.js
git commit -m "feat: implement backend REST API and SSE real-time sync manager"
```

---

### Task 4: InfoVarde AI Tolk & Neural Voice Generator Engine

**Files:**
- Create: `src/server/services/aiTolk.js`
- Create: `src/server/routes/ai.js`
- Create: `src/test/aiTolk.test.js`

**Interfaces:**
- Consumes: OpenAI / Gemini API key (eğer tanımlıysa) VEYA yerleşik Humanitarian Terminology AI Mock/Offline Engine
- Produces:
  - `POST /api/ai/translate`: `{ text, sourceLang, targetLangs }` -> `{ translations: { uk: {...}, ar: {...}, fa: {...}, ... } }`
  - `POST /api/ai/generate-voice`: `{ text, langCode }` -> `{ audioUrl, duration }`
  - `POST /api/ai/transcribe`: `{ audioBlob }` -> `{ text }` (Whisper)

- [ ] **Step 1: Write tests for AI translation and voice synthesis in `src/test/aiTolk.test.js`**
- [ ] **Step 2: Implement `src/server/services/aiTolk.js`**
  - System prompt containing asylum/humanitarian glossary: UDI, NAV, mottakskontrakt, helsestasjon, oppholdstillatelse, politiattest, legetime.
  - Automatic RTL detection and metadata generation.
  - Neural TTS / Speech synthesis integration with Web Speech fallback and local sample audio generation.
- [ ] **Step 3: Implement `src/server/routes/ai.js` router**
- [ ] **Step 4: Run tests and verify translation accuracy**
- [ ] **Step 5: Commit Task 4**

```bash
git add src/server/services/aiTolk.js src/server/routes/ai.js src/test/aiTolk.test.js
git commit -m "feat: implement InfoVarde AI Tolk multilingual translation and voice engine"
```

---

### Task 5: InfoVarde Lifeline (KVKK/GDPR Acil İletişim Masası & WebRTC Signaling)

**Files:**
- Create: `src/server/services/lifelineService.js`
- Create: `src/server/routes/lifeline.js`
- Create: `src/server/webrtcSignaling.js`
- Create: `src/test/lifeline.test.js`

**Interfaces:**
- Consumes: `src/server/db.js`, `ws`
- Produces:
  - `POST /api/lifeline/session`: Rastgele kriptografik oturum token'ı oluştur (sıfır PII).
  - `POST /api/lifeline/chat/ai`: 24/7 AI İlk Yardım Asistanı cevabı (ana dilde).
  - `POST /api/lifeline/escalate`: Nöbetçi memura yardım çağrısı bildirimi.
  - `POST /api/lifeline/chat/message`: Canlı çift dilli çeviri destekli mesajlaşma.
  - `GET /api/lifeline/sessions`: Aktif yardım kuyruğu.
  - `WebSocket /ws/lifeline`: WebRTC sesli görüşme (VoIP) sinyalleşme sunucusu.
  - `cleanupExpiredSessions()`: 1 saatlik TTL ile uçucu mesaj imha mekanizması (GDPR Right to be Forgotten).

- [ ] **Step 1: Write Lifeline privacy and session lifecycle tests**
- [ ] **Step 2: Implement Lifeline service and routes**
- [ ] **Step 3: Implement WebRTC signaling handler for audio calls**
- [ ] **Step 4: Add cron/timer for ephemeral session destruction**
- [ ] **Step 5: Run tests and verify zero-PII compliance**
- [ ] **Step 6: Commit Task 5**

```bash
git add src/server/services/lifelineService.js src/server/routes/lifeline.js src/server/webrtcSignaling.js src/test/lifeline.test.js
git commit -m "feat: implement InfoVarde Lifeline GDPR-compliant emergency desk and webrtc signaling"
```

---

### Task 6: InfoVarde Skjerm (TV Digital Signage Player - `/tv/:code`)

**Files:**
- Create: `src/components/tv/TvPlayer.jsx`
- Create: `src/components/tv/SlideView.jsx`
- Create: `src/components/tv/WeatherClockWidget.jsx`
- Create: `src/components/tv/QrCodeWidget.jsx`
- Create: `src/components/tv/EmergencyTakeover.jsx`
- Create: `src/components/tv/TvPlayer.css`

**Interfaces:**
- Consumes: `/api/channels/:code/feed`, `/api/channels/:code/stream`
- Produces: 
  - Tam ekran 10-foot UI slayt döngüsü.
  - Canlı saat, tarih ve Open-Meteo hava durumu bandı.
  - Mobil akışa yönlendiren SVG QR kod.
  - Slayt süresi ilerleme çubuğu (progress bar).
  - SSE ile anında yenilenme ve acil durum tam ekran uyarısı.
  - `localStorage` offline fallback (internet koptuğunda kararmayan ekran).

- [ ] **Step 1: Build TV slide renderer and animation cycle with smooth transitions**
- [ ] **Step 2: Build Live Clock & Weather widget using Open-Meteo API**
- [ ] **Step 3: Build Dynamic QR Code generator pointing to `${window.location.origin}/m/${channelCode}`**
- [ ] **Step 4: Implement SSE live listener with automatic reconnection and offline cache recovery**
- [ ] **Step 5: Test TV Player in fullscreen mode with various screen resolutions**
- [ ] **Step 6: Commit Task 6**

```bash
git add src/components/tv/
git commit -m "feat: implement InfoVarde Skjerm TV digital signage player with offline cache"
```

---

### Task 7: InfoVarde Mobil (Zero-Login PWA Feed & Lifeline UI - `/m/:code`)

**Files:**
- Create: `src/components/mobile/MobileFeed.jsx`
- Create: `src/components/mobile/LanguageSelector.jsx`
- Create: `src/components/mobile/AnnouncementCard.jsx`
- Create: `src/components/mobile/AudioVoicePlayer.jsx`
- Create: `src/components/mobile/EventCalendarView.jsx`
- Create: `src/components/mobile/LifelineModal.jsx`
- Create: `public/manifest.json`
- Create: `public/sw.js`

**Interfaces:**
- Consumes: `/api/channels/:code/feed?lang=...`, `/api/lifeline/...`
- Produces:
  - Sıfır kayıt, tek tıkla açılan mobil haber akışı.
  - 8+ dil seçici ve anında `dir="rtl"` adaptasyonu.
  - Sesli duyuru oynatıcı (Voice Memo) ve Web Speech TTS motoru.
  - Kategori ve yaklaşan etkinlik takvimi sekmeleri.
  - "Acil Yardım / Nöbetçi Masası" (Lifeline) butonu ve canlı sohbet/WebRTC arama arayüzü.
  - PWA Service Worker ile çevrimdışı okuma.

- [ ] **Step 1: Build `LanguageSelector` with flags and instant RTL switching**
- [ ] **Step 2: Build `AnnouncementCard` with category tags, date/location badges, and `AudioVoicePlayer`**
- [ ] **Step 3: Implement Web Speech API Text-to-Speech fallback for reading announcements aloud**
- [ ] **Step 4: Build `EventCalendarView` for daily/weekly appointments and distributions**
- [ ] **Step 5: Build `LifelineModal` for anonymous AI first-response & WebRTC emergency calling**
- [ ] **Step 6: Register PWA manifest and service worker for offline resilience**
- [ ] **Step 7: Commit Task 7**

```bash
git add src/components/mobile/ public/manifest.json public/sw.js
git commit -m "feat: implement InfoVarde Mobil zero-login PWA feed and lifeline interface"
```

---

### Task 8: InfoVarde Studio (CMS Management Panel - `/admin`)

**Files:**
- Create: `src/components/admin/AdminDashboard.jsx`
- Create: `src/components/admin/ChannelManager.jsx`
- Create: `src/components/admin/AnnouncementEditor.jsx`
- Create: `src/components/admin/AiTolkModal.jsx`
- Create: `src/components/admin/DualScreenPreview.jsx`
- Create: `src/components/admin/LifelineDutyDesk.jsx`
- Create: `src/components/admin/EmergencyBroadcastModal.jsx`

**Interfaces:**
- Consumes: All `/api/channels`, `/api/announcements`, `/api/ai`, `/api/lifeline` endpoints.
- Produces:
  - Kanal oluşturma ve yazdırılabilir QR kod üretici.
  - Çok dilli sekme destekli zengin duyuru ve etkinlik editörü.
  - "1-Click AI Tolk": Tek tıkla tüm dillere otomatik tercüme ve ses dosyası oluşturma arayüzü.
  - Çift Ekran Canlı Önizleme: TV görünümü ve Mobil görünümü yan yana test edebilme.
  - Flaş Acil Durum Butonu (Broadcast Alert).
  - Nöbetçi Memur Masası (Lifeline Duty Desk): Gelen acil çağrıları karşılama, iki dilli canlı tercüme ile mülteciyle yazışma ve WebRTC ile konuşma.

- [ ] **Step 1: Build Admin Dashboard layout with channel selector and stats**
- [ ] **Step 2: Build Multilingual `AnnouncementEditor` with event scheduler and audio recorder**
- [ ] **Step 3: Implement `AiTolkModal` (One-click translate & voice generation)**
- [ ] **Step 4: Implement `DualScreenPreview` for side-by-side TV & Mobile testing**
- [ ] **Step 5: Implement `LifelineDutyDesk` for receiving live calls and translated emergency chats**
- [ ] **Step 6: Implement `EmergencyBroadcastModal` for instant camp-wide flash alerts**
- [ ] **Step 7: Commit Task 8**

```bash
git add src/components/admin/
git commit -m "feat: implement InfoVarde Studio CMS panel, dual-screen preview and duty desk"
```

---

### Task 9: Portal Home, End-to-End System Integration & Verification

**Files:**
- Create: `src/components/portal/PortalHome.jsx`
- Create: `src/test/e2e.test.js`
- Create: `README.md`

**Interfaces:**
- Consumes: All components and services
- Produces:
  - Giriş portalı (`/`): TV ekranlarını, Mobil akışları ve Studio panelini tanıtan şık başlangıç sayfası.
  - Uçtan uca test senaryoları (Duyuru ekleme -> AI çeviri -> TV'de canlı akış -> Mobilde RTL ve sesli okuma -> Lifeline acil çağrısı).
  - Kapsamlı kurulum ve kullanım kılavuzu (`README.md`).

- [ ] **Step 1: Build `PortalHome.jsx` with channel switcher, quick launch links and feature showcase**
- [ ] **Step 2: Write end-to-end integration test `src/test/e2e.test.js`**
- [ ] **Step 3: Run all automated tests: `npm test`**
- [ ] **Step 4: Test in browser: Run `npm run dev` and verify TV, Mobile, and Studio views**
- [ ] **Step 5: Write comprehensive `README.md` with Mottak deployment guide and architecture overview**
- [ ] **Step 6: Commit Task 9**

```bash
git add src/components/portal/ src/test/e2e.test.js README.md
git commit -m "feat: complete end-to-end integration, portal home and documentation"
```

---

## Verification Plan

### Automated Tests
- `npm test`: Runs all Node.js native test runner suites:
  - `src/test/db.test.js`: Veritabanı tabloları, ilişkiler, TTL temizliği.
  - `src/test/api.test.js`: REST API uç noktaları, filtreleme, SSE yayını.
  - `src/test/aiTolk.test.js`: İltica terminolojisi çevirisi, RTL tespiti, ses sentezi.
  - `src/test/lifeline.test.js`: Sıfır PII doğrulaması, anonim oturum, çift dilli tercüme.
  - `src/test/e2e.test.js`: Uçtan uca akış testi.

### Manual Verification Instructions
1. **Studio & AI Tolk Testi:**
   - Tarayıcıda `http://localhost:5173/admin` adresine gidin.
   - Yeni bir duyuru oluşturun, Norveççe metin girin.
   - "AI Tolk ile Çevir ve Seslendir" butonuna basın; Ukraynaca, Arapça, Farsça dillerinin saniyeler içinde doldurulduğunu görün.
2. **TV Player & SSE Canlı Akış Testi:**
   - İkinci bir sekmede `http://localhost:5173/tv/MYTI-01` açın.
   - Admin panelinden duyuruyu kaydedin veya acil durum flaşı gönderin; TV ekranının sayfa yenilenmeden anında güncellendiğini doğrulayın.
   - Tarayıcının internetini (DevTools Network -> Offline) kapatın; TV'nin kararmadan mevcut slaytları döngüde oynatmaya devam ettiğini gözlemleyin.
3. **Mobil PWA, RTL & Sesli Anlatım Testi:**
   - `http://localhost:5173/m/MYTI-01` adresine gidin.
   - Dil seçiciden Arapça veya Farsça seçin; sayfanın otomatik sağdan sola (RTL) döndüğünü doğrulayın.
   - Duyuru kartındaki "Sesli Dinle" butonuna dokunarak ses kaydının/TTS'in çalıştığını test edin.
4. **Lifeline Acil Yardım & WebRTC Testi:**
   - Mobilde sağ alttaki "Acil Yardım / Nöbetçi Hattı" butonuna basın.
   - Kendi dilinizde bir acil soru yazın, AI asistanın cevabını görün.
   - "Nöbetçiye Aktar" butonuna basın; admin panelindeki Nöbetçi Masasında (`/admin`) anında sesli bildirim ve çift yönlü çevirili sohbetin açıldığını doğrulayın.
