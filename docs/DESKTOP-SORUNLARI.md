# Desktop (Electron) Sorun Analizi

> **Toplam Sorun:** 50 | **KRITIK:** 6 | **YUKSEK:** 6 | **ORTA:** 19 | **DUSUK:** 19

---

## KRITIK Sorunlar

### DESK-01: Discord Bot Token Plaintext Saklaniyor
- **Dosya:** `desktop/src/main/main.ts:343-354`
- **Kategori:** GUVENLIK
- **Aciklama:** Discord bot token'i `electron-store` uzerinde sifrelenmemis olarak saklaniyor. Dosya sistemi erisimi olan saldirganlar token'i calabilir.
- **Cozum:** `electron.safeStorage` ile sifreleme uygulanmali. Token child process'e env olarak degil, IPC/pipe uzerinden gecirilmeli.

### DESK-02: store:get IPC ile Herhangi Bir Sifreli Veri Okunabilir
- **Dosya:** `desktop/src/main/main.ts:537`
- **Kategori:** GUVENLIK
- **Aciklama:** `ipcMain.handle('store:get')` herhangi bir key kabul ediyor. Kompromize edilmis renderer, `discordBotToken`, `oauthClientSecret`, `googleTokens` gibi hassas verileri okuyabilir. `as any` cast'i TypeScript guvenligini devre disi birakir.
- **Cozum:** Store IPC handler'da whitelist uygulanmali. Hassas key'ler renderer'dan erisilemez olmali.

### DESK-03: Bot REST API Wildcard CORS
- **Dosya:** `desktop/src/main/api/bot-server.ts:88-89, 107-111`
- **Kategori:** GUVENLIK
- **Aciklama:** `Access-Control-Allow-Origin: *` ile herhangi bir web sitesi API'ye istek gonderebilir. Token rastgele uretiliyor ancak port sabit (9863).
- **Cozum:** CORS `http://127.0.0.1:*` ile sinirlandirilmali veya tamamen kaldirilmali.

### DESK-04: CSP unsafe-inline style-src
- **Dosya:** `desktop/src/renderer/index.html:6`
- **Kategori:** GUVENLIK
- **Aciklama:** Content-Security-Policy `style-src 'self' 'unsafe-inline'` iceriyor. `innerHTML` ve inline style kullanimi XSS yuzeyini genisletiyor.
- **Cozum:** `unsafe-inline` kaldirilmali, nonce-based veya class-based stillendirme kullanilmali.

### DESK-05: shell:openExternal localhost Acilabiliyor
- **Dosya:** `desktop/src/main/main.ts:539-547`
- **Kategori:** GUVENLIK
- **Aciklama:** `isSafeExternalUrl` `http://127.0.0.1` ve `http://localhost` izin veriyor. Bu, yerel HTTP endpoint'lerin rastgele acilmasina yol acabilir.
- **Cozum:** Localhost URL'leri guvenli listesinden kaldirilmali.

### DESK-06: Discord Token Child Process'e Env Olarak Geciriliyor
- **Dosya:** `desktop/src/main/main.ts:377-381`
- **Kategori:** GUVENLIK
- **Aciklama:** `DISCORD_TOKEN` environment variable olarak geciriliyor. Process tree, crash dump'lari ve procfs uzerinden gorunur.
- **Cozum:** Token pipe/stdin uzerinden gecirilmeli.

---

## YUKSEK Sorunlar

### DESK-07: sandbox: false
- **Dosya:** `desktop/src/main/main.ts:135-141`
- **Aciklama:** `sandbox: false` renderer'in Node.js erisimi olmasa bile bazi native API'lere erisebilmesine izin veriyor.
- **Cozum:** `sandbox: true` yapilmali.

### DESK-08: Versiyon Uyumsuzlugu (1.0.0 vs 1.0.1)
- **Dosya:** `main.ts:239`, `index.html:386`, `desktop/package.json:3`
- **Aciklama:** package.json 1.0.1 gosterirken About dialog ve settings sayfasi 1.0.0 gosteriyor.
- **Cozum:** `app.getVersion()` ile dinamik versiyon kullanilmali.

### DESK-09: backgroundMaterial 'mica' as any
- **Dosya:** `desktop/src/main/main.ti:130`
- **Aciklama:** `as any` cast'i TypeScript'in bu ozelligin varligini kontrol etmesini engelliyor.
- **Cozum:** Platform kontrolu ile kosullu kullanilmali.

### DESK-10: isDev Guard Bypass Edilebilir
- **Dosya:** `desktop/src/main/main.ts:192-198`
- **Aciklama:** F12 ve Ctrl+Shift+I production'da bloklu ama menu'den hala erisilebilir.
- **Cozum:** Reload menu item'i production'da gizlenmeli.

### DESK-11: Hardcoded Port 9863 Fallback Yok
- **Dosya:** `desktop/src/main/api/bot-server.ts:39`, `main.ts:712`, `app.ts:2392`
- **Aciklama:** Port 3 farkli yerde sabit kodlanmis. Baska uygulama bu portu kullaniyorsa sunucu sessizce basarisiz olur.
- **Cozum:** Port store'dan okunmali ve otomatik fallback uygulanmali.

### DESK-12: discord-rpc Bakimsiz Paket
- **Dosya:** `desktop/package.json:27`
- **Aciklama:** `discord-rpc` v4.0.1 bakimsiz ve guvenlik uyarilari var.
- **Cozum:** `@xhayper/discord-rpc` veya ozel Discord RPC istemcisine gecilmeli.

---

## ORTA Sorunlar

### DESK-13: StoreManager debounceTimers Temizlenmiyor
- **Dosya:** `desktop/src/main/utils/store.ts:56, 101-109`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** `debounceTimers` Map'i timeout handle'lari uretiyor ama `destroy()` metodu yok.
- **Cozum:** `destroy()` metodu eklenmeli, tum timer'lar temizlenmeli.

### DESK-14: StreamResolver.onUpdate Listener Temizlenmiyor
- **Dosya:** `desktop/src/main/main.ts:277-281`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** `streamResolver.onUpdate()` cagriliyor ama donus degeri (unsubscribe) kaydedilmiyor.
- **Cozum:** Unsubscribe fonksiyonu kaydedilmeli ve cleanup handler'larda cagirilmali.

### DESK-15: Tekrarlanan ipcMain.handle Kayitlari
- **Dosya:** `desktop/src/main/main.ts:252-690`
- **Aciklama:** `setupIPC()` birden fazla kez cagrilirsa ayni handler'lar tekrar kaydedilir.
- **Cozum:** `ipcInitialized` guard'i eklenmeli.

### DESK-16: discordRPC.connect() Hata Yutuluyor
- **Dosya:** `desktop/src/main/main.ts:721`
- **Kategori:** HATA-ISLEME
- **Aciklama:** Discord calismiyorsa unhandled rejection olusabilir.
- **Cozum:** try-catch veya `.catch(() => {})` eklenmeli.

### DESK-17: _pauseEnforceInterval Pencere Yok Edildiginde Devam Ediyor
- **Dosya:** `desktop/src/main/api/stream-resolver.ts:778-794`
- **Aciklama:** Interval yok edilmis pencere uzerinde JavaScript calistirmaya calisir.
- **Cozum:** `if (this._destroyed) return;` eklenmeli.

### DESK-18: execCmd Guvensiz Kod Calistirma
- **Dosya:** `desktop/src/main/api/stream-resolver.ts:809-900`
- **Kategori:** GUVENLIK
- **Aciklama:** `JSON.stringify` ile string interpolasyonu kirilgan bir kaliptir.
- **Cozum:** Daha guvenli bir kod calistirma yontemi kullanilmali.

### DESK-19: TVHTML5_SIMPLY_EMBEDDED_PLAYER Kullanimi
- **Dosya:** `desktop/src/main/api/innertube.ts:464-496`
- **Kategori:** GUVENLIK/HUKUKSAL
- **Aciklama:** YouTube kosullarini ihlal edebilir, her an engellenebilir.
- **Cozum:** Fallback mekanizmasi dusunulmeli.

### DESK-20: YouTube API Rate Limiting Yok
- **Dosya:** `desktop/src/main/api/innertube.ts`
- **Kategori:** PERFORMANS
- **Aciklama:** Hizli art arda istekler YouTube tarafindan gecici olarak engellenebilir.
- **Cozum:** Istek kuyrugu veya 429 yanit exponentially backoff eklenmeli.

### DESK-21: parseSong Debug Logging Production'da
- **Dosya:** `desktop/src/main/api/innertube.ts:203, 248`
- **Aciklama:** Her sarki icin console.log cagrisi loglari doldurur ve yavaslatir.
- **Cozum:** Kaldirilmali veya `isDev` kontrolu altina alinmali.

### DESK-22: Chrome Cookie Dosyasi Okuma
- **Dosya:** `desktop/src/main/auth/music-auth.ts:186-196, 333-358`
- **Aciklama:** Chrome SQLite dosyasini dogrudan okumak antivirus uyarilari tetikleyebilir.
- **Cozum:** Dosya tabanli cookie algilama kaldirilmali, yalnizca CDP kullanilmali.

### DESK-23: fetchProfileViaAPI Gizli Pencere Sizintisi
- **Dosya:** `desktop/src/main/auth/music-auth.ts:500-558`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** Her cagriya yeni gizli BrowserWindow olusturuluyor. Hata durumunda finally yok.
- **Cozum:** `finally` blogu ile garanti temizlik veya tek pencere yeniden kullanma.

### DESK-24: Google OAuth HTTP Sunucu Temizlik Eksikligi
- **Dosya:** `desktop/src/main/auth/google-oauth.ts:93-286`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** Rastgele port'ta HTTP sunucusu. `cleanup()` cagirilmazsa sunucu acik kalabilir.
- **Cozum:** `finally` bloguna tasimali.

### DESK-25: app.ts Monolitik Dosya (2636 Satir)
- **Dosya:** `desktop/src/renderer/components/app.ts`
- **Kategori:** BAKIM
- **Aciklama:** Tum renderer mantigi tek dosyada. Test ve debug cok zor.
- **Cozum:** Ayri modullere bolunmeli: player.ts, search.ts, library.ts, settings.ts, discord.ts, queue.ts, auth.ts, playlists.ts

### DESK-26: innerHTML ile Dinamik Veri
- **Dosya:** `desktop/src/renderer/components/app.ts` (cok sayida satir)
- **Kategori:** GUVENLIK/XSS
- **Aciklama:** `innerHTML` kullanimi XSS acigi olusturabilir. Tum user verisi escape edilmeli.
- **Cozum:** Template kutuphanesi veya guvenli DOM olusturma yontemi kullanilmali.

### DESK-27: Event Listener Birikme
- **Dosya:** `desktop/src/renderer/components/app.ts:727-767`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** `attachSongEvents` her yuklemede cagriliyor. Ayni elementlere listener yiginiyor.
- **Cozum:** Event delegation kullanilmali.

### DESK-28: Discord Status Interval Temizlenmiyor
- **Dosya:** `desktop/src/renderer/components/app.ts:2335`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** `setInterval` sonsuz calisiyor, temizlik yok.
- **Cozum:** Interval ID kaydedilmeli, uygun zamanda temizlenmeli.

### DESK-29: ADBLOCK_INJECTION_JS 250ms Polling
- **Dosya:** `desktop/src/main/api/stream-resolver.ts:102-131`
- **Kategori:** PERFORMANS
- **Aciklama:** 250ms'de bir DOM taramasi CPU tuketiyor.
- **Cozum:** MutationObserver veya buyuk aralik ile polling.

---

## DUSUK Sorunlar

### DESK-30: store.get Defaults Donusu
- **Dosya:** `desktop/src/main/utils/store.ts:62-68`
- **Aciklama:** `defaults[key]` tanimsiz donebilir.
- **Cozum:** Tum key'ler icin default deger tanimlanmali.

### DESK-31: requestPlayer Timeout Yok
- **Dosya:** `desktop/src/main/api/innertube.ts:484-488`
- **Aciklama:** YouTube player API takilirsa istek sonsuz bekler.
- **Cozum:** `AbortSignal.timeout()` eklenmeli.

### DESK-32: mainWindow Null Assertion
- **Dosya:** `desktop/src/main/main.ts:235`
- **Aciklama:** `mainWindow!` null olabilir.
- **Cozum:** Null kontrolu eklenmeli.

### DESK-33: Volume Negatif/Ustu
- **Dosya:** `desktop/src/renderer/components/app.ts:2109-2126`
- **Aciklama:** Volume 0-100 disinda deger alabilir.
- **Cozum:** `Math.max(0, Math.min(100, ...))` ile sinirlandirilmali.

### DESK-34: Date.now() Geriye Gitme
- **Dosya:** `desktop/src/renderer/components/app.ts:920`
- **Aciklama:** NTP senkronizasyonu ile `Date.now()` geriye gidebilir.
- **Cozum:** `performance.now()` kullanilmali.

### DESK-35: Discord OAuth Sabit Port 65432
- **Dosya:** `desktop/src/main/auth/discord-oauth.ts:38`
- **Aciklama:** Port baska uygulama tarafindan isgal edilebilir.
- **Cozum:** Port 0 ile rastgele atama yapilmali.

### DESK-36: logout() hide() Calistiriyor
- **Dosya:** `desktop/src/main/auth/music-auth.ts:732`
- **Aciklama:** Pencere gizleniyor ama yok edilmiyor.
- **Cozum:** `destroy()` kullanilmali.

### DESK-37: Settings Versiyon Sabit
- **Dosya:** `desktop/src/renderer/index.html:386`
- **Aciklama:** `v1.0.0` sabit kodlanmis.
- **Cozum:** Dinamik versiyon kullanilmali.

### DESK-38: prefers-color-scheme Fallback Yok
- **Dosya:** `desktop/src/renderer/styles/main.css`
- **Aciklama:** CSS'te `@media (prefers-color-scheme)` fallback'i yok.
- **Cozum:** Fallback media query eklenmeli.

### DESK-39: Discord Bot UI Elementleri Eksik
- **Dosya:** `desktop/src/renderer/components/app.ts:2381-2389`
- **Aciklama:** DOM elementleri `index.html`'de yok, fonksiyon calismaz.
- **Cozum:** Elementler eklmeli veya olum kod kaldirilmali.

### DESK-40: showContextMenu innerHTML Kirilgan
- **Dosya:** `desktop/src/renderer/components/app.ts:1683-1691`
- **Aciklama:** Kullanici verisi eklenirse XSS acigi olusur.
- **Cozum:** `textContent` kullanilmali.

### DESK-41: discordBotProcess Listener Birikme
- **Dosya:** `desktop/src/main/main.ts:391-407`
- **Aciklama:** stdout/stderr listener'lari temizlenmiyor.
- **Cozum:** Mevcut listener'lar kaldirilmali.

### DESK-42: visitorData Hiyerarsisi
- **Dosya:** `desktop/src/main/api/innertube.ts:89, 118`
- **Aciklama:** `visitorData` hic set edilmiyor, olu kod.
- **Cozum:** Kaldirilmali veya uygulanmali.

### DESK-43: UUID Token Gelistirme
- **Dosya:** `desktop/src/main/providers/auth-provider.ts:9`
- **Aciklama:** `randomUUID()` kriptografik olarak yeterli degil.
- **Cozum:** `crypto.randomBytes(32).toString('hex')` kullanilmali.

### DESK-44: tsconfig noUnusedLocals Yok
- **Dosya:** `desktop/tsconfig.main.json`
- **Aciklama:** Kullanilmayan degiskenler yakalanmaz.
- **Cozum:** `"noUnusedLocals": true` eklenmeli.

### DESK-45: tsconfig Renderer noEmit Eksik
- **Dosya:** `desktop/tsconfig.json`
- **Aciklama:** Vite derleme yaparken tsconfig emission denemesi yaniltici.
- **Cozum:** `"noEmit": true` eklenmeli.

### DESK-46: installer.nsh Cache Silme
- **Dosya:** `desktop/installer.nsh:22-24`
- **Aciklama:** Varsayilan path disindaki veriler de silinebilir.
- **Cozum:** Path dogrulamasi yapilmali.

### DESK-47: discord-bot Extra Resource Yolu
- **Dosya:** `desktop/package.json:59-65`
- **Aciklama:** `../scripts/discord-bot/` yoksa build basarisiz olabilir.
- **Cozum:** Build dogrulamasi eklenmeli.

### DESK-48: @ts-ignore CDP Import
- **Dosya:** `desktop/src/main/auth/music-auth.ts:8`
- **Aciklama:** Tur tanimi olmayan paket icin `@ts-ignore`.
- **Cozum:** `.d.ts` dosyasi olusturulmali.

### DESK-49: LRCLIB Harici HTTP Istege Gece Veri
- **Dosya:** `desktop/src/main/api/innertube.ts:832-866`
- **Aciklama:** Sarki bilgisi ucuncu tarafa gonderiliyor, riza yok.
- **Cozum:** Kullaniciya bilgilendirme veya opt-in ozelligi.

### DESK-50: saveQueueTimer Temizlenmiyor
- **Dosya:** `desktop/src/renderer/components/app.ts:250-262`
- **Aciklama:** Kapanis sirasinda timer calisarak store'a yazabilir.
- **Cozum:** `beforeunload` handler'inda temizlenmeli.
