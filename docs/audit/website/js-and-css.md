# 📄 Dosya Denetimi: `website/js/main.js` ve `website/css/style.css`

> **Dosya Yolları**: `website/js/main.js` ve `website/css/style.css`  
> **Kod Hacmi**: 33 Satır (`main.js`) + ~750 Satır (`style.css`)  
> **Rolü**: Web Sitesi Etkileşimleri, Mobil Menü ve Stil Düzeni

---

## 🔍 1. Genel İnceleme

- `main.js`: Mobil menü açma/kapama, klavye ile kapatma (Escape), FAQ akordiyonu ve aktif link işaretleme.
- `style.css`: Modern koyu tema, CSS grid, flexbox ve responsive medya sorguları.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟡 ORTA): `pathname` Ayrıştırmasında Ana Dizin Sapması
- **Konum**: `website/js/main.js:27-31`
- **Kod**:
  ```js
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage) a.classList.add('active');
  });
  ```
- **Kök Neden**: Kullanıcı `https://domain.com/` adresindeyken `pathname` boş döner ve `currentPage = 'index.html'` olur. Ancak menüde `href="index.html"` linki bulunmadığı için hiçbir menü elemanı aktif yeşil renkle vurgulanmaz.
- **Düzeltme**: Menüye "Ana Sayfa" linki eklenmeli ve URL normalize edilmelidir.

---

### Sorun 2 (🟡 ORTA): Mobil Menü Açıkken Ekranın Kilitlenmesinde iOS Scroll Bug'ı
- **Konum**: `website/js/main.js:6-7`
- **Kod**:
  ```js
  function openMenu() { document.body.style.overflow='hidden'; }
  ```
- **Kök Neden**: iOS Safari'de yalnızca `overflow: hidden` vermek dokunmatik kaydırmayı engellemez; ekran arkadan kaymaya devam eder.
- **Düzeltme**: `touch-action: none` veya `position: fixed` eklenmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Sayfa konumu tespiti normalize edilmelidir.
2. iOS dokunmatik kaydırma engeli giderilmelidir.
