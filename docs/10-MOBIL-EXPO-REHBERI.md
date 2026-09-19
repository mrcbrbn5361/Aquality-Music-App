# 📱 10. Mobil (Expo - Android & iOS) Geliştirme Rehberi

> **Aquality Music Mobil Mimari ve Uygulama Kılavuzu**  
> Bu belge, mevcut Aquality Music masaüstü mimarisinin (API, mantık ve durum yönetimi) **Expo (React Native)** kullanılarak **Android** ve **iOS** platformlarına nasıl dönüştürüleceğini adım adım açıklar.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-19 14:49` |
| **Proje Sürümü** | `v1.0.2` (Masaüstü: `v1.0.2`, Web: `v1.0.2`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `b2dba57 - fix(desktop): restore robust hybrid google login with login-preload, CDP, and fallback options (0 seconds ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 🗺️ 1. Genel Mobil Mimari ve Kod Paylaşımı

Mevcut monorepo yapımıza üçüncü bir workspace olarak `mobile` eklenecektir:

```mermaid
graph TD
    subgraph Shared_Core [Ortak Çekirdek - Core Logic]
        InnerTube[InnerTube API İstemcisi]
        Types[TypeScript Şarkı & Çalma Listesi Modelleri]
        i18n[Türkçe / İngilizce Sözlük]
    end

    subgraph Desktop_Workspace [desktop/ - Masaüstü]
        Electron[Electron 28 Main & Preload]
        WebUI[HTML5 + CSS + app.ts]
    end

    subgraph Mobile_Workspace [mobile/ - Expo React Native]
        ExpoRouter[expo-router Dosya Tabanlı Navigasyon]
        NativeUI[React Native Bileşenleri (View, Text, FlatList)]
        TrackPlayer[react-native-track-player (Arka Plan Ses & Kilit Ekranı)]
        SecureStore[expo-secure-store (Korumalı Token Deposu)]
    end

    Shared_Core --> Desktop_Workspace
    Shared_Core --> Mobile_Workspace
```

---

## 📋 2. Gerekli Dokümantasyon ve Uygulama Adımları Listesi

Mobil versiyonu eksiksiz ve sorunsuz inşa etmek için aşağıdaki 8 ana faz uygulanmalıdır:

### 📑 Faz 1: Proje Başlatma ve Monorepo Entegrasyonu
- **Hedef**: Kök dizindeki `package.json` içine `"workspaces": ["desktop", "website", "mobile"]` eklenmesi.
- **Komut**:
  ```bash
  npx create-expo-app mobile --template blank-typescript
  ```
- **Paketler**: `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-status-bar`.

---

### 📑 Faz 2: Arka Planda Müzik Çalma ve Kilit Ekranı (`react-native-track-player`)
Mobil bir müzik uygulamasında en kritik bileşen, ekran kapalıyken telefonun müziği kesmemesidir.

- **Kullanılacak Kütüphane**: `react-native-track-player` (Spotify kalitesinde yerel ses servisi).
- **Yetenekler**:
  - Bildirim çubuğunda şarkı kapağı, parça adı ve sanatçı bilgisi.
  - Kilit ekranında (Lock Screen) canlı seek bar (ilerleme çubuğu).
  - Bluetooth kulaklık (AirPods vb.) tek/çift tık oynatma/durdurma desteği.
  - Telefon çaldığında müziği otomatik durdurup arama bitince devam ettirme (Audio Focus).
- **Örnek Servis Tanımı (`mobile/src/services/playback-service.ts`)**:
  ```typescript
  import TrackPlayer, { Event } from 'react-native-track-player';

  export async function PlaybackService() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  }
  ```

---

### 📑 Faz 3: InnerTube API ve Expo Go Hibrit Ses Köprüsü (`AudioBridge.tsx`)
- **Expo Go Uyumluluğu**: Expo Go ortamında yerel C/Java modülleri derlenemediği için, YouTube Music iframe API motoru görünmez ve optimize edilmiş bir `react-native-webview` köprüsü (`AudioBridge.tsx`) üzerinden çalıştırılır.
- **Android & iOS Çözümleri**:
  - `expo-audio`'nun `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true })` yapılandırması kök layout'ta aktif edilir.
  - WebView `playsinline=1`, `enablejsapi=1`, `origin=https://www.youtube.com`, `allowsInlineMediaPlayback={true}` ve mobil Safari user-agent ayarlarıyla iOS WebKit kısıtlamaları aşılmıştır.
  - Akıllı reklam katili (Ad Killer), video reklamları anında fark edip 16x hıza alarak atlar.
  - Şarkı sözleri (Lyrics), YouTube Music InnerTube ve LRCLIB servislerinden anlık çekilir.

---

### 📑 Faz 4: Mobil Navigasyon ve Ekran Tasarımı (MetroList Standardı)
Spotify görünümünden tamamen bağımsız, modern ve minimalist **MetroList** tasarım dili uygulanmıştır:

1. **Alt Menü Çubuğu (Bottom Tab Bar)**:
   - 🏠 **Ana Sayfa (`app/(tabs)/index.tsx`)**: Hızlı Akış (Quick Picks), Zirvedeki Hit Parçalar (Top 50), Ruh Hali & Tür filtre çipleri.
   - 🔍 **Keşfet & Ara (`app/(tabs)/search.tsx`)**: Canlı InnerTube arama tamamlama önerileri, Metro tür kartları ve anlık filtreleme.
   - 📚 **Kitaplığım (`app/(tabs)/library.tsx`)**: Özel çalma listeleri (oluşturma, silme), beğenilenler ve dinleme geçmişi.
   - ⚙️ **Ayarlar (`app/(tabs)/settings.tsx`)**: Akıllı reklam katili, Hi-Fi 256k ses kalitesi, MetroList tema vurgu renkleri (Siber Mavi, Neon İndigo, Güneş Sarısı, Zümrüt).
2. **Yüzen Mini Oynatıcı (MetroList Floating MiniPlayer)**:
   - Tab bar'ın hemen üzerinde yüzen siber mavi kapsül kart.
   - Squircle albüm kapağı, animasyonlu ekolayzır, hızlı parça atlama ve neon ilerleme çizgisi.
3. **Çok Modlu Tam Ekran Oynatıcı (MetroList Multi-View Modal Player)**:
   - **Şarkı (Player)**: Büyük squircle albüm kapağı, interaktif scrubber, transport kontrolleri, repeat/shuffle.
   - **Sözler (Lyrics)**: Yüksek kontrastlı, temiz tipografili canlı şarkı sözü okuyucu.
   - **Sıradakiler (Queue)**: Çalma sırasındaki şarkılar, benzer parça radyo ekleyici.

---

### 📑 Faz 5: Veri Kalıcılığı ve Depolama
- React Native için `@react-native-async-storage/async-storage` kullanılır.
- Beğenilen şarkılar (`@aquality_liked`), çalma listeleri (`@aquality_playlists`), dinleme geçmişi (`@aquality_recent`), tema vurgusu (`@aquality_accent`) ve ses kalitesi (`@aquality_quality`) kalıcı olarak saklanır.

---

### 📑 Faz 6: Windows Üzerinden Bulut Derleme (EAS Build) & Expo Go
1. **Expo Go ile Anında Canlı Test (Tünel Modu)**:
   > ⚠️ **Önemli Not**: Proje bir monorepo yapısında olduğundan, kök dizinde `npx expo start` çalıştırmak yerine aşağıdaki yöntemlerden birini kullanmalısınız:
   ```bash
   # Yöntem 1 (Kök dizinden - En Kolay ve Önerilen):
   npm run mobile:tunnel

   # Yöntem 2 (mobile dizininden):
   cd mobile
   npx expo start --tunnel
   ```
   *Terminalde çıkan QR kodu telefonunuzdaki Expo Go uygulamasıyla (Android kamera/Expo Go, iOS Kamera) okutarak anında test edebilirsiniz.*

2. **EAS Build ile Bağımsız APK / IPA Üretme**:
   ```bash
   cd mobile && eas build -p android --profile preview
   ```

---

## 🛠️ 3. Mobil Proje Dizin Yapısı

```
mobile/
├── app/                      # Expo Router Ekranları
│   ├── (tabs)/
│   │   ├── _layout.tsx       # MetroList Koyu Navigasyon Tab Bar
│   │   ├── index.tsx         # Ana Sayfa (Quick Picks, Top 50, Moods)
│   │   ├── search.tsx        # Keşfet & Canlı Arama Önerileri
│   │   ├── library.tsx       # Kitaplık (Özel Listeler, Beğenilenler, Geçmiş)
│   │   └── settings.tsx      # Ayarlar (Reklam Katili, Hi-Fi Kalite, Temalar)
│   ├── modal/
│   │   └── player.tsx        # MetroList Çok Modlu Oynatıcı (Şarkı / Sözler / Kuyruk)
│   └── _layout.tsx           # Kök Layout & AudioBridge
├── src/
│   ├── api/
│   │   └── innertube.ts      # YouTube Music InnerTube & Şarkı Sözü Motoru
│   ├── components/
│   │   ├── AudioBridge.tsx   # Expo Go Android & iOS WebKit Ses Köprüsü
│   │   ├── Equalizer.tsx     # Siber Camgöbeği Dinamik Dalga Ekolayzır
│   │   ├── MiniPlayer.tsx    # Yüzen Kapsül Mini Oynatıcı
│   │   └── SongRow.tsx       # MetroList Squircle Parça Satırı
│   ├── services/
│   │   └── player.ts         # Mobil Oynatma Servisi
│   ├── store/
│   │   └── player-store.ts   # Zustand / AsyncStorage Kalıcı Durum Yönetimi
│   └── types/
│       └── index.ts          # TypeScript Arayüzleri (Song, Playlist, LyricsData, ThemeAccent)
├── assets/                   # Mobil İkon ve Splash Ekranı
├── app.json                  # Expo Konfigürasyonu
├── tsconfig.json             # TypeScript Konfigürasyonu
└── package.json
```

---

## 🎯 4. Tamamlanma Kontrol Listesi (Checklist)

- [x] Monorepo `workspaces` ayarına `mobile` entegrasyonu.
- [x] Expo Go Android & iOS ses oynatma motoru (`AudioBridge.tsx`) stabilizasyonu.
- [x] Spotify yeşili (`#1ed760`) ve tasarım çizgilerinin tamamen temizlenmesi.
- [x] MetroList esintili modern Obsidiyen & Siber Camgöbeği renk paleti.
- [x] MetroList Çok Modlu Oynatıcı: Şarkı, Şarkı Sözleri (Lyrics) ve Kuyruk sekmeleri.
- [x] Canlı InnerTube arama önerileri ve tür matrisi.
- [x] Kitaplıkta özel çalma listesi oluşturma/yönetme desteği.
- [x] TypeScript derleme doğrulaması (`npx tsc --noEmit` hatasız 0 hata).
