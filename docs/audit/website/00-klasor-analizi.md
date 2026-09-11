# 📁 Klasör Denetimi: `website/` (Resmi Web Sitesi ve Dağıtım)

> **Modül Adı**: Aquality Music Resmi Tanıtım Sitesi (Vite + Vanilla JS + HTML5)  
> **Dosya Sayısı**: 11 Dosya  
> **Toplam Satır**: ~1,050 Satır  
> **Hedef**: Ürün Tanıtımı, Özellikler, SSS, İndirme ve Yasal Sayfalar

---

## 🏗️ 1. Mimari Yapı ve Değerlendirme

`website/` klasörü, Aquality Music'in internet üzerindeki vitrinidir. Çok sayfalı (Multi-Page Application - MPA) olarak Vite ile paketlenir.

```
website/
├── index.html                 # Ana tanıtım sayfası, hero banner ve özellik kartları
├── indir.html                 # Windows 11 NSIS ve Portable indirme sayfası
├── ozellikler.html            # Karşılaştırma tablosu ve detaylı özellikler
├── sss.html                   # Sıkça Sorulan Sorular ve akordiyon bileşeni
├── gizlilik.html              # Gizlilik Politikası ve veri güvenliği bildirimi
├── kosullar.html              # Kullanım Koşulları ve lisans metni
├── js/
│   └── main.js                # Mobil menü, FAQ akordiyonu ve aktif link yönetimi
├── css/
│   └── style.css              # ~750 satırlık responsive web stilleri
├── vite.config.js             # Vite rollup MPA giriş yapılandırması
├── robots.txt                 # Arama motoru indeksleme kuralları
└── sitemap.xml                # XML site haritası
```

---

## ⚠️ 2. Bu Klasörde Tespit Edilen Sistemik Riskler

### A. İndirme Bağlantılarında 404 Riski
- `indir.html` ve `index.html` sayfalarındaki indirme butonları doğrudan `https://github.com/aquality-music/aquality-music-app/releases/latest` adresine yönlendirmektedir. GitHub üzerinde henüz resmi bir release tag'i yayınlanmamışsa kullanıcı 404 Not Found sayfasına düşer.

### B. İşletim Sistemi Tespiti (OS Detection) Yokluğu
- İndirme sayfasında `data-platform="windows"` niteliği bulunmasına rağmen, siteyi ziyaret eden kullanıcının işletim sistemini (Windows 11, Mac, Linux veya Android) tespit eden hiçbir JavaScript kodu bulunmamaktadır.

### C. Mobil Menü ve `active` Sekme Mantık Hataları
- `js/main.js` dosyasında `pathname.split('/').pop()` ile sayfa tespiti yapılmaktadır. Alan adının köküne (`/`) girildiğinde `.nav-links` içinde `index.html` linki bulunmadığı için hiçbir sekme aktifleşmez.

---

## 📋 3. Klasör İçi Dosya Detay Dokümantasyonları

Ayrıntılı dosya bazlı analiz ve kod düzeltmeleri için aşağıdaki dokümanları inceleyiniz:
- [html-pages.md İncelemesi](html-pages.md)
- [js-and-css.md İncelemesi](js-and-css.md)
- [config-and-seo.md İncelemesi](config-and-seo.md)
