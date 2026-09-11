# 🔒 03. Kimlik Doğrulama ve Güvenlik

> **Aquality Music Kimlik ve Güvenlik Mimarisi**  
> YouTube Music oturumu, Chromium Client Hints spoofing, OAuth süreçleri ve uygulanan katı güvenlik kontrolleri.

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

## 1. YouTube Music Oturum Mimarisi (`desktop/src/main/auth/music-auth.ts`)

Aquality Music, kullanıcıların YouTube Music kütüphanelerine, beğenilerine ve çalma listelerine erişmek için Electron izole oturum (`persist:music`) mimarisini kullanır.

### 1.1 Google "Güvenli Olmayan Tarayıcı" Korumasını Aşma (Client Hints)
Google, Electron tarayıcılarını varsayılan olarak engellemekte ve "Oturumunuz açılamadı" hatası vermektedir. Aquality Music bu sorunu, gerçek Chromium masaüstü istemcisine ait başlıkları enjekte ederek aşar:

```typescript
ses.webRequest.onBeforeSendHeaders(
  { urls: ['*://*.google.com/*', '*://*.youtube.com/*', '*://*.googleusercontent.com/*'] },
  (details, cb) => {
    const h = details.requestHeaders;
    h['Sec-CH-UA'] = '"Chromium";v="126", "Google Chrome";v="126", "Not.A/Brand";v="8"';
    h['Sec-CH-UA-Mobile'] = '?0';
    h['Sec-CH-UA-Platform'] = '"Windows"';
    h['Accept-Language'] = h['Accept-Language'] || 'tr-TR,tr;q=0.9,en;q=0.8';
    h['X-Client-Data'] = (h as any)['X-Client-Data'] || 'CJW2yQEIpLbJAQimtskBCKmdygEIv6HKAQ==';
    cb({ requestHeaders: h });
  }
);
```

### 1.2 Oturum Durumu ve Çerez Bütünlüğü (Cookie Jar)
- **`LOGIN_INFO`**: Kullanıcının oturum açtığını belirten ana Google çerezidir. Süresi dolmuş (`expirationDate < now`) veya geçersiz değerler elenir.
- **`SAPISID`**: YouTube Music API isteklerinde SHA-1 hash üretimi için zorunludur.
- **Profil Bilgileri**: Giriş yapıldığında `/youtubei/v1/account/account_menu` üzerinden kullanıcının adı, e-posta adresi ve profil fotoğrafı dinamik olarak alınır ve saklanır.

---

## 2. OAuth Güvenliği ve İzolasyon

### 2.1 Google OAuth Client Secret İzolasyonu (`SEC-01`)
- **Tehdit**: OAuth `client_secret` anahtarının Renderer sürecine veya preload üzerinden web dünyasına açılması token sızıntısı riski doğurur.
- **Çözüm**: Tüm OAuth akışı ana süreçte (`google-oauth.ts`) tutulur. Renderer yalnızca yetkilendirme başlatma sinyali gönderir; hiçbir gizli anahtar arayüze sızdırılmaz.

### 2.2 Discord OAuth ve Yerel Dinleyici
- Discord OAuth akışında yerel bir HTTP sunucusu (`localhost:PORT`) dinlemeye alınır.
- Callback URL'inden dönen auth code ana süreçte token ile takas edilir ve güvenli store içine şifrelenerek yazılır.

---

## 3. DOM Güvenliği ve XSS Önleme (`SEC-02`)

Kullanıcıların arama terimleri, çalma listesi isimleri ve YouTube Music sunucularından gelen dinamik metinler doğrudan HTML içine yerleştirilmez:

```typescript
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

Bu fonksiyon; kart başlıkları, arama önerileri, kullanıcı profil isimleri ve oynatma listesi adları oluşturulurken zorunlu olarak uygulanır.

---

## 4. Dış Bağlantı ve Protokol İzolasyonu (`SEC-05`)

Uygulama dışına yönlendirilen tıklamalar (`target="_blank"` veya `shell.openExternal`) `isSafeExternalUrl` süzgecinden geçirilir:

```typescript
function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const allowedHosts = ['music.youtube.com', 'youtube.com', 'accounts.google.com', 'discord.com', 'github.com'];
    return allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}
```
Bu sayede kötü niyetli `javascript:`, `file://` veya `vbscript:` yönlendirmeleri tamamen engellenmiştir.
