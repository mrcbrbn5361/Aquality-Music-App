# 🌐 07. Web Sitesi ve Dağıtım

> **Aquality Music Web ve Dağıtım Altyapısı**  
> Vite çok sayfalı web mimarisi, akıllı indirme yönlendiricisi, SEO optimizasyonu, yasal metinler ve site haritası.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-12 00:12` |
| **Proje Sürümü** | `v1.0.0` (Masaüstü: `v1.0.0`, Web: `v1.0.0`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `05f8ef9 - fix(mobile): update expo start guide and kill stale dev server processes (8 minutes ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 21 / 21 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. Web Sitesi Mimarisi (`website/`)

Aquality Music tanıtım ve dağıtım web sitesi, modern ve yüksek performanslı **Vite 5** altyapısıyla derlenir:

```
website/
├── index.html        # Ana tanıtım ve karşılama sayfası
├── indir.html        # Otomatik OS algılamalı indirme portalı
├── ozellikler.html   # Detaylı özellikler ve ekran görüntüleri
├── sss.html          # Sıkça Sorulan Sorular
├── gizlilik.html     # Gizlilik Politikası (Privacy Policy)
├── kosullar.html     # Kullanım Koşulları (Terms of Service)
├── robots.txt        # Arama motoru tarama kuralları
├── sitemap.xml       # Arama motoru site haritası
└── vite.config.js    # Rollup çok sayfalı derleme konfigürasyonu
```

---

## 2. Otomatik İndirme ve OS Algılama (`website/indir.html`)

Kullanıcı `indir.html` sayfasına girdiğinde:
1. `navigator.userAgent` veya `navigator.userAgentData` okunarak işletim sistemi tespit edilir (Windows, macOS, Linux).
2. Windows tespit edildiğinde doğrudan Setup EXE ve Portable EXE indirme kartları öne çıkarılır.
3. 3 saniyelik geri sayım sayacı çalışır ve indirme otomatik olarak tetiklenir (`window.location.href = ...`).

---

## 3. SEO ve Arama Motoru İndeksleme

- **OpenGraph & Twitter Cards**: Sosyal medya paylaşımlarında zengin başlık, açıklama ve önizleme görseli sağlayan meta etiketleri eklenmiştir.
- **`robots.txt`**: Tüm arama motorlarının sitenin tamamını dizine eklemesine izin verir (`User-agent: *`, `Allow: /`).
- **`sitemap.xml`**: Tüm alt sayfaları, güncel öncelik (`priority: 1.0` ve `0.8`) ve haftalık güncelleme frekansı ile Google Search Console'a sunar.

---

## 4. Yasal Uygunluk ve Sözleşmeler

- **`gizlilik.html`**: Kullanıcı verilerinin yalnızca yerel cihazda (`localStorage` / `electron-store`) tutulduğunu, hiçbir kullanıcı çerezinin üçüncü taraf sunuculara aktarılmadığını açıklar.
- **`kosullar.html`**: MIT lisansı, YouTube Hizmet Şartları uyumluluğu ve telif hakkı yasal bildirimlerini içerir.
