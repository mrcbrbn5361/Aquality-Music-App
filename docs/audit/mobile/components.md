# 📄 Dosya Denetimi: `mobile/src/components/` (`AudioBridge`, `MiniPlayer`, `SongRow`, `Equalizer`)

> **Dizin Yolu**: `mobile/src/components/`  
> **Dosyalar**: `AudioBridge.tsx`, `MiniPlayer.tsx`, `SongRow.tsx`, `Equalizer.tsx`  
> **Kod Hacmi**: ~620 Satır (4 Dosya)  
> **Rolü**: Mobil Kullanıcı Arayüzü Yapı Taşları ve Ses Köprüsü

---

## 🔍 1. Genel İnceleme ve Bileşen Görevleri

- `AudioBridge.tsx`: Görünmez 1x1 boyutlu `<WebView>` içinde YouTube IFrame API çalıştıran ve React Native ile postMessage köprüsü kuran motor.
- `MiniPlayer.tsx`: Ekranın en altında sabit duran, parça bilgisi, oynat/duraklat butonu ve tıklanarak tam ekran modala geçiş sağlayan yüzen çubuk.
- `SongRow.tsx`: Arama ve ana sayfa listelerindeki şarkı kartı, süresi ve kalp (beğeni) butonu.
- `Equalizer.tsx`: Çalan şarkı satırında yeşil ritmik 3 bar gösteren animasyonlu grafik.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): `MiniPlayer.tsx` İçinde Dokunma Alanı (HitSlop) Çakışması
- **Konum**: `mobile/src/components/MiniPlayer.tsx:40-60`
- **Açıklama**: Mini oynatıcı üzerindeki "Oynat/Duraklat" butonu ile mini oynatıcının kendisi (`TouchableOpacity`) iç içedir. Kullanıcı butonun hemen yanına dokunduğunda hem şarkı durup başlamakta hem de aniden tam ekran modal açılmaktadır.
- **Düzeltme**: Butona `e.stopPropagation()` benzeri izole dokunma alanı atanmalı ve `hitSlop` sınırları netleştirilmelidir.

---

### Sorun 2 (🟡 ORTA): `SongRow.tsx` Görsellerinde Önbellek (Caching) Eksikliği
- **Konum**: `mobile/src/components/SongRow.tsx:25-35`
- **Kod**:
  ```tsx
  <Image source={{ uri: song.thumbnail }} style={styles.thumb} />
  ```
- **Kök Neden**: Standart React Native `Image` bileşeni kullanılmaktadır. Uzun listelerde (örneğin 50 arama sonucu) hızlıca aşağı kaydırılırken her satırda görseller ağdan tekrar indirilmeye çalışılır.
- **Düzeltme**: `expo-image` kütüphanesine geçilmeli; disk ve bellek önbelleği (`cachePolicy: 'memory-disk'`) aktif edilmelidir.

---

### Sorun 3 (🟡 ORTA): `AudioBridge.tsx` Hata Yakalama Eksikliği
- **Konum**: `mobile/src/components/AudioBridge.tsx:85-87`
- **Açıklama**: YouTube IFrame API'sinde video kullanılamadığında veya telif/bölge engeli (`onError`) oluştuğunda sadece `post('error', { code: e.data })` fırlatılmakta, kullanıcıya hiçbir hata mesajı gösterilmemekte ve sonraki parçaya otomatik geçiş tetiklenmemektedir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `MiniPlayer` dokunma sınırları ayrıştırılmalıdır.
2. `expo-image` ile görsel önbellekleme sağlanmalıdır.
3. `AudioBridge` hata durumunda sıradaki şarkıya otomatik geçiş yapmalıdır.
