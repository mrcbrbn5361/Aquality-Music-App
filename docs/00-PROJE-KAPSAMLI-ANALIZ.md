# Aquality Music - Kapsamlı Proje Analizi

> **Tarih:** 16 Eylül 2026  
> **Kapsam:** Tüm platformlar (Desktop, Mobile, Website, Discord Bot)  
> **Toplam Tespit Edilen Sorun:** 47

---

## 📊 Özet Tablosu

| Kategori | Sorun Sayısı | Kritik | Yüksek | Orta | Düşük |
|----------|:---:|:---:|:---:|:---:|:---:|
| [Güvenlik (SEC)](#1---güvenlik-sorunları) | 9 | 3 | 4 | 2 | 0 |
| [Mimari & Kod (ARC)](#2---mimari-ve-kod-sorunları) | 12 | 2 | 5 | 3 | 2 |
| [Performans (PERF)](#3---performans-sorunları) | 7 | 1 | 3 | 2 | 1 |
| [Hata Yönetimi (REL)](#4---hata-yönetimi-ve-kararlılık) | 8 | 1 | 3 | 3 | 1 |
| [Mobil (MOB)](#5---mobil-uygulama-sorunları) | 6 | 1 | 2 | 2 | 1 |
| [CI/CD & Paketleme (OPS)](#6---cicd-ve-paketleme-sorunları) | 3 | 0 | 1 | 1 | 1 |
| [Website (WEB)](#7---website-sorunları) | 2 | 0 | 1 | 1 | 0 |
| **TOPLAM** | **47** | **8** | **19** | **14** | **6** |

---

## 🔴 Kritik Sorunlar (8)

| # | ID | Dosya | Satır | Sorun | Detay |
|---|-----|-------|-------|-------|-------|
| 1 | SEC-001 | `google-credentials.ts` | 1-5 | Boş Google OAuth credential'ları | `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` boş string olarak tanımlı. Authentication başarısız olur. |
| 2 | SEC-003 | `AudioBridge.tsx` | 276 | `originWhitelist={['*']}` | WebView tüm originlere izin veriyor. Güvenlik açığı. |
| 3 | SEC-004 | `AudioBridge.tsx` | 289 | `mixedContentMode="always"` | HTTPS sayfasında HTTP kaynağına izin veriyor. MITM riski. |
| 4 | SEC-005 | `discord.ts` | 1-182 | Discord token doğrudan console'a basılabilir | Bot token'ı process.env'den okunuyor ve log'a basılıyor. Token sızıntısı riski. |
| 5 | ARC-001 | `settings.tsx` | 24 | `autoPlay` store'da tanımsız | `usePlayer()` hook'u `autoPlay` döndürüyor ama `player-store.ts`'te bu alan tanımlı değil. TypeScript compile hatası. |
| 6 | ARC-002 | `settings.tsx` | 95 | `setAutoPlay` fonksiyonu eksik | `playerStore.setAutoPlay(val)` çağrılıyor ama `PlayerStore` sınıfında böyle bir metot yok. Runtime hatası. |
| 7 | PERF-001 | `stream-resolver.ts` | 130 | 250ms interval ile ad-skipping | Her 250ms'de bir reklam kontrolü yapılıyor. Yüksek CPU tüketimi. |
| 8 | MOB-001 | `settings.tsx` | 24, 95 | `autoPlay` eksik mobile store | Settings ekranı `autoPlay` ve `setAutoPlay` kullanıyor ama store'da yok. Build-time hata. |

---

## 🟠 Yüksek Öncelikli Sorunlar (19)

| # | ID | Dosya | Satır | Sorun | Detay |
|---|-----|-------|-------|-------|-------|
| 9 | SEC-002 | `google-oauth.ts` | 153 | XSS: error mesajı HTML'de escape edilmemiş | `${error === 'access_denied' ? ...}` HTML içine doğrudan插入. |
| 10 | SEC-006 | `music-auth.ts` | 346-348 | Cookie dosyası binary tarama | `buf.includes(Buffer.from('LOGIN_INFO'))` büyük dosyalarda yavaş. |
| 11 | SEC-007 | `stream-resolver.ts` | 57-132 | Reklam engelleme scripti content injection | `ADBLOCK_INJECTION_JS` tüm sayfaya inject ediliyor, CSP bypass. |
| 12 | SEC-008 | `main.ts` | 84-94 | URL allowlist eksik | `vercel.app` allowlist'te ama tüm Vercel deployment'ları eşleşiyor. |
| 13 | ARC-003 | `main.ts` | 239 | Hardcoded versiyon | Hakkında mesajı `v1.0.0` diyor ama package.json v1.0.1. |
| 14 | ARC-004 | `preload.ts` | 29-33 | Listener cleanup eksik | `onMaximized`, `onDeeplink`, `onLog`, `onStatusChanged`, `onUpdate` listener'ları temizlenmiyor. Memory leak. |
| 15 | ARC-005 | `main.ts` | 130 | `backgroundMaterial: 'mica' as any` | Type assertion ile bypass ediliyor. Electron API'si stabil değil. |
| 16 | ARC-006 | `main.ts` | 201-250 | Menu her çağrıda yeniden oluşturuluyor | `buildMenu()` her defasında yeni template oluşturuyor. |
| 17 | ARC-007 | `store.ts` | 101-109 | Debounce timer dispose edilmiyor | `debounceTimers` Map'i hiçbir zaman temizlenmiyor. |
| 18 | ARC-008 | `discord.ts` | 61-63 | Connect timeout 3sn ama promise race | Timeout fırlatılıyor ama connectPromise devam ediyor. |
| 19 | ARC-009 | `stream-resolver.ts` | 809-907 | execCmd her seferinde JS string oluşturuyor | Her komut çağrısında büyük bir JavaScript string'i oluşturulup inject ediliyor. |
| 20 | PERF-002 | `music-auth.ts` | 499-641 | Profil çekme için 15sn bekleme | `fetchProfileViaAPI` 15+15=30sn'ye kadar bekleyebilir. |
| 21 | PERF-003 | `stream-resolver.ts` | 566-568 | 800ms polling interval | Her 800ms'de bir tam JS ejeciton. |
| 22 | REL-001 | `main.ts` | 235 | Non-null assertion `mainWindow!` | `mainWindow` destroyed olabilir. |
| 23 | REL-002 | `main.ts` | 309-318 | Bot stop handler'da process null kontrolü eksik | `discordBotProcess.kill()` çağrılıyor ama null kontrolü yok. |
| 24 | REL-003 | `music-auth.ts` | 410-496 | importFromChromeLegacy CDP hata yönetimi | CDP bağlantısı başarısız olursa kullanıcıya anlamlı hata verilmiyor. |
| 25 | REL-004 | `stream-resolver.ts` | 449-456 | Adblock injection hata yönetimi | `executeJavaScript` ve `insertCSS` hataları sessizce yutuluyor. |
| 26 | MOB-002 | `innertube.ts` | 1 | `@react-native-async-storage/async-storage` import | Bu paket `mobile/package.json`'da dependency olarak listelenmemiş. |
| 27 | MOB-003 | `AudioBridge.tsx` | 276 | originWhitelist={'*'} | Tüm URL scheme'lerine izin veriyor. |
| 28 | OPS-001 | `.github/workflows/*` | - | CI'da typecheck sadece desktop | Mobile ve website'da typecheck çalışmıyor. |

---

## 🟡 Orta Öncelikli Sorunlar (14)

| # | ID | Dosya | Satır | Sorun | Detay |
|---|-----|-------|-------|-------|-------|
| 29 | ARC-010 | `main.ts` | 727 | `require('fs')` ve `require('path')` ESM'de çalışmaz | `app.whenReady` içinde `require()` kullanılıyor. |
| 30 | ARC-011 | `music-auth.ts` | 219 | PowerShell komutu satır bazlı | `execSync` ile PowerShell komutu çalıştırılıyor. Injection riski. |
| 31 | ARC-012 | `discord.ts` | 16 | Store instance'ı modül seviyesinde | `discordAppId` store'u global, birden fazla instance kullanılabilir. |
| 32 | PERF-004 | `player-store.ts` | 260-264 | addRecentlyPlayed high-frequency write | Her şarkı değişiminde AsyncStorage'a yazılıyor. |
| 33 | PERF-005 | `stream-resolver.ts` | 710-767 | 5sn boyunca her saniye autoplay deneme | İlk yükleme sonrası 5 kez 1sn aralıkla autoplay deniyor. |
| 34 | PERF-006 | `innertube.ts` | 200-258 | parseSong çok fazla console.log | Her parse çağrısında 2-3 log basılıyor. Production'da yavaşlatıyor. |
| 35 | REL-005 | `main.ts` | 324-431 | Bot start handler token leak riski | Token `discordBotProcess.env`'e yazılıyor ama hata durumunda temizlenmiyor. |
| 36 | REL-006 | `stream-resolver.ts` | 396-404 | pollTimer null kontrolü | `pollTimer` set edildiğinde önceki timer temizlenmiyor. |
| 37 | REL-007 | `music-auth.ts` | 128-136 | migrateDirtyStore sessiz hata | Store migration hataları yutuluyor. |
| 38 | MOB-004 | `player-store.ts` | 340-344 | clearAllCache sadece recent'ı temizliyor | "Tüm önbellek temizle" sadece recent playlist'i temizliyor. |
| 39 | MOB-005 | `innertube.ts` | 24-29 | Search params hardcoded | URL-encode edilmemiş search params'ları. |
| 40 | OPS-002 | `package.json` | - | Root ve desktop version tutarsızlığı | Root package.json version farklı olabilir. |
| 41 | OPS-003 | `desktop/package.json` | - | Duplicate dependency | `discord-rpc` hem root'ta hem desktop'ta var. |
| 42 | WEB-001 | `website/css/style.css` | - | Media query eksik | Tablet boyutu için responsive breakpoint eksik. |

---

## 🟢 Düşük Öncelikli Sorunlar (6)

| # | ID | Dosya | Satır | Sorun | Detay |
|---|-----|-------|-------|-------|-------|
| 43 | PERF-007 | `innertube.ts` | 87 | User-Agent hardcoded | Chrome 126.0.0.0 sabit, zamanla eskiyor. |
| 44 | REL-008 | `discord.ts` | 50-65 | Connect promise resolve çağrılmazsa | Ready event gelmezse promise asılı kalır. |
| 45 | MOB-006 | `AudioBridge.tsx` | 306-307 | Hardcoded player HTML | YouTube Iframe API HTML'i hardcoded, güncelleme zor. |
| 46 | WEB-002 | `website/js/main.js` | - | FAQ accordion memory leak | Event listener'lar temizlenmiyor. |
| 47 | ARC-012 | `music-auth.ts` | 504 | Window oluşturulup hemen loadURL | `fetchProfileViaAPI` her çağrısında yeni BrowserWindow açıyor. |

---

## 📋 Detaylı Sorun Analizleri

Her sorunun detaylı analizi ve çözüm önerileri için aşağıdaki dosyalara bakın:

1. **[SEC-GUVENLIK-SORUNLARI.md](./SEC-GUVENLIK-SORUNLARI.md)** - 9 güvenlik açığı
2. **[ARC-MIMARI-KOD-SORUNLARI.md](./ARC-MIMARI-KOD-SORUNLARI.md)** - 12 mimari/kod sorunu
3. **[PERF-PERFORMANS-SORUNLARI.md](./PERF-PERFORMANS-SORUNLARI.md)** - 7 performans sorunu
4. **[REL-HATA-YONETIMI-SORUNLARI.md](./REL-HATA-YONETIMI-SORUNLARI.md)** - 8 hata yönetimi sorunu
5. **[MOBIL-SORUNLAR.md](./MOBIL-SORUNLAR.md)** - 6 mobil sorun
6. **[CI-CD-SORUNLARI.md](./CI-CD-SORUNLARI.md)** - 3 CI/CD sorunu
7. **[WEB-SORUNLARI.md](./WEB-SORUNLARI.md)** - 2 website sorunu

---

## 🔧 Önerilen Çözüm Sırası

### Aşama 1: Kritik Düzeltmeler (Hemen)
1. `settings.tsx` → `autoPlay` ve `setAutoPlay` tanımını `player-store.ts`'e ekle
2. `AudioBridge.tsx` → `originWhitelist` ve `mixedContentMode` düzelt
3. `google-credentials.ts` → Boş credential'ları handle et (fallback mekanizması)
4. `discord.ts` → Token logging'i kaldır

### Aşama 2: Yüksek Öncelik (Bu Sprint)
1. `preload.ts` → Listener cleanup mekanizması ekle
2. `main.ts` → Versiyon bilgisini package.json'dan oku
3. `main.ts` → Menu singleton pattern'e çevir
4. `stream-resolver.ts` → Ad-skipping interval'ini 500ms'e çıkar
5. `music-auth.ts` → Profil çekme timeout'unu 8sn'ye düşür

### Aşama 3: Orta Öncelik (Sonraki Sprint)
1. `store.ts` → Debounce timer disposal mekanizması
2. `stream-resolver.ts` → execCmd caching mekanizması
3. `player-store.ts` → addRecentlyPlayed debounce
4. CI/CD → Mobile typecheck ekle

### Aşama 4: Düşük Öncelik (Backlog)
1. `innertube.ts` → Console.log'ları production'da kaldır
2. User-Agent rotasyonu
3. Website responsive breakpoint'leri

---

## 📁 Etkilenen Dosyalar

### Desktop Main Process
- `desktop/src/main/main.ts` (8 sorun)
- `desktop/src/main/preload.ts` (1 sorun)
- `desktop/src/main/api/innertube.ts` (2 sorun)
- `desktop/src/main/api/stream-resolver.ts` (7 sorun)
- `desktop/src/main/auth/music-auth.ts` (5 sorun)
- `desktop/src/main/auth/google-oauth.ts` (1 sorun)
- `desktop/src/main/auth/google-credentials.ts` (1 sorun)
- `desktop/src/main/utils/store.ts` (1 sorun)
- `desktop/src/main/utils/discord.ts` (3 sorun)

### Desktop Renderer
- `desktop/src/renderer/components/app.ts` (0 sorun - ayrı analiz gerekli)

### Mobile
- `mobile/src/store/player-store.ts` (3 sorun)
- `mobile/src/api/innertube.ts` (2 sorun)
- `mobile/src/components/AudioBridge.tsx` (3 sorun)
- `mobile/app/(tabs)/settings.tsx` (2 sorun)

### Website
- `website/css/style.css` (1 sorun)
- `website/js/main.js` (1 sorun)

### CI/CD
- `.github/workflows/build-windows.yml` (1 sorun)
- `.github/workflows/build-mac.yml` (1 sorun)
