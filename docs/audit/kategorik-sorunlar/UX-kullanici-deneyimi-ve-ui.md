# 🎨 Kategorik Sorun Denetimi: Kullanıcı Deneyimi ve Arayüz (UX & UI)

> **Kategori Kodu**: `UX`  
> **Kapsam**: Etkileşimler, Butonlar, Animasyonlar, Erişilebilirlik ve Bildirimler  
> **Toplam Bulgu**: 5 UX/UI Başlığı

---

## 🔍 1. UX Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `UX-02` | 🔴 KRİTİK | Mobilde Karıştır ve Tekrarla Butonlarının Tepkisiz Olması | `mobile/app/modal/player.tsx` | ❌ AÇIK |
| `UX-03` | 🟠 YÜKSEK | Mobilde İlerleme Çubuğunun Sürüklenememesi (Drag Yokluğu) | `mobile/app/modal/player.tsx` | ❌ AÇIK |
| `UX-04` | 🟡 ORTA | Web Sitesi İndirme Sayfasında İşletim Sistemi Tespiti Yokluğu | `website/indir.html` | ❌ AÇIK |
| `UX-05` | 🟡 ORTA | Masaüstünde Başlık ve Kontrol Butonlarında ARIA Eksikliği | `desktop/src/renderer/index.html` | ❌ AÇIK |
| `UX-06` | 🟡 ORTA | Şarkı Durduğunda Bile Animasyon Yapan Ekolayzır | `desktop/src/renderer/styles/main.css` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı UX Analizleri

### `UX-02`: Çalışmayan Butonlar
- **Deneyim**: Kullanıcı mobil arayüzde görsel olarak yerleştirilmiş Shuffle ve Repeat butonlarına dokunur, ancak ekranda hiçbir durum değişmez, renk değişmez ve oynatma sırası etkilenmez.
- **Düzeltme**: Butonlara `onPress` atanmalı, aktif olduğunda yeşil renge bürünmelidir.

### `UX-03`: Sürüklenemeyen Scrubber
- **Deneyim**: Kullanıcı şarkının belirli bir nakaratına gitmek için parmağını çubuk boyunca kaydıramaz; yalnızca dokunduğu noktaya kaba bir atlama yapılır.
- **Düzeltme**: Gesture handler tabanlı akıcı sürükleme çubuğu eklenmelidir.

---

## 🛠️ 3. UX Yol Haritası

1. Mobil kontrollerin tümü aktif ve reaktif hale getirilmelidir.
2. Sürükleme hareketleri (gestures) desteklenmelidir.
3. Erişilebilirlik standartları tamamlanmalıdır.
