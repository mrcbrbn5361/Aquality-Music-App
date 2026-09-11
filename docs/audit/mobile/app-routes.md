# 📄 Dosya Denetimi: `mobile/app/` (Expo Router Sayfaları ve Modal)

> **Dizin Yolu**: `mobile/app/`  
> **Dosyalar**: `_layout.tsx`, `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/search.tsx`, `(tabs)/library.tsx`, `(tabs)/settings.tsx`, `modal/player.tsx`  
> **Kod Hacmi**: ~1,550 Satır  
> **Rolü**: Mobil Ekranlar, Tab Bar ve Oynatıcı Modalı

---

## 🔍 1. Genel İnceleme ve Sayfa Yapısı

Uygulama, Expo Router dosya tabanlı gezinme sistemini kullanmaktadır:
- `_layout.tsx`: Kök düzen, `AudioBridge` bileşenini DOM ağacına kalıcı olarak bağlar.
- `(tabs)/_layout.tsx`: Alt gezinme çubuğu ve yüzen `MiniPlayer` bileşeni.
- `modal/player.tsx`: Alt çubuğa tıklandığında alttan yukarı açılan tam ekran görsel oynatıcı.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): `modal/player.tsx` İçinde Karıştır ve Tekrarla Butonlarının Tepkisiz Olması
- **Konum**: `mobile/app/modal/player.tsx:127-129` ve `156-158`
- **Kod**:
  ```tsx
  <TouchableOpacity style={styles.controlIcon}>
    <Ionicons name="shuffle" size={22} color="#8892b0" />
  </TouchableOpacity>
  // ...
  <TouchableOpacity style={styles.controlIcon}>
    <Ionicons name="repeat" size={22} color="#8892b0" />
  </TouchableOpacity>
  ```
- **Kök Neden**: Her iki `TouchableOpacity` bileşeninde de `onPress` prop'u tanımlanmamıştır.
- **Etki**: Kullanıcı mobilde şarkı dinlerken listeyi karıştıramaz veya şarkıyı tekrar moduna alamaz; butonlara basıldığında hiçbir tepki verilmez.
- **Düzeltme**:
  ```tsx
  <TouchableOpacity
    style={styles.controlIcon}
    onPress={() => playerStore.toggleShuffle()}
  >
    <Ionicons name="shuffle" size={22} color={shuffle ? '#1ed760' : '#8892b0'} />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.controlIcon}
    onPress={() => playerStore.toggleRepeat()}
  >
    <Ionicons name="repeat" size={22} color={repeat !== 'off' ? '#1ed760' : '#8892b0'} />
  </TouchableOpacity>
  ```

---

### Sorun 2 (🟠 YÜKSEK): İlerleme Çubuğunda Sürükleme (Drag/Scrub) Desteğinin Olmaması
- **Konum**: `mobile/app/modal/player.tsx:103-114`
- **Kod**:
  ```tsx
  <TouchableOpacity
    onPress={(e) => {
      const { locationX } = e.nativeEvent;
      const ratio = locationX / barWidth;
      mobilePlayer.seek(ratio * duration);
    }}
  >
  ```
- **Kök Neden**: İlerleme çubuğu basit bir `TouchableOpacity` tıklamasıyla çalışmaktadır. Kullanıcı parmağını çubuk üzerinde sürükleyerek şarkıyı ileri-geri saramaz (Gesture/Pan responder desteği yoktur). Ayrıca tıklama anında `e.nativeEvent.locationX` değeri basılan alt bileşene göre sıfırlanabilmekte ve şarkının aniden başa sarmasına neden olabilmektedir.
- **Düzeltme**: `@react-native-community/slider` veya `react-native-gesture-handler` tabanlı sürükleme bileşenine geçilmelidir.

---

### Sorun 3 (🟡 ORTA): `index.tsx` İçinde Mood Değişimlerinde Yarış Koşulu
- **Konum**: `mobile/app/(tabs)/index.tsx:48-70`
- **Kök Neden**: Kullanıcı üstteki "Trendler", "Rap", "Chill" butonlarına hızlıca art arda bastığında önceki `loadData()` asenkron çağrısı iptal edilmemektedir. Yavaş yanıt veren önceki istek en son gelen isteğin verilerini ezebilmektedir.
- **Düzeltme**: Bir istek sayacı (`requestId`) veya `AbortController` ile eski aramaların sonuçları yok sayılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `modal/player.tsx` içindeki Shuffle ve Repeat butonlarına `onPress` bağlanmalıdır.
2. İlerleme çubuğuna sürükleme (gesture) desteği getirilmelidir.
3. Asenkron sayfa yüklemelerinde yarış koşulu önlenmelidir.
