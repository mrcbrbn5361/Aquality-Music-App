# 📄 Dosya Denetimi: `mobile/src/services/player.ts`

> **Dosya Yolu**: `mobile/src/services/player.ts`  
> **Kod Hacmi**: 155 Satır  
> **Rolü**: Mobil Oynatma Servis Denetleyicisi ve Native/Bridge Köprüsü

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`mobilePlayer`, mobil istemcide müzik çalma, duraklatma, ileri-geri sarma, sonraki parçaya geçme ve ses seviyesini ayarlama işlemlerini koordine eder. `expo-audio` konfigürasyonunu yönetir ve `AudioBridge` (WebView) ile çift yönlü köprü kurar.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Arka Planda Müzik Çalmanın Durması (WebView Askıya Alınması)
- **Konum**: `mobile/src/services/player.ts:32-44, 58-62`
- **Kod**:
  ```ts
  async configureAudio() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true
    });
  }
  // ...
  if (this.bridge) {
    this.bridge.play(song.id);
  }
  ```
- **Kök Neden**: `setAudioModeAsync` çağrısı yapılmasına rağmen, gerçekte müzik `AudioBridge` bileşeni içindeki `<WebView>` üzerinde YouTube IFrame oynatıcıdan çalınmaktadır.
- **Etki**:
  - `shouldPlayInBackground: true` ayarı yalnızca `expo-audio`'nun kendi native ses çalıcıları için geçerlidir.
  - İşletim sistemi (özellikle iOS ve Android 14), uygulama arka plana geçtiğinde WebView'ın donanım kaynaklarını ve JavaScript yürütmesini durdurur (freeze).
  - Kullanıcı ekranı kilitlediğinde veya başka bir uygulamaya geçtiğinde şarkı susar. Müzik uygulaması için bu en temel işlev kaybıdır.
- **Düzeltme**:
  - Arka planda kesintisiz müzik çalabilmek için gerçek bir native ses motoruna (`react-native-track-player` veya stream URL çözen `expo-audio` AudioPlayer) geçilmelidir.
  - Android için `android.app.Service` tabanlı `ForegroundService` ve bildirim (Notification) bağlanmalıdır.

---

### Sorun 2 (🔴 KRİTİK): Android 14 `FOREGROUND_SERVICE_MEDIA_PLAYBACK` Çökmesi
- **Konum**: `mobile/app.json:33` ve `mobile/src/services/player.ts`
- **Kök Neden**: `app.json` içinde `FOREGROUND_SERVICE_MEDIA_PLAYBACK` izni istenmiştir. Android 14 (API level 34) kurallarına göre, bu izne sahip bir uygulama arka planda medya çalarken **aynı anda sisteme bir Foreground Service bildirimi bağlamak zorundadır**.
- **Etki**: Servis bildirimi oluşturulmadığı için Android 14 cihazlarda uygulama arka planda çalışırken işletim sistemi tarafından `ForegroundServiceDidNotStartInTimeException` hatası ile doğrudan çöker (crash).
- **Düzeltme**: Medya bildirimi sağlayan bir native modül kurulmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. WebView yerine native medya oynatıcı altyapısına geçilmelidir.
2. Android 14 Foreground Media Service bildirimi eksiksiz entegre edilmelidir.
