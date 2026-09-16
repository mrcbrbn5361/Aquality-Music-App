# KAPSAMLI SORUN ANALIZI - Aquality Music App

> **Analiz Tarihi:** 2026-09-16
> **Toplam Sorun:** 202
> **Analiz Kapsami:** Desktop (Electron), Mobile (Expo/React Native), Website (Vite), CI/CD & Scripts, Dokumantasyon

---

## Ozet Tablosu

| Modul | KRITIK | YUKSEK | ORTA | DUSUK | Toplam |
|-------|--------|--------|------|-------|--------|
| Desktop (Electron) | 6 | 6 | 19 | 19 | **50** |
| Mobile (Expo) | 2 | 5 | 14 | 13 | **34** |
| Website (Vite) | 3 | 11 | 15 | 21 | **50** |
| CI/CD & Scripts | 3 | 8 | 13 | 16 | **40** |
| Dokumantasyon | 0 | 6 | 9 | 13 | **28** |
| **TOPLAM** | **14** | **36** | **70** | **82** | **202** |

---

## Oncelik Siralama

### KRITIK Sorunlar (Hemen Cozulmeli)

| ID | Modul | Sorun | Dosya |
|----|-------|-------|-------|
| DESK-01 | Desktop | Discord Bot Token plaintext olarak saklaniyor | `desktop/src/main/main.ts:343-354` |
| DESK-02 | Desktop | store:get IPC ile herhangi bir sifreli veri okunabilir | `desktop/src/main/main.ts:537` |
| DESK-03 | Desktop | Bot REST API wildcard CORS + token sifreleme yok | `desktop/src/main/api/bot-server.ts:88-89` |
| DESK-04 | Desktop | CSP `unsafe-inline` style-src XSS korumasi zayiflatiyor | `desktop/src/renderer/index.html:6` |
| DESK-05 | Desktop | shell:openExternal localhost acilabiliyor | `desktop/src/main/main.ts:539-547` |
| DESK-06 | Desktop | Discord token child process'e env olarak geciriliyor | `desktop/src/main/main.ts:377-381` |
| MOB-01 | Mobile | `autoPlay` state'i ve `setAutoPlay` metodu eksik - CRASH | `mobile/app/(tabs)/settings.tsx:24,95` |
| MOB-02 | Mobile | `playerStore.setAutoPlay()` calismaz - runtime hatasi | `mobile/app/(tabs)/settings.tsx:95` |
| WEB-01 | Website | Catch-all rewrite tum sayfalari 404 yapiyor | `website/vercel.json:9` |
| WEB-02 | Website | Aktif nav vurgulama production'da calismiyor | `website/js/main.js:53-62` |
| WEB-03 | Website | Iki farkli vercel.json dosyasi cakisiyor | `vercel.json` vs `website/vercel.json` |
| CICD-01 | CI/CD | Discord bot node_modules git'e commit edilmis | `scripts/discord-bot/node_modules/` |
| CICD-02 | CI/CD | desktop/dist/ ve desktop/release/ build artifact'lari | `.gitignore` |
| CICD-03 | CI/CD | sandbox: false - Electron guvenlik riski | `desktop/src/main/main.ts:140` |

### YUKSEK Oncelikli Sorunlar

| ID | Modul | Sorun | Dosya |
|----|-------|-------|-------|
| DESK-07 | Desktop | sandbox: false - sandbox devre disi | `desktop/src/main/main.ts:135-141` |
| DESK-08 | Desktop | Versiyon uyumsuzlugu (1.0.0 vs 1.0.1) | `main.ts:239`, `index.html:386` |
| DESK-09 | Desktop | backgroundMaterial 'mica' as any | `main.ts:130` |
| DESK-10 | Desktop | isDev guard bypass edilebilir | `main.ts:192-198` |
| DESK-11 | Desktop | Hardcoded port 9863 fallback yok | `bot-server.ts:39` |
| DESK-12 | Desktop | discord-rpc bakimsiz paket | `desktop/package.json:27` |
| MOB-03 | Mobile | Search debounce timer unmount'ta temizlenmiyor | `search.tsx:48` |
| MOB-04 | Mobile | PlayerStore dizileri direkt mutasyon | `player-store.ts:165,245,262` |
| MOB-05 | Mobile | usePlayer() her bildirimde yeni obje olusturur | `player-store.ts:349-358` |
| MOB-06 | Mobile | Progress guncellemeleri cascade re-render | `player-store.ts:361-374` |
| MOB-07 | Mobile | Auto-play switch her zaman false gosterir | `settings.tsx:93-98` |
| WEB-04 | Website | CSP header eksik - guvenlik | tum HTML dosyalari |
| WEB-05 | Website | Guvenlik header'lari eksik | `vercel.json` (root) |
| WEB-06 | Website | `<main>` landmark eksik | tum HTML dosyalari |
| WEB-07 | Website | Skip navigation link eksik | tum HTML dosyalari |
| WEB-08 | Website | SVG icon'larda aria-hidden yok | tum HTML dosyalari |
| WEB-09 | Website | Mobile menu butonu aria-label eksik | tum HTML dosyalari |
| WEB-10 | Website | FAQ accordion ARIA rolleri eksik | `sss.html:42-105` |
| WEB-11 | Website | OG/Twitter Card meta tag eksik (7/8 sayfa) | 7 HTML dosyasi |
| WEB-12 | Website | Canonical URL eksik | tum HTML dosyalari |
| WEB-13 | Website | OG image favicon kullanir (cok kucuk) | `indir.html:11,15` |
| WEB-14 | Website | :focus-visible stilleri eksik | `css/style.css` |
| CICD-04 | CI/CD | Hardcoded versiyon About dialog'da | `main.ts:238` |
| CICD-05 | CI/CD | Iki vercel.json cakismasi | root vs website |
| CICD-06 | CI/CD | PR'lar icin cross-platform test yok | CI workflow'lari |
| CICD-07 | CI/CD | postinstall her npm ci'da agir script calistiriyor | `package.json:26` |
| CICD-08 | CI/CD | npm ci lockfile sorunlari olusturabilir | CI workflow'lari |
| CICD-09 | CI/CD | Google OAuth secret bos varsayilan | `google-credentials.ts:4-5` |
| CICD-10 | CI/CD | Bot REST API auth uyumsuz | `bot-server.ts:88`, `discord-bot/index.js:37` |
| DOC-01 | Docs | README versiyon 1.0.0 eski kalmis | `README.md:1,10` |
| DOC-02 | Docs | TUM-GUNCELLEMELER versiyon eski kalmis | `TUM-GUNCELLEMELER.md:3` |
| DOC-03 | Docs | Audit dosyalari Windows CI/CD yok diyor ama var | `audit/infra-and-scripts/` |
| DOC-04 | Docs | WEBSITE-SORUNLARI cozulmus sorunlari acik gosteriyor | `WEBSITE-SORUNLARI.md` |
| DOC-05 | Docs | GENEL-OZET ile PROJE-DURUM celisiyor | `GENEL-OZET.md` vs `PROJE-DURUM.md` |
| DOC-06 | Docs | Audit dosyalari Vercel header eksik diyor ama var | `WEBSITE-SORUNLARI.md` |

---

## Detay Sorun Listeleri

Her modulun detayli sorun listesi icin asagidaki dosyalara bakiniz:

- [Desktop Sorunlari](DESKTOP-SORUNLARI.md) - 50 sorun
- [Mobile Sorunlari](MOBILE-SORUNLARI.md) - 34 sorun
- [Website Sorunlari](WEBSITE-SORUNLARI.md) - 50 sorun
- [CI/CD ve Scripts Sorunlari](CICD-SCRIPTS-SORUNLARI.md) - 40 sorun
- [Dokumantasyon Sorunlari](docs/DOKUMANTASYON-SORUNLARI.md) - 28 sorun

---

## Cozum Oncelikleri

### Asama 1: KRITIK Guvenlik ve Crash Sorunlari (Hemen)
1. Discord bot token sifreleme (DESK-01)
2. Store IPC erisim kontrolu (DESK-02)
3. CORS kisitlamasi (DESK-03)
4. Mobile autoPlay crash cozumu (MOB-01, MOB-02)
5. sandbox: true yapilmasi (CICD-03)
6. Vercel catch-all rewrite kaldirilmasi (WEB-01)

### Asama 2: YUKSEK Oncelikli Sorunlar (1 hafta)
1. Versiyon uyumsuzluklarinin duzeltilmesi
2. Accessibility eksikliklerinin giderilmesi
3. State mutation ve performance sorunlari
4. CI/CD pipeline iyilestirmeleri
5. Dokumantasyon guncellemeleri

### Asama 3: ORTA/DUSUK Oncelikli (Planlanmis)
1. Code splitting (app.ts monolitik dosya)
2. Rate limiting ekleme
3. i18n API locale dinamiklestirme
4. Test framework kurulumu
5. Dead code temizligi

---

## İstatistikler

| Metrik | Deger |
|--------|-------|
| Toplam Analiz Edilen Dosya | ~150+ |
| Kod Satiri (LOC) | ~16,639 (Desktop: ~9,847, Mobile: ~5,206, Web: ~1,586) |
| Toplam Sorun | 202 |
| KRITIK | 14 |
| YUKSEK | 36 |
| ORTA | 70 |
| DUSUK | 82 |
| Guvenlik Sorunu | 25 |
| Performans Sorunu | 15 |
| Erisilebilirlik Sorunu | 20 |
| Tip Guvenligi Sorunu | 8 |
| Bellek Sizintisi Sorunu | 10 |
