# 📁 Klasör Denetimi: `desktop/src/renderer/` (Masaüstü Arayüz Süreci)

> **Modül Adı**: Chromium Renderer Process UI  
> **Dosya Sayısı**: 4 Dosya (`components/app.ts`, `index.html`, `styles/main.css`, `styles/login.css`)  
> **Toplam Satır**: ~4,700 Satır  
> **Teknoloji**: Vanilla TypeScript, Vite, CSS3, DOM API

---

## 🏗️ 1. Mimari Yapı ve Değerlendirme

`desktop/src/renderer/` klasörü, uygulamanın kullanıcıya gösterilen grafik arayüzüdür (GUI). React veya Vue gibi bir SPA kütüphanesi yerine saf (Vanilla) TypeScript ve doğrudan DOM manipülasyonu tercih edilmiştir.

```
desktop/src/renderer/
├── components/
│   └── app.ts                 # 2,384 satırlık devasa monolitik uygulama mantığı
├── index.html                 # Ana HTML şablonu, CSP ve panel iskeletleri
└── styles/
    ├── main.css               # ~1,850 satırlık Spotify/Windows 11 temalı ana stil dosyası
    └── login.css              # Giriş bileşeni ve modal stilleri
```

---

## ⚠️ 2. Bu Klasörde Tespit Edilen Sistemik Riskler

### A. Aşırı Monolitik Kod Mimarisi
- `components/app.ts` tek bir IIFE fonksiyonu (`(() => { ... })()`) içine sıkıştırılmış **2,384 satırdan** oluşmaktadır.
- Oynatıcı mantığı, arama filtreleri, sayfa yönlendirme (routing), ayarlar, şarkı sözleri paneli, kuyruk yönetimi, bağlam menüsü, klavye kısayolları ve DOM güncellemeleri tek bir dosyadadır.
- Dosya bölümlere (modüllere) ayrılmadığı için test edilebilirlik sıfırdır; herhangi bir küçük değişiklik tüm arayüzü etkileyebilmektedir.

### B. DOM Sorgu Yığılması ve Render Darboğazları
- `api.player.onUpdate` dinleyicisi her 800ms'de bir tetiklendiğinde DOM üzerinde düzinelerce `$$('.song-row')` ve `$('#...')` sorgusu çalıştırılmaktadır.
- Virtual DOM veya reaktif bir durum yöneticisi olmadığı için her güncellemede doğrudan HTML string birleştirmeleri (`innerHTML = ...`) yapılmaktadır.

### C. Çevrimdışı (Offline) Açılış Zaafiyeti
- `index.html` başlığında Google Fonts CDN'ine doğrudan bağımlılık bulunmaktadır. İnternet bağlantısı olmadan uygulama başlatıldığında font yükleme zaman aşımına uğramakta ve arayüzde layout kaymalarına yol açmaktadır.

---

## 📋 3. Klasör İçi Dosya Detay Dokümantasyonları

Ayrıntılı dosya bazlı analiz ve kod düzeltmeleri için aşağıdaki dokümanları inceleyiniz:
- [components/app.ts İncelemesi](components-app.ts.md)
- [index.html İncelemesi](index.html.md)
- [styles.md İncelemesi](styles.md)
