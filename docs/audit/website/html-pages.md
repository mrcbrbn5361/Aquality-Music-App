# 📄 Dosya Denetimi: `website/*.html` (Web Sayfaları Denetimi)

> **Dosyalar**: `index.html`, `indir.html`, `ozellikler.html`, `sss.html`, `gizlilik.html`, `kosullar.html`  
> **Kod Hacmi**: ~850 Satır (6 HTML Dosyası)  
> **Rolü**: Kullanıcı Arayüzü, SEO Meta Verileri ve Dönüşüm Sayfaları

---

## 🔍 1. Genel İnceleme

Web sitesi, semantic HTML5 öğeleri (`<nav>`, `<header>`, `<main>`, `<section>`, `<footer>`) kullanılarak geliştirilmiştir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): Kırık GitHub Release Bağlantısı
- **Konum**: `website/indir.html:47, 67` ve `website/index.html:44`
- **Kod**:
  ```html
  <a href="https://github.com/aquality-music/aquality-music-app/releases/latest" target="_blank" rel="noopener">
  ```
- **Kök Neden**: Link statik olarak GitHub Releases sayfasına verilmiştir. GitHub'da henüz ilk sürüm `v1.0.0` yayınlanmadıysa ziyaretçiler doğrudan 404 sayfası ile karşılaşır.
- **Düzeltme**: Otomatik GitHub API sorgusu (`/repos/{owner}/{repo}/releases/latest`) yapılarak en güncel `.exe` binary varlığı kontrol edilmeli, yoksa kullanıcı dostu bir bilgilendirme sunulmalıdır.

---

### Sorun 2 (🟡 ORTA): `nav-links` Menüsünde "Ana Sayfa" Bağlantısının Olmaması
- **Konum**: `website/index.html:21-25`, `website/ozellikler.html:18-22`
- **Açıklama**: Üst menü çubuğunda sadece "Özellikler", "İndir" ve "SSS" linkleri bulunmaktadır. Ana sayfaya dönüş yalnızca sol üstteki logonun tıklanmasıyla mümkündür. Mobil cihazlarda kullanıcılar ana sayfaya dönmekte zorlanmaktadır.

---

### Sorun 3 (🟡 ORTA): Eksik OpenGraph ve Twitter Card Meta Etiketleri
- **Konum**: Tüm HTML sayfalarının `<head>` bölümleri
- **Açıklama**: Sosyal medyada (Discord, Twitter/X, WhatsApp, LinkedIn) web sitesinin bağlantısı paylaşıldığında zengin önizleme (kart, başlık, açıklama ve kapak görseli) oluşturacak `og:title`, `og:image`, `og:description` ve `twitter:card` meta etiketleri eksiktir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. GitHub API ile dinamik sürüm kontrolü eklenmelidir.
2. Navigasyon menüsüne "Ana Sayfa" linki eklenmelidir.
3. OpenGraph ve SEO meta etiketleri tamamlanmalıdır.
