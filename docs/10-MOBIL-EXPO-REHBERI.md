# 📱 10. Mobil (Expo - Android & iOS) Geliştirme Rehberi

> **Aquality Music Mobil Mimari ve Uygulama Kılavuzu**  
> Bu belge, mevcut Aquality Music masaüstü mimarisinin (API, mantık ve durum yönetimi) **Expo (React Native)** kullanılarak **Android** ve **iOS** platformlarına nasıl dönüştürüleceğini adım adım açıklar.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-11 22:32` |
| **Proje Sürümü** | `v1.0.0` (Masaüstü: `v1.0.0`, Web: `v1.0.0`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `443cd06 - fix(ci): optimize macos dmg build without 7zip-bin (5 minutes ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 21 / 21 Çözüldü (%100 Başarı) |
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

### 📑 Faz 3: InnerTube API ve Mobil Akış (Stream) Çözümleyici
- **Masaüstü Farkı**: Masaüstünde gizli `BrowserWindow` kullanıyorduk. Mobilde ise `innertube.ts` motoru doğrudan `player` endpoint'inden ayrıştırılan ses akış URL'lerini (`audio/webm` veya `audio/mp4`) alır ve `TrackPlayer.add({ url: streamUrl })` şeklinde yerel oynatıcıya iletir.
- **Reklam Atlama**: Ses formatı doğrudan çekildiği için video arayüz reklamları doğal olarak sıfıra iner.

---

### 📑 Faz 4: Mobil Navigasyon ve Ekran Tasarımı (Spotify Standardı)
`expo-router` ile Spotify mobil deneyiminin birebir aynısı kurulur:

1. **Alt Menü Çubuğu (Bottom Tab Bar)**:
   - 🏠 **Ana Sayfa (`app/(tabs)/index.tsx`)**: Günün önerileri, yeni çıkanlar ve hızlı çalma listeleri.
   - 🔍 **Ara (`app/(tabs)/search.tsx`)**: Anlık arama, tür kartları ve popüler sanatçılar.
   - 📚 **Kitaplığım (`app/(tabs)/library.tsx`)**: Çalma listeleri, beğenilen şarkılar ve sanatçılar.
   - ⚙️ **Ayarlar (`app/(tabs)/settings.tsx`)**: Ses kalitesi, tema ve dil seçimi.
2. **Yüzen Mini Oynatıcı (Floating Mini-Player)**:
   - Alt sekmelerin hemen üzerinde sabit durur.
   - Şarkı kapağı, başlık, oynat/duraklat butonu ve minik ilerleme çubuğu içerir.
3. **Tam Ekran Oynatıcı Modalı (Full Player Modal)**:
   - Mini oynatıcıya tıklandığında aşağıdan yukarı doğru yumuşakça açılır (`presentation: 'modal'`).
   - Büyük albüm kapağı, canlı 3 barlı ekolayzır, şarkı sözleri çekmecesi ve sıradaki parçalar listesi.

---

### 📑 Faz 5: Kullanıcı Girişi (Google & YouTube Music Auth)
- **`expo-web-browser` ve `expo-auth-session`**: Kullanıcıya güvenli bir sistem tarayıcı sayfası açarak YouTube Music girişini sağlar.
- **Çerez Saklama**: Elde edilen `LOGIN_INFO` ve `SAPISID` çerezleri Android Keystore ve iOS Keychain ile korunan `expo-secure-store` içine şifreli yazılır.

---

### 📑 Faz 6: Veri Kalıcılığı ve Çevrimdışı Mod
- `desktop/src/main/utils/store.ts` yerine React Native için `@react-native-async-storage/async-storage` veya `react-native-mmkv` kullanılır.
- Beğenilen şarkılar, arama geçmişi ve son çalınanlar diske anında kaydedilir.

---

### 📑 Faz 7: Windows Üzerinden Bulut Derleme (EAS Build)
Mac bilgisayara sahip olmadan Windows üzerinden hem **Android APK** hem de **iOS IPA** oluşturma:

1. **EAS CLI Kurulumu**:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Yapılandırma (`mobile/eas.json`)**:
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         },
         "ios": {
           "simulator": true
         }
       },
       "production": {}
     }
   }
   ```
3. **Tek Komutla Android APK Üretme (Bulutta)**:
   ```bash
   cd mobile && eas build -p android --profile preview
   ```
   *Expo sunucuları APK dosyasını derler ve telefonunuza doğrudan indirebileceğiniz bir karekod (QR Code) ve indirme linki verir.*
4. **Tek Komutla iOS Çıktısı Üretme (Bulutta - Mac Gerektirmez)**:
   ```bash
   cd mobile && eas build -p ios --profile preview
   ```

---

## 🛠️ 3. Mobil Proje Dizin Yapısı Taslağı

```
mobile/
├── app/                      # Expo Router Ekranları
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Alt Menü (Bottom Tabs)
│   │   ├── index.tsx         # Ana Sayfa
│   │   ├── search.tsx        # Arama Ekranı
│   │   ├── library.tsx       # Kitaplık
│   │   └── settings.tsx      # Ayarlar
│   ├── modal/
│   │   ├── player.tsx        # Tam Ekran Oynatıcı
│   │   └── queue.tsx         # Oynatma Kuyruğu
│   └── _layout.tsx           # Kök Yığın (Root Stack)
├── src/
│   ├── api/                  # InnerTube API (Masaüstüyle paylaşılan motor)
│   ├── components/           # MiniPlayer, SongItem, Equalizer, AlbumCard
│   ├── hooks/                # usePlayer, useQueue, useTheme
│   ├── services/             # TrackPlayer Servisi
│   └── store/                # Zustand / Redux / Context Durum Yönetimi
├── assets/                   # Mobil İkonlar, Splash Ekranı
├── app.json                  # Expo Konfigürasyonu
└── package.json
```

---

## 🎯 4. Başlangıç Kontrol Listesi (Checklist)

- [ ] Monorepo `workspaces` ayarına `mobile` eklenmesi.
- [ ] Expo TypeScript projesinin oluşturulması.
- [ ] `react-native-track-player` entegrasyonu ve Android `AndroidManifest.xml` izinleri (`WAKE_LOCK`, `FOREGROUND_SERVICE`).
- [ ] `desktop/src/main/api/innertube.ts` motorunun mobil uyumlu hale getirilmesi.
- [ ] Spotify temalı alt menü ve mini oynatıcı bileşeninin kodlanması.
- [ ] EAS Build ile ilk test Android APK'sının çıkarılması.
