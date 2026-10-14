# InfoVarde 🛡️📡

> **Trygg informasjon som viser vei — på veggen og i lomma.**  
> *Pintomind (Infoskjermen) modelinde; mülteci kabul merkezleri, kamplar ve sivil toplum kuruluşları için geliştirilmiş çok dilli dijital bilgi panosu ve acil iletişim platformu.*

---

## 🌟 Genel Bakış ve Misyon

InfoVarde; Norveç'in öncü dijital bilgilendirme platformu **Pintomind (Infoskjermen)** mimarisini referans alarak, zorlu insani yardım ve sığınmacı kabul merkezi (asylmottak) şartları için sıfırdan tasarlandı.

Platform dört temel sütun üzerine kuruludur:
1. **InfoVarde Skjerm (`/tv/:code`):** Duvardaki TV ekranları için 10-foot UI slayt döngüsü, canlı hava durumu & saat bandı, mobil yönlendirici dinamik QR kod ve elektrik/internet kesintisinde kararmayan `localStorage` önbelleği.
2. **InfoVarde Mobil (`/m/:code`):** Beboere (sığınmacılar) için sıfır kayıt ve sıfır kişisel veri (Zero-PII / KVKK / GDPR) ile çalışan, anında 8+ dilde sağdan-sola (RTL) dönen, Web Speech sesli okuma destekli PWA haber akışı.
3. **InfoVarde AI Tolk:** İltica ve mottak terminolojisiyle (UDI, helsesjekk, asylintervju) eğitilmiş 1-tıkla çok dilli otomatik çeviri ve yapay seslendirme motoru.
4. **InfoVarde Lifeline:** 24/7 AI ilk yardım triyajı, nöbetçi memur masasına canlı eskalasyon, çift dilli anlık çevirili sohbet ve WebRTC sesli VoIP çağrı hattı.
5. **InfoVarde Studio (`/admin`):** Çift ekran önizleme simülatörü (TV ve Mobil yan yana), zengin slayt editörü, nöbetçi memur masası ve kamp geneli flaş nødvarsel (acil durum ekran takeover) yönetim paneli.

---

## 🏗️ Mimari ve Teknoloji Yığını

- **Backend:** Node.js, Express, `better-sqlite3` (DatabaseSync), Server-Sent Events (SSE) yayın motoru, WebRTC VoIP sinyalleşmesi (`ws`).
- **Frontend:** React 18, Vite, React Router 7, Lucide Icons, QRCode SVG, Web Speech API (TTS).
- **Tasarım:** Nordic Glassmorphism (`#0B1120`, `#1E293B`, `#F97316`, `#06B6D4`, `#EF4444`).

```
                    ┌───────────────────────────────────────────────┐
                    │               InfoVarde Studio                │
                    │               (/admin - CMS)                  │
                    └───────┬───────────────────────────────┬───────┘
                            │                               │
                REST API / SSE Broadcast        WebRTC / AI Tolk Engine
                            │                               │
        ┌───────────────────▼───────────┐       ┌───────────▼───────────────────┐
        │       InfoVarde Skjerm        │       │       InfoVarde Mobil         │
        │       (/tv/:code - TV)        │       │       (/m/:code - PWA)        │
        │ • 10-Foot UI Slayt Döngüsü    │       │ • Sıfır Kayıt / Zero-PII      │
        │ • Live Clock & Open-Meteo     │◄──────┤ • 8+ Dil & Anında RTL         │
        │ • Dinamik QR Kod              │ QR    │ • Web Speech TTS Seslendirme  │
        │ • Kararmayan Offline Cache    │ KOD   │ • Lifeline 24/7 Acil Yardım   │
        └───────────────────────────────┘       └───────────────────────────────┘
```

---

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Örnek Veritabanını Doldurun (Seed)
Mytilene Humanitarian Hub (`MYTI-01`) ve Oslo Mottakssenter (`OSLO-01`) kanalları ile 8 dilde hazırlanmış örnek duyuruları yükler:
```bash
npm run seed
```

### 3. Tek Komutla Başlatın (Dev Server & Backend)
```bash
npm run dev
```
- **Web Portalı:** `http://localhost:5173/`
- **TV Skjerm:** `http://localhost:5173/tv/MYTI-01`
- **Mobil PWA:** `http://localhost:5173/m/MYTI-01`
- **Studio Admin:** `http://localhost:5173/admin`
- **Backend API:** `http://localhost:3001/api/health`

---

## 🧪 Testleri Çalıştırma

InfoVarde, veritabanı, REST API, SSE yayını, AI Tolk, Lifeline ve WebRTC VoIP dahil olmak üzere 5 ayrı test paketinde 27 otomatik test içerir:

```bash
npm test
```

### Test Kapsamı:
- `src/test/db.test.js`: SQLite tabloları, CASCADE silme ve 1 saatlik GDPR TTL oturum temizliği.
- `src/test/api.test.js`: Kanal yönetimi, duyuru filtreleme, çok dilli akış ve acil flaş yayını.
- `src/test/aiTolk.test.js`: İltica glossarı çevirisi, RTL tespiti, yapay ses sentezi.
- `src/test/lifeline.test.js`: Sıfır PII oturum doğrulaması, AI triyajı, çift dilli sohbet ve WebRTC SDP offer/answer değişimi.
- `src/test/e2e.test.js`: Uçtan uca sistem entegrasyon yaşam döngüsü.

---

## 🔒 KVKK ve GDPR Tam Uyumu

- **Kayıt ve Giriş Yok:** Mülteciler ve sığınmacılar için e-posta, telefon veya isim talep edilmez.
- **Kriptografik Uçucu Oturumlar:** Acil yardım hattında rastgele UUID üretilir.
- **Unutulma Hakkı (Right to be Forgotten):** Tüm oturumlar ve yardım mesajları 1 saatlik TTL sonrasında veritabanından tamamen silinir (`cleanupExpiredSessions`).

---

## 📄 Lisans

InfoVarde Açık İnsani Yardım Lisansı © 2026.
