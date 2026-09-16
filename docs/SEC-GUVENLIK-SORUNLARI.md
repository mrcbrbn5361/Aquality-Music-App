# Güvenlik Sorunları (SEC)

> **Toplam:** 9 sorun | **Kritik:** 3 | **Yüksek:** 4 | **Orta:** 2

---

## SEC-001: Boş Google OAuth Credential'ları

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `desktop/src/main/auth/google-credentials.ts:1-5` |
| **Kategori** | Kimlik Doğrulama |

### Sorun
```typescript
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
```

`GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` ortam değişkenleri tanımlı değilse boş string olarak döner. Bu durumda:
- `GoogleOAuth.loginGoogle()` fonksiyonu her zaman `{ success: false, error: 'Google bilgileri eksik' }` döner
- Google ile giriş hiçbir zaman çalışmaz
- Kullanıcıya anlamlı bir hata mesajı gösterilmez

### Etki
- Google OAuth entegrasyonu tamamen bozuk
- Kullanıcılar Google hesabıyla giriş yapamaz

### Çözüm
```typescript
// google-credentials.ts
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export function hasGoogleCredentials(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}
```

```typescript
// main.ts - auth:loginGoogle handler'ında
ipcMain.handle('auth:loginGoogle', async () => {
  if (!mainWindow) return { success: false, error: 'Pencere bulunamadı' };
  const config = googleAuth.getGoogleConfig();
  if (!config.clientId || !config.clientSecret) {
    return { 
      success: false, 
      error: 'Google OAuth yapılandırması eksik. Lütfen Ayarlar > Hesap bölümünden Google Client ID ve Secret girin.' 
    };
  }
  // ...
});
```

---

## SEC-002: XSS: Error Mesajı HTML'de Escape Edilmemiş

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/auth/google-oauth.ts:153` |
| **Kategori** | XSS |

### Sorun
```typescript
res.end(`
  <html><body>
    <p>Giriş başarısız — ${error === 'access_denied' ? 'Giriş iptal edildi.' : 'Kod alınamadı'}</p>
    <p style="color:#666;font-size:12px;margin-top:16px">Bu sekmeyi kapatabilirsiniz.</p>
  </body></html>
`);
```

`error` parametresi URL'den geliyor ve HTML içine doğrudan插入. Saldırgan `error` parametresine XSS payload'u ekleyebilir.

### Etki
- OAuth callback sayfasında XSS saldırı riski
- Localhost'ta çalıştığı için düşük ama mevcut risk

### Çözüm
Zaten `escapeHtml` fonksiyonu tanımlı, ama kullanılmıyor:
```typescript
// google-oauth.ts:148-161
if (error || !code) {
  const safeError = error ? escapeHtml(error) : '';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <html><body>
      <p>Giriş başarısız — ${safeError === 'access_denied' ? 'Giriş iptal edildi.' : 'Kod alınamadı'}</p>
    </body></html>
  `);
}
```

---

## SEC-003: WebView originWhitelist={'*'}

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `mobile/src/components/AudioBridge.tsx:276` |
| **Kategori** | WebView Güvenliği |

### Sorun
```tsx
<WebView
  originWhitelist={['*']}
  source={{
    html: PLAYER_HTML,
    baseUrl: 'https://www.youtube.com'
  }}
  mixedContentMode="always"
  // ...
/>
```

`originWhitelist={['*']}` tüm URL scheme'lerine (http://, https://, file://, vb.) izin veriyor. `mixedContentMode="always"` ise HTTPS sayfasında HTTP kaynağına izin veriyor.

### Etki
- MITM (Man-in-the-Middle) saldırısı riski
- Kötü niyetli kaynaklara yönlendirme riski
- YouTube以外 bir kaynak yüklenirse zararlı içerik çalışabilir

### Çözüm
```tsx
<WebView
  originWhitelist={['https://']}
  source={{
    html: PLAYER_HTML,
    baseUrl: 'https://www.youtube.com'
  }}
  mixedContentMode="never"
  // ...
/>
```

---

## SEC-004: mixedContentMode="always"

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `mobile/src/components/AudioBridge.tsx:289` |
| **Kategori** | WebView Güvenliği |

### Sorun
`mixedContentMode="always"` HTTPS sayfasında HTTP kaynaklarına izin verir. Bu, YouTube iframe'inin HTTP üzerinden içerik çekmesine neden olabilir.

### Etki
- İçerik manipülasyonu riski
- Güvensiz HTTP bağlantılara izin

### Çözüm
```tsx
mixedContentMode="never"
```

---

## SEC-005: Discord Token Log'a Basılabilir

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/utils/discord.ts` + `desktop/src/main/main.ts:377-381` |
| **Kategori** | Sızıntı Riski |

### Sorun
```typescript
// main.ts:377-381
const env = {
  ...process.env,
  DISCORD_TOKEN: token,  // Token process.env'e yazılıyor
  ...extraEnv
};
```

Token `process.env`'e yazılıyor. Eğer herhangi bir hata log'unda `process.env` dump edilirse token sızabilir.

Ayrıca `discordBotProcess.stdout`'dan gelen stdout/stderr verileri `discordBotLogs` dizisine ekleniyor ve `mainWindow.webContents.send('bot-server:log', line)` ile renderer'a gönderiliyor.

### Etki
- Token log dosyalarına sızabilir
- Renderer process'e token sızabilir

### Çözüm
```typescript
// Token'ı env'e yazmak yerine, bot'a argüman olarak gönder
const env = {
  ...process.env,
  // DISCORD_TOKEN: token,  // KALDIRILDI
  ...extraEnv
};

// Bot'a token'ı command line argümanı olarak gönder
const extraArgs = ['--token', token];
discordBotProcess = child_process.spawn(cmd, [scriptPath, ...extraArgs], {
  cwd: botDir,
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});
```

---

## SEC-006: Cookie Dosyası Binary Tarama

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/auth/music-auth.ts:346-348` |
| **Kategori** | Performans/Güvenlik |

### Sorun
```typescript
const buf = fs.readFileSync(tmp);
const hasLogin = buf.includes(Buffer.from('LOGIN_INFO')) || buf.includes(Buffer.from('SAPISID'));
```

Chrome cookie dosyası büyük olabilir (10MB+). `readFileSync` ile tam dosya okunup binary tarama yapılıyor.

### Etki
- Uygulama açılışını yavaşlatır
- Büyük dosyalarda bellek sorunu

### Çözüm
```typescript
// Streaming approach - sadece ilk 1MB'ı oku
const MAX_CHECK = 1024 * 1024; // 1MB
const fd = fs.openSync(src, 'r');
const buf = Buffer.alloc(MAX_CHECK);
const bytesRead = fs.readSync(fd, buf, 0, MAX_CHECK, 0);
fs.closeSync(fd);
const hasLogin = buf.slice(0, bytesRead).includes(Buffer.from('LOGIN_INFO')) || 
                  buf.slice(0, bytesRead).includes(Buffer.from('SAPISID'));
```

---

## SEC-007: Reklam Engelleme Scripti Content Injection

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:57-132` |
| **Kategori** | CSP Bypass |

### Sorun
`ADBLOCK_INJECTION_JS` her sayfa yüklenişinde ve `did-start-navigation`'da inject ediliyor. Bu script:
- `window.fetch` override ediyor
- `window.ytInitialPlayerResponse` property override ediyor
- `setInterval` ile 250ms'de reklam kontrolü yapıyor

### Etki
- CSP (Content Security Policy) bypass
- YouTube sayfasının orijinal JavaScript'ini manipüle ediyor
- YouTube'un anti-adblock tespit edebilmesi riski

### Çözüm
Session seviyesindeki ad-block zaten yeterli olabilir. `ADBLOCK_INJECTION_JS` sadece gerekli kısımları içerecek şekilde küçültülebilir:
```typescript
// Sadece fetch override ve player response cleaning yeterli
const ADBLOCK_INJECTION_JS = `(() => {
  if (window.__aq) return;
  window.__aq = true;
  // Sadece fetch override
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('/youtubei/v1/player')) {
        const clone = res.clone();
        const json = await clone.json();
        delete json.adPlacements;
        delete json.playerAds;
        return new Response(JSON.stringify(json), { status: res.status, headers: res.headers });
      }
    } catch {}
    return res;
  };
  // setInterval kaldırıldı - sadece fetch override
})(); 
```

---

## SEC-008: URL Allowlist Eksik

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/main.ts:84-94` |
| **Kategori** | URL Doğrulama |

### Sorun
```typescript
const allowed = [
  'music.youtube.com', 'youtube.com', 'www.youtube.com', 
  'github.com', 'accounts.google.com', 'discord.gg', 'discord.com', 
  'ytimg.com', 'vercel.app'
];
return allowed.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
```

`vercel.app` allowlist'te. Bu, `*.vercel.app` altındaki tüm deploylara izin verir. Kötü niyetli biri kendi Vercel deployment'ını link olarak kullanabilir.

### Etki
- Phishing linkleri açılabilir
- Güvensiz sitelere yönlendirme riski

### Çözüm
```typescript
const allowed = [
  'music.youtube.com', 'youtube.com', 'www.youtube.com', 
  'github.com', 'accounts.google.com', 'discord.gg', 'discord.com', 
  'ytimg.com',
  'aqualitymusic.com', 'www.aqualitymusic.com'  // Sadece kendi domain
];
// vercel.app kaldırıldı
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| SEC-001 | Kolay | 30dk | Yüksek |
| SEC-002 | Kolay | 15dk | Yüksek |
| SEC-003 | Kolay | 5dk | Yüksek |
| SEC-004 | Kolay | 5dk | Yüksek |
| SEC-005 | Orta | 1saat | Yüksek |
| SEC-006 | Orta | 45dk | Orta |
| SEC-007 | Zor | 2saat | Orta |
| SEC-008 | Kolay | 15dk | Orta |
