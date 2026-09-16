# Mobile Uygulaması - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** React Native (Expo Router)  
> **Toplam Sorun:** 61  
> **Önem Dereceleri:** Kritik: 10 | Yüksek: 6 | Orta: 22 | Düşük: 23

---

## 🔴 KRİTİK - Çalışma Zamanı Hataları

### M-001: Hooks Kuralları İhlali - MiniPlayer'da try/catch İçinde useRouter
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Satır** | 14-17 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `useRouter()` try/catch bloğu içinde çağrılıyor. React Hook'ları koşullu olarak çağrılamaz — bu Hooks Kuralları'nı ihlal eder ve öngörülemeyen davranışlara veya çökmelere neden olur.

```tsx
// Hatalı
try {
  router = useRouter();  // Hook koşullu çalışıyor
} catch { router = null; }
```

**Çözüm:** useRouter her zaman bileşenin üst düzeyinde çağrılmalı, hata yönetimi try/catch yerine koşullu render ile yapılmalı.

---

### M-002: Hooks Kuralları İhlali - Player Modal'da try/catch İçinde useRouter
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 29-32 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** Aynı sorun — `useRouter()` try/catch içinde. Bu runtime crash'e neden olur.

---

### M-003: React Native'de Yüzde Genişlik Kullanımı - MiniPlayer
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Satır** | 48 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `{ width: \`${progressPercent}%\` }` — React Native `View` bileşeni `width` özelliği için yüzde stringlerini desteklemez. Bu layout bozulmasına neden olur.

**Çözüm:** `Animated.Value` veya sayısal değer kullanılmalı.

---

### M-004: React Native'de Yüzde Genişlik Kullanımı - Player Modal
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 199 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `progressBarFill` için aynı yüzde string sorunu.

---

### M-005: Güvensiz JavaScript Enjeksiyonu - Video ID
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 210 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `injectJavaScript(\`window.playSong('${id}')\`)` — ham video ID'si JS'e dezenfekte edilmeden enjekte ediliyor. Şarkı ID'si `'` veya `)` içerirse kırılır veya enjeksiyon saldırısı mümkün olur.

**Çözüm:** `JSON.stringify(id)` veya white-list doğrulaması kullanılmalı.

---

### M-006: WebView mixedContentMode Güvenlik Açığı
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 289 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `mixedContentMode="always"` — HTTPS WebView'da HTTP içeriğine izin veriyor, potansiyel güvenlik riski.

---

### M-007: WebView originWhitelist Açık
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 276 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `originWhitelist={['*']}` — WebView'dan herhangi bir URL'e gezinmeye izin veriyor.

---

### M-008: likedSongs Mantıksal Hatası
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/library.tsx` |
| **Satır** | 28 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `likedSongs` `recentlyPlayed` dizisi filtrelenerek hesaplanıyor. Beğenilen bir şarkı yakın zamanda çalınmamışsa "Beğenilenler" listesinde görünmez. Ayrı bir beğenilen şarkılar listesi tutulmalı.

**Kullanıcı Etkisi:** Kullanıcılar beğendikleri şarkıları kaybedebilir.

---

### M-009: autoPlay Kaydedilmiyor
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/settings.tsx` |
| **Satır** | 25 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `autoPlay` durumu yerel `useState` ile tutuluyor ve AsyncStorage'a kaydedilmiyor. Navigasyon veya yeniden yükleme sonrasında ayar kayboluyor.

---

### M-010: strict: false — Tüm Tip Hatalarını Gizliyor
| | |
|---|---|
| **Dosya** | `mobile/tsconfig.json` |
| **Satır** | 13 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `"strict": false` tüm sıkı tip kontrolünü devre dışı bırakıyor. Null kontrolleri, örtük any ve diğer potansiyel hatalar gizleniyor.

---

## 🟠 YÜKSEK - Performans

### M-011: React.memo Eksik - SongRow
| | |
|---|---|
| **Dosya** | `mobile/src/components/SongRow.tsx` |
| **Satır** | 16 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `SongRow` `React.memo` ile sarılmamış. Her üst bileşen yeniden render olduğunda tüm şarkı satırları yeniden render oluyor. Liste performansı için ciddi sorun.

**Çözüm:**
```tsx
export default React.memo(SongRow);
```

---

### M-012: ScrollView Yerine FlatList Kullanılmaması
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 302-308 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** 25'e kadar `SongRow` öğesi dikey `ScrollView` içinde render ediliyor — sanallaştırma yok. Tüm öğeler aynı anda DOM'a ekleniyor.

**Çözüm:** `FlatList` kullanılmalı.

---

### M-013: Yatay ScrollView'da Eş Zamanlı Görüntü Yükleme
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 168-201 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** 10 adede kadar 170x170 `Image` bileşeni içeren yatay `ScrollView` — lazy loading yok, tüm görseller eş zamanlı yükleniyor.

---

### M-014: AudioBridge WebView 300ms setInterval
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 125-166 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** WebView içinde 300ms aralıklarla `injectJavaScript` ile ağır köprü trafiği. `requestAnimationFrame` veya daha uzun aralık kullanılmalı.

---

### M-015: usePlayer Her Bildirimde Yeni Nesne Oluşturuyor
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 349-358 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `usePlayer` her store bildiriminde `{ ...playerStore.getState() }` ile yeni bir nesne spread'i oluşturuyor. Bu, yalnızca bir alan değişse bile tüm abonelerin yeniden render olmasına neden oluyor.

**Çözüm:** `useSyncExternalStore` veya seçici abonelik kullanılmalı.

---

### M-016: usePlayerProgress Aynı Sorun
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 361-374 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** İlerleme her 300ms'de bir tam durum kopyasıyla bildiriliyor — ağır yeniden render.

---

## 🟡 ORTA - TypeScript / Tip Hataları

### M-017: Boş QueueItem Arayüzü
| | |
|---|---|
| **Dosya** | `mobile/src/types/index.ts` |
| **Satır** | 19 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `QueueItem extends Song` boş bir arayüz — hiçbir değer eklemiyor, ölü tip.

---

### M-018: playerModalOpen AsyncStorage'a Kaydedilmiyor
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 19 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `playerModalOpen` PlayerState'e eklendiği için AsyncStorage'a kaydedilmiyor, yeniden yükleme sonrasında sıfırlanıyor.

---

### M-019: Tab Layout'da `color: any` Kullanımı
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/_layout.tsx` |
| **Satır** | 23, 32, 41, 50 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `color: any` — tip `string` olmalı.

---

### M-020: Player Modal Props Tanımsız
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 28 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `onClose?: () => void` props'u kabul ediliyor ama expo-router bileşenlere props geçirmez. `onClose` her zaman undefined.

---

### M-021: MiniPlayer'da `router: any` Kullanımı
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Satır** | 14 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `router: any = null` — `ReturnType<typeof useRouter> | null` olmalı.

---

### M-022: Song | Album Tip Koruması Kırılgan
| | |
|---|---|
| **Dosya** | `mobile/src/api/innertube.ts` |
| **Satır** | 273-276 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `'duration' in parsed` ile duck-typing güvenilir değil — `Song.duration` 0 (falsy) olabilir.

---

## 🟡 ORTA - Yanlış Yapılandırma / Ölü Kod

### M-023: Kullanılmayan `react-native-youtube-iframe` Bağımlılığı
| | |
|---|---|
| **Dosya** | `mobile/package.json` |
| **Satır** | 29 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Bağımlılık listesinde ama hiçbir yerde import edilmiyor.

---

### M-024: Kullanılmayan `react-native-reanimated` Plugin'i
| | |
|---|---|
| **Dosya** | `mobile/babel.config.js` |
| **Satır** | 5 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Plugin listesinde ama hiçbir bileşende kullanılmıyor.

---

### M-025: Ölü expo-audio Kod Yolu
| | |
|---|---|
| **Dosya** | `mobile/src/services/player.ts` |
| **Satır** | 14-151 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `MobilePlayerService` hem `bridge` hem `expo-audio` çift oynatma yolu sunuyor ama `this.player` (expo-audio) hiç oluşturulmuyor — ölü kod.

---

### M-026: clearAllCache Yanıltıcı İsim
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 340-344 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `clearAllCache()` yalnızca `recentlyPlayed`'ı temizliyor — `clearRecentlyPlayed()` ile aynı. Yanıltıcı isim.

---

### M-027: Tema Stili Ölü UI
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/settings.tsx` |
| **Satır** | 162 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** "Tema Stili" satırı sabit "Koyu Metro" metni gösteriyor — gerçek tema geçişi yok.

---

### M-028: artists Dizisi Boş Dönüyor
| | |
|---|---|
| **Dosya** | `mobile/src/api/innertube.ts` |
| **Satır** | 221 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `artists` dizisi her zaman boş dönüyor — `parseSong` ve `parseTwoRow` sanatçı nesnelerini doldurmuyor.

---

### M-029: Arama Sonuçları Filtreleniyor
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/search.tsx` |
| **Satır** | 61-68 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** API'den gelen `albums` ve `artists` sonuçları tamamen atılıyor — "Albümler" ve "Sanatçılar" sekmeleri hiçbir şey döndürmüyor.

---

### M-030: Twice setAudioModeAsync Çağrısı
| | |
|---|---|
| **Dosya** | `mobile/app/_layout.tsx:12-17` ve `mobile/src/services/player.ts:35` |
| **Satır** | 12-17, 35 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `setAudioModeAsync` hem `RootLayout` hem de `MobilePlayerService.configureAudio()` içinde çağrılıyor — gereksiz çifte yapılandırma.

---

### M-031: metro.config.js Tüm Üst Dizini İzliyor
| | |
|---|---|
| **Dosya** | `mobile/metro.config.js` |
| **Satır** | 10 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `config.watchFolders = [workspaceRoot]` tüm üst dizini izliyor — ilgisi olmayan projeleri indeksleyebilir, derlemeleri yavaşlatır.

---

### M-032: nodeModulesPaths Çatışma Riski
| | |
|---|---|
| **Dosya** | `mobile/metro.config.js` |
| **Satır** | 13-16 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `nodeModulesPaths` workspace root `node_modules`'ı dahil ediyor — farklı bağımlılık sürümleriyle çatışma riski.

---

### M-033: EAS iOS Simulator Hedefi
| | |
|---|---|
| **Dosya** | `mobile/eas.json` |
| **Satır** | 16-17 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** iOS preview build'i simülatörü hedefliyor (`"simulator": true`) — gerçek cihaz özelliklerini (arka plan ses oynatma) test edemezsiniz.

---

### M-034: Android API 34 İzni Belirtilmemiş
| | |
|---|---|
| **Dosya** | `mobile/app.json` |
| **Satır** | 30-34 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `FOREGROUND_SERVICE_MEDIA_PLAYBACK` Android 14+ (API 34) izni. `compileSdkVersion` veya `targetSdkVersion` belirtilmemiş.

---

## 🟡 ORTA - Eksik Hata Yönetimi

### M-035: innertube.ts'de Ağ Hatası Yeniden Deneme Yok
| | |
|---|---|
| **Dosya** | `mobile/src/api/innertube.ts` |
| **Satır** | 38-50 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Tek `fetch` çağrısı, 12s timeout, başarısız olursa sessizce çağrıcıya dönüyor.

---

### M-036: play() Hatası Sessiz
| | |
|---|---|
| **Dosya** | `mobile/src/services/player.ts` |
| **Satır** | 49-68 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `play()` hataları yakalanıyor ama kullanıcıya geri bildirim gösterilmiyor — sessiz başarısızlık.

---

### M-037: getNext() Yakalanmamış Reddetti
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 340-343 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `mobileApigetNext()` promise'i `.catch()` içermiyor — yakalanmamış reddetme.

---

### M-038: getNext() Boş catch
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 84-89 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `mobileApi.getNext()` içinde boş `.catch()` — hatalar görünmez.

---

### M-039: WebView Mesaj Ayrıştırması Genel catch
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 267-269 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** Genel `catch(e)` — hatalı veri için spesifik yönetim yok.

---

### M-040: Boş catch Blokları
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 84, 98 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** JSON ayrıştırma hatalarını sessizce yutan boş `catch {}` blokları.

---

## 🟡 ORTA - Mimari Sorunlar

### M-041: AudioBridge'de 200+ Satırlık Ham HTML/JS String
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 7-202 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** TSX dosyasında 200+ satırlık ham HTML/JS string — test edilemez, sözdizimi vurgulaması yok, lint edilemez.

---

### M-042: Ad-Blocker Mantığı Kırılgan
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 130-157 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** WebView'da DOM sorgularıyla (`document.querySelector('.ad-showing')`) çalışan ad-blocker mantığı kırılgan — YouTube sınıf adlarını değiştirirse bozulur.

---

### M-043: Özel Store Yeniden icadı
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 36-345 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** Zustand/Jotai yerine özel store uygulaması — abonelik, dayanıklılık ve hook'ları yeniden icat ediyor.

---

### M-044: innertube.ts 600 Satır Tek Dosyada
| | |
|---|---|
| **Dosya** | `mobile/src/api/innertube.ts` |
| **Satır** | 1-603 |
| **Önem** | 🟡 ORTA |
**Durum** | Açık |

**Açıklama:** Tüm YouTube Music InnerTube API istemcisi tek dosyada — test etmek, mock'lamak veya değiştirmek zor.

---

## 🔵 DÜŞÜK - UX / Mantıksal Hatalar

### M-045: Shuffle ile Önyargılı Rastgele
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 170-188 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** `getNextSong()` ile shuffle'da `randIdx === queueIndex` olursa yalnızca 1 artırılıyor — tahmin edilebilir model.

---

### M-046: playNext() Yarış Koşulu
| | |
|---|---|
| **Dosya** | `mobile/src/services/player.ts` |
| **Satır** | 126-142 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** `getNextSong()` durumu (queueIndex) değiştiriyor, ardından `if (nextSong && nextSong.id !== currentSong?.id)` kontrolü yapılıyor — durum kontrolden önce değişmiş.

---

### M-047: Seek Bar Konum Hesaplaması Yanlış
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 186-196 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** Seek bar `onPress` `locationX`'i kullanıyor ama hit box'ın padding/margin hesaba katılmıyor — konum hatalı olacak.

---

### M-048: stopPropagation React Native'de Çalışmıyor
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Satır** | 84-86 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** `e.stopPropagation()` `TouchableOpacity` basma olayında — React Native'de native dokunma olaylarında DOM olay yayılımı yok.

---

## 🔵 DÜŞÜK - Kod Kalitesi / Ölü Kod

### M-049: Kullanılmayan AudioStatus Import
| | |
|---|---|
| **Dosya** | `mobile/src/services/player.ts` |
| **Satır** | 1 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

---

### M-050: Lazy-Load Edilebilecek mobileApi Import
| | |
|---|---|
| **Dosya** | `mobile/src/services/player.ts` |
| **Satır** | 3 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

---

### M-051: Hardcoded require Yolu
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 106-108 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** `require('../../assets/icon.png')` — dizin yapısı değişirse kırılır.

---

### M-052: Lyrics Key olarak Dizin İndeksi
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 300 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

**Açıklama:** Lyrics `map` dizin indeksini key olarak kullanıyor — lyrics yeniden yüklenirse titremeye neden olabilir.

---

## 🔵 DÜŞÜK - Kullanılmayan Bağımlılıklar

### M-053: react-native-worklets
| | |
|---|---|
| **Dosya** | `mobile/package.json` |
| **Satır** | 28 |
| **Önem** | 🔵 DÜŞÜK |
**Durum** | Açık |

---

## Özet Tablosu

| # | Sorun | Önem | Dosya | Satır |
|---|-------|------|-------|-------|
| M-001 | Hooks ihlali - MiniPlayer | 🔴 KRİTİK | MiniPlayer.tsx | 14-17 |
| M-002 | Hooks ihlali - Player | 🔴 KRİTİK | player.tsx | 29-32 |
| M-003 | Yüzde genişlik - MiniPlayer | 🔴 KRİTİK | MiniPlayer.tsx | 48 |
| M-004 | Yüzde genişlik - Player | 🔴 KRİTİK | player.tsx | 199 |
| M-005 | JS enjeksiyonu | 🔴 KRİTİK | AudioBridge.tsx | 210 |
| M-006 | mixedContentMode | 🔴 KRİTİK | AudioBridge.tsx | 289 |
| M-007 | originWhitelist açık | 🔴 KRİTİK | AudioBridge.tsx | 276 |
| M-008 | likedSongs mantıksal hata | 🔴 KRİTİK | library.tsx | 28 |
| M-009 | autoPlay kaydedilmiyor | 🔴 KRİTİK | settings.tsx | 25 |
| M-010 | strict: false | 🔴 KRİTİK | tsconfig.json | 13 |
| M-011 | React.memo eksik | 🟠 YÜKSEK | SongRow.tsx | 16 |
| M-012 | ScrollView yerine FlatList | 🟠 YÜKSEK | index.tsx | 302-308 |
| M-013 | Eş zamanlı görsel yükleme | 🟠 YÜKSEK | index.tsx | 168-201 |
| M-014 | WebView 300ms interval | 🟠 YÜKSEK | AudioBridge.tsx | 125-166 |
| M-015 | usePlayer nesne spread'i | 🟠 YÜKSEK | player-store.ts | 349-358 |
| M-016 | usePlayerProgress aynı | 🟠 YÜKSEK | player-store.ts | 361-374 |
| M-017 | Boş QueueItem | 🟡 ORTA | types/index.ts | 19 |
| M-018 | playerModalOpen kaydetme | 🟡 ORTA | player-store.ts | 19 |
| M-019 | color: any | 🟡 ORTA | _layout.tsx | 23,32,41,50 |
| M-020 | Player props tanımsız | 🟡 ORTA | player.tsx | 28 |
| M-021 | router: any | 🟡 ORTA | MiniPlayer.tsx | 14 |
| M-022 | Song/Album tip koruması | 🟡 ORTA | innertube.ts | 273-276 |
| M-023 | youtube-iframe ölü | 🟡 ORTA | package.json | 29 |
| M-024 | reanimated ölü plugin | 🟡 ORTA | babel.config.js | 5 |
| M-025 | expo-audio ölü yol | 🟡 ORTA | player.ts | 14-151 |
| M-026 | clearAllCache yanıltıcı | 🟡 ORTA | player-store.ts | 340-344 |
| M-027 | Tema stili ölü UI | 🟡 ORTA | settings.tsx | 162 |
| M-028 | artists boş dönüyor | 🟡 ORTA | innertube.ts | 221 |
| M-029 | Arama sonuçları filtreleniyor | 🟡 ORTA | search.tsx | 61-68 |
| M-030 | Çifte setAudioModeAsync | 🟡 ORTA | _layout.tsx, player.ts | - |
| M-031 | watchFolders geniş | 🟡 ORTA | metro.config.js | 10 |
| M-032 | nodeModulesPaths çatışma | 🟡 ORTA | metro.config.js | 13-16 |
| M-033 | iOS simulator hedef | 🟡 ORTA | eas.json | 16-17 |
| M-034 | Android API 34 izni | 🟡 ORTA | app.json | 30-34 |
| M-035 | Ağ hatası yeniden deneme yok | 🟡 ORTA | innertube.ts | 38-50 |
| M-036 | play() sessiz hata | 🟡 ORTA | player.ts | 49-68 |
| M-037 | getNext() yakalanmamış | 🟡 ORTA | player.tsx | 340-343 |
| M-038 | getNext() boş catch | 🟡 ORTA | index.tsx | 84-89 |
| M-039 | WebView mesaj ayrıştırma | 🟡 ORTA | AudioBridge.tsx | 267-269 |
| M-040 | Boş catch blokları | 🟡 ORTA | player-store.ts | 84, 98 |
| M-041 | 200+ satırlık ham HTML | 🟡 ORTA | AudioBridge.tsx | 7-202 |
| M-042 | Ad-blocker kırılgan | 🟡 ORTA | AudioBridge.tsx | 130-157 |
| M-043 | Store yeniden icadı | 🟡 ORTA | player-store.ts | 36-345 |
| M-044 | 600 satır tek dosya | 🟡 ORTA | innertube.ts | 1-603 |
| M-045 | Shuffle önyargılı | 🔵 DÜŞÜK | player-store.ts | 170-188 |
| M-046 | playNext() yarış koşulu | 🔵 DÜŞÜK | player.ts | 126-142 |
| M-047 | Seek bar konum hatası | 🔵 DÜŞÜK | player.tsx | 186-196 |
| M-048 | stopPropagation çalışmıyor | 🔵 DÜŞÜK | MiniPlayer.tsx | 84-86 |
| M-049 | AudioStatus ölü import | 🔵 DÜŞÜK | player.ts | 1 |
| M-050 | mobileApi lazy-load | 🔵 DÜŞÜK | player.ts | 3 |
| M-051 | Hardcoded require | 🔵 DÜŞÜK | index.tsx | 106-108 |
| M-052 | Lyrics key indeks | 🔵 DÜŞÜK | player.tsx | 300 |
| M-053 | worklets ölü | 🔵 DÜŞÜK | package.json | 28 |
