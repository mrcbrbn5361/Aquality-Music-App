# Desktop Uygulaması - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** Electron (Vite + TypeScript)  
> **Toplam Sorun:** 40  
> **Önem Dereceleri:** Kritik: 6 | Yüksek: 5 | Orta: 19 | Düşük: 10

---

## 🔴 KRİTİK - Güvenlik Sorunları

### D-001: Google OAuth HTML'de XSS Açığı
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/google-oauth.ts` |
| **Satır** | 147, 218, 233 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** Kullanıcı tarafından kontrol edilen veriler (`error`, `user.name`, `err.message`) HTML stringlerine kaçış yapılmadan doğrudan yerleştiriliyor. Google hesap adı `<script>` tagleri içeren bir saldırgan, XSS saldırısı gerçekleştirebilir.

**Örnek:**
```typescript
// Güvensiz
res.send(`<h1>${user.name}</h1>`)  // user.name: "<script>alert('xss')</script>"
```

**Çözüm:** HTML entity encoding uygulanmalı:
```typescript
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
res.send(`<h1>${escapeHtml(user.name)}</h1>`)
```

---

### D-002: Discord Bot Token Düz Metin Olarak Saklanıyor
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/store.ts` |
| **Satır** | 36 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `discordBotToken` electron-store JSON'da düz metin olarak saklanıyor. Makine ele geçirilirse token kolayca çıkarılabilir.

**Çözüm:** Token PCM (Platform Cryptography Module) veya electron's `safeStorage` API ile şifrelenmeli:
```typescript
import { safeStorage } from 'electron';
const encrypted = safeStorage.encryptString(token);
store.set('discordBotToken', encrypted.toString('base64'));
```

---

### D-003: Discord Bot Token Ortam Değişkeni Sızıntısı
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Satır** | 371-374 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** Bot token child process'e `process.env.DISCORD_TOKEN` aracılığıyla aktarılıyor. Makinedeki herhangi bir process bu değeri okuyabilir.

**Çözüm:** Token child process'e `fork` options ile veya IPC kanalı üzerinden güvenli şekilde aktarılmalı.

---

### D-004: Bot REST API'sinde Kimlik Doğrulama Yok
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/bot-server.ts` |
| **Satır** | 82-84 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** HTTP sunucusu `127.0.0.1:9863` adresine `Access-Control-Allow-Origin: *` ile bağlanıyor. Yerel process'ler veya tarayıcı sekmeleri (fetch ile) oturum açmadan tam uygulama durumunu okuyabilir veya eylem tetikleyebilir.

**Çözüm:** Rastgele bir API token oluşturulmalı ve her istekte doğrulanmalı:
```typescript
const apiToken = crypto.randomBytes(32).toString('hex');
// Her istekte: if (req.headers.authorization !== `Bearer ${apiToken}`) return 401;
```

---

### D-005: Chrome Cookie Dosyası Kilitleme Olmadan Okunuyor
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 191-192 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `fs.readFileSync` Chrome'un `Cookies` SQLite veritabanını Chrome yazırken okuyor. Bu bozulmaya veya eksik veri okumaya neden olabilir.

**Çözüm:** Okumadan önce Chrome'un durdurulması kontrol edilmeli veya dosya kopyalanarak okunmalı.

---

### D-006: Chrome Client Hints Taklidi
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 67-73 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** Sabit `Sec-CH-UA` ve `X-Client-Data` header'ları gerçek bir Chrome tarayıcısını taklit ediyor. Bu Google'ın güvenlik kontrollerini kasıtlı olarak aldatıyor ve ToS ihlali olabilir.

---

## 🟠 YÜKSEK - Tip Güvenliği ve Doğruluk

### D-007: `@ts-ignore` ile Tip Kontrolü Devre Dışı
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 8 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `// @ts-ignore` ifadesi `chrome-remote-interface` import'u için tüm tip güvenliğini devre dışı bırakıyor.

---

### D-008: music-auth.ts'de Güvenli Olmayan `as any` Dönüşümleri
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 102, 130, 142, 299 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Store ve CDP client üzerinde birden fazla `as any` dönüşümü gerçek tip hatalarını gizliyor.

---

### D-009: discord-rpc Tip Tanımında EventEmitter Eksik
| | |
|---|---|
| **Dosya** | `desktop/src/main/types/discord-rpc.d.ts` |
| **Satır** | 2 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `Client extends EventEmitter` ifadesi kullanılıyor ama `EventEmitter` import edilmemiş veya tanımlanmamış. Bu temel sınıf için örtük `any'ye` neden oluyor.

---

### D-010: Tanımsız IPC İşleyicileri
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Satır** | 626, 281 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `discord:setActivity` işleyicisi `data` parametresini `any` olarak alıyor. `bot-server:update-state` içindeki `partial` parametresi de tanımsız.

---

### D-011: Renderer `$()` Yardımcı Fonksiyonu Güvensiz
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 119 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `document.querySelector(sel) as HTMLElement` ifadesi null kontrolü olmadan dönüşüm yapıyor. Element mevcut değilse `.addEventListener` çağrısı hata verir.

---

## 🟡 ORTA - Bellek Sızıntıları ve Kaynak Yönetimi

### D-012: Enjekte Edilen Ad-Block Interval'ı Temizlenmiyor
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/stream-resolver.ts` |
| **Satır** | 102-131 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** YouTube Music sayfasına enjekte edilen 250ms `setInterval` hiçbir zaman temizlenmiyor. Birden fazla sayfa yüklenirse interval'lar birikir.

---

### D-013: Discord Durum setInterval'ı Temizlenmiyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2335 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `setInterval(() => {...}, 15000)` süresiz çalışıyor. Renderer yeniden yüklenirse eski interval GC'ye kadar kalıyor.

---

### D-014: Çoklu Yedek Temizleyici İşleyicileri
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Satır** | 152-158, 730-736, 738-746 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `streamResolver.destroy()`, `discordRPC.disconnect()`, `discordBotProcess.kill()` ve `botServer.stop()` hem `window-all-closed`, hem `before-quit`, hem `mainWindow.on('closed')` içinde çağrılıyor. Çift temizlik için koruma yok.

---

### D-015: Debounce Timer'ları Quit Sırasında Temizlenmiyor
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/store.ts` |
| **Satır** | 56, 104 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `debounceTimers` Map'i aktif `setTimeout` handle'larını saklıyor. Uygulama debounce sırasında kapanırsa timer callback'i temizlikten sonra çalışır.

---

### D-016: fetchProfileViaAPI'de Gizli BrowserWindow Sızıntısı
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 504 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Profil çekme için bir BrowserWindow oluşturuluyor ama `win.destroy()` yalnızca bir kod yolunda çağrılıyor. `executeJavaScript` ulaşmadan önce hata verirse pencere sızıntısı oluşur.

---

## 🟡 ORTA - Sabit Değerler ve Eski Kod

### D-017: Sabit YouTube Music İstemci Sürümü
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/innertube.ts:17`, `desktop/src/main/api/stream-resolver.ts:595` |
| **Satır** | 17, 595 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `clientVersion: '1.20250801.00.00'` sabit kodlanmış. YouTube eski sürümden gelen istekleri reddedebilir.

---

### D-018: Sabit Chrome User-Agent Sürümü
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 21 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `Chrome/126.0.0.0` sabit kodlanmış. Chrome güncellendikçe giderek şüpheli görünecek.

---

### D-019: Sabit Discord OAuth Portu
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/discord-oauth.ts` |
| **Satır** | 38 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `OAUTH_PORT = 65432` sabit kodlanmış. Başka bir uygulama bu portu kullanırsa Discord girişi hata verir.

---

### D-020: Sabit Discord Application ID
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/discord.ts` |
| **Satır** | 11 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `DISCORD_APP_ID = '1547602880427724841'` çalışma zamanında yapılandırılabilir değil.

---

## 🟡 ORTA - Kod Kalitesi

### D-021: Ölü Bağımlılık: `7zip-bin`
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 25 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `"7zip-bin": "^5.2.0"` bağımlılığı kaynak kodunda hiçbir yerde import edilmiyor.

---

### D-022: Kullanılmayan Dev Bağımlılık: `@types/ws`
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 36 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `@types/ws` devDependencies'de var ama `ws` hiçbir yerde kullanılmıyor.

---

### D-023: Tekrarlanan `session` Import'u
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/stream-resolver.ts` |
| **Satır** | 2, 577 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `session` dosyanın başında import edilmiş ama `fetchAccountProfile` içinde dinamik `import('electron')` ile tekrar import ediliyor. Dinamik import gereksiz.

---

### D-024: Sabit Partition Yerine Sabit String Kullanımı
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/stream-resolver.ts` |
| **Satır** | 578 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `'persist:aquality-music'` sabit string'i kullanılıyor, export edilen `MUSIC_PARTITION` sabiti yerine.

---

### D-025: Boş catch Blokları (`catch {}`)
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` ve diğerleri |
| **Satır** | 75, 155-158, 168, 232, 344, 538 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Hatalar sessizce yutuluyor. En azından `console.error` çağrılmalı.

---

### D-026: ES Importlarının Yanında `require()` Kullanımı
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Satır** | 716 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `require('fs').existsSync(...)` ve `require('path').join(...)` kullanılıyor, oysa `fs` ve `path` dosyanın başında zaten import edilmiş.

---

### D-027: Üretim Kodunda Debug console.log İfadeleri
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/innertube.ts` |
| **Satır** | 203, 248, 596, 665 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `[parseSong]` debug log'ları üretim kodunda bırakılmış, stdout'u kirletiyor.

---

### D-028: Renderer Debug Log'ları Ana Sürece Gönderiyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 69-75 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `dlog()` her debug mesajını IPC aracılığıyla ana süreç stdout'una gönderiyor. Üretimde performans開销 ve bilgi sızıntısı.

---

### D-029: Birden Fazla Yerde Sabit Sürüm Dizeleri
| | |
|---|---|
| **Dosya** | `bot-server.ts:42`, `index.html:385`, `main.ts:235` |
| **Satır** | 42, 385, 235 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Üç farklı sürüm dizgesi: `'1.0.1'`, `v1.0.0`, `v1.0.0`. `package.json`'dan sapabilir.

---

### D-030: Light Tema Kartlara Uygulanmıyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/styles/main.css` |
| **Satır** | 669, 679 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `.card { background: #181818; }` ve `.card:hover { background: #282828; }` sabit hex değerleri CSS değişkenlerini göz ardı ediyor.

---

## 🔵 DÜŞÜK - Performans

### D-031: Beğeni Değişiminde Tüm DOM Taraması
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 1582-1588 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `$$('.like-btn').forEach(...)` her beğeni değişiminde tüm DOM'daki beğenme butonlarını tarıyor.

---

### D-032: Büyük Liste Oluşturma için innerHTML
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 690, 1861, 1998 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Büyük HTML stringleri ile `innerHTML` kullanımı tam yeniden ayırmaya neden oluyor.

---

### D-033: Yinelenen Ses Seviyesi IPC Çağrısı
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 1191, 1193 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `api.player.setVolume(...)` `playSong` içinde aynı değerle iki kez çağrılıyor.

---

## 🔵 DÜŞÜK - Mimari Sorunlar

### D-034: Ayarlar Sayfası HTML Yapısında Hata
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/index.html` |
| **Satır** | 250 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** "Otomatik Oynatma" ayar satırının `</div>` kapanışı eksik. "Reklam Engelleyici" grubu hâlâ açık olan `Oynatma` grubu içinde açılıyor.

---

### D-035: `login.css` Kullanılmıyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/styles/login.css` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** 293 satırlık CSS dosyası `index.html`'de import edilmiyor. Ayrıca `:root` değişkenlerini yeniden tanımlıyor.

---

### D-036: `init()` DOMContentLoaded'da Çağrılıyor ama Modül Ertelemeli
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2635 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `document.addEventListener('DOMContentLoaded', init)` — `type="module"` ile ES modülleri ertelenir, bu nedenle DOMContentLoaded script çalıştırılana kadar ateşlenmiş olabilir.

---

### D-037: Bot ile İlgili DOM Elementleri Mevcut Değil
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2381-2390 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `#discordBotServerStatus`, `#discordBotProcessStatus`, `#btnStartDiscordBot` vb. referansları — bunların hiçbiri `index.html`'de mevcut değil. `setupDiscordBot()` fonksiyonu ölü DOM'u referans alıyor.

---

### D-038: `btnStartWelcome` Referansı Mevcut Değil
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 414 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `$('#btnStartWelcome')` sorgulanıyor ve olay dinleyicisi ekleniyor, ancak bu element `index.html`'de mevcut değil.

---

### D-039: NSIS Installer Kullanıcı Verilerini Kaldırma Sırasında Siliyor
| | |
|---|---|
| **Dosya** | `desktop/installer.nsh` |
| **Satır** | 22-24 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `RMDir /r "$APPDATA\Aquality Music\Cache"` ifadesi kaldırma sırasında önbelleği siliyor, ancak `package.json`'daki `deleteAppDataOnUninstall: false` bu niyeti çelişiyor.

---

### D-040: discord-bot extraResource Mevcut Olmayabilir
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 60-66 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `from: "../scripts/discord-bot/"` extraResource olarak dahil edilmiş. Build ortamında `scripts/discord-bot` dizini mevcut değilse `electron-builder` başarısız olur.

---

## Özet Tablosu

| # | Sorun | Önem | Dosya | Satır |
|---|-------|------|-------|-------|
| D-001 | XSS OAuth HTML'de | 🔴 KRİTİK | google-oauth.ts | 147,218,233 |
| D-002 | Token düz metin saklama | 🔴 KRİTİK | store.ts | 36 |
| D-003 | Token ortam değişkeni sızıntısı | 🔴 KRİTİK | main.ts | 371-374 |
| D-004 | API kimlik doğrulama yok | 🔴 KRİTİK | bot-server.ts | 82-84 |
| D-005 | Cookie dosyası kilitleme yok | 🔴 KRİTİK | music-auth.ts | 191-192 |
| D-006 | Chrome taklidi | 🔴 KRİTİK | music-auth.ts | 67-73 |
| D-007 | @ts-ignore | 🟠 YÜKSEK | music-auth.ts | 8 |
| D-008 | unsafe as any | 🟠 YÜKSEK | music-auth.ts | 102,130,142,299 |
| D-009 | EventEmitter eksik | 🟠 YÜKSEK | discord-rpc.d.ts | 2 |
| D-010 | Tanımsız IPC | 🟠 YÜKSEK | main.ts | 626, 281 |
| D-011 | null kontrolü yok | 🟠 YÜKSEK | app.ts | 119 |
| D-012 | Interval temizlenmiyor | 🟡 ORTA | stream-resolver.ts | 102-131 |
| D-013 | Discord interval temizlenmiyor | 🟡 ORTA | app.ts | 2335 |
| D-014 | Çift temizlik | 🟡 ORTA | main.ts | 152-158,730-746 |
| D-015 | Debounce timer sızıntısı | 🟡 ORTA | store.ts | 56,104 |
| D-016 | BrowserWindow sızıntısı | 🟡 ORTA | music-auth.ts | 504 |
| D-017 | Sabit client versiyonu | 🟡 ORTA | innertube.ts | 17 |
| D-018 | Sabit Chrome UA | 🟡 ORTA | music-auth.ts | 21 |
| D-019 | Sabit OAuth portu | 🟡 ORTA | discord-oauth.ts | 38 |
| D-020 | Sabit Discord App ID | 🟡 ORTA | discord.ts | 11 |
| D-021 | Ölü 7zip-bin | 🟡 ORTA | package.json | 25 |
| D-022 | Ölü @types/ws | 🟡 ORTA | package.json | 36 |
| D-023 | Tekrarlanan session import | 🟡 ORTA | stream-resolver.ts | 2,577 |
| D-024 | Sabit partition string | 🟡 ORTA | stream-resolver.ts | 578 |
| D-025 | Boş catch blokları | 🟡 ORTA | main.ts | birden fazla |
| D-026 | Gereksiz require() | 🟡 ORTA | main.ts | 716 |
| D-027 | Debug log'lar | 🟡 ORTA | innertube.ts | 203,248,596,665 |
| D-028 | Debug IPC | 🟡 ORTA | app.ts | 69-75 |
| D-029 | Sürüm tutarsızlığı | 🟡 ORTA | birden fazla | - |
| D-030 | Light tema eksik | 🟡 ORTA | main.css | 669,679 |
| D-031 | DOM taraması | 🔵 DÜŞÜK | app.ts | 1582-1588 |
| D-032 | innerHTML kullanımı | 🔵 DÜŞÜK | app.ts | 690,1861,1998 |
| D-033 | Yinelenen IPC | 🔵 DÜŞÜK | app.ts | 1191,1193 |
| D-034 | HTML yapıs hatası | 🔵 DÜŞÜK | index.html | 250 |
| D-035 | Kullanılmayan login.css | 🔵 DÜŞÜK | login.css | - |
| D-036 | DOMContentLoaded zamanlaması | 🔵 DÜŞÜK | app.ts | 2635 |
| D-037 | Ölü DOM referansları | 🔵 DÜŞÜK | app.ts | 2381-2390 |
| D-038 | Ölü btnStartWelcome | 🔵 DÜŞÜK | app.ts | 414 |
| D-039 | Installer veri silme | 🔵 DÜŞÜK | installer.nsh | 22-24 |
| D-040 | Eksik extraResource | 🔵 DÜŞÜK | package.json | 60-66 |
