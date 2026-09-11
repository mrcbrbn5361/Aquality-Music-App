# ⚡ 02. API ve Stream Motoru

> **Aquality Music API ve Akış Motoru Dokümantasyonu**  
> YouTube Music InnerTube v1 API tersine mühendisliği, gizli pencere oynatıcısı, reklam atlama mekanizması ve Discord Rich Presence entegrasyonu.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-11 23:52` |
| **Proje Sürümü** | `v1.0.0` (Masaüstü: `v1.0.0`, Web: `v1.0.0`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `6f3a3ba - feat(mobile): overhaul Expo Go with MetroList architecture, lyrics, and iOS/Android playback (3 minutes ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 21 / 21 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. InnerTube v1 API Mimarisi (`desktop/src/main/api/innertube.ts`)

Aquality Music, resmi YouTube Music istemcisinin kullandığı tersine mühendislik uygulanmış `WEB_REMIX` InnerTube API'sini kullanır:

```typescript
const INNERTUBE_CLIENT = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20250801.00.00',
  hl: 'tr',
  gl: 'TR'
};
```

### 1.1 Desteklenen Uç Noktalar (Endpoints)
- **`/youtubei/v1/browse`**:
  - Ana sayfa önerileri (`FEmusic_home`)
  - Sanatçı detayları, popüler parçalar ve diskografi (`browseId: "UC..."`)
  - Albüm detayları ve parça listesi (`browseId: "MPREb_..."`)
  - Kullanıcı çalma listeleri ve beğenilen parçalar (`browseId: "VL..."` veya `LM`)
- **`/youtubei/v1/search`**:
  - Serbest metin araması (şarkılar, videolar, albümler, sanatçılar ve çalma listeleri).
  - Filtreli arama: `EgWKAQIIAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D` vb. paramlar ile hedeflenmiş sorgular.
- **`/youtubei/v1/player`**:
  - Şarkı metadata'sı, süre, format listesi ve kapak görseli bilgileri.

### 1.2 Carousel ve Raf Ayrıştırıcısı (Shelf Parser)
YouTube Music dinamik carousel yapıları (`musicCarouselShelfRenderer`, `musicShelfRenderer`, `sectionListRenderer`) standart şablonlara indirgenerek temiz TypeScript modellerine dönüştürülür.

---

## 2. Gizli Stream Resolver Motoru (`desktop/src/main/api/stream-resolver.ts`)

YouTube Music video ve ses akışlarını korumak için dinamik imza ve JavaScript tabanlı n-parametre şifreleme kullanır. Aquality Music, harici kırılgan çözücülere ihtiyaç duymadan **Gizli BrowserWindow (Hidden Player)** mimarisiyle çalışır.

### 2.1 Çalışma Mantığı
1. Kullanıcı bir parçaya tıkladığında, gizli pencereye `https://music.youtube.com/watch?v={videoId}` URL'si yüklenir.
2. `session.fromPartition('persist:music')` kullanıldığı için kullanıcının premium veya ücretsiz hesabı aktif kalır.
3. YouTube'un resmi `movie_player` DOM arayüzü JavaScript enjeksiyonu ile yakalanır:
   - `mp.getCurrentTime()`
   - `mp.getDuration()`
   - `mp.getPlayerState()`
   - `mp.getVideoData()`
4. Her 800 milisaniyede bir (`POLL_MS`) toplanan telemetri verileri ana süreç üzerinden arayüze (`player:update`) iletilir.

---

## 3. Akıllı Reklam Atlama ve Engelleme Motoru

Uygulama üç katmanlı savunma ile kesintisiz müzik deneyimi sunar:

### 3.1 Ağ Düzeyinde Engelleme (`AD_BLOCK_PATTERNS`)
`session.webRequest.onBeforeRequest` kancası ile bilinen reklam domainleri (`doubleclick.net`, `googleadservices.com`, `youtube.com/pagead/*`, `youtube.com/api/stats/ads*` vb.) doğrudan ağ seviyesinde `cancel: true` yapılarak engellenir.

### 3.2 İçerik Yanıtı Temizliği (Payload Filter)
`window.fetch` kancalanarak `/youtubei/v1/player` ve `/youtubei/v1/next` JSON yanıtlarından reklam nesneleri (`adPlacements`, `playerAds`, `adSlots`) anında silinir.

### 3.3 DOM Nöbetçisi (DOM Sentinel)
Görsel reklam overlay'leri CSS ile tamamen gizlenir (`ADHIDE_CSS`). Eğer kaçak bir video reklam başlarsa (`isAd = true`), video anında sessize alınır (`v.muted = true`) ve `v.currentTime = v.duration` atanarak reklam 0.1 saniyede otomatik atlatılır.

---

## 4. Discord Rich Presence Entegrasyonu (`desktop/src/main/utils/discord.ts`)

Kullanıcının o an dinlediği parça, gerçek zamanlı olarak Discord profilinde durum olarak gösterilir:

- **Detaylar**: Şarkı Adı
- **Durum**: Sanatçı Adı
- **Görsel**: Şarkının albüm/parça kapak görseli
- **Zaman Sayacı**: Kalan süre veya geçen süre hesabı
- **Butonlar**: "Aquality Music ile Dinle" / Web sitesi bağlantısı
- **Yeniden Bağlanma Mekanizması**: Discord istemcisi kapalıyken başlamışsa 45 saniyelik aralıklarla otomatik sessiz deneme yapılır, uygulama çökmesi önlenir.
