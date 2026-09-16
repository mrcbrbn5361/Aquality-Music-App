# CI/CD, Scripts ve Yapilandirma Sorun Analizi

> **Toplam Sorun:** 40 | **KRITIK:** 3 | **YUKSEK:** 8 | **ORTA:** 13 | **DUSUK:** 16

---

## KRITIK Sorunlar

### CICD-01: Discord Bot node_modules Git'te
- **Dosya:** `scripts/discord-bot/node_modules/`
- **Kategori:** GITIGNORE / REPO BLOAT
- **Aciklama:** Discord bot'un `node_modules/` dizini git'e commit edilmis. Bu depo boyutunu buyutur, merge conflict olusturur ve guvensiz/guncel olmayan bagimliliklari icerir.
- **Cozum:**
  ```bash
  echo "scripts/discord-bot/node_modules/" >> .gitignore
  git rm -r --cached scripts/discord-bot/node_modules/
  ```

### CICD-02: Build Artifact'lari Git'te
- **Dosya:** `desktop/dist/`, `desktop/release/`
- **Kategori:** GITIGNORE
- **Aciklama:** `.gitignore` bunlari listeliyor ama `mobile/node_modules/` hic listelenmemis. `desktop/release/` iceriginde buyuk binary dosyalari var.
- **Cozum:** `**/node_modules/` wildcard pattern eklenmeli.

### CICD-03: sandbox: false - Electron Guvenlik Riski
- **Dosya:** `desktop/src/main/main.ts:140`
- **Kategori:** GUVENLIK / CONFIG
- **Aciklama:** `sandbox: false` renderer'in V8 acigi exploited edilirse tam Node.js erisimi saglar. `contextIsolation: true` ve `nodeIntegration: false` dogru ama sandbox zayiflatiyor.
- **Cozum:** `sandbox: true` yapilmali. Preload script sadece `contextBridge` API'leri kullanmali.

---

## YUKSEK Sorunlar

### CICD-04: Hardcoded Versiyon About Dialog'da
- **Dosya:** `desktop/src/main/main.ts:238`
- **Kategori:** BUILD / CONFIG
- **Aciklama:** `message: 'Aquality Music v1.0.0'` sabit kodlanmis. Versiyon artirildiginda guncellenmez.
- **Cozum:** `` message: `Aquality Music v${app.getVersion()}` ``

### CICD-05: Iki Vercel.json Cakismasi
- **Dosya:** `vercel.json` vs `website/vercel.json`
- **Kategori:** DEPLOY
- **Aciklama:** Root'da build command `npm run build:website`, website'de `npm run build`. Root'da guvenlik header'lari eksik. Hangisinin kullanilacagi belirsiz.
- **Cozum:** Root vercel.json kaldirilmali veya birlestirilmeli.

### CICD-06: PR'lar Icin Cross-Platform Test Yok
- **Dosya:** `.github/workflows/build-windows.yml`, `.github/workflows/build-mac.yml`
- **Kategori:** CI/CD
- **Aciklama:** Her workflow kendi platformu icin build yapiyor. Ortak bir typecheck/lint/test pipeline'i yok. Windows workflow'u yalnizca desktop typecheck yapiyor, mobile ve website'i atliyor.
- **Cozum:** Ortak CI workflow olusturulmali: `npm ci`, tum workspace'ler icin typecheck, temel build dogrulamasi.

### CICD-07: postinstall Her npm ci'da Agir Script
- **Dosya:** `package.json:26`
- **Kategori:** CI/CD
- **Aciklama:** `postinstall` her `npm ci`'da `update-docs.cjs` calistiriyor. Bu script git komutlari, tsc kontrolu ve dosya yazma islemleri yapiyor. CI'da 30+ saniye kayip ve potansiyel hata.
- **Cozum:** CI'da devre disi: `process.env.CI !== 'true'` kontrolu.

### CICD-08: npm ci Lockfile Sorunlari
- **Dosya:** CI workflow'lari
- **Kategori:** CI/CD
- **Aciklama:** `postinstall` sirasinda tsc kontrolu ve dosya yazma, read-only CI ortaminda basarisiz olabilir.
- **Cozum:** Tsc ve doc-generation postinstall'dan kaldirilmali.

### CICD-09: Google OAuth Secret Bos Varsayilan
- **Dosya:** `desktop/src/main/auth/google-credentials.ts:4-5`
- **Kategori:** CONFIG / GUVENLIK
- **Aciklama:** `GOOGLE_CLIENT_SECRET` bos string olarak basliyor. Google OAuth sessizce basarisiz olur.
- **Cozum:** Build-time injection veya acik hata mesaji.

### CICD-10: Bot REST API Auth Uyumsuz
- **Dosya:** `desktop/src/main/api/bot-server.ts:88`, `scripts/discord-bot/index.js:37`
- **Kategori:** GUVENLIK / BUG
- **Aciklama:** BotServer Bearer token gerektiriyor ama bot token gondermiyor. /api/v1/state her zaman 401 donebilir.
- **Cozum:** Ya token bot'a gecirilmeli ya da localhost icin auth kaldirilmali.

---

## ORTA Sorunlar

### CICD-11: Mobile metro.config.js blockList Eksik
- **Dosya:** `mobile/metro.config.js`
- **Kategori:** CONFIG
- **Aciklama:** Root metro.config.js'de `blockList` var ama mobile'da yok. Monorepo'da diger workspace dosyalari resolve edilebilir.
- **Cozum:** Ayni blockList konfigurasyonu eklenmeli.

### CICD-12: CI macOS workflow'da shell: bash Yok
- **Dosya:** `.github/workflows/build-mac.yml`
- **Kategori:** CI/CD
- **Aciklama:** gh release upload adimi icin explicit shell tanimi yok.
- **Cozum:** `shell: bash` eklenmeli.

### CICD-13: Eski Versiyon Artifact'lari
- **Dosya:** `desktop/release/`
- **Kategori:** BUILD
- **Aciklama:** 1.0.0 ve 1.0.1 artifact'lari bir arada. latest.yml sadece 1.0.1'i referans gosteriyor.
- **Cozum:** Eski artifact'lar temizlenmeli.

### CICD-14: Git Hook Overwrite
- **Dosya:** `scripts/update-docs.cjs:446-457`
- **Kategori:** SCRIPTS
- **Aciklama:** `ensureGitHook()` mevcut post-commit hook'unu sessizce eziyor (husky, lint-staged vb.).
- **Cozum:** Husky veya simple-git-hooks kullanilmali.

### CICD-15: electron-builder publish never
- **Dosya:** `desktop/package.json:18-21`
- **Kategori:** BUILD
- **Aciklama:** Tum build scriptleri `--publish never` kullaniyor. CI'da bile otomatik publish yok.
- **Cozum:** Bilincli karar, dokumante edilmeli.

### CICD-16: react-native-worklets Gereksiz
- **Dosya:** `mobile/package.json:28`
- **Kategori:** DEPENDENCY
- **Aciklama:** react-native-reanimated v4.5.1 muhtemelen worklets'i iceriyor.
- **Cozum:** Gereklilik dogrulanmali, gereksizse kaldirilmali.

### CICD-17: discord-rpc Bakimsiz ve Tekrarli
- **Dosya:** `desktop/package.json:28`, root `package.json:40`
- **Kategori:** DEPENDENCY
- **Aciklama:** Hem root hem desktop'da var. Bakimsiz.
- **Cozum:** Root'dan kaldirilmali, `@xhayper/discord-rpc`'ye gecilmeli.

### CICD-18: electron-store Isim Cakismasi
- **Dosya:** `store.ts:59`, `google-oauth.ts:53`, `discord-oauth.ts:73`, `music-auth.ts:52`
- **Kategori:** CONFIG
- **Aciklama:** `aquality-music-auth` adi 3 modul tarafindan paylasiliyor. Key cakismasi riski.
- **Cozum:** Ayrilmis store adlari: `aquality-music-google-auth`, `aquality-music-discord-auth`, `aquality-music-music-auth`.

### CICD-19: Root package.json engines Yok
- **Dosya:** `package.json`
- **Kategori:** CONFIG
- **Aciklama:** Node.js surum kisitlami yok.
- **Cozum:** `"engines": { "node": ">=18" }` eklenmeli.

### CICD-20: mobile/.npmrc legacy-peer-deps
- **Dosya:** `mobile/.npmrc:1`
- **Kategori:** DEPENDENCY
- **Aciklama:** Peer dependency cakismalarini bastiriyor.
- **Cozum:** Gercek cakismalar cozulmeli.

### CICD-21: mobile/tsconfig.json lib DOM Iceriyor
- **Dosya:** `mobile/tsconfig.json`
- **Kategori:** CONFIG
- **Aciklama:** React Native'de DOM yok ama `"lib": ["DOM", "ESNext"]` tanimli.
- **Cozum:** `"lib": ["ESNext"]` olarak degistirilmeli.

### CICD-22: make-installer-bmps.ps1 Windows-Only
- **Dosya:** `scripts/make-installer-bmps.ps1`
- **Kategori:** CROSS-PLATFORM
- **Aciklama:** PowerShell ve .NET System.Drawing kullaniyor.
- **Cozum:** Cross-platform alternatif veya dokumantasyon.

### CICD-23: run_check.bat Hardcoded Path
- **Dosya:** `desktop/run_check.bat:1`
- **Kategori:** SCRIPTS
- **Aciklama:** `cd D:\Aquality-Music-App\desktop` sadece bir gelistiricide calisir.
- **Cozum:** `cd /d "%~dp0"` kullanilmali.

---

## DUSUK Sorunlar

### CICD-24: Root tsconfig Bos
- **Dosya:** `tsconfig.json`
- **Aciklama:** `"compilerOptions": {}` hicbir ise yaramiyor.
- **Cozum:** Kaldirilmali veya anlamlı icerik eklenmeli.

### CICD-25: Website vercel.json Catch-All
- **Dosya:** `website/vercel.json:9`
- **Aciklama:** Tum route'lari 404'e yonlendiriyor.
- **Cozum:** Kaldirilmali (WEB-01 ile ayni).

### CICD-26: gl.bat Gereksiz
- **Dosya:** `desktop/gl.bat`
- **Aciklama:** Sadece `git log --oneline` komutu.
- **Cozum:** Kaldirilmali veya .gitignore'a eklenmeli.

### CICD-27: Root vercel.json Guvenlik Header Eksik
- **Dosya:** `vercel.json`
- **Aciklama:** Sadece Cache-Control header'i var.
- **Cozum:** Website/vercel.json'daki header'lar eklenmeli.

### CICD-28: Root app.json Mobil Ile Ayni
- **Dosya:** `app.json` vs `mobile/app.json`
- **Aciklama:** Expo config tekrari.
- **Cozum:** Root app.json kaldirilmali.

### CICD-29: Discord Bot .env Ornegi Yok
- **Dosya:** `scripts/discord-bot/index.js:12`
- **Aciklama:** DISCORD_TOKEN gerekli ama .env.example yok.
- **Cozum:** `.env.example` olusturulmali.

### CICD-30: discord-bot package-lock.json CI'da Install Edilmiyor
- **Dosya:** `scripts/discord-bot/package-lock.json`
- **Aciklama:** extraResources olarak paketleniyor ama CI'da install edilmiyor.
- **Cozum:** CI adimi eklenmeli.

### CICD-31: assets-source AciKLAMASI YOK
- **Dosya:** `desktop/assets-source/`, `assets-source/`
- **Aciklama:** Amaclarina dair dokumantasyon yok.
- **Cozum:** README eklenmeli.

### CICD-32: bot-server.ts Hardcoded Versiyon
- **Dosya:** `desktop/src/main/api/bot-server.ts:44, 115`
- **Aciklama:** `version: '1.0.1'` sabit kodlanmis.
- **Cozum:** `app.getVersion()` kullanilmali.

### CICD-33: InnerTube hl/gl Hardcoded Turkce
- **Dosya:** `desktop/src/main/api/innertube.ts:15-16`, `mobile/src/main/api/innertube.ts:19-20`
- **Aciklama:** API her zaman Turkce sonuc dondurur.
- **Cozum:** Kullanici tercihinden dinamik alinmali.

### CICD-34: 100+ Bos catch {} Blogu
- **Dosya:** Cok sayida dosya
- **Aciklama:** Hatalari sessizce yutuyor.
- **Cozum:** Kritik yollarda en azindan console.warn.

### CICD-35: duplicate mobile Script
- **Dosya:** `package.json:12-16`
- **Aciklama:** `mobile` ve `dev:mobile` ayni.
- **Cozum:** Biri kaldirilmali.

### CICD-36: electron-builder mac.identity null
- **Dosya:** `desktop/package.json:110`
- **Aciklama:** Gatekeeper uyarisi verir.
- **Cozum:** Dokumante edilmeli.

### CICD-37: 7zip-bin Tekrarli
- **Dosya:** root `package.json:35`, `desktop/package.json:25`
- **Aciklama:** Hem root devDependencies hem desktop dependencies'de.
- **Cozum:** Root'dan kaldirilmali.

### CICD-38: chrome-remote-interface Tur Tanimsiz
- **Dosya:** `desktop/src/main/auth/music-auth.ts:8`
- **Aciklama:** `@ts-ignore` ile import.
- **Cozum:** `.d.ts` dosyasi olusturulmali.

### CICD-39: discord-bot CI'da Test Edilmiyor
- **Dosya:** CI workflow'lari
- **Aciklama:** Bot kodu hic test edilmiyor.
- **Cozum:** Test adimi eklenmeli.

### CICD-40: desktop/gl.bat Gereksiz
- **Dosya:** `desktop/gl.bat`
- **Aciklama:** Tek satirlik git alias.
- **Cozum:** Kaldirilmali.
