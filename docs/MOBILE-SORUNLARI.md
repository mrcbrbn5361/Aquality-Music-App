# Mobile Uygulaması - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** React Native (Expo Router)  
> **Toplam Sorun:** 20  
> **Önem Dereceleri:** Yüksek: 4 | Orta: 6 | Düşük: 10  
> **Durum:** Çözülen: 6 | Açık: 14

---

## 🔴 KRİTİK - ÇÖZÜLMÜŞ SORUNLAR

### ~~M-001: Hooks Kuralları İhlali - MiniPlayer'da try/catch İçinde useRouter~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Durum** | ✅ Çözüldü — useRouter try/catch dışına çıkarıldı |

### ~~M-002: Hooks Kuralları İhlali - Player Modal'da try/catch İçinde useRouter~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Durum** | ✅ Çözüldü — useRouter try/catch dışına çıkarıldı |

### ~~M-009: autoPlay Kaydedilmiyor~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/settings.tsx` |
| **Durum** | ✅ Çözüldü — autoPlay store'da tanımlı ve kullanılıyor |

### ~~M-011: React.memo Eksik - SongRow~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `mobile/src/components/SongRow.tsx` |
| **Durum** | ✅ Çözüldü — React.memo ile sarılmış |

### ~~M-018: playerModalOpen AsyncStorage'a Kaydedilmiyor~~ ✅ ÇÖZÜLDÜ
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Durum** | ✅ Çözüldü — Modal durumu kaydedilmiyor (kasıtlı tasarım) |

---

## 🔴 YÜKSEK - AÇIK SORUNLAR

### M-005: Güvensiz JavaScript Enjeksiyonu - Video ID
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 210 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `injectJavaScript(\`window.playSong('${id}')\`)` — ham video ID'si JS'e dezenfekte edilmeden enjekte ediliyor. Şarkı ID'si `'` veya `)` içerirse kırılır veya enjeksiyon saldırısı mümkün olur.

**Çözüm:** `JSON.stringify(id)` veya white-list doğrulaması kullanılmalı.

---

### M-006: WebView mixedContentMode Güvenlik Açığı
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 289 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `mixedContentMode="always"` — HTTPS WebView'da HTTP içeriğine izin veriyor, potansiyel güvenlik riski.

**Çözüm:** `mixedContentMode="never"` yapılmalı.

---

### M-007: WebView originWhitelist Açık
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 276 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `originWhitelist={['*']}` — WebView'dan herhangi bir URL'e gezinmeye izin veriyor.

**Çözüm:** `originWhitelist={['https://www.youtube.com']}` yapılmalı.

---

### M-008: likedSongs Mantıksal Hatası
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/library.tsx` |
| **Satır** | 28 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `likedSongs` `recentlyPlayed` dizisi filtrelenerek hesaplanıyor. Beğenilen bir şarkı yakın zamanda çalınmamışsa "Beğenilenler" listesinde görünmez.

**Çözüm:** Ayrı bir beğenilen şarkılar listesi tutulmalı.

---

## 🟡 ORTA - AÇIK SORUNLAR

### M-010: strict: false — Tüm Tip Hatalarını Gizliyor
| | |
|---|---|
| **Dosya** | `mobile/tsconfig.json` |
| **Satır** | 13 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `"strict": false` tüm sıkı tip kontrolünü devre dışı bırakıyor.

**Çözüm:** `"strict": true` yapılmalı.

---

### M-014: AudioBridge WebView 300ms setInterval
| | |
|---|---|
| **Dosya** | `mobile/src/components/AudioBridge.tsx` |
| **Satır** | 125-166 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** WebView içinde 300ms aralıklarla `injectJavaScript` ile ağır köprü trafiği.

**Çözüm:** `requestAnimationFrame` veya daha uzun aralık kullanılmalı.

---

### M-015: usePlayer Her Bildirimde Yeni Nesne Oluşturuyor
| | |
|---|---|
| **Dosya** | `mobile/src/store/player-store.ts` |
| **Satır** | 349-358 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `usePlayer` her store bildiriminde `{ ...playerStore.getState() }` ile yeni bir nesne spread'i oluşturuyor.

**Çözüm:** `useSyncExternalStore` veya seçici abonelik kullanılmalı.

---

### M-023: Kullanılmayan react-native-youtube-iframe Bağımlılığı
| | |
|---|---|
| **Dosya** | `mobile/package.json` |
| **Satır** | 29 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Bağımlılık listesinde ama hiçbir yerde import edilmiyor.

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

## 🔵 DÜŞÜK - AÇIK SORUNLAR

### M-012: ScrollView Yerine FlatList Kullanılmaması
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 302-308 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** 25'e kadar `SongRow` öğesi dikey `ScrollView` içinde render ediliyor — sanallaştırma yok.

---

### M-013: Yatay ScrollView'da Eş Zamanlı Görüntü Yükleme
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/index.tsx` |
| **Satır** | 168-201 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** 10 adede kadar 170x170 `Image` bileşeni içeren yatay `ScrollView` — lazy loading yok.

---

### M-017: Boş QueueItem Arayüzü
| | |
|---|---|
| **Dosya** | `mobile/src/types/index.ts` |
| **Satır** | 19 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `QueueItem extends Song` boş bir arayüz — hiçbir değer eklemiyor, ölü tip.

---

### M-019: Tab Layout'da `color: any` Kullanımı
| | |
|---|---|
| **Dosya** | `mobile/app/(tabs)/_layout.tsx` |
| **Satır** | 23, 32, 41, 50 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `color: any` — tip `string` olmalı.

---

### M-020: Player Modal Props Tanımsız
| | |
|---|---|
| **Dosya** | `mobile/app/modal/player.tsx` |
| **Satır** | 28 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `onClose?: () => void` props'u kabul ediliyor ama expo-router bileşenlere props geçirmez.

---

### M-021: MiniPlayer'da `router: any` Kullanımı
| | |
|---|---|
| **Dosya** | `mobile/src/components/MiniPlayer.tsx` |
| **Satır** | 14 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `router: any = null` — `ReturnType<typeof useRouter> | null` olmalı.

---

### M-022: Song | Album Tip Koruması Kırılgan
| | |
|---|---|
| **Dosya** | `mobile/src/api/innertube.ts` |
| **Satır** | 273-276 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `'duration' in parsed` ile duck-typing güvenilir değil.

---

### M-024: Kullanılmayan react-native-reanimated Plugin'i
| | |
|---|---|
| **Dosya** | `mobile/babel.config.js` |
| **Satır** | 5 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Plugin listesinde ama hiçbir bileşende kullanılmıyor.

---

### M-030: Twice setAudioModeAsync Çağrısı
| | |
|---|---|
| **Dosya** | `mobile/app/_layout.tsx:12-17` ve `mobile/src/services/player.ts:35` |
| **Satır** | 12-17, 35 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `setAudioModeAsync` hem `RootLayout` hem de `MobilePlayerService.configureAudio()` içinde çağrılıyor — gereksiz çifte yapılandırma.

---

### M-031: metro.config.js Tüm Üst Dizini İzliyor
| | |
|---|---|
| **Dosya** | `mobile/metro.config.js` |
| **Satır** | 10 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `config.watchFolders = [workspaceRoot]` tüm üst dizini izliyor — ilgisi olmayan projeleri indeksleyebilir.

---

## Özet Tablosu

| # | Sorun | Önem | Durum | Dosya | Satır |
|---|-------|------|-------|-------|-------|
| M-005 | JS enjeksiyonu | 🔴 YÜKSEK | Açık | AudioBridge.tsx | 210 |
| M-006 | mixedContentMode | 🔴 YÜKSEK | Açık | AudioBridge.tsx | 289 |
| M-007 | originWhitelist açık | 🔴 YÜKSEK | Açık | AudioBridge.tsx | 276 |
| M-008 | likedSongs mantıksal hata | 🔴 YÜKSEK | Açık | library.tsx | 28 |
| M-010 | strict: false | 🟡 ORTA | Açık | tsconfig.json | 13 |
| M-014 | WebView 300ms interval | 🟡 ORTA | Açık | AudioBridge.tsx | 125-166 |
| M-015 | usePlayer nesne spread'i | 🟡 ORTA | Açık | player-store.ts | 349-358 |
| M-023 | youtube-iframe ölü | 🟡 ORTA | Açık | package.json | 29 |
| M-025 | expo-audio ölü yol | 🟡 ORTA | Açık | player.ts | 14-151 |
| M-026 | clearAllCache yanıltıcı | 🟡 ORTA | Açık | player-store.ts | 340-344 |
| M-012 | ScrollView yerine FlatList | 🔵 DÜŞÜK | Açık | index.tsx | 302-308 |
| M-013 | Eş zamanlı görsel yükleme | 🔵 DÜŞÜK | Açık | index.tsx | 168-201 |
| M-017 | Boş QueueItem | 🔵 DÜŞÜK | Açık | types/index.ts | 19 |
| M-019 | color: any | 🔵 DÜŞÜK | Açık | _layout.tsx | 23,32,41,50 |
| M-020 | Player props tanımsız | 🔵 DÜŞÜK | Açık | player.tsx | 28 |
| M-021 | router: any | 🔵 DÜŞÜK | Açık | MiniPlayer.tsx | 14 |
| M-022 | Song/Album tip koruması | 🔵 DÜŞÜK | Açık | innertube.ts | 273-276 |
| M-024 | reanimated ölü plugin | 🔵 DÜŞÜK | Açık | babel.config.js | 5 |
| M-030 | Çifte setAudioModeAsync | 🔵 DÜŞÜK | Açık | _layout.tsx, player.ts | - |
| M-031 | watchFolders geniş | 🔵 DÜŞÜK | Açık | metro.config.js | 10 |
