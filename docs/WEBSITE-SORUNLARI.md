# Website - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** Statik HTML/CSS/JS (Vite + Vercel)  
> **Toplam Sorun:** 50  
> **Önem Dereceleri:** Yüksek: 12 | Orta: 14 | Düşük: 24

---

## 🔴 YÜKSEK - Güvenlik

### W-001: Content Security Policy (CSP) Uygulanmamış
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<head>` bölümü |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Gizlilik sayfası (gizlilik.html:71) CSP'nin mevcut olduğunu iddia ediyor ama hiçbir sayfada CSP meta etiketi veya header'ı uygulanmamış.

---

### W-002: Vercel'de Güvenlik Header'ları Eksik
| | |
|---|---|
| **Dosya** | `website/vercel.json` |
| **Satır** | 1-19 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy` header'ları yapılandırılmamış.

**Çözüm:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

### W-003: 404 Rewrite Yapılandırması Eksik
| | |
|---|---|
| **Dosya** | `website/vercel.json` |
| **Satır** | - |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `404.html` dosyası mevcut ama `"rewrites"` yapılandırması yok. Vercel, bilinmeyen rotalar için varsayılan hata sayfasını gösterecek, özel 404'ü değil.

**Çözüm:**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/404.html" }
  ]
}
```

---

## 🔴 YÜKSEK - SEO

### W-004: Tüm Sayfalarda Open Graph ve Twitter Card Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları (index, ozellikler, sss, bot, gizlilik, kosullar, 404) |
| **Satır** | 3-13 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `<meta property="og:*">` ve `<meta name="twitter:*">` etiketleri hiçbir sayfada yok. Sosyal medya paylaşım önizlemesi çalışmıyor.

---

### W-005: Sitemap'ler Geçersiz URL'ler Kullanıyor
| | |
|---|---|
| **Dosya** | `website/sitemap.xml` ve `website/public/sitemap.xml` |
| **Satır** | Tüm dosya |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Sitemap'ler göreli URL'ler (`./index.html`) kullanıyor. Sitemap protokolüne göre mutlak URL (`https://aqualitymusic.vercel.app/...`) kullanılmalı. Arama motorları bunu reddeder.

---

### W-006: Sitemap'ler Senkronize Değil
| | |
|---|---|
| **Dosya** | `website/sitemap.xml` vs `website/public/sitemap.xml` |
| **Satır** | - |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Kök `sitemap.xml` `bot.html` girişini içeriyor, `public/sitemap.xml` içermiyor (veya tersi). Vercel `public/sitemap.xml`'i sunuyor, bu yüzden kök sitemap ölü.

---

### W-007: indir.html'de Göreceli og:image
| | |
|---|---|
| **Dosya** | `website/indir.html` |
| **Satır** | 11 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `og:image` göreli yol kullanıyor (`./assets/favicon.png`). OG image sosyal medya paylaşımı için mutlak URL olmalı.

---

### W-008: indir.html'de twitter:image Eksik
| | |
|---|---|
| **Dosya** | `website/indir.html` |
| **Satır** | 14 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `twitter:card="summary_large_image"` tanımlı ama `twitter:image` etiketi eksik — zorunlu alan.

---

## 🔴 YÜKSEK - Yapılandırma

### W-009: vercleanUrls İç Bağlantılarla Çelişiyor
| | |
|---|---|
| **Dosya** | `website/vercel.json` |
| **Satır** | 8-18 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `cleanUrls: true` (.html uzantılarını kaldırır) tanımlı ama tüm iç bağlantılar `.html` uzantısı kullanıyor. Bu gereksiz 301 yönlendirmeleri oluşturur ve SEO'yu etkiler.

---

### W-010: robots.txt Sitemap Yönlendirmesi Eksik
| | |
|---|---|
| **Dosya** | `website/robots.txt` ve `website/public/robots.txt` |
| **Satır** | 1-2 |
| **Önem** | 🔴 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `Sitemap:` talimatı eksik — arama motorları sitemap'i otomatik olarak keşfedemez.

---

## 🟡 ORTA - Erişilebilirlik

### W-011: Skip-to-Content Navigasyonu Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<body>` |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `<a href="#main-content" class="skip-link">` gibi bir atlama bağlantısı yok.

---

### W-012: SVG İkonlarında aria-hidden Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | Tüm inline SVG'ler |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Tüm inline SVG ikonları `aria-hidden="true"` veya uygun `role="img"` + `<title>` içermiyor — ekran okuyucular SVG içeriğini okumaya çalışacak.

---

### W-013: Mobil Menü Butonunda aria-label Eksik
| | |
|---|---|
| **Dosya** | `website/index.html` |
| **Satır** | 30-32 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Mobil menü butonu HTML'de `aria-label` içermiyor (JS ile main.js:23'te ayarlanıyor). JS çalışana kadar buton etiketsiz.

---

### W-014: FAQ Cevapları ile İlişkilendirme Eksik
| | |
|---|---|
| **Dosya** | `website/sss.html` |
| **Satır** | 42-104 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** FAQ öğeleri `<button>` kullanıyor doğru ama cevap `<div>`'leri `role="region"` veya soru-cevap ilişkilendirmesi (`aria-labelledby`) içermiyor.

---

### W-015: İçerik Bölümünde `<main>` Eksik
| | |
|---|---|
| **Dosya** | gizlilik.html, kosullar.html, indir.html, bot.html |
| **Satır** | 43+ |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Uzun biçimli içerik bölümleri `<main>` sarmalayıcısı içermiyor.

---

### W-016: Navigasyonda ARIA Landmark Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<nav>` |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `<nav>` etiketi `class="navbar"` kullanıyor ama ARIA landmark rol niteliği (`aria-label="Ana menü"`) yok.

---

## 🟡 ORTA - İçerik / Yapısal Sorunlar

### W-017: 404.html'de Tutarlılık Hatası - Copyright Yılı
| | |
|---|---|
| **Dosya** | `website/404.html` |
| **Satır** | 46 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Copyright yılı **2025** diğer tüm sayfalar **2026** yazıyor.

---

### W-018: gizlilik.html ve kosullar.html'de Eksik Footer
| | |
|---|---|
| **Dosya** | `website/gizlilik.html`, `website/kosullar.html` |
| **Satır** | 86-96, 72-82 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Footer'lar kısaltılmış (footer-brand, footer-links, footer-social yok) — diğer sayfalarla tutarsız.

---

### W-019: Yinelenen sss.html Bağlantıları Footer'larda
| | |
|---|---|
| **Dosya** | index.html, ozellikler.html, sss.html, indir.html, bot.html |
| **Satır** | Footer bölümleri |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `sss.html` hem "SSS" hem "Destek" etiketi altında sunuluyor — aynı sayfa, kafa karıştırıcı UX.

---

### W-020: Inline Stiller (Anti-pattern)
| | |
|---|---|
| **Dosya** | ozellikler.html, sss.html, bot.html, gizlilik.html, kosullar.html, 404.html |
| **Satır** | Birden fazla satır |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** 20+ inline `style` niteliği — bakım ve tutarlılık için CSS sınıflarına taşınmalı.

**En çok etkilenen dosyalar:**
- `bot.html`: 8 inline style
- `404.html`: 7 inline style
- `ozellikler.html`: 2 inline style
- `sss.html`: 2 inline style

---

## 🟡 ORTA - CSS Sorunları

### W-021: Geçersiz font-weight Değeri
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 97 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `font-weight:650` geçerli bir CSS değeri değil. Geçerli değerler 100-900 arası 100'ün katları. Tarayıcı **700**'e yuvarlayacak ama bu teknik olarak geçersiz.

---

### W-022: Mobil Menü Üst Konumu Sabit
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 192-196 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `.nav-actions.mobile-open{top:180px}` sabit değer — nav-links içeriği değişirse (farklı bağlantı sayısı, yazı tipi boyutu) hizalama bozulur.

---

### W-023: Çok Küçük Ekran Kesme Noktası Eksik
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 203 (son media query) |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Media query'ler 768px'de bitiyor. iPhone SE gibi çok küçük ekranlar (320px-375px) için kesme noktası yok — metin taşabilir veya layout kırılabilir.

---

### W-024: backdrop-filter Fallback Eksik
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 38 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `backdrop-filter:blur(18px) saturate(160%)` kullanılıyor ama `@supports` ile fallback yok. Daha eski tarayıcılarda navbar arkasındaki içerik bulanıksız görünecek.

---

### W-025: Ölü CSS Değişkenleri
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 19 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `--r-sm:10px;--r-md:14px;--r-lg:18px;--r-xl:24px;` tanımlı ama hiçbir yerde kullanılmıyor.

---

### W-026: background-clip: text Fallback Eksik
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 55 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `.highlight` `-webkit-background-clip:text` kullanıyor ama Firefox için `background-clip:text` fallback'i yok.

---

## 🟡 ORTA - JavaScript

### W-027: Aktif Nav Link Çalışma Durumu Yarış Koşulu
| | |
|---|---|
| **Dosya** | `website/js/main.js` |
| **Satır** | 55-62 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Aktif nav link mantığı her sayfa yüklenişinde çalışıyor VE HTML'de nav link'lerde hardcoded `class="active"` var. JS yavaş yüklenirse hardcoded aktif class kısa süreli görünür sonra JS tarafından tekrar uygulanır. Tutarlı olmayan davranış.

---

### W-028: Anchor Link'ler Navbar Arkasında Kalıyor
| | |
|---|---|
| **Dosya** | `website/js/main.js` |
| **Satır** | 1-63 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Sabit navbar (64px yükseklik) nedeniyle anchor link'ler (`#kurulum`, `#api-endpoints`) navbar'ın arkasına kayıyor. Offset telafisi yok.

---

## 🔵 DÜŞÜK - Performans

### W-029: Tekrarlanan SVG İkon Verileri
| | |
|---|---|
| **Dosya** | `website/index.html`, `website/bot.html` |
| **Satır** | Footer bölümleri |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** GitHub SVG ikonu (~900 byte) index.html ve bot.html'de aynı kopya — birbirinin aynısı.

---

### W-030: Kullanılmayan favicon.ico
| | |
|---|---|
| **Dosya** | `website/assets/favicon.ico` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `favicon.ico` dosyası mevcut ama hiçbir yerde referans yok — yalnızca `favicon.png` kullanılıyor.

---

### W-031: Dekoratif DOM Ağacı Ağır
| | |
|---|---|
| **Dosya** | `website/index.html` |
| **Satır** | 58-88 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Uygulama önizleme maketi ~30 boş div içeren karmaşık DOM ağacı — saf dekoratif. Tek bir SVG veya CSS-only illüstrasyon olabilir.

---

### W-032: Kök robots.txt Ölü
| | |
|---|---|
| **Dosya** | `website/robots.txt` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `public/robots.txt` ile aynı içerik. Vercel `public/robots.txt`'i statik kök olarak sunuyor — kök dosya ölü.

---

## 🔵 DÜŞÜK - Tarayıcı Uyumluluğu

### W-033: flexbox gap Desteği
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 57, 93 vb. |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Flexbox `gap` kullanımı — IE11 ve Safari < 14.1 desteklemiyor.

---

### W-034: clamp() Fonksiyonu Desteği
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 54 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `clamp()` fonksiyonu — IE11 ve daha eski tarayıcılar desteklemiyor.

---

### W-035: inset Kısayol Desteği
| | |
|---|---|
| **Dosya** | `website/css/style.css` |
| **Satır** | 38 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `inset` kısayol niteliği — daha eski tarayıcılar desteklemiyor.

---

## 🔵 DÜŞÜK - Yapılandırma / Bakım

### W-036: package.json'da author ve license Eksik
| | |
|---|---|
| **Dosya** | `website/package.json` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

---

### W-037: lint/format/typecheck Scriptleri Eksik
| | |
|---|---|
| **Dosya** | `website/package.json` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

---

### W-038: Vite Sürümü Eski
| | |
|---|---|
| **Dosya** | `website/package.json` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Vite `^5.0.12` kullanılıyor (2026 itibarıyla en son 6.x).

---

### W-039: rel="noreferrer" Eksik
| | |
|---|---|
| **Dosya** | `website/index.html` |
| **Satır** | 142 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Dış bağlantılar `rel="noopener"` kullanıyor ama `rel="noreferrer"` eksik.

---

### W-040: meta name="theme-color" Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<head>` |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

---

### W-041: meta name="robots" Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<head>` |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

---

### W-042: Structured Data (Schema.org) Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Organization, WebSite veya BreadcrumbList şemaları yok.

---

### W-043: `<link rel="canonical">` Eksik
| | |
|---|---|
| **Dosya** | Tüm HTML dosyaları |
| **Satır** | `<head>` |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

---

### W-044: Boot'ta Sabit Yol İfşa
| | |
|---|---|
| **Dosya** | `website/bot.html` |
| **Satır** | 57 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Discord IPC pipe yolu (`\\?\pipe\discord-ipc-0`) dokümantasyonda exposed — bu beklenen bir davranış.

---

### W-045: Discord Uygulama ID'leri Açık
| | |
|---|---|
| **Dosya** | `website/bot.html` |
| **Satır** | 73-77 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Discord Application ID'leri client-side HTML'de exposed — aslında gizli değil ama istismar için kolayca kazınabilir.

---

### W-046: Boot sayfasında Erişilemez Emoji Başlıklar
| | |
|---|---|
| **Dosya** | `website/bot.html` |
| **Satır** | 118, 130 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Komut bölümleri başlıkları emoji (`💬`, `🎵`) kullanıyor — erişilebilir değil.

---

### W-047: Boot sayfasında Ekran Okuyucu Dostu Olmayan İçerik
| | |
|---|---|
| **Dosya** | `website/index.html` |
| **Satır** | 67-80 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Boş `div.preview-nav-item`, `div.preview-card`, `div.preview-list-item`元素leri erişilebilir isim içermiyor.

---

### W-048: logo-icon Erişilebilirlik
| | |
|---|---|
| **Dosya** | `website/index.html` |
| **Satır** | 18 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `<div class="logo-icon">A</div>` `aria-label` içermiyor — süs harfi `aria-hidden="true"` olmalı.

---

### W-049: Vercel'de InstallCommand Eksik
| | |
|---|---|
| **Dosya** | `website/vercel.json` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Monorepo workspaces varsa Vercel doğru bağımlılıkları yükleyemeyebilir. `"installCommand": "npm install"` belirtilmeli.

---

### W-050: Vercel Framework Çatışması
| | |
|---|---|
| **Dosya** | `website/vercel.json` |
| **Satır** | 3 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `"framework": "vite"` tanımlı ama özel `buildCommand` da var. Vercel'in `buildCommand`'ı framework ayarını yok sayarak çalıştırıp çalıştırmadığı doğrulanmalı.

---

## Özet Tablosu

| # | Sorun | Önem | Dosya |
|---|-------|------|-------|
| W-001 | CSP uygulanmamış | 🔴 YÜKSEK | Tüm HTML |
| W-002 | Güvenlik header'ları eksik | 🔴 YÜKSEK | vercel.json |
| W-003 | 404 rewrite eksik | 🔴 YÜKSEK | vercel.json |
| W-004 | OG/Twitter meta eksik | 🔴 YÜKSEK | Tüm HTML |
| W-005 | Sitemap geçersiz URL | 🔴 YÜKSEK | sitemap.xml |
| W-006 | Sitemap senkronizasyon | 🔴 YÜKSEK | sitemap.xml |
| W-007 | og:image göreli | 🔴 YÜKSEK | indir.html |
| W-008 | twitter:image eksik | 🔴 YÜKSEK | indir.html |
| W-009 | cleanUrls çelişki | 🔴 YÜKSEK | vercel.json |
| W-010 | robots.txt sitemap eksik | 🔴 YÜKSEK | robots.txt |
| W-011 | Skip-to-content eksik | 🟡 ORTA | Tüm HTML |
| W-012 | SVG aria-hidden eksik | 🟡 ORTA | Tüm HTML |
| W-013 | Menü aria-label eksik | 🟡 ORTA | index.html |
| W-014 | FAQ ilişkilendirme eksik | 🟡 ORTA | sss.html |
| W-015 | main etiketi eksik | 🟡 ORTA | 4 dosya |
| W-016 | nav ARIA landmark eksik | 🟡 ORTA | Tüm HTML |
| W-017 | Copyright yılı tutarsız | 🟡 ORTA | 404.html |
| W-018 | Eksik footer | 🟡 ORTA | gizlilik, kosullar |
| W-019 | Yinelenen sss.html linkleri | 🟡 ORTA | 5 dosya |
| W-020 | Inline stiller | 🟡 ORTA | 6 dosya |
| W-021 | Geçersiz font-weight | 🟡 ORTA | style.css:97 |
| W-022 | Sabit menü üst konumu | 🟡 ORTA | style.css:192 |
| W-023 | Küçük ekran kesme noktası | 🟡 ORTA | style.css:203 |
| W-024 | backdrop-filter fallback | 🟡 ORTA | style.css:38 |
| W-025 | Ölü CSS değişkenleri | 🟡 ORTA | style.css:19 |
| W-026 | background-clip fallback | 🟡 ORTA | style.css:55 |
| W-027 | Aktif link yarış koşulu | 🟡 ORTA | main.js:55-62 |
| W-028 | Anchor link offset | 🟡 ORTA | main.js |
| W-029 | Yinelenen SVG | 🔵 DÜŞÜK | index, bot |
| W-030 | Kullanılmayan favicon.ico | 🔵 DÜŞÜK | assets/ |
| W-031 | Ağır dekoratif DOM | 🔵 DÜŞÜK | index.html |
| W-032 | Kök robots.txt ölü | 🔵 DÜŞÜK | robots.txt |
| W-033 | flexbox gap desteği | 🔵 DÜŞÜK | style.css |
| W-034 | clamp() desteği | 🔵 DÜŞÜK | style.css |
| W-035 | inset desteği | 🔵 DÜŞÜK | style.css |
| W-036 | author/license eksik | 🔵 DÜŞÜK | package.json |
| W-037 | lint scriptleri eksik | 🔵 DÜŞÜK | package.json |
| W-038 | Vite sürümü eski | 🔵 DÜŞÜK | package.json |
| W-039 | noreferrer eksik | 🔵 DÜŞÜK | index.html |
| W-040 | theme-color eksik | 🔵 DÜŞÜK | Tüm HTML |
| W-041 | robots meta eksik | 🔵 DÜŞÜK | Tüm HTML |
| W-042 | Structured data eksik | 🔵 DÜŞÜK | Tüm HTML |
| W-043 | canonical eksik | 🔵 DÜŞÜK | Tüm HTML |
| W-044 | Boot yolu ifşa | 🔵 DÜŞÜK | bot.html |
| W-045 | Discord App ID açık | 🔵 DÜŞÜK | bot.html |
| W-046 | Emoji başlıklar | 🔵 DÜŞÜK | bot.html |
| W-047 | Dekoratif div erişilebilirlik | 🔵 DÜŞÜK | index.html |
| W-048 | logo-icon erişilebilirlik | 🔵 DÜŞÜK | index.html |
| W-049 | InstallCommand eksik | 🔵 DÜŞÜK | vercel.json |
| W-050 | Framework çatışması | 🔵 DÜŞÜK | vercel.json |
