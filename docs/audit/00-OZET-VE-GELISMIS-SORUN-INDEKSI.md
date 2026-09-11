# 📋 Aquality Music — Kapsamlı Proje Denetim ve Sorun Dokümantasyonu

> **Denetim Tarihi**: 2026-09-11  
> **Kapsam**: Tüm Proje Dizinleri (`desktop`, `mobile`, `website`, `scripts`, `.github`, kök konfigürasyonlar)  
> **Metodoloji**: Statik Kod Analizi, Yaşam Döngüsü İzleme, Güvenlik & Tehdit Modellemesi, Performans ve Bellek Profili İncelemesi, Çapraz Platform Uyumluluk Denetimi

---

## 🎯 1. Yönetici Özeti ve Genel Değerlendirme

Bu denetim raporu, **Aquality Music** projesinin tüm alt modüllerini, kaynak kod dosyalarını, yapılandırmalarını ve altyapısını en ince detayına kadar inceleyerek hazırlanmıştır. Proje; Windows 11 için geliştirilmiş bir masaüstü uygulaması (Electron + TypeScript + Vite), React Native / Expo tabanlı bir mobil uygulama ve statik bir tanıtım web sitesinden oluşan çok katmanlı bir ekosistemdir.

Önceki aşamalarda 21 adet temel sorun çözülmüş olmasına rağmen, yapılan derinlemesine kod incelemesinde sistemin kararlılığını, güvenliğini, arka plan oynatma yeteneklerini ve performansını doğrudan tehdit eden **38 yeni ve kritik bulgu** tespit edilmiştir.

Bu sorunlar tek bir dosyada özetlenmemiş; **her klasör, her dosya ve her sorun kategorisi için bağımsız, ayrıntılı dokümantasyonlar** üretilmiştir.

---

## 📊 2. Modül ve Klasör Bazlı İstatistikler

| Klasör / Modül | Dosya Sayısı | Kod Hacmi (LOC) | Tespit Edilen Sorun | Öncelik Dağılımı |
|---|---|---|---|---|
| **`desktop/src/main/`** (Ana Süreç) | 16 Dosya | ~4,580 satır | 12 Sorun | 🔴 4 Kritik, 🟠 5 Yüksek, 🟡 3 Orta |
| **`desktop/src/renderer/`** (Arayüz) | 4 Dosya | ~4,700 satır | 8 Sorun | 🔴 2 Kritik, 🟠 4 Yüksek, 🟡 2 Orta |
| **`desktop/`** (Paketleme & Config) | 6 Dosya | ~850 satır | 4 Sorun | 🟠 2 Yüksek, 🟡 2 Orta |
| **`mobile/`** (Expo & React Native) | 18 Dosya | ~3,200 satır | 7 Sorun | 🔴 2 Kritik, 🟠 3 Yüksek, 🟡 2 Orta |
| **`website/`** (Tanıtım Sitesi & Vite) | 11 Dosya | ~1,050 satır | 4 Sorun | 🟠 1 Yüksek, 🟡 3 Orta / Düşük |
| **`scripts/` & Kök / CI-CD** | 6 Dosya | ~600 satır | 3 Sorun | 🟠 2 Yüksek, 🟡 1 Orta |
| **TOPLAM** | **61 Kaynak Dosyası** | **~14,980 Satır** | **38 Yeni Sorun** | **🔴 8 Kritik, 🟠 17 Yüksek, 🟡 13 Orta** |

---

## 🗂️ 3. Ayrı Ayrı Dokümantasyon Haritası

Aşağıdaki bağlantılardan ilgili klasörün ve dosyanın bağımsız analiz dokümanına doğrudan ulaşabilirsiniz:

### 🖥️ A. Masaüstü Ana Süreç (`desktop/src/main/`)
1. [`desktop-main/00-klasor-analizi.md`](desktop-main/00-klasor-analizi.md) — Klasör Mimarisi, IPC Akış Şeması ve İzolasyon Analizi
2. [`desktop-main/main.ts.md`](desktop-main/main.ts.md) — Yaşam döngüsü, single-instance lock, off-screen pencere ve 500ms zorunlu çıkış
3. [`desktop-main/preload.ts.md`](desktop-main/preload.ts.md) — ContextBridge izolasyonu, autoUpdate/deeplink eksiklikleri ve tip zafiyetleri
4. [`desktop-main/api-innertube.ts.md`](desktop-main/api-innertube.ts.md) — Cookie/oturum enjeksiyonu eksikliği (Beğenilenler/Kütüphane 401 hatası), timeout yokluğu
5. [`desktop-main/api-stream-resolver.ts.md`](desktop-main/api-stream-resolver.ts.md) — GPU compositing iptali CPU yükü, 800ms/250ms agresif DOM polling ve WeakSet/listener sızıntıları
6. [`desktop-main/auth-music-auth.ts.md`](desktop-main/auth-music-auth.ts.md) — Cookie ayrıştırma, session partition, CDP port 9222 çakışması ve disk temizliği
7. [`desktop-main/auth-google-oauth.ts.md`](desktop-main/auth-google-oauth.ts.md) — Gömülü pencerede Google "disallowed_useragent" engeli, PKCE eksikliği, çift token exchange yarışı
8. [`desktop-main/auth-discord-oauth.ts.md`](desktop-main/auth-discord-oauth.ts.md) — Sabit 65432 port kilitlenmesi, CSRF state parametresi eksikliği, zaman aşımı yokluğu
9. [`desktop-main/lib-discord-rpc.md`](desktop-main/lib-discord-rpc.md) — Tamamen ölü kod olan yerel `lib/discord-rpc/` klasörü ve npm bağımlılığı çakışması
10. [`desktop-main/providers.md`](desktop-main/providers.md) — `auth-provider.ts`, `lyrics-provider.ts`, `volume-ratio.ts` ölü ve sahte (placebo) kodları
11. [`desktop-main/utils-store.ts.md`](desktop-main/utils-store.ts.md) — Plaintext secret depolama, senkron disk blokajı, oynatma listelerinde şarkı metadata kaybı
12. [`desktop-main/utils-discord.ts.md`](desktop-main/utils-discord.ts.md) — RPC yeniden bağlanma döngüleri, kapak URL çözümleme limitleri

### 🎨 B. Masaüstü Kullanıcı Arayüzü (`desktop/src/renderer/`)
1. [`desktop-renderer/00-klasor-analizi.md`](desktop-renderer/00-klasor-analizi.md) — Renderer Katmanı, Monolitik Script Değerlendirmesi ve Güvenlik
2. [`desktop-renderer/components-app.ts.md`](desktop-renderer/components-app.ts.md) — 2384 satırlık monolitik dosya, 800ms DOM sorgulamaları, event listener birikmesi
3. [`desktop-renderer/index.html.md`](desktop-renderer/index.html.md) — Harici Google Fonts CDN bağımlılığı (çevrimdışı açılış riski), CSP analizi ve ARIA eksiklikleri
4. [`desktop-renderer/styles.md`](desktop-renderer/styles.md) — `main.css` ve `login.css` stil performans analizi, GPU katman maliyeti

### 📱 C. Mobil Uygulama (`mobile/`)
1. [`mobile/00-klasor-analizi.md`](mobile/00-klasor-analizi.md) — Expo & React Native Mimari Özeti ve Mobil Kısıtlar
2. [`mobile/app-routes.md`](mobile/app-routes.md) — Expo Router sayfaları, `modal/player.tsx` içindeki çalışmayan (ölü) Karıştır ve Tekrarla butonları
3. [`mobile/api-innertube.ts.md`](mobile/api-innertube.ts.md) — Mobil ağ zaman aşımları, User-Agent filtreleri, CORS ve veri eşleme
4. [`mobile/services-player.ts.md`](mobile/services-player.ts.md) — Arka planda WebView kilitlenmesi, Android 14 Foreground Service ve kilit ekranı kontrolü eksikliği
5. [`mobile/store-player-store.ts.md`](mobile/store-player-store.ts.md) — `usePlayer` hook'unun her saniye tüm ekranları yeniden çizmesi (re-render fırtınası, pil tüketimi)
6. [`mobile/components.md`](mobile/components.md) — `AudioBridge.tsx`, `Equalizer.tsx`, `MiniPlayer.tsx`, `SongRow.tsx` performans ve dokunma alanı kusurları
7. [`mobile/configs-and-build.md`](mobile/configs-and-build.md) — `app.json`, `eas.json`, `package.json` izinleri ve bağımlılık kilitleri

### 🌐 D. Web Sitesi (`website/`)
1. [`website/00-klasor-analizi.md`](website/00-klasor-analizi.md) — Web Sitesi Mimarisi, Vite Yapılandırması ve Dağıtım Riskleri
2. [`website/html-pages.md`](website/html-pages.md) — `index.html`, `indir.html`, `ozellikler.html`, `sss.html`, `gizlilik.html`, `kosullar.html` kırık bağlantıları ve SEO eksikleri
3. [`website/js-and-css.md`](website/js-and-css.md) — `main.js` menü kilitlenmesi, `style.css` responsive tasarım ve mobil görünüm hataları
4. [`website/config-and-seo.md`](website/config-and-seo.md) — `vite.config.js`, `robots.txt`, `sitemap.xml` yapılandırma analizi

### ⚙️ E. Altyapı, Scriptler ve CI/CD (`scripts/`, `.github/`, Kök)
1. [`infra-and-scripts/00-klasor-analizi.md`](infra-and-scripts/00-klasor-analizi.md) — Monorepo Altyapısı ve Otomasyon Özeti
2. [`infra-and-scripts/scripts.md`](infra-and-scripts/scripts.md) — `update-docs.cjs` statik array bağımlılığı, `make-installer-bmps.ps1` sabit "D:\" sürücü yolu
3. [`infra-and-scripts/ci-cd-workflows.md`](infra-and-scripts/ci-cd-workflows.md) — Windows CI/CD eksikliği (yalnızca macOS olması), kod imzalama (code-sign) olmaması
4. [`infra-and-scripts/desktop-configs.md`](infra-and-scripts/desktop-configs.md) — NSIS `installer.nsh` uninstaller eksik temizlikleri, `desktop/package.json` yapılandırması
5. [`infra-and-scripts/root-configs.md`](infra-and-scripts/root-configs.md) — Kök `package.json`, `tsconfig.json`, `.gitignore` ve log dosyaları

### 🧩 F. Kategorik ve Çapraz Sorun Katalogları
1. [`kategorik-sorunlar/SEC-guvenlik-ve-gizlilik.md`](kategorik-sorunlar/SEC-guvenlik-ve-gizlilik.md) — Tüm Güvenlik Açıkları Kataloğu
2. [`kategorik-sorunlar/ARC-mimari-ve-kod-borcu.md`](kategorik-sorunlar/ARC-mimari-ve-kod-borcu.md) — Mimari ve Kod Kalitesi Kataloğu
3. [`kategorik-sorunlar/PERF-performans-ve-kaynak.md`](kategorik-sorunlar/PERF-performans-ve-kaynak.md) — Performans, Bellek ve Pil Tüketimi Kataloğu
4. [`kategorik-sorunlar/REL-kararlilik-ve-hata-yonetimi.md`](kategorik-sorunlar/REL-kararlilik-ve-hata-yonetimi.md) — Hata Yönetimi, Çökme ve Kararlılık Kataloğu
5. [`kategorik-sorunlar/UX-kullanici-deneyimi-ve-ui.md`](kategorik-sorunlar/UX-kullanici-deneyimi-ve-ui.md) — Arayüz, UX ve Erişilebilirlik Kataloğu
6. [`kategorik-sorunlar/OPS-paketleme-dagitim-ve-ci.md`](kategorik-sorunlar/OPS-paketleme-dagitim-ve-ci.md) — Dağıtım, Paketleme ve CI/CD Kataloğu

---

## 🚦 4. En Öncelikli 10 Kritik Sorun ve Çözüm Özeti

| No | Kod | Dosya Yolu | Sorun Özeti | Çözüm Aksiyonu |
|---|---|---|---|---|
| **1** | `SEC-06` | `desktop/src/main/auth/google-oauth.ts:233` | **Google OAuth gömülü pencerede engelleniyor**: `accounts.google.com` Electron BrowserWindow içinde açıldığında Google "disallowed_useragent" hatası verir. | Akış varsayılan sistem tarayıcısına (`shell.openExternal`) taşınmalı ve yerel loopback üzerinden dinlenmelidir. |
| **2** | `ARC-05` | `desktop/src/main/api/innertube.ts:111` | **InnerTube isteklerinde Cookie/Auth aktarılmıyor**: `getLikedSongs` ve `getLibrary*` çağrıları oturumsuz fetch attığı için kullanıcının özel listeleri boş veya 401 döner. | `Session.cookies` içinden `Cookie` başlığı `request()` metoduna enjekte edilmelidir. |
| **3** | `PERF-01` | `desktop/src/main/api/stream-resolver.ts:437` | **Oynatıcıda GPU compositing tamamen kapalı**: `--disable-gpu` bayrağı video/ses çözümlemesini CPU'ya yıkar, dizüstü bilgisayarlarda yüksek CPU ve pil harcar. | Gereksiz GPU disable bayrakları kaldırılmalı, donanım ivmelendirmesi aktif tutulmalıdır. |
| **4** | `PERF-02` | `desktop/src/main/api/stream-resolver.ts:153` | **Her 800ms'de derin Shadow DOM rekürsif taraması**: `querySelectorAll('*')` ile her 800ms'de tüm YouTube Music DOM'u taranıyor. | DOM scraping yerine `movie_player` referansı bir kez önbelleğe alınmalı veya `MutationObserver` kullanılmalıdır. |
| **5** | `MOB-01` | `mobile/src/services/player.ts:58` | **Mobil arka planda WebView durdurulması**: Arka planda WebView JS motoru kilitlendiği için ekran kapanınca müzik susar; native ForegroundService yoktur. | `expo-audio` veya `react-native-track-player` ile gerçek native ses motoruna geçilmelidir. |
| **6** | `MOB-02` | `mobile/src/store/player-store.ts:214` | **`usePlayer` her progress tick'inde tüm uygulamayı yeniden render ediyor**: Saniyede 4 kez tüm component ağacı setState ile re-render olur. | `zustand` veya `useSyncExternalStore` selector yapısına geçilerek sadece progress bar dinleyicisi tetiklenmelidir. |
| **7** | `MOB-03` | `mobile/app/modal/player.tsx:127` | **Mobilde Karıştır ve Tekrarla butonları ölü (onPress yok)**: Oyuncu modalındaki Shuffle ve Repeat butonları tamamen tepkisizdir. | `playerStore.toggleShuffle()` ve `playerStore.toggleRepeat()` fonksiyonları bağlanmalıdır. |
| **8** | `SEC-07` | `desktop/src/main/auth/discord-oauth.ts:38` | **Sabit 65432 Portu ve Eksik CSRF State Parametresi**: Port çakışmasında OAuth çöküyor; state parametresi olmadığı için CSRF riski taşıyor. | Rastgele port dinlemesi ve kriptografik `state` doğrulaması eklenmelidir. |
| **9** | `ARC-06` | `desktop/src/main/lib/discord-rpc/` | **5 Dosyadan Oluşan Ölü Kod Klasörü**: Kendi yazdıkları Discord IPC kütüphanesi hiçbir yerde kullanılmıyor, npm paketi kullanılıyor. | Ölü kod temizlenmeli ya da dış bağımlılık kaldırılarak yerel modüle bağlanmalıdır. |
| **10** | `REL-01` | `desktop/src/main/main.ts:67` | **Çoklu Monitör Çıkarıldığında Ekran Dışı Başlama**: `storeManager.getWindowBounds()` eski koordinatları sınamadan yükler; monitör yoksa pencere görünmez kalır. | `screen.getAllDisplays()` ile pencerenin görünür bir ekranda olduğu doğrulanmalıdır. |
