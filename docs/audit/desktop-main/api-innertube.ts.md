# 📄 Dosya Denetimi: `desktop/src/main/api/innertube.ts`

> **Dosya Yolu**: `desktop/src/main/api/innertube.ts`  
> **Kod Hacmi**: 961 Satır  
> **Rolü**: YouTube Music InnerTube (v1) Özel İstemcisi ve JSON Ayrıştırıcı

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`innertube.ts`, YouTube Music'in dahili JSON API'si (`https://music.youtube.com/youtubei/v1`) ile doğrudan konuşan istemci sınıfıdır. Arama sonuçları, ana sayfa önerileri, şarkı sözleri, sanatçı/albüm sayfaları ve kullanıcının kütüphane verilerini çeker.

İçerdiği ana fonksiyonlar:
- `search(query, filter)`: Şarkı, video, albüm, sanatçı arama
- `getHome()`: Ana sayfa raf ve carousel verileri
- `browse(browseId, params)`: Sanatçı, albüm ve playlist sayfaları
- `getLikedSongs()`: Beğenilen şarkılar listesi (`LM`)
- `getLibraryPlaylists()`, `getLibraryArtists()`, `getLibraryAlbums()`: Kullanıcı kütüphanesi
- `getLyrics(videoId)`: Şarkı sözleri

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): `request()` Çağrılarında Oturum Çerezleri (Cookie) ve Authorization Gönderilmiyor
- **Konum**: `desktop/src/main/api/innertube.ts:111-123`
- **Kod**:
  ```ts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://music.youtube.com',
    'Referer': 'https://music.youtube.com/'
  };

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  ```
- **Kök Neden**: Node.js `fetch()` motoru, Electron'un tarayıcı çerezlerini (`session.fromPartition('persist:aquality-music')`) otomatik olarak devralmaz. Kullanıcı uygulamada giriş yapmış olsa dahi, `innertube.ts` tüm istekleri tamamen anonim (misafir) olarak yollar.
- **Etki**:
  - `getLikedSongs()` (`browseId: 'LM'`) çağrısı 401 Unauthorized veya boş döner.
  - `getLibraryPlaylists()`, `getLibraryArtists()`, `getLibraryAlbums()` çağrıları boş liste döner.
  - Kullanıcı kütüphanesini masaüstünde göremez.
- **Düzeltme**:
  ```ts
  import { session } from 'electron';

  private async getSessionCookies(): Promise<string> {
    try {
      const ses = session.fromPartition('persist:aquality-music');
      const cookies = await ses.cookies.get({ url: 'https://music.youtube.com' });
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    } catch {
      return '';
    }
  }

  // request() metodunda:
  const cookieHeader = await this.getSessionCookies();
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }
  ```

---

### Sorun 2 (🟠 YÜKSEK): Ölü `accessToken` Değişkeni
- **Konum**: `desktop/src/main/api/innertube.ts:87, 94`
- **Kod**:
  ```ts
  private accessToken: string | null = null;
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }
  ```
- **Kök Neden**: `main.ts` içinde `youtubeAPI.setAccessToken(googleAuth.getGoogleAccessToken())` şeklinde çağrılmasına rağmen, `this.accessToken` değişkeni `request()` metodunun hiçbir yerinde `Authorization: Bearer ...` olarak başlıklara eklenmemektedir.
- **Etki**: Tanımlanmış OAuth token'ları tamamen boşa gitmektedir.

---

### Sorun 3 (🟠 YÜKSEK): Ağ İsteklerinde Zaman Aşımı (Timeout) ve AbortSignal Yokluğu
- **Konum**: `desktop/src/main/api/innertube.ts:118`
- **Kök Neden**: Yerel Node.js `fetch` çağrısında hiçbir zaman aşımı (`AbortSignal.timeout(...)`) bulunmamaktadır. Ağ kesintisinde veya YouTube sunucusunun yanıt vermediği durumlarda `fetch` çağrısı sonsuza dek askıda kalır ve ilgili IPC çağrısını (ve dolayısıyla arayüzü) kilitler.
- **Düzeltme**:
  ```ts
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000) // 15 saniye zaman aşımı
  });
  ```

---

### Sorun 4 (🟡 ORTA): Dinamik Ayrıştırmada Derin Nesne Gezinme Hataları (Null Safety)
- **Konum**: `desktop/src/main/api/innertube.ts:155-220` (ve browse metotları)
- **Kök Neden**: YouTube Music API'si JSON yanıt formatlarını sıkça güncellemektedir (`musicResponsiveListItemRenderer`, `musicCarouselShelfRenderer`, `musicShelfRenderer`). Kod içerisinde bazı yerlerde `item.musicResponsiveListItemRenderer` denetlenirken, alt flex column'ların boş dizi gelmesi durumunda `undefined` hatası düşmektedir.
- **Düzeltme**: Güvenli `optional chaining` (`?.`) ve yedekli ayrıştırıcı blokları genişletilmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `request()` metoduna `persist:aquality-music` session'ından çerez başlığı (`Cookie: ...`) eklenmelidir.
2. `AbortSignal.timeout(15000)` ile istek kilitlenmeleri önlenmelidir.
3. Ölü `accessToken` temizlenmeli veya uygun Google API isteklerine bağlanmalıdır.
