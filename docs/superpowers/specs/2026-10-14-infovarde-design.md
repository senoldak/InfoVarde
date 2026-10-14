# InfoVarde - Sistem Tasarım Dokümanı (Design Specification)

**Tarih:** 14 Ekim 2026  
**Proje:** InfoVarde (Pintomind / Infoskjermen Alternatifi Dijital Bilgilendirme ve İletişim Platformu)  
**Hedef Kitle:** Mülteci kampları, kabul merkezleri (UDI/Mottak), sivil toplum kuruluşları, belediyeler ve ortak alanlar  
**Mimari:** Node.js/Express + React/Vite + SQLite + Server-Sent Events (SSE) + PWA  

---

## 1. Giriş ve Proje Amacı

InfoVarde, Norveç merkezli Infoskjermen / Pintomind sisteminden ilham alan, "Tek Merkezden Yönetim, Çift Ekranlı Yayın" ilkesiyle çalışan açık kaynaklı ve modern bir bilgilendirme platformudur.

### Temel Problemler ve Çözümler
1. **Bilgi Kirliliği ve Söylentiler:** Mülteci kamplarında ve topluluk merkezlerinde resmi ve doğrulanmış bilginin tek bir güvenilir kaynaktan anında duvara (TV) ve cebe (Mobil) yansıması.
2. **Kişisel Veri ve Güven Engeli:** Mülteciler ve yararlanıcılar için hesap oluşturma, e-posta, telefon numarası veya uygulama mağazası zorunluluğu olmadan sadece TV'deki QR kod veya kısa kodla (`infovarde.app/m/MYTI-01`) anında bilgiye erişim.
3. **Dil Bariyeri ve Okuryazarlık:** 6 temel dil desteği (İngilizce, Norveççe, Arapça, Farsça, Türkçe, Yunanca), otomatik RTL (sağdan sola) arayüz desteği, yerel dilde ses kaydı (Voice Memo) ve tarayıcı tabanlı sesli okuma (TTS).
4. **Bağlantı ve Donanım Esnekliği:** Pahalı dijital tabela (signage) cihazları yerine herhangi bir Smart TV tarayıcısında, ucuz Android TV kutusunda veya Raspberry Pi'de çalışabilme; internet kesintisinde `localStorage` ile kararmadan yayına devam edebilme.

---

## 2. Terminoloji ve Modüller

* **InfoVarde Skjerm (TV Player):** Ortak alanlardaki televizyonlarda çalışan tam ekran, fare/klavye gerektirmeyen döngüsel slayt oynatıcı.
* **InfoVarde Mobil (Varde Feed):** QR kodla açılan, kayıt gerektirmeyen dikey haber akışı ve etkinlik takvimi.
* **InfoVarde Studio (CMS Panel):** Görevlilerin ve tercümanların içerik girdiği, zamanlama yaptığı ve ekranları yönettiği web paneli.

---

## 3. Sistem Mimarisi

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                     InfoVarde Studio (CMS)                      │
 │   - Ekran/Kanal Yönetimi & QR Kod Üretici                       │
 │   - Çok Dilli İçerik Editörü (EN, NO, AR, FA, TR, EL)           │
 │   - Sesli Duyuru (Audio Memo) & Etkinlik/Takvim Girişi          │
 │   - Acil Durum Flaş Bildirimi (Broadcast Alert)                 │
 └────────────────────────────────┬────────────────────────────────┘
                                  │ REST API (JSON)
                                  ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │               InfoVarde Backend (Node.js / Express)             │
 │   - REST Endpoints (`/api/channels`, `/api/announcements`, vb.) │
 │   - SQLite Veritabanı (`better-sqlite3` - Sıfır Konfigürasyon)  │
 │   - Server-Sent Events (SSE) Yayını (`/api/channels/:code/stream`)│
 └────────────────┬───────────────────────────────┬────────────────┘
                  │                               │
  SSE Canlı Akış  │                               │ REST + Service Worker
  (Sıfır Gecikme) │                               │ (Offline Cache)
                  ▼                               ▼
 ┌────────────────────────────────┐  ┌─────────────────────────────┐
 │  InfoVarde Skjerm (TV Player)  │  │  InfoVarde Mobil (PWA Feed) │
 │  - Otomatik Slayt Döngüsü      │  │  - Sıfır Kayıt / Giriş      │
 │  - Canlı Saat & Hava Durumu    │  │  - 6 Dil + Otomatik RTL     │
 │  - Dinamik QR Kod Widget'ı     │  │  - Ses Kaydı & TTS Okuma    │
 │  - Acil Durum Tam Ekran Modu   │  │  - Etkinlik Takvimi Filtresi│
 │  - Kesintisiz Çevrimdışı Bellek│  │  - Ana Ekrana Ekleme (PWA)  │
 └────────────────────────────────┘  └─────────────────────────────┘
```

---

## 4. Veri Modeli ve Veritabanı Şeması (SQLite)

### 4.1. `channels` (Kanallar / Ekran Grupları)
| Alan Adı | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Benzersiz ID |
| `code` | TEXT UNIQUE NOT NULL | Kısa paylaşım kodu (Örn: `MYTI-01`, `BERGEN-CAMP`) |
| `name` | TEXT NOT NULL | Kanal Adı (Örn: "Mytilene Hub A Salonu") |
| `location_name` | TEXT | Konum/Şehir adı (Örn: "Mytilene, Lesvos") |
| `latitude` | REAL | Hava durumu koordinatı |
| `longitude` | REAL | Hava durumu koordinatı |
| `slide_interval_sec` | INTEGER DEFAULT 12 | TV'de slaytların varsayılan geçiş süresi (saniye) |
| `theme_color` | TEXT DEFAULT '#F97316' | Vurgu rengi |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | Oluşturulma tarihi |

### 4.2. `announcements` (Duyurular / Slaytlar)
| Alan Adı | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Benzersiz ID |
| `channel_id` | INTEGER NOT NULL | Bağlı olduğu kanal ID'si (Foreign Key) |
| `category` | TEXT DEFAULT 'general' | `emergency`, `health`, `legal`, `food`, `education`, `general` |
| `priority` | TEXT DEFAULT 'normal' | `normal`, `urgent` (Acil durum ekranı) |
| `content_type` | TEXT DEFAULT 'standard' | `standard`, `event` (Etkinlik/Takvim duyurusu) |
| `image_url` | TEXT | Varsa kapak görseli URL'i veya yolu |
| `audio_url` | TEXT | Yerel ses kaydı dosyası (Voice Memo) URL'i veya yolu |
| `event_date` | TEXT | Etkinlik tarihi (Format: YYYY-MM-DD, opsiyonel) |
| `event_time` | TEXT | Etkinlik saati (Örn: "14:30 - 16:00", opsiyonel) |
| `event_location` | TEXT | Etkinlik yeri (Örn: "Sağlık Çadırı 2", opsiyonel) |
| `start_date` | DATETIME | Yayına başlama zamanı (Zamanlama motoru için) |
| `end_date` | DATETIME | Yayından kalkma zamanı |
| `slide_duration` | INTEGER | Bu slayta özel gösterim süresi (boşsa kanal varsayılanı) |
| `is_active` | INTEGER DEFAULT 1 | 1 = Aktif, 0 = Pasif |
| `created_at` | DATETIME DEFAULT CURRENT_TIMESTAMP | Eklenme zamanı |

### 4.3. `announcement_translations` (Çok Dilli İçerikler)
| Alan Adı | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Benzersiz ID |
| `announcement_id` | INTEGER NOT NULL | Duyuru ID'si (Foreign Key, Cascade Delete) |
| `lang_code` | TEXT NOT NULL | `en`, `no`, `ar`, `fa`, `tr`, `el` |
| `title` | TEXT NOT NULL | Seçili dildeki başlık |
| `content` | TEXT NOT NULL | Seçili dildeki açıklama / gövde metni |
| `is_rtl` | INTEGER DEFAULT 0 | 1 = Sağdan Sola (`ar`, `fa`), 0 = Soldan Sağa |

---

## 5. API ve Server-Sent Events (SSE) Protokolü

### 5.1. REST API
* `GET /api/channels`: Tüm kanalları listeler.
* `POST /api/channels`: Yeni kanal oluşturur (benzersiz kodla).
* `GET /api/channels/:code`: Belirli bir kanalın ayarlarını getirir.
* `GET /api/channels/:code/feed?lang=en`: Belirli bir dildeki aktif duyuruları ve etkinlikleri döner.
* `POST /api/announcements`: Yeni duyuru ekler (tüm dil çevirileriyle birlikte).
* `PUT /api/announcements/:id`: Duyuruyu günceller.
* `DELETE /api/announcements/:id`: Duyuruyu siler.
* `POST /api/channels/:code/broadcast-alert`: Acil durum flaş uyarısı tetikler.

### 5.2. Server-Sent Events (SSE) Canlı Yayın
* **Endpoint:** `GET /api/channels/:code/stream`
* **Olaylar (Events):**
  * `connected`: İlk bağlantı kurulduğunda onay mesajı.
  * `feed_updated`: Yeni bir duyuru eklendiğinde, güncellendiğinde veya silindiğinde istemcilere son veriyi anında yeniden çekme sinyali gönderir.
  * `emergency_alert`: Acil durum anında normal döngüyü kesen acil durum verisini taşır.

---

## 6. Arayüz ve Kullanıcı Deneyimi Detayları

### 6.1. InfoVarde Skjerm (TV Arayüzü - `/tv/:code`)
* **10-Foot UI:** Minimum 3 metreden rahat okunabilen büyük tipografi (`h1: 56px`, `p: 28px`).
* **Otomatik Döngü ve Canlı İlerleme:** Ekranın altında akıcı ilerleme çizgisi. Belirtilen sürede sonraki slayta geçiş.
* **Dinamik QR Kod:** Sağ alt köşede mobil URL'ye (`/m/:code`) yönlendiren SVG QR kod.
* **Hava Durumu ve Saat Bandı:** Open-Meteo API entegrasyonu ile ücretsiz ve lisans anahtarsız canlı hava durumu ve yerel saat.
* **Ekran Koruma (Pixel-Shift):** TV ekranının yanmasını (burn-in) önlemek için sabit bileşenlerde periyodik mikro yer değiştirme.
* **Çevrimdışı Önbellek:** Veriler `localStorage`'da tutulur; internet kesildiğinde sağ üstte minik bir *"Çevrimdışı"* rozeti ile kesintisiz yayına devam eder.

### 6.2. InfoVarde Mobil (Kullanıcı Akışı - `/m/:code`)
* **Sıfır Kayıt:** Kullanıcı QR kodu okuttuğunda doğrudan besleme açılır.
* **Çok Dilli Seçici:** 🇬🇧 EN, 🇳🇴 NO, 🇸🇾 العربية, 🇮🇷 فارسی, 🇹🇷 TR, 🇬🇷 EL.
* **RTL Desteği:** Arapça veya Farsça seçildiğinde sayfa yönü `dir="rtl"` olur, tüm kartlar ve simgeler sağdan sola dizilir.
* **Ses Kaydı Oynatıcı (Voice Memo):** Duyuruya eklenmiş ses kaydı varsa tek tıkla doğrudan tarayıcıda oynatılır.
* **Tarayıcı Tabanlı Sesli Okuma (Web Speech TTS):** Ses dosyası yoksa tarayıcının yerleşik konuşma sentezleyicisi ile duyuruyu sesli okur.
* **Kategori ve Takvim Filtresi:** Tüm duyurular, acil durumlar, sağlık, hukuk, eğitim ve yaklaşan etkinlik takvimi.
* **PWA Desteği:** Web App Manifest ve Service Worker ile internet yokken bile son açılan duyurular okunabilir.

### 6.3. InfoVarde Studio (CMS Yönetim Paneli - `/admin`)
* **Kanal Seçici & Ayarlar:** Hangi ekranda neyin yayınlanacağını belirleme.
* **Çok Dilli Sekmeli Editör:** Tek ekranda farklı diller için başlık ve metin girişi.
* **Etkinlik & Zamanlama:** Tarih, saat, konum ve yayın başlangıç/bitiş planlaması.
* **Ses & Görsel Yükleme:** Ses kaydı ve görsel ekleme desteği.
* **Çift Ekran Canlı Önizleme:** Sol tarafta TV görünümü, sağ tarafta Mobil görünümü simüle eden canlı önizleme ekranı.
* **Flaş Acil Durum Butonu:** Tek tıkla tüm ekranları kırmızı alarma geçirme.

---

## 7. Görsel Kimlik ve Tasarım Sistemi (Design Tokens)

* **Logo:** Üst üste dengelenmiş 3 İskandinav taşı (*Varde*). En üst taşın üzerinde turuncu yol gösterici patika işareti.
* **Renk Paleti:**
  - `Fjord Dark (Arka Plan)`: `#0B1120` / `#0F172A`
  - `Surface Glass (Kartlar)`: `rgba(255, 255, 255, 0.05)` (Buzlu cam / Glassmorphism)
  - `Beacon Orange (Vurgu / Yol Gösterici)`: `#F97316` / `#EA580C`
  - `Emergency Red (Acil Durum)`: `#EF4444`
  - `Aurora Cyan (Sağlık & Sakinlik)`: `#06B6D4`
  - `Polar White (Metin)`: `#F8FAFC`
  - `Slate Muted (İkincil Metin)`: `#94A3B8`
* **Yazı Tipleri:**
  - Latin / Grek: `Plus Jakarta Sans` veya `Inter`
  - Arapça / Farsça (RTL): `Tajawal` veya `Noto Sans Arabic`

---

## 8. Doğrulama ve Test Stratejisi

1. **Birim & API Testleri:**
   - Kanalların ve çok dilli duyuruların doğru kaydedilmesi, güncellenmesi ve silinmesi.
   - Dil koduna göre filtrelenmiş verinin doğruluğu ve RTL bayraklarının test edilmesi.
2. **Server-Sent Events (SSE) Canlı Testi:**
   - Admin panelinden yeni duyuru yayınlandığında TV ve mobil ekranların otomatik güncellenmesinin doğrulanması.
3. **Çevrimdışı (Offline) Dayanıklılık Testi:**
   - Ağ bağlantısı kesildiğinde TV ekranının kararmadan mevcut slaytları döngüde oynatmaya devam ettiğinin doğrulanması.
4. **Çok Dilli & RTL Arayüz Doğrulaması:**
   - Arapça ve Farsça dillerinde kartların, butonların ve tipografinin görsel bütünlüğünün doğrulanması.
5. **Ses Oynatıcı & TTS Testi:**
   - Yüklenen ses kaydının ve Web Speech TTS motorunun hatasız çalışmasının doğrulanması.
