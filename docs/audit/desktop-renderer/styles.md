# 📄 Dosya Denetimi: `desktop/src/renderer/styles/` (`main.css` & `login.css`)

> **Dosya Yolları**: `desktop/src/renderer/styles/main.css` ve `login.css`  
> **Kod Hacmi**: ~1,850 Satır (`main.css`) + ~80 Satır (`login.css`)  
> **Rolü**: Masaüstü Uygulamasının Spotify & Windows 11 Fluent Tarzı Görsel Tasarımı

---

## 🔍 1. Genel İnceleme ve Tasarım Sistemi

`main.css`, Windows 11 Fluent Design (Mica, koyu tema, yuvarlatılmış köşeler) ve Spotify arayüz standardını (yeşil vurgular `#1ed760`, kart hover efektleri, canlı 3 barlı ekolayzır animasyonu) harmanlayan kapsamlı bir CSS stil tablosudur.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): Aşırı `backdrop-filter: blur(...)` Kullanımı ve GPU Katman Baskısı
- **Konum**: `desktop/src/renderer/styles/main.css:45, 120, 310, 480`
- **Kök Neden**: Başlık çubuğunda, kenar çubuğunda, kart hover durumlarında ve alt oynatıcı çubuğunda yoğun biçimde `backdrop-filter: blur(20px)` ve `box-shadow` kullanılmaktadır.
- **Etki**: Düşük donanımlı entegre ekran kartlarında (Intel HD Graphics) pencere yeniden boyutlandırılırken (resize) veya uzun listeler kaydırılırken (scroll) kare hızının (FPS) 20-30'lara kadar düşmesine (jank) neden olur.
- **Düzeltme**: Kaydırma yapılan geniş alanlarda `backdrop-filter` yerine opak/yarı saydam arka plan renkleri (`rgba(...)`) tercih edilmeli; donanım katmanı `will-change: transform` ile optimize edilmelidir.

---

### Sorun 2 (🟡 ORTA): Canlı Ekolayzır Animasyonunun Sürekli Çalışması
- **Konum**: `desktop/src/renderer/styles/main.css:620-660`
- **Kod**:
  ```css
  @keyframes eqBounce {
    0%, 100% { height: 3px; }
    50% { height: 16px; }
  }
  .equalizer-bar { animation: eqBounce 1s infinite ease-in-out; }
  ```
- **Kök Neden**: Ekolayzır barları CSS `@keyframes` ile sürekli döngüde çalışır. Şarkı duraklatıldığında (`paused`) veya pencere simge durumuna küçültüldüğünde bu animasyon `animation-play-state: paused` ile durdurulmazsa tarayıcı motoru gereksiz yere GPU render döngüsünü tetikler.
- **Düzeltme**: `.paused .equalizer-bar { animation-play-state: paused; }` kuralı eklenmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `backdrop-filter` performansı düşük sistemler için optimize edilmelidir.
2. Ekolayzır ve yükleme animasyonları oynatma durumuna göre durdurulmalıdır.
