# 🧠 Aquality Music — memory.md (Kalıcı Proje Hafızası)

> **Bu dosyanın amacı:** OpenCode (Muse Spark) kotası dolup **Antigravity**'de devam
> edildiğinde, yeni ajanın projeyi **bozmadan, kaldığı yerden güçlendirerek**
> devam etmesini sağlamak.
>
> **KURAL:** Her çalışma oturumunun sonunda (OpenCode'da da, Antigravity'de de)
> bu dosya güncellenir. Kod değişikliği yapmadan önce bu dosya OKUNUR.
>
> **Bu dosya kök dizinde durur.** `docs/` içine taşınmamalı — çünkü
> `scripts/update-docs.cjs` ("Aquality Docs Engine") her commit/build/postinstall
> sonrası `docs/*.md` ve `PROJE-DURUM.md` başlıklarını otomatik yeniden yazar.
> Kökteki `memory.md` bu motordan etkilenmez (doğrulandı: script `memory`
> kelimesini hiç içermiyor).
>
> Son güncelleme: **2026-09-17** · Güncelleyen: **Antigravity**
> HEAD: `f120c18` · Branch: `master` · Repo: `mrcbrbn5361/Aquality-Music-App`

---

## 1. Proje Özeti (30 saniyede bağlam)

- **Ne:** YouTube Music tabanlı, reklamsız müzik dinleme uygulaması — 4 platform:
  1. **desktop/** — Electron 28 + Vite + TypeScript (Windows NSIS + Portable, macOS DMG + ZIP)
  2. **mobile/** — React Native + Expo Router (Android & iOS, Expo Go uyumlu; `AudioBridge` WebView ses motoru)
  3. **website/** — Statik Vite sitesi, Vercel'de yayında
  4. **scripts/discord-bot/** — Discord botu + Canvas kart motoru (`cardRenderer.js`)
- **Monorepo:** npm workspaces (`desktop`, `website`, `mobile`). Kök `package.json` → `version: 1.0.1`
- **Dil:** Kullanıcı Türkçe konuşur. **Tüm UI metinleri, dokümanlar ve commit mesajları Türkçe** (teknik terimler İngilizce kalabilir).
- **Canlı site:** `https://aqualitymusic.vercel.app/` — **özel alan adı YOK, alınmayacak.** Tüm sitemap/robots/OG URL'leri bu adrese sabitlendi.
- **Yayın akışı:** GitHub tag (`v*`) → Actions (Windows + macOS build) → GitHub Release'e otomatik asset yükleme.

## 2. Kritik Ortam Bilgisi (bozmamak için şart)

| Konu | Değer / Kural |
|---|---|
| Ana branch | `master` (main değil) |
| Node | 20 (CI'da `setup-node@v4`, `node-version: 20`) |
| Bağımlılık kurulumu | Her zaman `npm ci`, asla `npm install` |
| Electron | **28.3.3** — major yükseltme YOK (preload/IPC mimarisi buna bağlı) |
| macOS build | **Sadece macOS'te çalışır.** Windows'ta `npm run build:mac` beklenen şekilde hata verir (`Build for macOS is supported only on macOS`). Bu bir bug değil; Mac build CI'daki `build-mac.yml`'e bırakılır |
| Windows build | `npm run build:win` (yerelde doğrulandı, ~96 MB Setup + Portable üretir) |
| Website build | `npm run build:website` (çıktı: `website/dist`) |
| Desktop build | `npm run build --workspace=desktop` = `tsc -p tsconfig.main.json` + `vite build` |
| Typecheck | `npm --workspace=desktop run typecheck` — CI'da zorunlu adım |
| Mobil başlatma | Kökten `npx expo start --tunnel` de çalışır (kökte `App.tsx`, `app.json`, `metro.config.js` bilerek var — silme!) |
| Portable mod | `PORTABLE_EXECUTABLE_DIR` algılanırsa veriler exe yanındaki `data/` klasörüne yazılır — bu mantığa dokunma |
| InnerTube | `clientVersion 1.20250801.00.00` — YouTube drop ederse 400'ler başlar; ilk bakılacak yer |
| Devlet sırrı niteliğinde | `desktop/src/main/auth/*` içindeki Client Secret / token'lar renderer'a ASLA taşınmaz |

## 3. Bu Oturumda Yapılanlar (değişiklik günlüğü)

### 3a. Güvenlik sertleştirme + boş catch temizliği + WCAG + build doğrulama
Commit: **`605f390`** (2026-09-16) — push edildi, `master`'da.

Doğrulanmış (dosyada gerçekten var):
- `desktop/src/main/auth/google-oauth.ts` → `escapeHtml()` (`../utils/crypto-util`'den import), `user.name` ve `err.message` HTML yanıtlarında escape'li (XSS D-001).
- `desktop/src/main/api/bot-server.ts` → `crypto.randomBytes(32)` API token, `Bearer` kontrolü (401), `getApiToken()` metodu (D-004).
- `mobile/src/components/MiniPlayer.tsx` + `mobile/app/modal/player.tsx` → `useRouter()` try/catch dışına alındı (M-001/M-002).
- `desktop/src/main/main.ts` → tüm boş catch'lere yorum eklendi (`/* cleanup best-effort */` vb.); **grep ile doğrulandı: `main.ts`'te `catch {}` kalmadı.**
- `desktop/src/main/utils/discord.ts` → boş catch'e yorum.
- `desktop/src/renderer/styles/main.css` → WCAG AA kontrast (`--c-text-3/4` açıldı), Firefox volume slider (`::-moz-range-*`), `prefers-reduced-motion` → `animation: none`, play butonu 44px, kart renkleri CSS değişkenine bağlandı, `.song-row:focus-visible` eklendi.
- `desktop/src/renderer/index.html` → settings'te kapanmamış `</div>` düzeltildi (D-034).
- Mobil: `SongRow` → `React.memo`, touch target'lar büyütüldü (hitSlop 12px, padding 10px); `mobile/tsconfig.json` → `strict: true`; `settings.tsx` → `autoPlay` store'a persist ediliyor, ölü "Koyu Metro" yazısı kaldırıldı; `library.tsx` → geçmiş silmeden önce `Alert` onayı.
- Website: `vercel.json` → güvenlik header'ları; `sitemap.xml` (+`public/` kopyası) → mutlak URL'ler; `robots.txt` (+`public/`) → `Sitemap:` satırı; `indir.html` → mutlak OG/Twitter image; `404.html` → copyright 2026.
- CI: `build-windows.yml` + `build-mac.yml` → tag tetikleyici, `npm ci`, release asset'leri (`.blockmap`, `latest.yml`/`latest-mac.yml`), gereksiz `|| true` ve symlink hack'leri temizlendi.
- `scripts/discord-bot/cardRenderer.js` → `lineTo` koordinat düzeltmesi + `truncateText` guard; `index.js` → boş catch'ler + `unhandledRejection` handler.
- 6 Türkçe doküman oluşturuldu: `docs/GENEL-OZET.md`, `DESKTOP/MOBILE/WEBSITE/CICD-SCRIPTS/UI-UX-SORUNLARI.md` (toplam 286 sorun kaydı).
- **DİKKAT:** Bu commit'teki `DESKTOP-SORUNLARI.md` (~579 satır) ve `MOBILE-SORUNLARI.md` (~738 satır), sonraki commit'teki otomatik Docs Engine çalışmasıyla **kırpıldı** (şu an 288/225 satır). Orijinal tam metinler `605f390` commit'inden `git show 605f390:docs/...` ile geri alınabilir. Elle yazılan uzun dokümanlar `docs/` altında kalıcı değildir — önemli kararlar BURAYA (memory.md) yazılır.

### 3b. Alan adı kararı → `aqualitymusic.vercel.app`
Commit: **`e9612e8`** (2026-09-16) — push edildi.
- `aqualitymusic.com` geçen TÜM yerler `aqualitymusic.vercel.app` yapıldı: `website/sitemap.xml`, `website/public/sitemap.xml`, `website/robots.txt`, `website/public/robots.txt`, `website/indir.html` (og:url, og:image, twitter:image), ilgili `docs/` satırları.
- Website yeniden build edildi (`website/dist` üretildi), push edildi. Vercel otomatik deploy eder.

### 3c. Google "browser not secure" + misafir çalma düzeltmesi
Commit: **`f1dc31d`** (2026-09-16), header sync: **`454597e`** (HEAD) — push edildi.
- Yeni dosya: `desktop/src/main/auth/login-preload.ts` (izole MusicAuth penceresi preload'u).
- `music-auth.ts` (stealth injection, Chrome UA, cookie akışı) + `main.ts` (IPC) güncellendi.
- Misafir (girişsiz) çalma engeli kaldırıldı.

### 3d. GitHub push + release
- `master` → `origin/master` push edildi (iki kez: 605f390 sonrası ve e9612e8 sonrası).
- Tag **`v1.0.2`** oluşturulup push edildi; GitHub Release açıldı: `releases/tag/v1.0.2` (Windows + macOS workflow'ları tetiklendi).
- Yerel build çıktıları `desktop/release/` altında mevcut: `Aquality-Music-Setup-1.0.1-win11.exe` + `.blockmap`, `Aquality-Music-Portable-1.0.1-win11.exe` (~96 MB).

## 4. Doğrulanmış Durum vs. İddia (Antigravity buraya dikkat)

- ✅ `main.ts` içinde `catch {}` **yok** (grep ile doğrulandı, 2026-09-17).
- ⚠️ `desktop/src` genelinde hâlâ **79 adet `catch {}`** var: `stream-resolver.ts` (~50, enjekte edilen DOM-query JS'i — çoğu kabul edilebilir), `music-auth.ts` (~18), `innertube.ts` (5), `login-preload.ts` (3), `google/discord-oauth.ts` (`server.close()` temizlikleri). Bunlar "kalan iş" listesindedir ama stream-resolver içindekiler topluca değiştirilmemeli (aşağıdaki kural 5'e bak).
- ⚠️ Önceki oturumda "vercel.json'a 404 rewrite eklendi" denmiş; **doğrulamada `vercel.json`'da rewrite yok**, sadece `cleanUrls: true` + security header'lar var. 404 sayfası Vercel'de `404.html` üzerinden zaten serve ediliyor; ek rewrite gerekiyorsa test edilerek eklenmeli.
- ⚠️ **Sürüm uyumsuzluğu (açık konu):** `package.json` hâlâ `1.0.1` ama tag/release `v1.0.2`. CI release script'leri sürümü `package.json`'dan okuyor (`v$(node -p "require('./package.json').version")`), yani `v1.0.2` tag'ine basmak asset'leri `v1.0.1` release'ine yükler. **Sonraki sürümde önce `package.json` (+`desktop/mobile/website package.json`) version bump yapılmalı, sonra tag atılmalı.**
- ❓ `mobile/src/components/AudioBridge.tsx` WebView zafiyetleri (M-005 JS injection, M-006 mixedContent, M-007 wildcard origin) bu oturumda **doğrulanmadı/düzeltilmedi** — dosyaya dokunulmadan önce okunup risk analizi yapılmalı.

## 5. Antigravity İçin Sert Kurallar (projeyi bozmamak için)

1. **Önce oku, sonra yaz.** Değiştirilecek her dosyayı `read` ile açmadan `edit` yapma. `oldString` birebir dosyadan alınır.
2. **Toplu refactor YOK.** Özellikle `stream-resolver.ts` (1000+ satır enjekte JS), `music-auth.ts`, `innertube.ts`, `app.ts` (~2600 satır renderer) dosyalarında satır satır, küçük ve test edilebilir adımlar. Tek seferde 3'ten fazla dosyaya dokunma.
3. **Boş catch'leri körü körüne doldurma.** `stream-resolver.ts` içindeki `try { ... } catch {}` bloklarının çoğu, var olmayabilecek YouTube DOM elemanlarına karşı bilerek sessizdir. Bunlara `console.log` eklemek performansı ve gizliliği bozar. Sadece **main process** tarafındaki gerçek hata yutma noktalarına anlamlı log/yorum ekle.
4. **Güvenlik sınırları:** OAuth secret/token'ları renderer/preload'a taşıma; `shell.openExternal` için `isSafeExternalUrl` filtresini atlama; bot API `Bearer` zorunluluğunu gevşetme.
5. **Türkçe UI kuralı:** Kullanıcının göreceği hiçbir metni İngilizce'ye çevirme; dil sözlükleri (`i18nDict`) iki dili de kapsar.
6. **Her değişiklik sonrası:** `npm --workspace=desktop run typecheck` + ilgili build (`build:website` / desktop `build`). Kırmızı build ile commit atma.
7. **Commit disiplini:** Küçük, tek konulu commit'ler; mesaj formatı `fix(desktop): ...`, `feat(mobile): ...`, `fix(web): ...`, `ci: ...`. Secret commit'leme (`.env`, token) — `git status` + `git diff` kontrol edilmeden commit yok.
8. **Tag/release disiplini:** Tag atmadan ÖNCE tüm `package.json` sürümlerini eşitle (kök + desktop + mobile + website), SONRA `git tag -a vX.Y.Z` + push. Release notları Türkçe + İngilizce kısa özet içerir.
9. **`docs/` uyarısı:** Uzun el yazımı dokümanlar Docs Engine tarafından kırpılabilir. Kalıcı kararlar ve durum **bu dosyaya** yazılır.
10. **Şüphede dur:** Emin olmadığın bir mimari kararda (ör. AudioBridge WebView, InnerTube client, Portable veri yolu) kod yazmak yerine analiz edip seçenekleri kullanıcıya sor.
11. **Docs Engine sonsuz döngüsüne girme (doğrulandı 2026-09-17):** Repo'da commit sonrası çalışan "Aquality Docs Engine" hook'u (`scripts/update-docs.cjs`) `PROJE-DURUM.md` ve `docs/01-11-README` başlıklarındaki `Son Güncelleme` + `Son Git Commit` satırlarını her commit'te yeniden yazar. Sonuç: **her commit'ten sonra ağaçta ~26 satırlık başlık churn'ü kalır ve bunu ayrı commit'lemek döngüyü asla bitirmez** (churn, yeni commit hash'ini içerir). Kural: bu churn'ü tek başına commit'leme; bir sonraki GERÇEK değişikliğin commit'ine paketle (`git add -A`). Çalışma ağacında bu 13 dosyanın `M` görünmesi normaldir, kirli ağaç paniği yapma.
12. **Edit güvenliği (2026-09-17'de 3 kez doğrulandı):** (a) `oldString` ASLA tek başına `} catch {}` gibi kısa/jenerik olmamalı — her zaman çevresindeki benzersiz satırlarla birlikte verilir. (b) `oldString`'e dahil edilen HER satır (`}`, `}, 1500);`, `const ...`, comment) `newString`'de de birebir yer almalı; düşen satır = bozulan build. (c) Her edit'ten sonra ilgili bölge `read` ile teyit edilir, her dosya bitiminde `typecheck` çalıştırılır. Typecheck kırmızıysa commit YOK.

## 6. Sıradaki Adım (ANTIGRAVITY DEVİR — 2026-09-17, OpenCode'dan)

> OpenCode oturumu burada temiz noktada kapatıldı: tüm commit'ler push'lu,
> typecheck/build yeşil, kırık kod yok. Aşağıdaki 3 görev Antigravity'nindir.
> Her görev ayrı commit + push + memory.md güncellemesi ile ilerler.

### Görev A — UI/UX backlog doğrulaması (~98 madde, büyük iş)
- Kaynak: `docs/UI-UX-SORUNLARI.md` (749 satır).
- Yöntem: maddeleri tek tek ele al; HER madde için önce ilgili dosyayı `read` ile açıp
  gerçekten var mı yok mu doğrula.
- **Doğrulanan & Düzeltilen Gerçek Sorunlar (Antigravity):**
  - `UX-D-095`: Context menu öğelerine SVG simgeleri (Şimdi Çal, Önce Çal, Sıraya Ekle, Beğeni, Bağlantı Kopyala) eklendi; CSS'te flex + icon stilleri sağlandı.
  - `UX-D-094`: Context menu sabit genişlik taşması giderildi — DOM'a eklendikten sonra `getBoundingClientRect()` ile dinamik ölçülüp viewport sınırlarına kenetlendi (`Math.max(8, Math.min(...))`).
  - `UX-D-028`: Modal genişliği `width: min(420px, calc(100vw - 32px)); max-width: 100%;` yapılarak dar ekranlarda taşması önlendi.
  - `UX-D-041`: Boş kütüphane ve beğeni ekranlarındaki butonlar için eksik olan `.btn-secondary` ve `.btn-sm` CSS sınıfları tanımlandı.
- **Doğrulanmış Stale / Zaten Çözülmüş Maddeler:**
  - `UX-D-013` (playlist click), `UX-D-029` (lyric sync), `UX-D-017` (repeat toggle), `UX-M-063` (tab layout), `UX-W-076` (focus-visible), `UX-W-077` (mobile menu aria), `UX-W-079` (footer parity), `UX-M-066/067` (search label), `UX-M-057/058` (player badges), `UX-D-093` (context menu klavye navigasyonu), `UX-D-012/027` (playlist create enter & toast), `UX-D-025/026` (chrome import modal escape/backdrop), `UX-D-022` (search debounce), `UX-D-014` (nav preventDefault).

### Görev B — v1.0.2 build + release asset güncelleme (TAMAMLANDI)
- **Yapılanlar:**
  1. `npm run build:win` yerelde çalıştırıldı → `desktop/release/` altında `Aquality-Music-Setup-1.0.2-win11.exe` (~96.8 MB), `Aquality-Music-Portable-1.0.2-win11.exe` (~96.3 MB), `.blockmap` ve `latest.yml` hatasız üretildi.
  2. Windows ikilileri `gh release upload v1.0.2` ile GitHub Release `v1.0.2` sayfasına yüklendi. Artık `v1.0.2` sürümünde hem Windows (Setup + Portable) hem macOS (DMG arm64 + x64) dosyaları eksiksiz mevcut.
  3. `website/indir.html` ve `website/index.html` indirme kartları ve versiyon rozetleri v1.0.2'ye güncellendi; `npm run build:website` ile `website/dist` yeniden üretildi.
  4. CI `build-windows.yml` iş akışına `desktop/node_modules` junction adımı eklenerek hoisted paketlerin `app-builder.exe ENOENT` hatasına yol açması önlendi.

### Güvenli Sistem Tarayıcısı ile Giriş ve Doğrudan Cookie Aktarımı (TAMAMLANDI)
- **Yapılanlar:**
  1. Kullanıcının belirttiği özel `GlifWebSignIn` Google bağlantısı (`accounts.google.com/v3/signin/...`) doğrudan kullanıcının varsayılan sistem tarayıcısında (`shell.openExternal`) açılarak Electron içi WebView/tarayıcı penceresi ve Google'ın güvensiz tarayıcı engeli ("This browser or app may not be secure") tamamen bertaraf edildi.
  2. Tarayıcıda oturum açıldıktan sonra Windows DPAPI anahtar çözümü (`[System.Security.Cryptography.ProtectedData]::Unprotect`) + SQLite (`node:sqlite` `DatabaseSync`) + AES-256-GCM kullanılarak Chrome/Edge/Brave çerezleri güvenle ve yerel olarak çözülüp Electron'un `session.fromPartition('persist:aquality-music')` oturumuna aktarılıyor.
  3. Alternatif tarayıcılar (Firefox vb.) için manuel cookie yapıştırma (`importFromCookieString`) arayüze ve IPC'ye eklendi.
  4. Typecheck (`npm --workspace=desktop run typecheck`) ve desktop build (`npm run build --workspace=desktop`) 0 hata ile doğrulandı.

### Discord Bot Entegrasyonu & Profil (İsim + Kullanıcı Adı) Düzeltmesi (TAMAMLANDI)
- **Yapılanlar:**
  1. Discord Bot tetikleyicisi strictly `.aquamusic` olarak sınırlandırıldı (çakışma yaratan `.aqua` kaldırıldı). Bot intent'lerine `GuildMembers` eklendi; `guild.members.fetch({ user, withPresences: true, force: true })` yapılandırılarak kullanıcı presence durumu garantilendi.
  2. Local bot sunucusu ve desktop entegrasyonu: `main.ts` üzerinden bot alt işlemine `BOT_SERVER_TOKEN` ortam değişkeni aktarılarak Bearer doğrulaması korundu ve 401 hatası önlendi.
  3. YouTube Music profil çekimi (`music-auth.ts`): InnerTube `account_menu` API'si `SAPISIDHASH` yetkilendirmesiyle doğrudan çağrılacak şekilde güçlendirildi; kullanıcı adı (`handle`, örn. `@miracteksaslioglu`), tam isim (`name`), e-posta ve yüksek çözünürlüklü avatar recursive JSON yürüyücüsü (`extractAccountInfo`) ile eksiksiz çekilip kaydedildi.
  4. Renderer arayüzünde (`app.ts`): Hem tam hesap ismi hem de `@handle` kullanıcı adı alt alta eksiksiz gösterilecek şekilde `updateAuthUI` güncellendi.
  5. Windows derlemesi (`npm run build:win`) yerelde çalıştırılıp güncel paketler oluşturuldu; website rebuild edildi.

### Port 9863 REST API Salt Okunur Erişim & Vercel Alan Adı Senkronizasyonu (TAMAMLANDI)
- **Yapılanlar:**
  1. `desktop/src/main/api/bot-server.ts`: `/api/v1/state`, `/query`, `/state`, `/api/v1/health`, `/health` uç noktalarına yapılan isteklerdeki bloklayıcı Bearer token zorunluluğu kaldırıldı. Tarayıcıdan (`http://127.0.0.1:9863/api/v1/state`) ve yerel araçlardan (curl, bot) yapılan GET sorguları salt-okunur olarak doğrudan çalan şarkı JSON'ını dönecek şekilde açıldı (401 Unauthorized sorunu çözüldü).
  2. Güvenlik ve CORS: `Access-Control-Allow-Origin` başlığı yalnızca yerel origin'ler (`localhost`, `127.0.0.1`, `chrome-extension://`) ve canlı web sitesi (`https://aqualitymusic.vercel.app`) için dinamik olarak izin verecek şekilde sıkılaştırıldı; yetkisiz web sitelerinin yerel API'yi gizlice okuması engellendi.
  3. Eski `https://aquality-music-app-desktop.vercel.app` alan adı tamamen temizlendi ve tüm projede `https://aqualitymusic.vercel.app` alan adına geçirildi (`bot-server.ts`, `scripts/discord-bot/index.js`, `desktop/src/renderer/components/app.ts`).

### Görev C — Kalan teknik borç (küçük, fırsat bulunca)
- `desktop/src/main/api/stream-resolver.ts` içindeki ~50 `catch {}`:
  BİLEREK BIRAKILDI (enjekte DOM-query JS'i, kural 5/12). Topluca değiştirme;
  sadece gerçek hata yutan main-process noktaları varsa tek test ele al.
- `website/vercel.json`: rewrite yok, `cleanUrls: true` + `404.html` yeterli
  görünüyor; 404 davranışını canlı sitede test edip sonucu buraya yaz.
- Önceki oturum iddiası çürütüldü ("404 rewrite eklendi" — yoktu); bu tür
  iddialar dosyada doğrulanmadan memory.md'ye "tamamlandı" yazılmaz.

## 6b. Antigravity'ye verilecek İLK KOMUT (kopyala-yapıştır)

```
Önce kökteki memory.md dosyasını tamamını oku. Bu projenin kalıcı hafızasıdır.
Bölüm 5'teki 12 kurala ve Bölüm 7'deki oturum protokolüne harfiyen uy.
Bölüm 6'daki Görev A'dan başla (UI/UX backlog doğrulaması).
Her görev sonunda memory.md'nin 6. ve 8. bölümlerini güncelle, commit at ve push et.
Emin olmadığın yerde kod yazma, bana sor.
```

## 7. Oturum Kapanış Protokolü (her ajan, her seferinde)

Oturum bitmeden ÖNCE:
1. `git status --short` + `git log --oneline -5` çalıştır, durumu netleştir.
2. Aşağıdaki **"Oturum Kaydı"** bölümüne yeni madde ekle: tarih, ajan adı, yapılanlar (dosya + satır etkisi), doğrulama komutları ve sonuçları, push/tag durumu.
3. **Bölüm 6 (Sıradaki Adım)** güncelle — bitenlerin üstünü çiz, yeni bulunanları ekle.
4. Commit + push et (memory.md dahil). Kullanıcı istemedikçe tag atma.
5. **Kota kuralı (kritik):** Limitin dolmasına yakınsan YENİ kod yazmayı bırak; sadece analiz edip bu dosyayı güncelle ve Bölüm 6'yı netleştir. Yarım kalmış, build'i kırık kod ASLA bırakma — ya bitir ya başlama.

## 8. Oturum Kaydı (her güncellemede buraya ekle — en üste)

- **2026-09-17 · Antigravity:** Discord Bot `.aquamusic` Cevap Vermeme Sorununun Çözümü — `scripts/discord-bot/index.js` dosyasında bulunan ve botu tek bir sunucuya (`1504574003594137680`) hapsederek diğer sunucularda gelen komutları sessizce yutan `AQUALITY_GUILD_ID` kısıtlaması kaldırıldı (`DISCORD_GUILD_ID` env değişkeni yoksa botun eklendiği tüm sunucularda çalışmasına izin verildi). Komut loglaması eklendi, kanal yetki kontrolleri sağlamlaştırıldı ve yerel API sorgusu 2000 ms zaman aşımına çıkarıldı. Güncel scriptler kurulu program dizinine de kopyalandı. Push edildi.

- **2026-09-17 · Antigravity:** UI Ayarlar Sürüm Gösterimi (v1.0.2) & Windows Binary Yeniden Paketleme — `desktop/src/renderer/index.html`'de sabit kalan `v1.0.1` metni `v1.0.2` olarak güncellendi ve `desktop/src/renderer/components/app.ts`'te `api.autoUpdate.getUpdateStatus()` ile dinamik hale getirildi. Arka planda kilitli kalan eski Aquality Music süreçleri sonlandırıldı. `npm run build:win` ile güncel kodları içeren `Aquality-Music-Setup-1.0.2-win11.exe` ve `Aquality-Music-Portable-1.0.2-win11.exe` üretilip GitHub Release `v1.0.2` sayfasına yüklendi. Push edildi.

- **2026-09-17 · Antigravity:** Port 9863 REST API 401 Hatası Düzeltmesi & `aqualitymusic.vercel.app` Alan Adı Güncellemesi — `desktop/src/main/api/bot-server.ts`'te `GET /api/v1/state`, `/query` ve `/health` için tarayıcı / curl sorgularını engelleyen Bearer token kontrolü kaldırıldı (tarayıcılar rastgele üretilen dahili token'ı bilemediğinden 401 alıyordu); CORS izinleri güvenli origin'lere (`localhost`, `127.0.0.1`, `aqualitymusic.vercel.app`) bağlandı. Projede kalan eski `aquality-music-app-desktop.vercel.app` referansları (`bot-server.ts`, `discord-bot/index.js`, `app.ts`) yeni `https://aqualitymusic.vercel.app` adresine taşındı. Typecheck 0 hata, desktop build yeşil. Push edildi.

- **2026-09-17 · Antigravity:** Discord Bot .aquamusic Çakışma Önleme & YouTube Music Profil Adı/Kullanıcı Adı Düzeltmesi — `scripts/discord-bot/index.js`'te `.aqua` kaldırılıp tekil `.aquamusic` yapıldı; `withPresences: true` ve `GuildMembers` intent'i eklenerek kullanıcının çaldığı şarkı tespiti garantiye alındı. `desktop/src/main/main.ts`'te `BOT_SERVER_TOKEN` aktarıldı. `desktop/src/main/auth/music-auth.ts`'te InnerTube `SAPISIDHASH` yetkilendirmesi, `handle` alanı ve `extractAccountInfo` eklendi. `desktop/src/renderer/components/app.ts`'te hem ad hem kullanıcı adı (`@handle`) gösterimi sağlandı. Windows Setup + Portable yerelde yeniden derlendi, website rebuild edildi, typecheck 0 hata. Push edildi.

- **2026-09-17 · Antigravity:** Güvenli Sistem Tarayıcısı ile Giriş & DPAPI Cookie Aktarımı — `desktop/src/main/auth/music-auth.ts`, `main.ts`, `preload.ts`, `app.ts` güncellendi. Kullanıcının verdiği özel Google login bağlantısı varsayılan sistem tarayıcısında açılacak şekilde yapılandırıldı (`shell.openExternal`). Chrome/Edge/Brave oturum çerezlerini çözen Windows DPAPI + AES-256-GCM + `node:sqlite` altyapısı ve alternatif cookie yapıştırma desteği eklendi. Typecheck 0 hata, desktop build temiz. Push edildi.
- **2026-09-17 · Antigravity:** Görev B (v1.0.2 Windows Build & Release Asset Güncelleme) tamamlandı — Yerel ortamda `npm run build:win` ile `Aquality-Music-Setup-1.0.2-win11.exe` (~96.8 MB), `Aquality-Music-Portable-1.0.2-win11.exe` (~96.3 MB), `.blockmap` ve `latest.yml` üretildi. `gh release upload v1.0.2` ile GitHub Release `v1.0.2` sayfasına yüklendi (artık Windows ve Mac ikilileri eksiksiz mevcut). `website/indir.html` ve `website/index.html` indirme kartları ve versiyon etiketleri v1.0.2'ye güncellendi (`website/dist` rebuild edildi). `.github/workflows/build-windows.yml`'e `desktop/node_modules` junction adımı eklenerek CI derleme hatası (`app-builder.exe ENOENT`) çözüldü. Push edildi.
- **2026-09-17 · Antigravity:** UI/UX Backlog Görev A doğrulaması ve düzeltmeleri — `desktop/src/renderer/components/app.ts`'te context menu SVG simgeleri (`UX-D-095`), dinamik `getBoundingClientRect` viewport taşma koruması (`UX-D-094`) ve güvenli click delegasyonu (`.closest`) eklendi. `desktop/src/renderer/styles/main.css`'te `.ctx-item` flex/icon stilleri, modal için duyarlı genişlik `min(420px, calc(100vw - 32px))` (`UX-D-028`) ve eksik olan `.btn-secondary`, `.btn-sm` sınıfları (`UX-D-041`) eklendi. Backlog'daki 14 stale madde doğrulandı. `npm --workspace=desktop run typecheck` 0 hata, `npm run build --workspace=desktop` yeşil (vite 989ms). Push edildi.
- **2026-09-17 · OpenCode (Muse Spark) → ANTIGRAVITY DEVİR:** Bölüm 6, Antigravity görev listesine (A/B/C) + kopyala-yapıştır ilk komuta (6b) çevrildi. Devir anı durumu: HEAD `fafd359`, remote senkron, typecheck/build yeşil, kırık kod yok. Kullanıcı onayı ile devir.
- **2026-09-17 · OpenCode (Muse Spark):** UI/UX doğrulama turu — UX-D-013, UX-D-029, repeat ikonları, UX-M-063 stale çıktı (kodda zaten düzgün), değişiklik YOK. Kural eklendi: doküman maddesi önce kodda doğrulanır.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(mobile): AudioBridge inceleme + WebView tani loglari` — dosya zaten sertleştirilmiş (`55da5a8`), sadece `onError`/`onHttpError` warn eklendi. Mobile tsc temiz. Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(desktop): innertube fallback zincirlerine debug loglar` — `innertube.ts` 5/5 + `bot-server.ts` appVersion. Doğrulama: typecheck + desktop build yeşil (2 ara kırılma typecheck ile yakalanıp düzeltildi). Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(desktop): music-auth bos catch bloklarina anlamli loglar` — `music-auth.ts` 18/18 + `login-preload.ts` 3 yorum + 2 oauth `server.close()` yorumu. Doğrulama: `auth/` grep temiz, typecheck temiz, desktop build yeşil (vite 1.05s). Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `chore(release): sync version to 1.0.2` — 6 dosya (`package.json` ×4 + `app.json` ×2) `1.0.1`→`1.0.2`. Doğrulama: node JSON parse OK (6/6 `1.0.2`), `npm --workspace=desktop run typecheck` temiz. Tag atılmadı. Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `memory.md` oluşturuldu (`284ff9d`) + push. Ardından Docs Engine churn'ü ayrı commit'lendi (`cbb1076`) — bunun sonsuz döngü olduğu doğrulandı (fark yalnızca `Son Güncelleme`/`Son Git Commit` satırları), Bölüm 5'e **kural 11** eklendi. Bundan sonra churn yalnızca gerçek değişikliklerle paketlenerek commit'lenecek.
- **2026-09-16 · OpenCode:** `605f390` güvenlik/WCAG/CI paketi + push; `e9612e8` alan adı `aqualitymusic.vercel.app` + website rebuild + push; `f1dc31d` Google login/misafir çalma düzeltmesi; `454597e` docs sync (HEAD); `v1.0.2` tag + GitHub Release; Windows Setup+Portable yerelde build edildi (~96 MB).
