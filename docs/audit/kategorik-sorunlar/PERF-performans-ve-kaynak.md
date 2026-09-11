# ⚡ Kategorik Sorun Denetimi: Performans ve Kaynak Yönetimi (Performance & Resources)

> **Kategori Kodu**: `PERF`  
> **Kapsam**: CPU, GPU, Bellek, Pil Tüketimi ve DOM İşlemleri  
> **Toplam Bulgu**: 5 Performans Başlığı

---

## 🔍 1. Performans Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `PERF-01` | 🔴 KRİTİK | Oynatıcı Penceresinde `--disable-gpu` ile CPU Yükü | `desktop/src/main/api/stream-resolver.ts` | ❌ AÇIK |
| `PERF-02` | 🔴 KRİTİK | Her 800ms'de Rekürsif Shadow DOM `querySelectorAll` | `desktop/src/main/api/stream-resolver.ts` | ❌ AÇIK |
| `PERF-03` | 🔴 KRİTİK | Mobilde `usePlayer` ile Saniyede 4 Kez Global Re-render | `mobile/src/store/player-store.ts` | ❌ AÇIK |
| `PERF-04` | 🟠 YÜKSEK | Her Güncellemede Senkron `saveQueue()` Disk Yazımı | `desktop/src/renderer/components/app.ts` | ❌ AÇIK |
| `PERF-05` | 🟡 ORTA | Masaüstünde `backdrop-filter: blur` GPU Katman Baskısı | `desktop/src/renderer/styles/main.css` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı Performans Analizleri

### `PERF-01`: Donanım İvmelendirmesi Kapatılması
- **Etki**: Chromium medya motoru donanım hızlandırmalı video/ses decode'u devre dışı bırakır. İşlemci çekirdekleri %20-40 yük altına girer, fanlar yüksek devirde çalışır ve dizüstü bilgisayarlarda şarj hızla biter.
- **Çözüm**: Oynatıcı penceresinin `additionalArguments` yapılandırmasından `--disable-gpu` ve `--disable-gpu-compositing` kaldırılmalıdır.

### `PERF-02`: 800ms Shadow DOM Rekürsif Araması
- **Etki**: Her 800 milisaniyede bir `executeJavaScript` ile konuk pencereye kod gönderilip binlerce DOM öğesi taranır. Garbage Collection (GC) duraklamaları ve CPU churn oluşur.
- **Çözüm**: `movie_player` nesnesi bir kez bulunduktan sonra önbelleğe alınmalı (`window.__cached_player`), polling sıklığı optimize edilmelidir.

### `PERF-03`: Mobilde Global Re-render Fırtınası
- **Etki**: Şarkı süresi ilerledikçe (`currentTime`) her çeyrek saniyede bir `setState` çağrılmakta; `MiniPlayer`, sekmeler ve liste elemanları lüzumsuz yere baştan çizilmektedir.
- **Çözüm**: Selector tabanlı durum aboneliği kurulmalıdır.

---

## 🛠️ 3. Performans Yol Haritası

1. GPU ivmelendirmesi tekrar açılmalıdır.
2. DOM aramaları önbelleklenmeli ve dinleyiciler olay tabanlı hale getirilmelidir.
3. React durum yönetimi selector desenine geçirilmelidir.
