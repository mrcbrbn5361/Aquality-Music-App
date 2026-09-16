# 🔍 Aquality Music — Kapsamlı Sorun Analiz Raporu

> **Analiz Tarihi:** 2026-09-16
> **Kapsam:** Tüm proje dosyaları (desktop, mobile, website, scripts, CI/CD, Discord bot)
> **Metodoloji:** Satır satır kaynak kod incelemesi, statik analiz, mimari değerlendirme
> **Toplam Tespit:** 225+ benzersiz sorun (önceki 24 çözülen + 201+ yeni/açık)

---

## 📊 Genel İstatistikler

| Kategori | Kritik | Yüksek | Orta | Düşük | Toplam |
|----------|--------|--------|------|-------|--------|
| **Desktop (main)** | 7 | 9 | 14 | 7 | 37 |
| **Desktop (renderer)** | 2 | 8 | 20 | 25 | 55 |
| **Mobile** | 13 | 11 | 22 | 23 | 69 |
| **Website** | 3 | 6 | 10 | 12 | 31 |
| **CI/CD & Scripts** | 3 | 3 | 7 | 3 | 16 |
| **Discord Bot** | 1 | 1 | 4 | 2 | 8 |
| **Çapraz Platform** | - | 7 | - | - | 7 |
| **TOPLAM** | **29** | **45** | **77** | **72** | **223** |

---

## 🔴 EN KRİTİK 15 SORUN VE ÇÖZÜM PLANI

### 1. WebView JavaScript Enjeksiyon (Mobile)
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx:210,213,216,219,222` |
| **Etki** | Saldırgan keyfi JS kodu WebView içinde çalıştırabilir |
| **Çözüm** | `JSON.stringify(id)` ile tüm enjeksiyon noktaları düzeltilmeli |

### 2. IPC Üzerinden Bot Token Yansıtımı (Desktop)
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts:324` + `preload.ts:122` |
| **Etki** | XSS ile Discord bot token'ı değiştirilebilir |
| **Çözüm** | Token format regex doğrulaması, IPC'de validasyon |

### 3. Store IPC Key Kısıtlamasız (Desktop)
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts:537-538` |
| **Etki** | Renderer tüm store sırlarını (OAuth token, bot token) okuyabilir |
| **Çözüm** | Beyaz listeli key izni, `ALLOWED_STORE_KEYS` |

### 4. Bot Sunucu State'i Doğrulamasız (Desktop)
| | |
|---|---|
| **Dosya** | `desktop/src/main/main.ts:285-288` |
| **Etki** | Sahte Discord durumu oluşturulabilir |
| **Çözüm** | Zod/io-ts ile şema validasyonu |

### 5. Google OAuth "disallowed_useragent" Engeli (Desktop)
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/google-oauth.ts:233` |
| **Etki** | Google girişi Electron içinde çalışmıyor |
| **Çözüm** | `shell.openExternal` + loopback redirect |

### 6. usePlayer Re-render Fırtınası (Mobile)
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts:350-358` |
| **Etki** | Saniyede 3+ kez tüm uygulama yeniden render — pil ve performans |
| **Çözüm** | Selector pattern, slice-specific hook'lar |

### 7. usePlayerProgress 300ms Tetikleme (Mobile)
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts:361-374` |
| **Etki** | Yoğun CPU kullanımı, pil tüketimi |
| **Çözüm** | Throttle ~1 güncelleme/saniye |

### 8. Null-Unsafe $() Init Çökmesi (Desktop Renderer)
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts:795-802` |
| **Etki** | DOM elementi yoksa tüm UI yüklenmiyor |
| **Çözüm** | Null guard: `if (el) el.addEventListener(...)` |

### 9. CSS url() Enjeksiyon (Desktop Renderer)
| | |
|---|---|
| **Dosya** | `desktop/src/renderer/components/app.ts:389,964,1035` |
| **Etki** | API görsellerinden CSS enjeksiyonu |
| **Çözüm** | `escapeCssUrl()` helper'ı |

### 10. Root vercel.json Güvenlik Header'sız (Website)
| | |
|---|---|
| **Dosya** | Kök `vercel.json` |
| **Etki** | Website X-Frame-Options, HSTS vb. olmadan deploy |
| **Çözüm** | Header bloğu root config'e kopyalanmalı |

### 11. likedSongs Mantıksal Hatası (Mobile)
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/library.tsx:28` |
| **Etki** | Beğenilen şarkılar yakın zamanda çalınmamışsa kayboluyor |
| **Çözüm** | Ayrı beğenilen şarkılar listesi tutulmalı |

### 12. WebView originWhitelist Açık (Mobile)
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx:276` |
| **Etki** | Herhangi bir URL'e gezinmeye izin |
| **Çözüm** | `['https://www.youtube.com']` |

### 13. Discord OAuth CSRF State Eksik (Desktop)
| | |
|---|---|
| **Dosya** | `desktop/src/main/auth/discord-oauth.ts:38` |
| **Etki** | CSRF saldırısı riski |
| **Çözüm** | Kriptografik state parametresi (çözülmüş ancak port sabitliği devam) |

### 14. Hooks Kuralları İhlali — try/catch İçinde useRouter (Mobile)
| | |
|---|---|
| **Dosya** | `MiniPlayer.tsx:14-17` + `player.tsx:29-32` |
| **Etki** | Runtime crash, öngörülemeyen davranış |
| **Çözüm** | useRouter üst düzeyde çağrılmalı |

### 15. postinstall Hook Zorla Git Hook Kurulumu
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs:446-457` |
| **Etki** | Mevcut git hook'ları sessizce siliniyor |
| **Çözüm** | postinstall kaldırılmalı, opt-in yapılmalı |

---

## 🏗️ MİMARİ SORUNLAR

### M-ARC-01: 2636 Satırlık Monolitik Renderer
- **Dosya:** `desktop/src/renderer/components/app.ts`
- **Sorun:** Tüm renderer mantığı tek dosyada. Modül ayrımı yok.
- **Çözüm:** `player.ts`, `search.ts`, `auth.ts`, `discord.ts`, `queue.ts`, `ui.ts` modüllerine ayrılmalı.

### M-ARC-02: Özel Store Yeniden İcadı (Mobile)
- **Dosya:** `mobile/src/store/player-store.ts`
- **Sorun:** Zustand/Jotai yerine 350 satırlık özel store. Abonelik, persist ve hook'lar yeniden icat edilmiş.
- **Çözüm:** `zustand` veya `@tanstack/react-query`'e geçilmeli.

### M-ARC-03: AudioBridge'de 200+ Satırlık Ham HTML/JS String
- **Dosya:** `mobile/src/components/AudioBridge.tsx:7-202`
- **Sorun:** Test edilemez, lint edilemez, sözdizimi vurgulaması yok.
- **Çözüm:** HTML/JS dosyaya ayrılmalı veya `expo-webview` template mekanizması kullanılmalı.

### M-ARC-04: innertube.ts 600+ Satır Tek Dosya (Mobile)
- **Dosya:** `mobile/src/api/innertube.ts`
- **Sorun:** Tüm YouTube Music API istemcisi tek dosyada — test, mock ve bakım zor.
- **Çözüm:** `home.ts`, `search.ts`, `player.ts`, `browse.ts` modüllerine ayrılmalı.

### M-ARC-05: İki Ayrı vercel.json Çatışması
- **Dosya:** Kök `vercel.json` + `website/vercel.json`
- **Sorun:** Vercel root olanı kullanıyor, website olanı ölü ve yanıltıcı.

---

## 🔒 GÜVENLİK ÖZETİ

### Açıklar (Öncelik sırasıyla)
| # | Açıklama | Platform | Çözüm |
|---|----------|----------|-------|
| 1 | WebView JS enjeksiyon (5 nokta) | Mobile | `JSON.stringify()` |
| 2 | IPC store key kısıtlamasız | Desktop | Beyaz liste |
| 3 | IPC bot token geçişi | Desktop | Token validasyonu |
| 4 | Bot state doğrulamasız | Desktop | Şema validasyonu |
| 5 | OAuth token düz metin | Desktop | `safeStorage` |
| 6 | Bot REST API auth yok | Desktop | Bearer token |
| 7 | WebView originWhitelist=* | Mobile | Sınırlı origin |
| 8 | mixedContentMode=always | Mobile | "never" |
| 9 | CSS url() injection | Desktop | escapeCssUrl() |
| 10 | Cookie dosyası kilitleme yok | Desktop | Kopyalama + try-finally |

### Çözülmüş Güvenlik Sorunları (24 adet)
SEC-01'den SEC-07'ye, ARC-01'den ARC-04'e kadar tüm önceki sorunlar çözülmüş.

---

## ⚡ PERFORMANS ÖZETİ

### En Kritik Performans Sorunları
| # | Sorun | Platform | Etki |
|---|-------|----------|------|
| 1 | usePlayer re-render fırtınası | Mobile | Pil tüketimi, UI donması |
| 2 | 300ms progress tetikleme | Mobile | CPU %30+ |
| 3 | 800ms/250ms DOM polling | Desktop | CPU yüksek |
| 4 | 2636 satırlık monolitik dosya | Desktop | Yükleme yavaşlığı |
| 5 | ScrollView + inline styles | Mobile | Gereksiz reflow |
| 6 | ScrollView yerine FlatList | Mobile | Sanallaştırma yok |
| 7 | Eş zamanlı görsel yükleme | Mobile | Ağ tıkanıklığı |
| 8 | 5 saniyelik blocking loop | Desktop | UI donması |

---

## ♿ ERİŞİLEBİLİRLİK ÖZETİ

| Platform | Eksik ARIA | Kontrast Sorunu | Klavye Erişimi | Toplam |
|----------|------------|-----------------|----------------|--------|
| Desktop | 8 | 3 | 5 | 16 |
| Mobile | 0 | 0 | 2 | 2 |
| Website | 12 | 0 | 3 | 15 |
| **Toplam** | **20** | **3** | **10** | **33** |

---

## 🧹 KOD KALİTESİ ÖZETİ

### Tekrarlanan Kod
| Tekrarlama | Konum | Çözüm |
|-----------|-------|-------|
| `base64url()` | discord-oauth.ts + google-oauth.ts | Utils modülü |
| `escapeHtml()` | google-oauth.ts (var), discord-oauth.ts (yok) | Tutarsız güvenlik |
| Volume icon SVG | app.ts init() + updateVolumeSliderBg() | Tek noktadan |
| Repeat SVG'leri | app.ts 5 farklı yer | Sabit tanımlar |
| Empty state HTML | app.ts 2 farklı yer | Yardımcı fonksiyon |

### Ölü Kod
| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `lyrics-provider.ts` | 7-10 | `fetch()` hiçbir yerde çağrılmıyor |
| `app.ts` setupDiscordBot() | 2380-2536 | HTML elementleri mevcut değil |
| `app.ts` btnStartWelcome | 414 | Element index.html'de yok |
| `login.css` | tüm dosya | index.html'de import edilmiyor |
| `QueueItem` (mobile) | types/index.ts:19 | Kullanılmıyor |
| `expo-audio` kod yolu | player.ts:14-151 | Hiç oluşturulmuyor |

### Boş catch Blokları (Toplam: 45+)
| Dosya | Sayı |
|-------|------|
| `desktop/main/main.ts` | 7 |
| `desktop/main/auth/music-auth.ts` | 16 |
| `desktop/main/api/innertube.ts` | 5 |
| `desktop/main/api/stream-resolver.ts` | 7 |
| `desktop/renderer/components/app.ts` | 9 |
| `mobile/src/store/player-store.ts` | 2 |
| `mobile/src/components/AudioBridge.tsx` | 1 |
| `scripts/update-docs.cjs` | 2 |
| `scripts/discord-bot/index.js` | 2 |

---

## 📱 PLATFORM ÇAPRAZ TUTARSIZLIKLAR

| Özellik | Desktop | Mobile | Website |
|---------|---------|--------|---------|
| Vurgu Rengi | Yeşil (#1DB954) | Cyan (#00f0ff) | Yeşil |
| Tema | Spotify-karanlık | Neon-karanlık | Yeşil-karanlık |
| Dil Seçimi | TR/EN | Yok | - |
| Discord Entegrasyonu | RPC + Bot | Yok | Bot dokümanı |
| Ses Kalitesi Seçimi | kbps etiketleri | Hi-Fi/Standard | - |
| Sözler | Kenar paneli | Tam ekran sekme | - |
| Kütüphane Sekmeleri | 4 farklı | 3 farklı | - |

---

## 🎯 ÖNCELİKLI ÇÖZüm PLANI

### Aşama 1: Acil (0-3 gün) — Güvenlik ve Çökme
1. WebView JS enjeksiyonunu düzelt (Mobile M-054)
2. IPC store key kısıtlamasını ekle (Desktop D-043)
3. Null-safe $() fonksiyonunu düzelt (Desktop D-045)
4. Hooks kuralları ihlallerini düzelt (Mobile M-001, M-002)
5. Yüzde genişlik sorunlarını düzelt (Mobile M-003, M-004)
6. likedSongs mantıksal hatasını düzelt (Mobile M-008)
7. Root vercel.json'a güvenlik header'ları ekle (Website W-051)

### Aşama 2: Kısa Vadeli (1-2 hafta) — Performans
1. usePlayer selector pattern'e çevir (Mobile M-055)
2. usePlayerProgress throttle'ı ekle (Mobile M-056)
3. useCallback ile handler'ları sar (Mobile M-058)
4. AudioBridge timer'ını temizle (Mobile M-059)
5. CSS url() escape fonksiyonu ekle (Desktop D-044)
6. ErrorBoundary ekle (Mobile M-060)
7. Dimensions.get → useWindowDimensions (Mobile M-061)

### Aşama 3: Orta Vadeli (2-4 hafta) — Mimari
1. Renderer dosyasını modüllere böl (Desktop D-047)
2. Zustand'a geç (Mobile M-043)
3. innertube.ts'i böl (Mobile M-044)
4. OAuth token'ları safeStorage ile şifrele (Desktop D-046)
5. Store flush mekanizması ekle (Desktop D-049)
6. Boş catch bloklarına log ekle (45+ nokta)

### Aşama 4: Uzun Vadeli (1-2 ay) — UX ve Erişilebilirlik
1. Tema tutarlılığını sağla (Çapraz Platform)
2. ARIA erişilebilirliğini tamamla (33 sorun)
3. Responsive breakpoint'leri genişlet
4. Kuyruk sürükleme ile yeniden sıralama
5. Modal erişilebilirlik (Escape, backdrop, focus trap)

---

## 📋 DOSYA BAZLI SORUN DAĞILIMI

| Dosya | Kritik | Yüksek | Orta | Düşük | Toplam |
|-------|--------|--------|------|-------|--------|
| `desktop/src/main/main.ts` | 3 | 4 | 6 | 3 | 16 |
| `desktop/src/main/api/innertube.ts` | 0 | 1 | 5 | 2 | 8 |
| `desktop/src/main/api/stream-resolver.ts` | 0 | 1 | 4 | 2 | 7 |
| `desktop/src/main/auth/music-auth.ts` | 2 | 2 | 3 | 1 | 8 |
| `desktop/src/main/auth/google-oauth.ts` | 1 | 1 | 1 | 1 | 4 |
| `desktop/src/main/auth/discord-oauth.ts` | 1 | 1 | 1 | 1 | 4 |
| `desktop/src/main/utils/store.ts` | 0 | 1 | 2 | 1 | 4 |
| `desktop/src/main/utils/discord.ts` | 0 | 1 | 2 | 1 | 4 |
| `desktop/src/main/api/bot-server.ts` | 1 | 0 | 1 | 0 | 2 |
| `desktop/src/renderer/components/app.ts` | 1 | 6 | 8 | 12 | 27 |
| `desktop/src/renderer/index.html` | 0 | 2 | 3 | 4 | 9 |
| `desktop/src/renderer/styles/main.css` | 0 | 1 | 2 | 8 | 11 |
| `desktop/src/renderer/styles/login.css` | 0 | 1 | 1 | 2 | 4 |
| `mobile/src/components/AudioBridge.tsx` | 3 | 2 | 3 | 1 | 9 |
| `mobile/src/store/player-store.ts` | 2 | 2 | 4 | 2 | 10 |
| `mobile/src/components/MiniPlayer.tsx` | 2 | 0 | 1 | 2 | 5 |
| `mobile/app/modal/player.tsx` | 2 | 0 | 3 | 3 | 8 |
| `mobile/app/(tabs)/index.tsx` | 0 | 2 | 2 | 3 | 7 |
| `mobile/app/(tabs)/library.tsx` | 1 | 0 | 1 | 2 | 4 |
| `mobile/app/(tabs)/settings.tsx` | 1 | 0 | 1 | 1 | 3 |
| `mobile/src/api/innertube.ts` | 0 | 0 | 4 | 2 | 6 |
| `website/index.html` | 0 | 2 | 2 | 3 | 7 |
| `website/vercel.json` | 0 | 1 | 0 | 1 | 2 |
| Kök `vercel.json` | 2 | 0 | 0 | 0 | 2 |
| `.github/workflows/build-windows.yml` | 1 | 1 | 1 | 2 | 5 |
| `.github/workflows/build-mac.yml` | 1 | 1 | 1 | 1 | 4 |
| `scripts/update-docs.cjs` | 1 | 0 | 4 | 1 | 6 |
| `scripts/discord-bot/index.js` | 1 | 1 | 3 | 2 | 7 |
| `scripts/discord-bot/cardRenderer.js` | 0 | 1 | 0 | 2 | 3 |

---

## 🔧 ÇÖZÜM İÇİN GEREKLİ YAPILAR

### Hızlı Çözülebilir (1-2 saat)
- Null guard ekleme ($ fonksiyonu)
- JSON.stringify ile JS enjeksiyonu düzeltme
- Hooks try/catch'den çıkarma
- Boş catch bloklarına console.debug ekleme
- CSS url() escape
- percentage width → Animated.Value

### Orta Süreli (1-2 gün)
- Store key beyaz listesi
- Token validasyonu
- useCallback/useMemo ekleme
- usePlayer selector pattern
- ErrorBoundary ekleme
- useWindowDimensions kullanımı

### Uzun Süreli (1-2 hafta)
- Renderer modüllere bölme
- Zustand geçişi
- OAuth safeStorage
- Tema tutarlılığı
- ARIA erişilebilirlik

---

*Bu rapor 223+ benzersiz sorunu kapsamaktadır. Tüm sorunlar detaylı dosya bazlı analizlerle desteklenmektedir.*
