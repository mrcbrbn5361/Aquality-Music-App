# 📄 Dosya Denetimi: `mobile/` Yapılandırma ve Derleme Dosyaları

> **Dosyalar**: `mobile/package.json`, `mobile/app.json`, `mobile/eas.json`, `mobile/babel.config.js`, `mobile/tsconfig.json`  
> **Rolü**: Expo ve React Native Derleme Ortamı, Bağımlılık Yönetimi ve EAS Build Profilleri

---

## 🔍 1. Genel İnceleme

Bu dosyalar, mobil uygulamanın Expo EAS Bulut derleme hattını ve yerel Metro bundler ortamını yapılandırır.
- `package.json`: Expo SDK 57, React Native 0.86 ve React 19 bağımlılıkları.
- `app.json`: Paket adı (`com.aquality.music`), izinler (`WAKE_LOCK`, `FOREGROUND_SERVICE`), arka plan ses modu (`UIBackgroundModes: ["audio"]`).
- `eas.json`: `development`, `preview` (APK) ve `production` (AAB) profilleri.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): React 19 ile Bazı Expo Kütüphanelerinin Eş Bağımlılık Uyuşmazlığı
- **Konum**: `mobile/package.json:20-29`
- **Kod**:
  ```json
  "react": "19.2.3",
  "react-native": "0.86.3",
  "react-native-youtube-iframe": "^2.4.1"
  ```
- **Kök Neden**: `react-native-youtube-iframe` paketi henüz resmi React 19 eş bağımlılığını (peer dependency) desteklememektedir. `npm install` çalıştırıldığında `--legacy-peer-deps` olmadan kurulum kilitlenmektedir.
- **Etki**: EAS Build veya yerel `npm install` adımlarında bağımlılık çözümleme hataları meydana gelebilir.

---

### Sorun 2 (🟡 ORTA): `eas.json` İçinde Android Keystore İmzalama Profili Eksikliği
- **Konum**: `mobile/eas.json`
- **Açıklama**: `production` profilinde Google Play Store için yükleme anahtarı (keystore credentials) tanımlı değildir. EAS Build çalıştırıldığında etkileşimli kullanıcı girişi beklenir ve CI/CD otomasyonunda askıda kalır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Bağımlılıklar `npx expo install --check` ile doğrulanmalı ve React 19 uyumlu paket sürümleri sabitlenmelidir.
2. `eas.json` otomatik derleme anahtarları ile tamamlanmalıdır.
