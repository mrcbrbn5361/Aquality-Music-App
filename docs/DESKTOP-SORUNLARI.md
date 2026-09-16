# Desktop Uygulaması - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** Electron (Vite + TypeScript)  
> **Toplam Sorun:** 28  
> **Önem Dereceleri:** Yüksek: 3 | Orta: 10 | Düşük: 15  
> **Durum:** Çözülen: 12 | Açık: 16

---

## 🔴 KRİTİK - ÇÖZÜLMÜŞ SORUNLAR

### ~~D-001: Google OAuth HTML'de XSS Açığı~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/google-oauth.ts` |
| **Durum** | ✅ Çözüldü — `escapeHtml()` fonksiyonu eklendi (satır 12-16) |

### ~~D-002: Discord Bot Token Düz Metin Olarak Saklanıyor~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/store.ts` |
| **Durum** | ✅ Çözüldü — Token güvenli şekilde saklanıyor |

### ~~D-003: Discord Bot Token Ortam Değişkeni Sızıntısı~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Durum** | ✅ Çözüldü — Token güvenli aktarım sağlanıyor |

### ~~D-005: Chrome Cookie Dosyası Kilitleme Olmadan Okunuyor~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Durum** | ✅ Çözüldü — Geçici dosya ile güvenli okuma |

### ~~D-006: Chrome Client Hints Taklidi~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Durum** | ✅ Çözüldü — Taklit riski kabul edildi, dokümante edildi |

---

## 🔴 YÜKSEK - AÇIK SORUNLAR

### D-004: Bot REST API'sinde Kimlik Doğrulama Yok
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/bot-server.ts` |
| **Satır** | 88, 99 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** HTTP sunucusu `127.0.0.1:9863` adresine `Access-Control-Allow-Origin: *` ile bağlanıyor. Yerel process'ler veya tarayıcı sekmeleri (fetch ile) oturum açmadan tam uygulama durumunu okuyabilir veya eylem tetikleyebilir.

**Ek Sorun:** Token karşılaştırması `!==` ile yapılıyor — timing attack'e karşı savunmasız. `crypto.timingSafeEqual` kullanılmalı.

**Çözüm:** Rastgele bir API token oluşturulmalı ve her istekte doğrulanmalı:
```typescript
const apiToken = crypto.randomBytes(32).toString('hex');
// Her istekte: if (req.headers.authorization !== `Bearer ${apiToken}`) return 401;
```

---

### D-007: Auth Clients Bridge Uyumsuzluğu
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2306-2307, 2344 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Renderer process `(api as any).authClients.list()` ve `(api as any).discordAuth.getUser()` çağrısı yapıyor ama preload bridge'de bu namespace'ler tanımlı olmayabilir. `main.ts:661-663`'te IPC handler'ları `auth:clients`, `auth:createClient`, `auth:revokeClient` olarak tanımlı — bridge uyumsuzluğu runtime crash'e neden olabilir.

**Çözüm:** Preload bridge'de `authClients` ve `discordAuth` namespace'leri doğru şekilde expose edilmeli.

---

### D-008: Electron Sürümü Eski
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 35 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Electron `28.3.3` kullanılıyor. Güncel sürüm 33+'dır. Eski sürümler bilinen güvenlik açıkları içerebilir.

**Çözüm:** Electron sürümü en son kararlı sürüme (33+) güncellenmeli.

---

## 🟡 ORTA - AÇIK SORUNLAR

### D-009: Sürüm Tutarsızlığı
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts:239`, `desktop/src/renderer/index.html:386` |
| **Satır** | 239, 386 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `package.json: "version": "1.0.1"` ama `main.ts:239: 'Aquality Music v1.0.0'` ve `index.html:386: v1.0.0` yazıyor. 3 farklı sürüm numerasyonu var.

**Çözüm:** Tüm dosyalarda `package.json`'dan okunan dinamik sürüm kullanılmalı.

---

### D-010: Chrome User-Agent Eski Sürüm
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 21 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `Chrome/126.0.0.0` hardcoded. Chrome güncellendikçe Google'ın anti-bot tespitini tetikleyebilir.

**Çözüm:** Dinamik UA veya periyodik güncelleme mekanizması.

---

### D-011: Google OAuth Token Yenileme Eksik Kontrol
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/google-oauth.ts` |
| **Satır** | 306-310 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `refreshGoogleToken` fonksiyonunda `data.expires_in` kontrolü yok — Google refresh response'unda `expires_in` eksik gelirse `NaN` olarak ayarlanır.

**Çözüm:**
```typescript
if (data.expires_in) {
  tokens.expires_at = Date.now() + (data.expires_in * 1000);
}
```

---

### D-012: Store Type Safety Kaybı
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/store.ts` |
| **Satır** | 19-37 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `StoreData` arayüzü `discordButtons`, `discordThumbnails` alanlarını içermiyor ama `main.ts:637-638`'de bu anahtarlar `as any` ile okunuyor.

**Çözüm:** `StoreData` arayüzüne eksik alanlar eklenmeli.

---

### D-013: CSP WebSocket Eksik
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/index.html` |
| **Satır** | 6 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Discord entegrasyonu `wss://gateway.discord.gg` kullanıyor olabilir ama CSP'de sadece `https://discord.com` var.

**Çözüm:** `connect-src`'e `wss://gateway.discord.gg` eklenmeli.

---

### D-014: Boş catch Blokları
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` ve diğerleri |
| **Satır** | Birden fazla |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Hatalar sessizce yutuluyor. En azından `console.error` çağrılmalı.

---

### D-015: Gereksiz require() Kullanımı
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts` |
| **Satır** | 727 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `require('fs').existsSync(...)` ve `require('path').join(...)` kullanılıyor, oysa `fs` ve `path` dosyanın başında zaten import edilmiş.

---

### D-016: Sabit Partition Yerine Sabit String Kullanımı
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/stream-resolver.ts` |
| **Satır** | 578 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `'persist:aquality-music'` sabit string'i kullanılıyor, export edilen `MUSIC_PARTITION` sabiti yerine.

---

### D-017: Light Tema Kartlara Uygulanmıyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/styles/main.css` |
| **Satır** | 669, 679 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `.card { background: #181818; }` ve `.card:hover { background: #282828; }` sabit hex değerleri CSS değişkenlerini göz ardı ediyor.

---

## 🔵 DÜŞÜK - AÇIK SORUNLAR

### D-018: Discord Durum setInterval'ı Temizlenmiyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2335 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `setInterval(() => {...}, 15000)` süresiz çalışıyor. Renderer yeniden yüklenirse eski interval GC'ye kadar kalıyor.

---

### D-019: Debounce Timer'ları Quit Sırasında Temizlenmiyor
| | |
|---|---|
| **Dosya** | `desktop/src/main/utils/store.ts` |
| **Satır** | 56, 104 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `debounceTimers` Map'i aktif `setTimeout` handle'larını saklıyor. Uygulama debounce sırasında kapanırsa timer callback'i temizlikten sonra çalışır.

---

### D-020: fetchProfileViaAPI'de Gizli BrowserWindow Sızıntısı
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/music-auth.ts` |
| **Satır** | 504-558 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Profil çekme için bir BrowserWindow oluşturuluyor ama `win.destroy()` yalnızca bir kod yolunda çağrılıyor. `executeJavaScript` ulaşmadan önce hata verirse pencere sızıntısı oluşur.

---

### D-021: Debug Log'lar
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/innertube.ts` |
| **Satır** | 203, 248, 596, 665 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `[parseSong]` debug log'ları üretim kodunda bırakılmış, stdout'u kirletiyor.

---

### D-022: Renderer Debug Log'ları Ana Sürece Gönderiyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 69-75 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `dlog()` her debug mesajını IPC aracılığıyla ana süreç stdout'una gönderiyor. Üretimde performans ve bilgi sızıntısı.

---

### D-023: Kullanılmayan 7zip-bin Bağımlılığı
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 25 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `"7zip-bin": "^5.2.0"` bağımlılığı kaynak kodunda hiçbir yerde import edilmiyor.

---

### D-024: Kullanılmayan @types/ws Bağımlılığı
| | |
|---|---|
| **Dosya** | `desktop/package.json` |
| **Satır** | 36 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `@types/ws` devDependencies'de var ama `ws` hiçbir yerde kullanılmıyor.

---

### D-025: Tekrarlanan session Import'u
| | |
|---|---|
| **Dosya** | `desktop/src/main/api/stream-resolver.ts` |
| **Satır** | 2, 577 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `session` dosyanın başında import edilmiş ama `fetchAccountProfile` içinde dinamik `import('electron')` ile tekrar import ediliyor.

---

### D-026: Beğeni Değişiminde Tüm DOM Taraması
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 1582-1588 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `$$('.like-btn').forEach(...)` her beğeni değişiminde tüm DOM'daki beğenme butonlarını tarıyor.

---

### D-027: Büyük Liste Oluşturma için innerHTML
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 690, 1861, 1998 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Büyük HTML stringleri ile `innerHTML` kullanımı tam yeniden ayırmaya neden oluyor.

---

### D-028: Yinelenen Ses Seviyesi IPC Çağrısı
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 1191, 1193 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `api.player.setVolume(...)` `playSong` içinde aynı değerle iki kez çağrılıyor.

---

### D-029: login.css Kullanılmıyor
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/styles/login.css` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** 293 satırlık CSS dosyası `index.html`'de import edilmiyor.

---

### D-030: init() DOMContentLoaded'da Çağrılıyor ama Modül Ertelemeli
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2635 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `document.addEventListener('DOMContentLoaded', init)` — `type="module"` ile ES modülleri ertelenir, DOMContentLoaded script çalıştırılana kadar ateşlenmiş olabilir.

---

### D-031: Bot ile İlgili DOM Elementleri Mevcut Değil
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 2381-2390 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `#discordBotServerStatus`, `#discordBotProcessStatus`, `#btnStartDiscordBot` vb. referansları — bunların hiçbiri `index.html`'de mevcut değil.

---

### D-032: btnStartWelcome Referansı Mevcut Değil
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts` |
| **Satır** | 414 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `$('#btnStartWelcome')` sorgulanıyor ve olay dinleyicisi ekleniyor, ancak bu element `index.html`'de mevcut değil.

---

## Özet Tablosu

| # | Sorun | Önem | Durum | Dosya | Satır |
|---|-------|------|-------|-------|-------|
| D-004 | API kimlik doğrulama yok | 🔴 YÜKSEK | Açık | bot-server.ts | 88, 99 |
| D-007 | Auth clients bridge uyumsuzluğu | 🔴 YÜKSEK | Açık | app.ts | 2306-2307, 2344 |
| D-008 | Eski Electron sürümü | 🔴 YÜKSEK | Açık | package.json | 35 |
| D-009 | Sürüm tutarsızlığı | 🟡 ORTA | Açık | main.ts, index.html | 239, 386 |
| D-010 | Chrome UA eski sürüm | 🟡 ORTA | Açık | music-auth.ts | 21 |
| D-011 | Token yenileme eksik kontrol | 🟡 ORTA | Açık | google-oauth.ts | 306-310 |
| D-012 | Store type safety kaybı | 🟡 ORTA | Açık | store.ts | 19-37 |
| D-013 | CSP WebSocket eksik | 🟡 ORTA | Açık | index.html | 6 |
| D-014 | Boş catch blokları | 🟡 ORTA | Açık | main.ts | birden fazla |
| D-015 | Gereksiz require() | 🟡 ORTA | Açık | main.ts | 727 |
| D-016 | Sabit partition string | 🟡 ORTA | Açık | stream-resolver.ts | 578 |
| D-017 | Light tema eksik | 🟡 ORTA | Açık | main.css | 669, 679 |
| D-018 | Interval temizlenmiyor | 🔵 DÜŞÜK | Açık | app.ts | 2335 |
| D-019 | Debounce timer sızıntısı | 🔵 DÜŞÜK | Açık | store.ts | 56, 104 |
| D-020 | BrowserWindow sızıntısı | 🔵 DÜŞÜK | Açık | music-auth.ts | 504-558 |
| D-021 | Debug log'lar | 🔵 DÜŞÜK | Açık | innertube.ts | 203,248,596,665 |
| D-022 | Debug IPC | 🔵 DÜŞÜK | Açık | app.ts | 69-75 |
| D-023 | Ölü 7zip-bin | 🔵 DÜŞÜK | Açık | package.json | 25 |
| D-024 | Ölü @types/ws | 🔵 DÜŞÜK | Açık | package.json | 36 |
| D-025 | Tekrarlanan session import | 🔵 DÜŞÜK | Açık | stream-resolver.ts | 2, 577 |
| D-026 | DOM taraması | 🔵 DÜŞÜK | Açık | app.ts | 1582-1588 |
| D-027 | innerHTML kullanımı | 🔵 DÜŞÜK | Açık | app.ts | 690,1861,1998 |
| D-028 | Yinelenen IPC | 🔵 DÜŞÜK | Açık | app.ts | 1191, 1193 |
| D-029 | Kullanılmayan login.css | 🔵 DÜŞÜK | Açık | login.css | - |
| D-030 | DOMContentLoaded zamanlaması | 🔵 DÜŞÜK | Açık | app.ts | 2635 |
| D-031 | Ölü DOM referansları | 🔵 DÜŞÜK | Açık | app.ts | 2381-2390 |
| D-032 | Ölü btnStartWelcome | 🔵 DÜŞÜK | Açık | app.ts | 414 |
