# 📁 Klasör Denetimi: `mobile/` (Mobil Uygulama - React Native & Expo)

> **Modül Adı**: Aquality Music Mobile Client (Expo SDK 57, React Native 0.86, React 19)  
> **Dosya Sayısı**: 18 Dosya  
> **Toplam Satır**: ~3,200 Satır  
> **Hedef Platformlar**: Android 14+ (APK/AAB) & iOS 17+ (IPA)

---

## 🏗️ 1. Mimari Yapı ve Değerlendirme

`mobile/` klasörü, Aquality Music'in akıllı telefonlar için geliştirilmiş istemcisidir. Expo Router (dosya tabanlı yönlendirme) mimarisi üzerine kurulmuştur.

```
mobile/
├── app/
│   ├── _layout.tsx            # Kök layout, Safe Area sağlayıcı ve AudioBridge montajı
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Alt sekme çubuğu (Home, Search, Library, Settings)
│   │   ├── index.tsx          # Keşfet, Trendler ve Mood sekmeleri
│   │   ├── search.tsx         # Arama, filtreler ve sonuç listesi
│   │   ├── library.tsx        # Beğenilenler ve son çalınanlar
│   │   └── settings.tsx       # Ses kalitesi, adblock ve hakkında ayarları
│   └── modal/
│       └── player.tsx         # Tam ekran şarkı oynatıcı modalı
├── src/
│   ├── api/
│   │   └── innertube.ts       # Mobil için optimize edilmiş InnerTube istemcisi
│   ├── components/
│   │   ├── AudioBridge.tsx    # Gizli WebView ve YouTube IFrame API köprüsü
│   │   ├── Equalizer.tsx      # Spotify tarzı animasyonlu ekolayzır
│   │   ├── MiniPlayer.tsx     # Alt gezinme çubuğu üstündeki yüzen mini oynatıcı
│   │   └── SongRow.tsx        # Şarkı satır bileşeni ve beğeni butonu
│   ├── services/
│   │   └── player.ts          # Oynatıcı servis arabirimi
│   ├── store/
│   │   └── player-store.ts    # Zustand/Observer tarzı durum yöneticisi ve usePlayer hook'u
│   └── types/
│       └── index.ts           # Şarkı, albüm, sanatçı ve durum modelleri
├── app.json                   # Expo uygulama konfigürasyonu, izinler ve eklentiler
├── eas.json                   # Expo Application Services build profilleri
└── package.json               # Mobil bağımlılıkları (Expo 57, React 19)
```

---

## ⚠️ 2. Bu Klasörde Tespit Edilen Sistemik Riskler

### A. Arka Planda Müzik Çalmanın Durması (Arka Plan Kısıtları)
- Ses çalma motoru olarak doğrudan native `expo-audio` veya native ExoPlayer yerine, gizli bir `react-native-webview` içindeki YouTube IFrame API kullanılmıştır.
- Hem iOS (WKWebView) hem de Android sistemleri, ekran kapandığında veya kullanıcı başka bir uygulamaya geçtiğinde batarya tasarrufu için **WebView JavaScript yürütmesini ve video/audio etiketlerini askıya alır (freeze/throttle)**.
- Sonuç olarak ekran kilitlendiğinde veya WhatsApp/Instagram açıldığında müzik birkaç saniye içinde durur.

### B. Kilit Ekranı (Lockscreen) ve Bildirim Kontrollerinin Bulunmaması
- Android `MediaSession` ve iOS `MPNowPlayingInfoCenter` entegrasyonu bulunmamaktadır. Kullanıcı kilit ekranından, bildirim çubuğundan veya Bluetooth kulaklık butonlarından parçayı durdurup geçemez.

### C. Re-Render Fırtınası ve Pil Tüketimi
- `store/player-store.ts` içindeki `usePlayer()` hook'u, şarkı ilerledikçe her saniyede 4 kez tetiklenen `currentTime` güncellemesinde tüm bileşen ağacına `setState` yaymaktadır. Bu durum işlemciyi sürekli uyanık tutarak cihazın ısınmasına ve şarjının tükenmesine yol açar.

### D. Çalışmayan (Ölü) Butonlar
- `modal/player.tsx` içindeki Karıştır (Shuffle) ve Tekrarla (Repeat) butonlarında `onPress` işleyicisi bulunmamaktadır; butonlar tamamen tepkisizdir.

---

## 📋 3. Klasör İçi Dosya Detay Dokümantasyonları

Ayrıntılı dosya bazlı analiz ve kod düzeltmeleri için aşağıdaki dokümanları inceleyiniz:
- [app-routes.md İncelemesi](app-routes.md)
- [api/innertube.ts İncelemesi](api-innertube.ts.md)
- [services/player.ts İncelemesi](services-player.ts.md)
- [store/player-store.ts İncelemesi](store-player-store.ts.md)
- [components.md İncelemesi](components.md)
- [configs-and-build.md İncelemesi](configs-and-build.md)
