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
> Son güncelleme: **2026-09-17** · Güncelleyen: **OpenCode (Muse Spark)**
> HEAD: `454597e` · Branch: `master` · Repo: `mrcbrbn5361/Aquality-Music-App`

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

## 6. Sıradaki Adım (kaldığımız yer — buradan devam et)

Öncelik sırasına göre, her biri ayrı commit:

1. ~~**Sürüm eşitleme (küçük, risksiz):** kök + `desktop` + `mobile` + `website` `package.json` → `1.0.2`; commit `chore(release): sync version to 1.0.2`; push (tag ATMA — bir sonraki feature ile birlikte).~~ ✅ TAMAMLANDI (2026-09-17, commit aşağıda). Ek olarak kök + mobile `app.json` expo.version da `1.0.2` yapıldı (unutulmuştu). Tag ATILMADI — kural korunuyor.
2. ~~**`music-auth.ts` boş catch'leri (~18 adet):** her birini tek tek oku; CDP/cookie/temp-dosya akışında gerçek hata yutma varsa anlamlı log + temizlik ekle; DOM/stealth enjeksiyonlarındakilere dokunma. Sonra typecheck + desktop build.~~ ✅ TAMAMLANDI (2026-09-17). 18/18 düzeltildi: gerçek hatalara `console.warn('[Auth] ...')`, sık polling döngülerine `console.debug`, best-effort DOM/kapatma/navigasyonlara açıklayıcı yorum. Sayfa-içi enjekte JS string'lerine (STEALTH_INJECTION, CDP expression) dokunulmadı. Bonus: `login-preload.ts` 3 catch'e yorum (davranış değişikliği yok — f1dc31d düzeltmesi korunuyor), `google/discord-oauth.ts` `server.close()` temizliklerine yorum. `auth/` klasöründe `catch {}` kalmadı (grep doğruladı). Typecheck + `desktop build` (tsc + vite) yeşil.
   - ⚠️ Ara not: bir düzenlemede `}, 1500);` satırı yanlışlıkla düşürüldü, hemen fark edilip geri eklendi ve bölge yeniden okunarak doğrulandı. Ders: çok satırlı `oldString`'lerde kapanış satırları her zaman `read` ile teyit edilir.
3. ~~**`innertube.ts` 5 boş catch:** API hata yolları — hangilerinin sessiz geçmesi gerektiğine karar ver, en azından debug log ekle.~~ ✅ TAMAMLANDI (2026-09-17). 5/5 düzeltildi — tamamı fallback zinciri olduğu için `console.debug` kullanıldı (normal akışta log kirliliği yapmaz): session cookie, lyrics-browse, oEmbed, LRCLIB, dış catch, Liked Songs LM fallback. Bonus: `bot-server.ts` `appVersion()` catch'ine debug + stale `'1.0.1'` fallback'ı `'1.0.2'` yapıldı. Typecheck + desktop build yeşil.
   - ⚠️ Ara not (önemli, 3 kez tekrarlandı): kısa `oldString` (`} catch {}` gibi) kullanıldığında edit aracı **dosyadaki ilk eşleşmeye** uygulayabiliyor (cookie mesajı oEmbed bloğuna gitti) ve `oldString`'e dahil edilen kapanış satırları (`}, 1500);`, `}`, `const data = ...`) `newString`'de unutulursa kod bozuluyor. Typecheck her seferinde yakaladı ve düzeltildi. **Yeni kural 12 olarak eklendi.**
4. ~~**`AudioBridge.tsx` güvenlik incelemesi (M-005/006/007):** önce dosyayı oku + risk analizi yaz; düzeltme ancak kullanıcı onayıyla.~~ ✅ TAMAMLANDI (2026-09-17, "devam et" onayı). **Bulgu: dosya ZATEN sertleştirilmiş** (`55da5a8`, v1.0.1 security hardening — memory.md öncesi olduğu için kayıtsız kalmış): `sanitizeVideoId` (11-karakter regex), `clampNumber`, `JSON.stringify` enjeksiyon koruması, `mixedContentMode="never"`, `originWhitelist` youtube/googlevideo/gstatic ile sınırlı, `onShouldStartLoadWithRequest={() => false}`, `allowFileAccess*={false}`, `handleMessage` uzunluk limiti (65536) + tip kontrolleri. Yapılan TEK ekleme: `onError`/`onHttpError` warn-only tanı handler'ları (sıfır davranış değişikliği). Doğrulama: `npx tsc --noEmit -p mobile/tsconfig.json` temiz. M-005/006/007 kapatıldı.
5. ~~**Kalan UI/UX maddeleri** (`docs/UI-UX-SORUNLARI.md` — dosya Docs Engine tarafından kırpılmamış, 749 satır tam duruyor): tekrar (repeat) ikon ayrımı, şarkı sözü otomatik kaydırma, context menu ikonları.~~ ⚠️ KISMEN TAMAMLANDI (2026-09-17) — **önemli bulgu: dokümandaki başlık maddeleri STALE.** Doğrulananlar (kod okundu, düzeltme gerekmedi): UX-D-013 playlist tıklama (`app.ts:2494-2501` handler mevcut), UX-D-029 lyrics auto-scroll (`autoScrollLyrics` + 8sn kullanıcı-kaydırma koruması, `app.ts:1961-1976`), repeat ikon ayrımı (`REPEAT_ICONS` off/all/one + title + persist, `app.ts:1675-1702,2971-2985`), UX-M-063 mobil tab layout (her iki `_layout.tsx` mevcut). **Kural: UI-UX dokümanındaki HER madde koda dokunmadan önce dosyada doğrulanır; stale çıkanlar için kod yazılmaz, sadece buraya not düşülür.** Kalan ~98 maddenin tek tek doğrulanması SONRAKİ OTURUMA bırakıldı (büyük iş — Antigravity'ye devredilebilir, talimat: madde madde doğrula, gerçek olanları küçük commit'lerle düzelt).
6. Bunlar bitince: version bump → tag → release → build çıktılarını `desktop/release/` + GitHub Release'te doğrula.

## 7. Oturum Kapanış Protokolü (her ajan, her seferinde)

Oturum bitmeden ÖNCE:
1. `git status --short` + `git log --oneline -5` çalıştır, durumu netleştir.
2. Aşağıdaki **"Oturum Kaydı"** bölümüne yeni madde ekle: tarih, ajan adı, yapılanlar (dosya + satır etkisi), doğrulama komutları ve sonuçları, push/tag durumu.
3. **Bölüm 6 (Sıradaki Adım)** güncelle — bitenlerin üstünü çiz, yeni bulunanları ekle.
4. Commit + push et (memory.md dahil). Kullanıcı istemedikçe tag atma.
5. **Kota kuralı (kritik):** Limitin dolmasına yakınsan YENİ kod yazmayı bırak; sadece analiz edip bu dosyayı güncelle ve Bölüm 6'yı netleştir. Yarım kalmış, build'i kırık kod ASLA bırakma — ya bitir ya başlama.

## 8. Oturum Kaydı (her güncellemede buraya ekle — en üste)

- **2026-09-17 · OpenCode (Muse Spark):** UI/UX doğrulama turu — UX-D-013, UX-D-029, repeat ikonları, UX-M-063 stale çıktı (kodda zaten düzgün), değişiklik YOK. Kural eklendi: doküman maddesi önce kodda doğrulanır.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(mobile): AudioBridge inceleme + WebView tani loglari` — dosya zaten sertleştirilmiş (`55da5a8`), sadece `onError`/`onHttpError` warn eklendi. Mobile tsc temiz. Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(desktop): innertube fallback zincirlerine debug loglar` — `innertube.ts` 5/5 + `bot-server.ts` appVersion. Doğrulama: typecheck + desktop build yeşil (2 ara kırılma typecheck ile yakalanıp düzeltildi). Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `fix(desktop): music-auth bos catch bloklarina anlamli loglar` — `music-auth.ts` 18/18 + `login-preload.ts` 3 yorum + 2 oauth `server.close()` yorumu. Doğrulama: `auth/` grep temiz, typecheck temiz, desktop build yeşil (vite 1.05s). Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `chore(release): sync version to 1.0.2` — 6 dosya (`package.json` ×4 + `app.json` ×2) `1.0.1`→`1.0.2`. Doğrulama: node JSON parse OK (6/6 `1.0.2`), `npm --workspace=desktop run typecheck` temiz. Tag atılmadı. Push edildi.
- **2026-09-17 · OpenCode (Muse Spark):** `memory.md` oluşturuldu (`284ff9d`) + push. Ardından Docs Engine churn'ü ayrı commit'lendi (`cbb1076`) — bunun sonsuz döngü olduğu doğrulandı (fark yalnızca `Son Güncelleme`/`Son Git Commit` satırları), Bölüm 5'e **kural 11** eklendi. Bundan sonra churn yalnızca gerçek değişikliklerle paketlenerek commit'lenecek.
- **2026-09-16 · OpenCode:** `605f390` güvenlik/WCAG/CI paketi + push; `e9612e8` alan adı `aqualitymusic.vercel.app` + website rebuild + push; `f1dc31d` Google login/misafir çalma düzeltmesi; `454597e` docs sync (HEAD); `v1.0.2` tag + GitHub Release; Windows Setup+Portable yerelde build edildi (~96 MB).
