# 🏛️ Kategorik Sorun Denetimi: Mimari ve Kod Kalitesi (Architecture & Code Debt)

> **Kategori Kodu**: `ARC`  
> **Kapsam**: Kod Yapısı, Tasarım Desenleri, Modülerlik ve Ölü Kodlar  
> **Toplam Bulgu**: 6 Mimari Başlık

---

## 🔍 1. Mimari Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `ARC-05` | 🔴 KRİTİK | InnerTube API'sine Session Çerezlerinin Enjekte Edilmemesi | `desktop/src/main/api/innertube.ts` | ❌ AÇIK |
| `ARC-06` | 🟠 YÜKSEK | Projede Tamamen Ölü Olan Yerel Discord RPC Kütüphanesi | `desktop/src/main/lib/discord-rpc/` | ❌ AÇIK |
| `ARC-07` | 🔴 KRİTİK | 2,384 Satırlık Monolitik `app.ts` Anti-Pattern'ı | `desktop/src/renderer/components/app.ts` | ❌ AÇIK |
| `ARC-08` | 🟠 YÜKSEK | `volume-ratio.ts` Sahte (Placebo) Normalizasyon Kodu | `desktop/src/main/providers/volume-ratio.ts` | ❌ AÇIK |
| `ARC-09` | 🟡 ORTA | Parçalanmış 4 Farklı `electron-store` Veri Dosyası | `desktop/src/main/` | ❌ AÇIK |
| `ARC-10` | 🟡 ORTA | Çalma Listelerinde Sadece Şarkı ID'lerinin Saklanması | `desktop/src/main/utils/store.ts` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı Mimari Analizler

### `ARC-05`: InnerTube Çerez Enjeksiyonu Eksikliği
- **Kök Neden**: Node.js `fetch` motoru ile Electron Chromium session'ı arasındaki veri kopukluğu. Masaüstü arayüzü çerezleri `persist:aquality-music` içinde tutarken, API çağrıları çıplak Node.js fetch ile atılmaktadır.
- **Çözüm**: `session.fromPartition('persist:aquality-music').cookies.get()` ile elde edilen çerez dizesi `request()` başlıklarına bağlanmalıdır.

### `ARC-06`: 5 Dosyadan Oluşan Ölü Kod Klasörü
- **Kök Neden**: Geliştirme sürecinde yerel bir RPC istemcisi yazılmış, ancak daha sonra npm'deki `discord-rpc` paketine dönülmüş ve eski klasör silinmeden unutulmuştur.
- **Çözüm**: Kod tabanından tamamen kaldırılmalı ya da npm paketi yerine bu yerel sınıflar sisteme bağlanmalıdır.

### `ARC-07`: Monolitik `app.ts`
- **Kök Neden**: Hızlı prototipleme amacıyla tüm mantık tek bir script içine yazılmıştır.
- **Çözüm**: Bileşen ve servis tabanlı (Controller, Model, View) modern bir klasör hiyerarşisine bölünmelidir.

---

## 🛠️ 3. Mimari Yol Haritası

1. `innertube.ts` oturum çerezlerine bağlanmalıdır.
2. Ölü ve sahte kodlar (`lib/discord-rpc`, `volume-ratio`) temizlenmelidir.
3. `app.ts` modüler bileşenlere ayrılmalıdır.
