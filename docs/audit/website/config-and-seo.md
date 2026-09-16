# 📄 Dosya Denetimi: `website/` Yapılandırma ve SEO (`vite.config.js`, `robots.txt`, `sitemap.xml`)

> **Dosyalar**: `website/vite.config.js`, `website/robots.txt`, `website/sitemap.xml`  
> **Rolü**: Statik Derleyici, Arama Motoru İndeksleme ve Site Haritası

---

## 🔍 1. Genel İnceleme

- `vite.config.js`: Rollup MPA girişlerini (6 sayfa) tanımlar.
- `robots.txt`: Tüm arama motorlarına izin verir (`User-agent: *`, `Allow: /`).
- `sitemap.xml`: Tüm sayfaların son güncelleme tarihlerini ve önceliklerini listeler.

---

## ⚠️ 2. Tespit Edilen Sorunlar

### Sorun 1 (🟡 ORTA): `sitemap.xml` İçinde Gerçekleşmemiş Statik Alan Adı
- **Konum**: `website/sitemap.xml:5-30`
- **Açıklama**: Site haritasındaki tüm `<loc>` etiketleri `https://aqualitymusic.vercel.app/` alan adına bağlanmıştır. Gerçek dağıtım GitHub Pages (`https://aquality-music.github.io/...`) veya Vercel/Netlify üzerine yapıldığında alan adı eşleşmezse Google Search Console indekslemeyi reddeder.
- **Düzeltme**: Alan adı bir çevre değişkeni (`SITE_URL`) ile derleme zamanında dinamik olarak enjekte edilmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Site haritasındaki domain dağıtım ortamına göre dinamikleştirilmelidir.
