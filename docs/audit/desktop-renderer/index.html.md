# 📄 Dosya Denetimi: `desktop/src/renderer/index.html`

> **Dosya Yolu**: `desktop/src/renderer/index.html`  
> **Kod Hacmi**: 482 Satır  
> **Rolü**: Masaüstü Uygulaması Arayüz İskeleti ve Güvenlik Başlıkları

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`index.html`, Electron ana penceresinde yüklenen kök HTML şablonudur. Özel başlık çubuğu (`titlebar`), sol gezinti paneli (`sidebar`), ana içerik bölümleri (`mainContent`), alt oynatıcı çubuğu (`playerbar`), yan paneller (`lyricsPanel`, `queuePanel`) ve modal diyalogları içerir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): Harici Google Fonts CDN Bağımlılığı (Çevrimdışı Açılış Riski)
- **Konum**: `desktop/src/renderer/index.html:8-9`
- **Kod**:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- **Kök Neden**: Arayüzün ana yazı tipi olan *Inter*, harici Google CDN üzerinden çalışma zamanında indirilmektedir.
- **Etki**:
  - Bilgisayar internete bağlı değilken uygulama açıldığında yazı tipleri yüklenemez; ağ zaman aşımı beklenirken arayüzde yazı tipi sıçramaları (FOUT - Flash of Unstyled Text) oluşur.
  - Güvenlik duvarı (Firewall) veya kurumsal kısıtlamaları olan ortamlarda Google sunucularına erişim engellendiğinde arayüz görünümü bozulur.
- **Düzeltme**: *Inter* yazı tipi dosyaları (woff2) doğrudan `assets/fonts/` klasörüne eklenmeli ve yerel CSS `@font-face` ile paket içine gömülmelidir.

---

### Sorun 2 (🟡 ORTA): CSP Başlığında `unsafe-inline` İzni
- **Konum**: `desktop/src/renderer/index.html:6`
- **Kod**:
  ```html
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  ```
- **Kök Neden**: Dinamik stiller (albüm kapağı arkaplanları, genişlik yüzdeleri) için `unsafe-inline` stil izni verilmiştir.
- **Düzeltme**: Stiller CSS değişkenleri (`element.style.setProperty('--pct', ...)`) üzerinden yönetilmeli veya nonce/hash tabanlı CSP'ye geçilmelidir.

---

### Sorun 3 (🟡 ORTA): Eksik Erişilebilirlik (a11y) ve ARIA Etiketleri
- **Konum**: `desktop/src/renderer/index.html:28-38, 442-476`
- **Kök Neden**: Başlık çubuğu butonları, ses kaydırıcı ve açılır panellerde `aria-label`, `aria-expanded` ve `role="dialog"` gibi standart WAI-ARIA nitelikleri eksiktir. Ekran okuyucu kullanan engelli kullanıcılar butonların işlevini anlayamaz.
- **Düzeltme**: Tüm etkileşimli kontrollere standart ARIA rolleri ve etiketleri eklenmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Google Fonts paket içine gömülmeli ve yerel `@font-face` ile yüklenmelidir.
2. CSP başlığı sıkılaştırılmalıdır.
3. Erişilebilirlik (ARIA) etiketleri tamamlanmalıdır.
