# Website (Vite) Sorun Analizi

> **Toplam Sorun:** 50 | **KRITIK:** 3 | **YUKSEK:** 11 | **ORTA:** 15 | **DUSUK:** 21

---

## KRITIK Sorunlar

### WEB-01: Catch-All Rewrite Tum Sayfalari 404 Yapiyor
- **Dosya:** `website/vercel.json:9`
- **Kategori:** DEPLOY / BUG
- **Aciklama:** `{"source": "/(.*)", "destination": "/404.html"}` tum route'lari 404 sayfasina yonlendiriyor. Uygulama hicbir sayfada calismaz.
- **Cozum:** Catch-all rewrite kaldirilmali, `cleanUrls: true` ile HTML sayfalari otomatik yonlendirilmeli.

### WEB-02: Aktif Nav Vurgulama Production'da Calismiyor
- **Dosya:** `website/js/main.js:53-62`
- **Kategori:** BUG
- **Aciklama:** `cleanUrls` ile sayfalar `.html` uzantisiz yasarken, nav vurgulama `window.location.pathname` ile `.html` uzantisini arastiriyor. Hicbir sayfa vurgulanmaz.
- **Cozum:** `.html` uzantisi karsilastirmasi kaldirilmali veya uzanti esnek hale getirilmeli.

### WEB-03: Iki Farkli vercel.json Cakisiyor
- **Dosya:** `vercel.json` vs `website/vercel.json`
- **Kategori:** CONFIG / DEPLOY
- **Aciklama:** Root ve website dizininde iki farkli vercel.json var. Root guvenlik header'lari eksik, website'de var. Hangisinin kullanilacagi belirsiz.
- **Cozum:** Root vercel.json kaldirilmali veya birlestirilmeli.

---

## YUKSEK Sorunlar

### WEB-04: CSP Header Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** GUVENLIK
- **Aciklama:** Tum sayfalarda Content-Security-Policy header'i yok.
- **Cozum:** `vercel.json` veya HTML `<meta>` ile CSP eklenmeli.

### WEB-05: Guvenlik Header'lari Eksik
- **Dosya:** `vercel.json` (root)
- **Kategori:** GUVENLIK
- **Aciklama:** Root vercel.json'da X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy eksik.
- **Cozum:** Website/vercel.json'daki header'lar root'a tasimali.

### WEB-06: `<main>` Landmark Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** ERISILEBILIRLIK
- **Aciklama:** Ana icerik landmark bolgesi tanimlanmamis.
- **Cozum:** Ana icerik `<main>` icine alinmali.

### WEB-07: Skip Navigation Link Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** ERISILEBILIRLIK (WCAG 2.4.1)
- **Aciklama:** Klavye kullanicilari her sayfa yuklemede tum nav linklerinden gecmek zorunda.
- **Cozum:**
  ```html
  <a href="#main-content" class="sr-only sr-only-focusable">Ana icerige atla</a>
  ```

### WEB-08: SVG Icon'larda aria-hidden Yok
- **Dosya:** tum HTML dosyalari (50+ SVG)
- **Kategori:** ERISILEBILIRLIK (WCAG 1.1.1)
- **Aciklama:** Decorative SVG'ler screen reader tarafindan okunmaya calisilir.
- **Cozum:** Tum decorative SVG'lere `aria-hidden="true"` eklenmeli.

### WEB-09: Mobile Menu Butonu aria-label Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** ERISILEBILIRLIK (WCAG 4.1.2)
- **Aciklama:** Hamburger butonu JS ile `aria-label` aliyor ama HTML'de yok. JS yuklenmezse isimsiz kalir.
- **Cozum:** HTML'de `aria-label="Menuyu ac"` eklenmeli.

### WEB-10: FAQ Accordion ARIA Roller Eksik
- **Dosya:** `website/sss.html:42-105`
- **Kategori:** ERISILEBILIRLIK (WCAG 4.1.2)
- **Aciklama:** FAQ cevaplari `role="region"` ve `aria-labelledby` eksik. `max-height: 0` icerigi screen reader'dan gizlemez.
- **Cozum:** ARIA iliskileri ve `visibility: hidden` eklenmeli.

### WEB-11: OG/Twitter Card Meta Tag Eksik (7/8 Sayfa)
- **Dosya:** 7 HTML dosyasi (indir.html haric)
- **Kategori:** SEO
- **Aciklama:** Sosyal medyada paylasimda zengin kart gosterilmez.
- **Cozum:** Tum sayfalara `og:title`, `og:description`, `og:image`, `twitter:card` eklenmeli.

### WEB-12: Canonical URL Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** SEO
- **Aciklama:** Farkli URL varyasyonlari ayni sayfayi indeksleyebilir, yetki dagilir.
- **Cozum:** `<link rel="canonical" href="...">` eklenmeli.

### WEB-13: OG Image Favicon Kullaniyor
- **Dosya:** `website/indir.html:11, 15`
- **Kategori:** SEO
- **Aciklama:** Favicon 32x32 piksel, sosyal paylasim icin 1200x630 gerekli.
- **Cozum:** Ozel OG gorseli olusturulmali.

### WEB-14: :focus-visible Stilleri Eksik
- **Dosya:** `website/css/style.css`
- **Kategori:** ERISILEBILIRLIK (WCAG 2.4.7)
- **Aciklama:** Klaveye navigasyonda gorunur odak gostergesi yok.
- **Cozum:**
  ```css
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  ```

---

## ORTA Sorunlar

### WEB-15: prefers-reduced-motion Destek Yok
- **Dosya:** `website/css/style.css`
- **Kategori:** ERISILEBILIRLIK
- **Aciklama:** Vestibuler bozuklugu olan kullanicilar icin animasyon kisitlamasi yok.
- **Cozum:** `@media (prefers-reduced-motion: reduce)` eklenmeli.

### WEB-16: Render-Blocking Google Fonts
- **Dosya:** tum HTML dosyalari
- **Kategori:** PERFORMANS
- **Aciklama:** Google Fonts CSS render-blocking yukleniyor.
- **Cozum:** `preload` stratejisi veya self-hosted font.

### WEB-17: nav-actions Linkler Mobile Menu Kapatmiyor
- **Dosya:** `website/js/main.js:34`
- **Aciklama:** "Indir" butonuna tiklaninca menu acik kalir.
- **Cozum:** `.nav-actions` linklerine de close handler eklenmeli.

### WEB-18: Tutarli Olmayan Footer Link Metni
- **Dosya:** Cok sayida HTML dosyasi
- **Aciklama:** Bazinda "Lisans", bazinda "Kullanim Kosullari" yaziyor.
- **Cozum:** Tek bir isim standardizasyonu yapilmali.

### WEB-19: Hero Preview Erisilebilir Aciklama Yok
- **Dosya:** `website/index.html:58-89`
- **Kategori:** ERISILEBILIRLIK (WCAG 1.1.1)
- **Aciklama:** Uygulama mockup'i screen reader'a aciklanmamis.
- **Cozum:** `role="img" aria-label="..."` eklenmeli.

### WEB-20: theme-color Meta Tag Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** SEO/UX
- **Aciklama:** Mobil tarayici adres cubugu rengi tutarsiz.
- **Cozum:** `<meta name="theme-color" content="#121212">` eklenmeli.

### WEB-21: 5 Font Weight Yukleniyor
- **Dosya:** tum HTML dosyalari
- **Kategori:** PERFORMANS
- **Aciklama:** 650 ve 750 degerleri kullaniliyor ama yuklenen sette yok.
- **Cozum:** Kullanilan weight'ler ile eslesmeli.

### WEB-22: CSS font-weight Degerleri Yanlis
- **Dosya:** `website/css/style.css:97, 108`
- **Aciklama:** 650 ve 750 degerleri yuklenen sete uymuyor.
- **Cozum:** 600/700 veya 700/800 olarak degistirilmeli.

### WEB-23: Critical CSS Inlining Yok
- **Dosya:** `website/css/style.css`
- **Kategori:** PERFORMANS
- **Aciklama:** Tum 203 satir CSS render-blocking yukleniyor.
- **Cozum:** `vite-plugin-critical` veya benzeri ile above-the-fold CSS inline edilmeli.

### WEB-24: Navigation Linkler .html Uzantisi Kullaniyor
- **Dosya:** tum HTML dosyalari
- **Aciklama:** `cleanUrls` ile sayfalar uzantisiz ama linkler `.html` kullaniyor. Her navigasyonda redirect.
- **Cozum:** Linkler uzantisiz hale getirilmeli.

### WEB-25: `<code>` Stil Eksik
- **Dosya:** `website/css/style.css`
- **Kategori:** ERISILEBILIRLIK
- **Aciklama:** Inline code snippet'leri serif font ile gosteriliyor.
- **Cozum:** Global `code` stili eklenmeli.

### WEB-26: Subresource Integrity Yok
- **Dosya:** tum HTML dosyalari
- **Kategori:** GUVENLIK
- **Aciklama:** Google Fonts SRI hash'i yok.
- **Cozum:** Self-hosted font veya SRI eklentisi.

### WEB-27: Structured Data (JSON-LD) Eksik
- **Dosya:** tum HTML dosyalari
- **Kategori:** SEO
- **Aciklama:** Arama motorlari icin yapilandirilmis veri yok.
- **Cozum:** `SoftwareApplication` schema eklenmeli.

### WEB-28: Mobile Menu Pozisyonlama Kirilgan
- **Dosya:** `website/css/style.css:193-195`
- **Aciklama:** Nav-actions icin sabit `top: 180px` sayfa degisiminde bozulabilir.
- **Cozum:** Dogrusal flow veya paylasilan container.

### WEB-29: Inline Styles Yaygin
- **Dosya:** tum HTML dosyalari
- **Kategori:** BAKIM
- **Aciklama:** Inline style'lar cache edilemez, override edilemez, media query calismaz.
- **Cozum:** CSS siniflarina tasimali.

---

## DUSUK Sorunlar

### WEB-30: Copyright Yili Sabit 2026
- **Dosya:** tum HTML dosyalari
- **Aciklama:** Yilda bir guncellenmeli.
- **Cozum:** Build-time script veya kabul.

### WEB-31: Footer HTML Tekrarlanmis
- **Dosya:** 8 HTML dosyasi
- **Aciklama:** Footer degisikligi 8 dosyada yapilmali.
- **Cozum:** Partial/component sistemi veya SSG.

### WEB-32: FAQ Cevaplari Screen Reader'dan Gorunur
- **Dosya:** `website/css/style.css:129-130`
- **Aciklama:** `max-height: 0` icerigi gizlemez.
- **Cozum:** `visibility: hidden` eklenmeli.

### WEB-33: Preload Hints Eksik
- **Dosya:** tum HTML dosyalari
- **Aciklama:** Kritik kaynaklar icin preload yok.
- **Cozum:** Vite production'da halleder.

### WEB-34: `<header>` Semantik Eleman Eksik
- **Dosya:** tum HTML dosyalari
- **Aciklama:** Navbar `<header>` icine alinmamis.
- **Cozum:** `<header>` etiketi eklenmeli.

### WEB-35: backdrop-filter Sinirli Destek
- **Dosya:** `website/css/style.css:38, 83, 193`
- **Aciklama:** Firefox 103 oncesi desteklemez.
- **Cozum:** `@supports` fallback'i eklenmeli.

### WEB-36: favicon.ico Kullanilmiyor
- **Dosya:** `website/assets/favicon.ico`
- **Aciklama:** Tum sayfalar favicon.png kullaniyor.
- **Cozum:** `<link rel="icon" href="./assets/favicon.ico" sizes="any">` eklenmeli.

### WEB-37: FAQ Chevron SVG aria-hidden Yok
- **Dosya:** `website/sss.html:45, 54, 63, 72, 81, 90, 99`
- **Aciklama:** Decorative SVG screen reader'da okunur.
- **Cozum:** `aria-hidden="true"` eklenmeli.

### WEB-38: Discord Application ID'leri Public
- **Dosya:** `website/bot.html:73-77`
- **Aciklama:** ID'ler dokumantasyon icin gosteriliyor, risk dusuk.
- **Cozum:** Bilincli karar, degisiklik gerekmez.

### WEB-39: SVG Icon'lari Tekrarlanmis
- **Dosya:** tum HTML dosyalari
- **Aciklama:** HTML boyutunu buyutuyor.
- **Cozum:** 8 sayfa icin kabul edilebilir.

### WEB-40: download-card primary Class'i
- **Dosya:** `website/indir.html:51`
- **Aciklama:** CSS kurali olmayan sinif.
- **Cozum:** Kaldirilmali veya stil eklenmeli.

### WEB-41: Mobile Menu Overlay Scroll Engellemesi
- **Dosya:** `website/js/main.js:11-12`
- **Aciklama:** `touchAction` `''` yerine `'auto'` olmali.
- **Cozum:** `touchAction = 'auto'` yapilmali.

### WEB-42: download-meta Flex Wrap Yok
- **Dosya:** `website/css/style.css:115`
- **Aciklama:** Dar ekranlarda yatay taşma.
- **Cozum:** `flex-wrap: wrap` eklenmeli.

### WEB-43: steps-grid Kucuk Ekranlarda 2 Sutun
- **Dosya:** `website/css/style.css:117, 199`
- **Aciklama:** 480px altinda tek sutun olmali.
- **Cozum:** `@media (max-width: 480px)` eklenebilir.

### WEB-44: Hero Preview Bos Span
- **Dosya:** `website/index.html:63-65`
- **Aciklama:** Decorative span'ler gizlenmemis.
- **Cozum:** `aria-hidden="true"` eklenmeli.

### WEB-45: X-XSS-Protection Header Yok
- **Dosya:** vercel.json dosyalari
- **Aciklama:** Eski tarayicilar icin ek koruma.
- **Cozum:** `"X-XSS-Protection": "1; mode=block"` eklenmeli.

### WEB-46: Meta Description Cok Kisa
- **Dosya:** `gizlilik.html:6`, `kosullar.html:6`
- **Aciklama:** 37-41 karakter, Google 120-600 oneriyor.
- **Cozum:** Aciklamalar genisletilmeli.

### WEB-47: Footer Sosyal Link Tutarsizligi
- **Dosya:** index.html vs diger sayfalar
- **Aciklama:** Sadece index ve bot.html'de sosyal link var.
- **Cozum:** Tum sayfalara eklenmeli veya hicbirlene kaldirilmali.

### WEB-48: robots.txt ve sitemap.xml Public'te Degil
- **Dosya:** `website/robots.txt`, `website/sitemap.xml`
- **Aciklama:** Vite bunlari dist'e kopyalamaz.
- **Cozum:** `website/public/` dizinine tasinmali.

### WEB-49: vite.config.js Optimizasyon Eksik
- **Dosya:** `website/vite.config.js`
- **Aciklama:** Varsayilan ayarlar iyi ama explicit olmali.
- **Cozum:** Minification ve CSS code split ayarlari.

### WEB-50: Inconsistent Footer Between Pages
- **Dosya:** index.html vs diger sayfalar
- **Aciklama:** Sosyal link alaninin tutarsizligi.
- **Cozum:** Tum sayfalara eklenmeli.
