# 🤖 11. Discord Bot ve RPC Entegrasyonu

> **Aquality Music & Harmonic — Discord Zengin Varlık (RPC), Yerel REST API ve Canvas Oynatıcı Kartı Sistemi**  
> Bu belge, masaüstü oynatıcının Discord ile olan çift yönlü veri akışını, Port 9863 üzerinde çalışan hafif HTTP REST API sunucusunu ve sunucularda çalışan gelişmiş Discord bot mimarisini açıklar.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-16 22:33` |
| **Proje Sürümü** | `v1.0.1` (Masaüstü: `v1.0.1`, Web: `v1.0.1`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `e9612e8 - fix: update domain to aqualitymusic.vercel.app (73 minutes ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 📑 İçindekiler
1. [Sistem Mimarisi ve Veri Akışı](#1-sistem-mimarisi-ve-veri-akışı)
2. [Yerel REST API Sunucusu (Port 9863)](#2-yerel-rest-api-sunucusu-port-9863)
3. [Discord Rich Presence (RPC) Entegrasyonu](#3-discord-rich-presence-rpc-entegrasyonu)
4. [Canvas Tabanlı Discord Oynatıcı Kartı](#4-canvas-tabanlı-discord-oynatıcı-kartı)
5. [Discord.js (v14) Hazır Bot İstemcisi](#5-discordjs-v14-hazır-bot-istemcisi)
6. [Dinamik Şarkı ve Sanatçı Önerileri](#6-dinamik-şarkı-ve-sanatçı-önerileri)
7. [Discord Developer Portal Yapılandırması](#7-discord-developer-portal-yapılandırması)
8. [Kurulum ve Çalıştırma Rehberi](#8-kurulum-ve-çalıştırma-rehberi)

---

## 1. Sistem Mimarisi ve Veri Akışı

Aquality Music ve Harmonic, kullanıcıların dinleme durumunu iki bağımsız kanal üzerinden Discord ekosistemine sunar:

```
+-------------------------------------------------------------------------+
|                        AQUALITY MUSIC DESKTOP                           |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |   Renderer (Player)   |              |       Main Process       |   |
|   |   - currentTime       |---IPC sync-->|  - BotServer (Port 9863) |   |
|   |   - queue & duration  |              |  - DiscordRPC (Client)   |   |
|   +-----------------------+              +--------------------------+   |
+---------------------------------------------------|---------------------+
                                                    |
                      +-----------------------------+---------------------+
                      |                                                   |
                      v                                                   v
        [ Port 9863 HTTP REST API ]                              [ Discord IPC Soketi ]
        - GET /api/v1/state                                      - Application ID:
        - GET /query                                               1547602880427724841
        - GET /api/v1/health                                     - 'LISTENING' Aktivitesi
                      |                                                   |
                      +-----------------------------+---------------------+
                                                    |
                                                    v
                                  +-----------------------------------+
                                  |       AQUALITY DISCORD BOTU       |
                                  |    Komutlar: .aqua, .spo, .har    |
                                  +-----------------------------------+
                                                    |
                                                    v
                                  [ Canvas Kartı & 2 Sıralı Buton ]
                                  - Koyu zemin oynatıcı kartı
                                  - Parlayan uçlu ilerleme çubuğu
                                  - 1, 2, 3 Numaralı öneriler
                                  - [Aquality'de Aç] [Şarkı Sözleri]
                                  - [1. Öneri] [2. Öneri] [3. Öneri]
```

---

## 2. Yerel REST API Sunucusu (Port 9863)

Masaüstü uygulaması başlatıldığında `desktop/src/main/api/bot-server.ts` üzerinden `127.0.0.1:9863` adresinde hafif bir HTTP REST API ayağa kalkar.

### Uç Noktalar (Endpoints):
- **`GET /api/v1/state` veya `GET /query`:** Çalan şarkının tüm detaylarını, ilerleme durumunu ve kuyruktaki ilk 3 şarkıyı döner.
- **`GET /api/v1/health`:** Sunucunun aktiflik durumunu döner (`status: "ok"`).

### Örnek JSON Yanıtı (`/api/v1/state`):
```json
{
  "app": "Aquality Music",
  "version": "1.0.0",
  "status": "playing",
  "isPlaying": true,
  "track": {
    "id": "abc123xyz",
    "title": "Ağlama Yar",
    "artist": "Nurettin Rençber",
    "album": "Eski Yara",
    "thumbnail": "https://i.ytimg.com/vi/abc123xyz/hqdefault.jpg",
    "duration": 287,
    "durationFormatted": "04:47",
    "currentTime": 9,
    "currentTimeFormatted": "00:09",
    "progress": 0.031,
    "url": "https://music.youtube.com/watch?v=abc123xyz"
  },
  "recommendations": [
    { "title": "Söyle Sunam", "artist": "Nurettin Rençber", "url": "https://music.youtube.com/watch?v=..." },
    { "title": "İçimdeki Ateş", "artist": "Nurettin Rençber", "url": "https://music.youtube.com/watch?v=..." },
    { "title": "Yürürüm", "artist": "Nurettin Rençber", "url": "https://music.youtube.com/watch?v=..." }
  ],
  "updatedAt": 1789308698752
}
```

---

## 3. Discord Rich Presence (RPC) Entegrasyonu

- **Uygulama Kimliği (Application ID):** `1547602880427724841` (Aquality Music) / `1545832861435830432` (Harmonic)
- **Protokol:** `\\?\pipe\discord-ipc-0` üzerinden yerel Discord istemcisine IPC bağlantısı.
- **Aktivite Türü:** `LISTENING` (Şarkı dinliyor).
- **Zaman Damgaları:** Şarkı bitiş zamanı (`endTimestamp`) gönderilerek Discord üzerinde gerçek zamanlı geri sayım çubuğu görüntülenir.

---

## 4. Canvas Tabanlı Discord Oynatıcı Kartı

Sıradan Discord metin embed'leri yerine `@napi-rs/canvas` ile ultra yüksek çözünürlüklü ve estetik kart üretilir (`scripts/discord-bot/cardRenderer.js`):
- **Görsel Düzeni:**
  - Sol tarafta yuvarlatılmış köşeli 150x150 albüm kapağı.
  - Kapağın altında temaya göre parlayan **`● Aquality`** veya **`● Harmonic`** rozeti.
  - Sağ tarafta parça adı (22px kalın beyaz), sanatçı adı ve albüm bilgisi.
  - Süre sayaçları (`00:09` / `04:47`) ve parlayan uç göstergeli şık ilerleme çubuğu.
  - Alt kısımda 1, 2, 3 dairesel rozetli **ÖNERİLER** listesi.
- **Tema Desteği:**
  - **Aquality Teması:** Kurumsal Spotify Yeşili (`#1ED760`) veya Neon Cyan (`#00F2FE`).
  - **Harmonic Teması:** Canlı Kırmızı (`#E53935`).

---

## 5. Discord.js (v14) Hazır Bot İstemcisi

`scripts/discord-bot/index.js` dosyasında yer alan hazır bot kodu:
- **Tetikleyiciler:** `.aqua`, `.aquality`, `.spo`, `.har`, `.harmonic`
- **İki Sıralı İnteraktif Buton Düzeni (ActionRow):**
  - **1. Satır:** `[Aquality'de Aç ↗]` (veya Harmonic) ve `[Şarkı Sözleri]`
  - **2. Satır:** Önerilen parçaların doğrudan dinlenebilmesi için link butonları (`[1. Şarkı ↗]`, `[2. Şarkı ↗]`, `[3. Şarkı ↗]`).
- **Önbellek Güvencesi:** Kullanıcı durumu önbellekte yoksa `members.fetch` ile veriyi anında tazeler.

---

## 6. Dinamik Şarkı ve Sanatçı Önerileri

Bot, kullanıcı şarkı dinlerken iki aşamalı öneri stratejisi uygular:
1. **Yerel Kuyruk:** Eğer kullanıcı masaüstü uygulamasında bir çalma listesi veya radyo dinliyorsa, sıradaki ilk 3 parça Port 9863 REST API'den alınır.
2. **iTunes API Entegrasyonu:** Eğer kuyruk bilgisi yoksa veya Gateway Presence üzerinden sorgulanıyorsa, çalınan sanatçının en popüler 3 şarkısı iTunes API üzerinden canlı olarak çekilir ve buton linkleriyle birlikte karta eklenir.

---

## 7. Discord Developer Portal Yapılandırması

Botun mesaj komutlarını okuyabilmesi ve kullanıcıların dinlediği şarkıyı görebilmesi için şu ayarlar yapılmalıdır:
1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin.
2. Botunuzu seçin -> Sol menüden **Bot** sekmesine tıklayın.
3. **Privileged Gateway Intents** başlığı altında:
   - ✅ **PRESENCE INTENT** -> Açık (Enabled)
   - ✅ **SERVER MEMBERS INTENT** -> Açık (Enabled)
   - ✅ **MESSAGE CONTENT INTENT** -> Açık (Enabled)
4. Değişiklikleri kaydedin.

---

## 8. Kurulum ve Çalıştırma Rehberi

### Bot Bağımlılıklarının Kurulumu:
```bash
cd scripts/discord-bot
npm install
```

### Botu Başlatma:
```bash
node index.js
```
*(Token `.env` dosyasında `DISCORD_TOKEN=...` şeklinde tanımlanabilir)*
